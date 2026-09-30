import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import { Transaction } from "../types";
import {
    getSetting,
    API_URL
} from "../utils/db";
import { authFetch } from "../utils/apiClient";
import { computeBalance } from "../utils/balance";
import { useAuth } from "./AuthContext";
import { useUserProfile } from "./UserProfileContext";
import { useSystemAlerts } from "./SystemAlertsContext";
import { useRepositories } from "./RepositoryContext";
import { useIsLocalAccount } from "../utils/authMode";
import { useToast } from "../context/ToastContext";
import { generateUUID } from "../utils/uuid";
import * as FileSystem from 'expo-file-system/legacy';
import { enqueueAndTrigger, processSyncQueue } from "../utils/syncProcessor";
import {
    buildTransactionSyncPayload,
    getLastServerTxIds,
    isTransactionSyncPaused,
    mergeTransactionSets,
    setLastServerTxIds,
    withFreshTimestamp,
} from "../utils/transactionSync";
import {
    resolveActivePlane,
    apiList,
    apiCreate,
    apiUpdate,
    apiDelete,
} from "../utils/apiOnly";

interface TransactionsData {
    transactions: Transaction[];
    loading: boolean;
}

interface TransactionsActions {
    refetch: () => Promise<void>;
    addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
    updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
}

const TransactionsDataContext = createContext<TransactionsData | undefined>(undefined);
const TransactionsActionsContext = createContext<TransactionsActions | undefined>(undefined);

const sanitizeTransaction = (t: Transaction): Transaction => {
    const withTimestamp = { ...t, updatedAt: t.updatedAt || Date.now() } as Record<string, unknown>;
    if (withTimestamp.note === undefined) withTimestamp.note = null;
    if (withTimestamp.receiptUrl === undefined) withTimestamp.receiptUrl = null;
    if (withTimestamp.paymentMethod === undefined) withTimestamp.paymentMethod = "";
    if (withTimestamp.establishment === undefined) withTimestamp.establishment = "";
    if (withTimestamp.category === undefined) withTimestamp.category = {
        id: 'uncategorized', name: 'Others', type: t.type || 'expense', updatedAt: 0,
    };
    return { ...withTimestamp } as unknown as Transaction;
};

const addCategoryFallback = (t: Transaction): Transaction => ({
    ...t,
    category: t.category || { id: 'uncategorized', name: 'Others', type: t.type || 'expense', updatedAt: 0 },
});

export function TransactionsProvider({ children }: { children: ReactNode }) {
    const { activeUserId } = useAuth();
    const { profile } = useUserProfile();
    const isLocal = useIsLocalAccount();
    const { transactions: txRepo } = useRepositories();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();
    // SPEC-27 D-02 — ids deleted locally this session whose `delete` has not
    // drained yet. In-memory only (NOT a persisted tombstone table per DEC-01).
    const deletedIdsRef = useRef<Set<string>>(new Set());

    const uploadReceiptIfNeeded = useCallback(async (tx: Transaction): Promise<Transaction> => {
        if (tx.receiptUrl && tx.receiptUrl.startsWith('file://')) {
            try {
                const fileName = `${tx.id}.jpg`;
                const securedPath = `${activeUserId}/${fileName}`;
                const base64 = await FileSystem.readAsStringAsync(tx.receiptUrl, {
                    encoding: 'base64',
                });
                const { ok, data: uploadData } = await authFetch(`storage/upload`, {
                    method: "POST",
                    body: JSON.stringify({
                        path: securedPath,
                        fileBase64: base64,
                        bucket: 'receipts'
                    })
                });
                if (ok && uploadData && typeof uploadData === 'object' && 'url' in uploadData) {
                    return { ...tx, receiptUrl: (uploadData as { url: string }).url };
                }
            } catch (e) {
                console.error("Failed to sync image to cloud:", e);
            }
        }
        return tx;
    }, [activeUserId]);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            // SPEC-34 CON-01/CON-02 — API-only plane reads live, zero repo
            // reads/writes, zero merge, zero queue.
            const plane = await resolveActivePlane({
                platformOs: Platform.OS,
                isLocal,
                profileAutoBackup: profile?.autoBackup,
            });
            if (plane === "api-only") {
                if (API_URL && activeUserId) {
                    const { ok, data } = await apiList("transactions", activeUserId);
                    if (ok && Array.isArray(data)) {
                        setTransactions((data as Transaction[]).map(sanitizeTransaction));
                    }
                } else {
                    setTransactions([]);
                }
                return;
            }

            const localData = (await txRepo.getAll()).map(addCategoryFallback);
            setTransactions(localData);

            // SPEC-27 CON-11 — Local accounts and Cloud+OFF issue zero
            // transaction calls in either direction (frozen local log).
            const autoBackup = await getSetting('autoBackup');
            const syncPaused = isTransactionSyncPaused(isLocal, autoBackup);
            if (!syncPaused && API_URL && activeUserId) {
                const { ok, data: remoteData } = await authFetch<Transaction[]>(`transactions?userId=${activeUserId}`);
                // CON-06 flaky-fetch guard: delete-wins applies ONLY on `ok`
                // array fetches — failed/empty fetches MUST NOT delete anything.
                if (ok && Array.isArray(remoteData)) {
                    const lastServerIds = await getLastServerTxIds(activeUserId);
                    const { merged, overwrittenCount, toCreate, toUpdate } = mergeTransactionSets({
                        local: localData,
                        remote: remoteData,
                        lastServerIds,
                        deletedIds: deletedIdsRef.current,
                    });

                    for (const localTx of toCreate) {
                        const uploaded = await uploadReceiptIfNeeded(sanitizeTransaction(localTx));
                        await enqueueAndTrigger('transactions', 'create', localTx.id,
                            buildTransactionSyncPayload(uploaded, activeUserId));
                    }
                    for (const localTx of toUpdate) {
                        await enqueueAndTrigger('transactions', 'update', localTx.id,
                            buildTransactionSyncPayload(localTx, activeUserId));
                    }

                    const mergedTx = merged.map(sanitizeTransaction);
                    await txRepo.upsertBulk(mergedTx);
                    setTransactions(mergedTx);
                    await setLastServerTxIds(activeUserId, remoteData.map(t => String(t.id)));

                    if (overwrittenCount > 0) {
                        showToast(`${overwrittenCount} record(s) updated from another device.`);
                    }
                }
            }

            await processSyncQueue();
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [activeUserId, txRepo, uploadReceiptIfNeeded, isLocal, showToast, profile?.autoBackup]);

    const { checkNegativeBalance } = useSystemAlerts();

    useEffect(() => {
        if (!activeUserId) return;
        fetchTransactions();
    }, [activeUserId, fetchTransactions]);

    useEffect(() => {
        if (!activeUserId || loading) return;
        // SPEC-37 D-02 — shared helper (CON-02); input shape unchanged (CON-05).
        const balance = computeBalance({ initialBalance: profile?.initialBalance, transactions });

        checkNegativeBalance(balance);
    }, [activeUserId, profile, transactions, loading, checkNegativeBalance]);

    const addTransaction = useCallback(async (transaction: Omit<Transaction, "id">) => {
        try {
            // SPEC-27 CON-04 — fresh `updatedAt` at creation.
            const newTransaction: Transaction = sanitizeTransaction(withFreshTimestamp({
                ...transaction,
                id: generateUUID(),
                updatedAt: 0,
            } as Transaction));

            // SPEC-34 CON-02 — API-only writes straight through (no repo, no
            // queue); failures throw so callers surface them with retry.
            const plane = await resolveActivePlane({
                platformOs: Platform.OS,
                isLocal,
                profileAutoBackup: profile?.autoBackup,
            });
            if (plane === "api-only") {
                if (!API_URL || !activeUserId) {
                    throw new Error("Cloud unavailable — check your connection.");
                }
                const uploaded = await uploadReceiptIfNeeded(newTransaction);
                const res = await apiCreate(
                    "transactions",
                    uploaded as unknown as Record<string, unknown>,
                    activeUserId
                );
                if (!res.ok) {
                    showToast("Couldn't save to cloud. Check your connection and retry.");
                    throw new Error(`Cloud create failed (status ${res.status})`);
                }
                const created = (res.data && typeof res.data === "object"
                    ? sanitizeTransaction(res.data as Transaction)
                    : uploaded);
                setTransactions((prev) => [...prev, created]);
                return;
            }

            await txRepo.upsert(newTransaction);
            setTransactions((prev) => [...prev, newTransaction]);

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    const uploaded = await uploadReceiptIfNeeded(newTransaction);
                    const syncData = buildTransactionSyncPayload(uploaded, activeUserId as string);
                    await enqueueAndTrigger('transactions', 'create', newTransaction.id, syncData);
                }
            }
        } catch (error) {
            console.error("Error adding transaction:", error);
            throw error;
        }
    }, [txRepo, activeUserId, uploadReceiptIfNeeded, isLocal, showToast, profile?.autoBackup]);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
        try {
            // SPEC-34 CON-02 — API-only partial PUT straight through.
            const plane = await resolveActivePlane({
                platformOs: Platform.OS,
                isLocal,
                profileAutoBackup: profile?.autoBackup,
            });
            if (plane === "api-only") {
                if (!API_URL || !activeUserId) {
                    throw new Error("Cloud unavailable — check your connection.");
                }
                const stamped = { ...updates, updatedAt: Date.now() };
                const res = await apiUpdate(
                    "transactions",
                    id,
                    stamped as unknown as Record<string, unknown>,
                    activeUserId
                );
                if (!res.ok) {
                    showToast("Couldn't save to cloud. Check your connection and retry.");
                    throw new Error(`Cloud update failed (status ${res.status})`);
                }
                setTransactions((prev) => prev.map(t =>
                    t.id === id ? { ...t, ...stamped } as Transaction : t
                ));
                return;
            }

            const item = await txRepo.getById(id);
            // SPEC-27 CON-04 — updates MUST bump `updatedAt`, never preserve it.
            const updated: Transaction | null = item
                ? sanitizeTransaction(withFreshTimestamp({ ...item, ...updates } as Transaction))
                : null;
            if (updated) {
                await txRepo.upsert(updated);
            }
            setTransactions((prev) => prev.map(t =>
                t.id === id ? (updated ?? { ...t, ...updates }) : t
            ));

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    const syncData = updated
                        ? buildTransactionSyncPayload(updated, activeUserId as string)
                        : { ...updates, userId: activeUserId };
                    await enqueueAndTrigger('transactions', 'update', id, syncData);
                }
            }
        } catch (error) {
            console.error("Error updating transaction:", error);
            throw error;
        }
    }, [txRepo, activeUserId, isLocal, showToast, profile?.autoBackup]);

    const deleteTransaction = useCallback(async (id: string) => {
        try {
            // SPEC-34 CON-02 — API-only DELETE straight through.
            const plane = await resolveActivePlane({
                platformOs: Platform.OS,
                isLocal,
                profileAutoBackup: profile?.autoBackup,
            });
            if (plane === "api-only") {
                if (API_URL && activeUserId) {
                    const res = await apiDelete("transactions", id);
                    if (!res.ok) {
                        showToast("Couldn't delete from cloud. Check your connection and retry.");
                        return;
                    }
                }
                setTransactions((prev) => prev.filter(t => t.id !== id));
                return;
            }

            await txRepo.deleteById(id);
            setTransactions((prev) => prev.filter(t => t.id !== id));
            // SPEC-27 D-02 — guard the merge until the queued `delete` drains.
            deletedIdsRef.current.add(id);

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    await enqueueAndTrigger('transactions', 'delete', id);
                }
            }
        } catch (error) {
            console.error("Error deleting transaction:", error);
            throw error;
        }
    }, [txRepo, isLocal, activeUserId, showToast, profile?.autoBackup]);

    const dataValue = useMemo(() => ({
        transactions,
        loading,
    }), [transactions, loading]);

    const actionsValue = useMemo(() => ({
        refetch: fetchTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
    }), [fetchTransactions, addTransaction, updateTransaction, deleteTransaction]);

    return (
        <TransactionsDataContext.Provider value={dataValue}>
            <TransactionsActionsContext.Provider value={actionsValue}>
                {children}
            </TransactionsActionsContext.Provider>
        </TransactionsDataContext.Provider>
    );
}

export function useTransactionsData(): TransactionsData {
    const context = useContext(TransactionsDataContext);
    if (!context) {
        throw new Error("useTransactionsData must be used within a TransactionsProvider");
    }
    return context;
}

export function useTransactionsActions(): TransactionsActions {
    const context = useContext(TransactionsActionsContext);
    if (!context) {
        throw new Error("useTransactionsActions must be used within a TransactionsProvider");
    }
    return context;
}

export function useTransactionsContext(): TransactionsData & TransactionsActions {
    return { ...useTransactionsData(), ...useTransactionsActions() };
}
