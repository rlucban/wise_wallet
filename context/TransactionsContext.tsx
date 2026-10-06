import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { Platform } from "react-native";
import { Transaction } from "../types";
import {
    getSetting,
    API_URL
} from "../utils/db";
import { authFetch } from "../utils/apiClient";
import { useAuth } from "./AuthContext";
import { useCategoriesData } from "./CategoriesContext";
import { useUserProfile } from "./UserProfileContext";
import { useSystemAlerts } from "./SystemAlertsContext";
import { useRepositories } from "./RepositoryContext";
import { useIsLocalAccount } from "../utils/authMode";
import { generateUUID } from "../utils/uuid";
import * as FileSystem from 'expo-file-system/legacy';
import { getPrefixedKey, setItem } from "../utils/storage";
import { updateLastSyncedAt } from "../utils/syncQueue";
import { OPENING_BALANCE_CATEGORY_ID } from "../utils/onboardingPayload";
import { resolveTransactionCategory } from "../utils/transactionCategory";

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

export function TransactionsProvider({ children }: { children: ReactNode }) {
    const { activeUserId } = useAuth();
    const { profile } = useUserProfile();
    const isLocal = useIsLocalAccount();
    const { transactions: txRepo, categories: catRepo } = useRepositories();
    // Web rehydrate source is context state, NOT catRepo (SPEC-36: web does no local reads).
    const { categories } = useCategoriesData();
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

    const refreshFromApi = useCallback(async () => {
        if (!API_URL || !activeUserId) return;
        const { ok, data: remoteData } = await authFetch<Transaction[]>(`transactions?userId=${activeUserId}`);
        if (ok && Array.isArray(remoteData)) {
            const cats = await catRepo.getAll();
            setTransactions(remoteData.map((t) => ({ ...t, category: resolveTransactionCategory(t, cats) })));
            const autoBackup = await getSetting('autoBackup');
            if (autoBackup !== 'false') {
                const key = await getPrefixedKey('transactions');
                await setItem(key, remoteData);
                await updateLastSyncedAt();
            }
        }
    }, [activeUserId, catRepo]);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web loads API-direct — no local reads, no merge, no queue.
                if (API_URL && activeUserId) {
                    const { ok, data: remoteData } = await authFetch<Transaction[]>(`transactions?userId=${activeUserId}`);
                    if (ok && Array.isArray(remoteData)) {
                        setTransactions(remoteData.map((t) => ({ ...t, category: resolveTransactionCategory(t, categories) })));
                    }
                }
                return;
            }
            if (isLocal) {
                // Local accounts: AsyncStorage only, zero API calls (SPEC-04, SPEC-45 CON-04).
                const localData = (await txRepo.getAll()).map(addCategoryFallback);
                setTransactions(localData);
                return;
            }
            // Online native: API is truth (SPEC-45 DEC-01/DEC-03). Replace, never merge.
            await refreshFromApi();
        } catch (error) {
            console.error("Error fetching transactions:", error);
        } finally {
            setLoading(false);
        }
    }, [activeUserId, txRepo, isLocal, refreshFromApi, categories]);

    const { checkNegativeBalance } = useSystemAlerts();

    useEffect(() => {
        if (!activeUserId) return;
        fetchTransactions();
    }, [activeUserId, fetchTransactions]);

    useEffect(() => {
        if (!activeUserId || loading) return;
        const initialBalance = Number(profile?.initialBalance || 0);
        const income = transactions
            .filter((t) => t.type === "income" && t.note !== "Initial account setup" && t.category?.id !== OPENING_BALANCE_CATEGORY_ID)
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
                    body: JSON.stringify({ ...uploaded, categoryId: uploaded.category?.id ?? null, userId: activeUserId }),
                });
                if (!ok) {
                    throw new Error("Failed to save transaction. Please check your connection.");
                }
                setTransactions((prev) => [...prev, uploaded]);
                return;
            }

            if (isLocal) {
                await txRepo.upsert(newTransaction);
                setTransactions((prev) => [...prev, newTransaction]);
                return;
            }
            // Online native: API first (SPEC-45 DEC-02). No local repo, no queue.
            const uploaded = await uploadReceiptIfNeeded(newTransaction);
            const { ok } = await authFetch('transactions', {
                method: "POST",
                body: JSON.stringify({ ...uploaded, categoryId: uploaded.category?.id ?? null, userId: activeUserId }),
            });
            if (!ok) {
                throw new Error("Failed to save transaction. Please check your connection.");
            }
            await refreshFromApi();
            return;
        } catch (error) {
            console.error("Error adding transaction:", error);
            throw error;
        }
    }, [txRepo, activeUserId, uploadReceiptIfNeeded, isLocal, refreshFromApi]);

    const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
        try {
            if (isLocal) {
                const item = await txRepo.getById(id);
                if (item) {
                    await txRepo.upsert(sanitizeTransaction({ ...item, ...updates } as Transaction));
                }
                setTransactions((prev) => prev.map(t =>
                    t.id === id ? { ...t, ...updates } : t
                ));
                return;
            }

            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web writes API-direct.
            const updateBody: Record<string, unknown> = { ...updates, userId: activeUserId };
            if (updates.category !== undefined) updateBody.categoryId = updates.category ? updates.category.id : null;
                if (updates.category !== undefined) updateBody.categoryId = updates.category ? updates.category.id : null;
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

            // Online native: API first (SPEC-45 DEC-02).
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
            await refreshFromApi();
            return;
        } catch (error) {
            console.error("Error updating transaction:", error);
            throw error;
        }
    }, [txRepo, activeUserId, isLocal, refreshFromApi]);

    const deleteTransaction = useCallback(async (id: string) => {
        try {
            if (isLocal) {
                await txRepo.deleteById(id);
                setTransactions((prev) => prev.filter(t => t.id !== id));
                return;
            }

            if (Platform.OS === "web") {
                // SPEC-36 CON-W-03 (v1.2): web writes API-direct.
                const { ok } = await authFetch(`transactions/${id}`, { method: "DELETE" });
                if (!ok) {
                    throw new Error("Failed to delete transaction. Please check your connection.");
                }
                setTransactions((prev) => prev.filter(t => t.id !== id));
                return;
            }

            // Online native: API first (SPEC-45 DEC-02).
            const { ok } = await authFetch(`transactions/${id}`, { method: "DELETE" });
            if (!ok) {
                throw new Error("Failed to delete transaction. Please check your connection.");
            }
            await refreshFromApi();
            return;
        } catch (error) {
            console.error("Error deleting transaction:", error);
            throw error;
        }
    }, [txRepo, isLocal, refreshFromApi]);

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
