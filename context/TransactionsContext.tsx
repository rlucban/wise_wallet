import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { Transaction } from "../types";
import {
    getSetting,
    API_URL
} from "../utils/db";
import { authFetch } from "../utils/apiClient";
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
    }, [activeUserId, txRepo, uploadReceiptIfNeeded, isLocal, showToast]);

    const { checkNegativeBalance } = useSystemAlerts();

    useEffect(() => {
        if (!activeUserId) return;
        fetchTransactions();
    }, [activeUserId, fetchTransactions]);

    useEffect(() => {
        if (!activeUserId || loading) return;
        const initialBalance = Number(profile?.initialBalance || 0);
        const income = transactions
            .filter((t) => t.type === "income" && t.title !== "Opening Balance")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const expense = transactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const balance = initialBalance + income - expense;

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
    }, [txRepo, activeUserId, uploadReceiptIfNeeded, isLocal]);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
        try {
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
    }, [txRepo, activeUserId, isLocal]);

    const deleteTransaction = useCallback(async (id: string) => {
        try {
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
    }, [txRepo, isLocal]);

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
