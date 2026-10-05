import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { Platform } from "react-native";
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
    const zDate = toZIso(withTimestamp.date);
    if (zDate !== null) withTimestamp.date = zDate;
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

// SPEC-43 follow-up (HAR-proven): the server echoes PG timestamptz (`+00:00`)
// which its strict zod datetime rejects, mints ids on create (client UUIDs
// never reconcile), and omits `updatedAt` on rows. Normalize outbound dates
// to Z ISO; treat a remote row without any timestamp as authoritative.
function toZIso(date: unknown): string | null {
    if (typeof date !== "string") return null;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function remoteEpoch(remoteTx: Transaction): number {
    if (remoteTx.updatedAt) return remoteTx.updatedAt;
    const createdAt = (remoteTx as { createdAt?: unknown }).createdAt;
    if (typeof createdAt === "string") {
        const parsed = Date.parse(createdAt);
        if (!isNaN(parsed)) return parsed;
    }
    return Number.POSITIVE_INFINITY;
}

function hasPendingLocalFile(tx: Transaction): boolean {
    return !!tx.receiptUrl && tx.receiptUrl.startsWith("file://");
}

function isSameRecord(a: Transaction, b: Transaction): boolean {
    const dateA = toZIso(a.date);
    const dateB = toZIso(b.date);
    return (
        dateA !== null &&
        dateA === dateB &&
        Number(a.amount || 0) === Number(b.amount || 0) &&
        (a.type || "") === (b.type || "") &&
        (a.note ?? null) === (b.note ?? null)
    );
}

function isSameContent(a: Transaction, b: Transaction): boolean {
    return (
        isSameRecord(a, b) &&
        (a.title ?? null) === (b.title ?? null) &&
        (a.paymentMethod ?? null) === (b.paymentMethod ?? null) &&
        (a.establishment ?? null) === (b.establishment ?? null) &&
        (a.receiptUrl ?? null) === (b.receiptUrl ?? null) &&
        (a.category?.id ?? null) === (b.category?.id ?? null) &&
        (a.dueId ?? null) === (b.dueId ?? null)
    );
}

export function TransactionsProvider({ children }: { children: ReactNode }) {
    const { activeUserId } = useAuth();
    const { profile } = useUserProfile();
    const isLocal = useIsLocalAccount();
    const { transactions: txRepo } = useRepositories();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

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
            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web loads API-direct — no local reads, no merge, no queue.
                if (API_URL && activeUserId) {
                    const { ok, data: remoteData } = await authFetch<Transaction[]>(`transactions?userId=${activeUserId}`);
                    if (ok && Array.isArray(remoteData)) {
                        setTransactions(remoteData.map(addCategoryFallback));
                    }
                }
                return;
            }
            const localData = (await txRepo.getAll()).map(addCategoryFallback);
            setTransactions(localData);

            if (!isLocal && API_URL && activeUserId) {
                const { ok, data: remoteData } = await authFetch<Transaction[]>(`transactions?userId=${activeUserId}`);
                if (ok && Array.isArray(remoteData)) {
                    const mergedMap = new Map<string, Transaction>();
                    let overwrittenCount = 0;

                    for (const remoteTx of remoteData) {
                        mergedMap.set(remoteTx.id, remoteTx);
                    }

                    for (const localTx of localData) {
                        const remoteTx = mergedMap.get(localTx.id);
                        if (!remoteTx) {
                            // Fingerprint-adopt: the server mints ids, so an already-POSTed
                            // payload lives remotely under another id — adopt it instead of
                            // minting another row. Never drop a pending local file.
                            const twin = remoteData.find((r) => isSameRecord(localTx, r));
                            if (twin && !hasPendingLocalFile(localTx)) {
                                await txRepo.deleteById(localTx.id);
                                continue;
                            }
                            const uploaded = await uploadReceiptIfNeeded(sanitizeTransaction(localTx));
                            mergedMap.set(localTx.id, uploaded);
                            await enqueueAndTrigger('transactions', 'create', localTx.id, {
                                ...uploaded,
                                userId: activeUserId,
                            });
                        } else if ((localTx.updatedAt || 0) > remoteEpoch(remoteTx) && !isSameContent(localTx, remoteTx)) {
                            mergedMap.set(localTx.id, localTx);
                            await enqueueAndTrigger('transactions', 'update', localTx.id, {
                                ...localTx,
                                userId: activeUserId,
                            });
                        } else if ((remoteTx.updatedAt || 0) > (localTx.updatedAt || 0)) {
                            overwrittenCount++;
                        }
                    }

                    const merged = Array.from(mergedMap.values());
                    await txRepo.upsertBulk(merged.map(sanitizeTransaction));
                    setTransactions(merged);

                    if (overwrittenCount > 0) {
                        showToast(`${overwrittenCount} record(s) updated from another device.`);
                    }
                }
            }

            processSyncQueue();
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
            const newTransaction: Transaction = sanitizeTransaction({
                ...transaction,
                id: generateUUID()
            });

            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web writes API-direct — no local repo, no flag gate, no queue.
                const uploaded = await uploadReceiptIfNeeded(newTransaction);
                const { ok } = await authFetch('transactions', {
                    method: "POST",
                    body: JSON.stringify({ ...uploaded, userId: activeUserId }),
                });
                if (!ok) {
                    throw new Error("Failed to save transaction. Please check your connection.");
                }
                setTransactions((prev) => [...prev, uploaded]);
                return;
            }

            await txRepo.upsert(newTransaction);
            setTransactions((prev) => [...prev, newTransaction]);

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    const uploaded = await uploadReceiptIfNeeded(newTransaction);
                    const syncData = { ...uploaded, userId: activeUserId };
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
            if (item) {
                await txRepo.upsert(sanitizeTransaction({ ...item, ...updates } as Transaction));
            }
            setTransactions((prev) => prev.map(t =>
                t.id === id ? { ...t, ...updates } : t
            ));

            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web writes API-direct.
                const updateBody: Record<string, unknown> = { ...updates, userId: activeUserId };
                const zUpdateDate = toZIso(updateBody.date);
                if (zUpdateDate !== null) updateBody.date = zUpdateDate;
                const { ok } = await authFetch(`transactions/${id}`, {
                    method: "PUT",
                    body: JSON.stringify(updateBody),
                });
                if (!ok) {
                    throw new Error("Failed to save changes. Please check your connection.");
                }
                setTransactions((prev) => prev.map(t =>
                    t.id === id ? { ...t, ...updates } : t
                ));
                return;
            }

            if (!isLocal) {
                const autoBackup = await getSetting('autoBackup');
                if (API_URL && autoBackup !== 'false') {
                    const syncBody: Record<string, unknown> = { ...updates, userId: activeUserId };
                    const zSyncDate = toZIso(syncBody.date);
                    if (zSyncDate !== null) syncBody.date = zSyncDate;
                    await enqueueAndTrigger('transactions', 'update', id, syncBody);
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

            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web writes API-direct.
                const { ok } = await authFetch(`transactions/${id}`, { method: "DELETE" });
                if (!ok) {
                    throw new Error("Failed to delete transaction. Please check your connection.");
                }
                setTransactions((prev) => prev.filter(t => t.id !== id));
                return;
            }

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
