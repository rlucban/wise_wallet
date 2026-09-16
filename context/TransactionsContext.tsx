import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
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
    const { transactions: txRepo } = useRepositories();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);

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

            if (API_URL && activeUserId) {
                const { ok, data: remoteData } = await authFetch<Transaction[]>(`transactions?userId=${activeUserId}`);
                if (ok && Array.isArray(remoteData)) {
                    const mergedMap = new Map<string, Transaction>();

                    for (const remoteTx of remoteData) {
                        mergedMap.set(remoteTx.id, remoteTx);
                    }

                    for (const localTx of localData) {
                        if (!mergedMap.has(localTx.id)) {
                            const uploaded = await uploadReceiptIfNeeded(sanitizeTransaction(localTx));
                            mergedMap.set(localTx.id, uploaded);
                            await enqueueAndTrigger('transactions', 'create', localTx.id, {
                                ...uploaded,
                                userId: activeUserId,
                            });
                        }
                    }

                    const merged = Array.from(mergedMap.values());
                    await txRepo.upsertBulk(merged.map(sanitizeTransaction));
                    setTransactions(merged);
                }
            }

            processSyncQueue();
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [activeUserId, txRepo, uploadReceiptIfNeeded]);

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

        if (balance < 0) {
            checkNegativeBalance(balance);
        }
    }, [activeUserId, profile, transactions, loading, checkNegativeBalance]);

    const addTransaction = useCallback(async (transaction: Omit<Transaction, "id">) => {
        try {
            const newTransaction: Transaction = sanitizeTransaction({
                ...transaction,
                id: generateUUID()
            });

            await txRepo.upsert(newTransaction);
            setTransactions((prev) => [...prev, newTransaction]);

            const autoBackup = await getSetting('autoBackup');
            if (API_URL && autoBackup !== 'false') {
                const uploaded = await uploadReceiptIfNeeded(newTransaction);
                const syncData = { ...uploaded, userId: activeUserId };
                await enqueueAndTrigger('transactions', 'create', newTransaction.id, syncData);
            }
        } catch (error) {
            console.error("Error adding transaction:", error);
            throw error;
        }
    }, [txRepo, activeUserId, uploadReceiptIfNeeded]);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
        try {
            const item = await txRepo.getById(id);
            if (item) {
                await txRepo.upsert(sanitizeTransaction({ ...item, ...updates } as Transaction));
            }
            setTransactions((prev) => prev.map(t =>
                t.id === id ? { ...t, ...updates } : t
            ));

            const autoBackup = await getSetting('autoBackup');
            if (API_URL && autoBackup !== 'false') {
                const syncData = { ...updates, userId: activeUserId };
                await enqueueAndTrigger('transactions', 'update', id, syncData);
            }
        } catch (error) {
            console.error("Error updating transaction:", error);
            throw error;
        }
    }, [txRepo, activeUserId]);

    const deleteTransaction = useCallback(async (id: string) => {
        try {
            await txRepo.deleteById(id);
            setTransactions((prev) => prev.filter(t => t.id !== id));

            const autoBackup = await getSetting('autoBackup');
            if (API_URL && autoBackup !== 'false') {
                await enqueueAndTrigger('transactions', 'delete', id);
            }
        } catch (error) {
            console.error("Error deleting transaction:", error);
            throw error;
        }
    }, [txRepo]);

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
