import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { Platform } from "react-native";
import { Category } from "../types";
import { API_URL, getSetting } from "../utils/db";
import { authFetch } from "../utils/apiClient";
import { enqueueAndTrigger, processSyncQueue } from "../utils/syncProcessor";
import { useAuth } from "./AuthContext";
import { useRepositories } from "./RepositoryContext";
import { useIsLocalAccount } from "../utils/authMode";
import { generateUUID } from "../utils/uuid";
import { useToast } from "./ToastContext";

interface CategoriesData {
  categories: Category[];
  loading: boolean;
}

interface CategoriesActions {
  addCategory: (category: Omit<Category, "id">) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const CategoriesDataContext = createContext<CategoriesData | undefined>(undefined);
const CategoriesActionsContext = createContext<CategoriesActions | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { activeUserId } = useAuth();
  const isLocal = useIsLocalAccount();
  const { categories: catRepo } = useRepositories();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      if (Platform.OS === "web") {
        // SPEC-36 CON-W-03 (v1.2): web loads API-direct — no local reads, no merge, no queue.
        if (API_URL && activeUserId) {
          const { ok, data } = await authFetch("categories");
          if (ok && Array.isArray(data)) {
            setCategories(data);
          }
        }
        return;
      }
      const localData = await catRepo.getAll();
      setCategories(localData);

      if (!isLocal && API_URL && activeUserId) {
        const { ok, data } = await authFetch("categories");

        if (ok && Array.isArray(data)) {
          let overwrittenCount = 0;
          for (const remoteCat of data) {
            const localCat = localData.find(c => c.id === remoteCat.id);
            if (localCat && (remoteCat.updatedAt || 0) > (localCat.updatedAt || 0)) {
              overwrittenCount++;
            }
          }
          await catRepo.upsertBulk(data);
          setCategories(data);
          if (overwrittenCount > 0) {
            showToast(`${overwrittenCount} record(s) updated from another device.`);
          }
        }

        processSyncQueue();
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, catRepo, isLocal, showToast]);

  useEffect(() => {
    if (!activeUserId) return;
    fetchCategories();
  }, [activeUserId, fetchCategories]);

  const addCategory = useCallback(async (category: Omit<Category, "id">) => {
    try {
      if (Platform.OS === "web") {
        // SPEC-36 CON-W-03 (v1.2): web writes API-direct — no local repo, no flag gate, no queue.
        const newCategory = { ...category, id: generateUUID() };
        const { ok } = await authFetch("categories", {
          method: "POST",
          body: JSON.stringify({ ...newCategory, userId: activeUserId }),
        });
        if (!ok) {
          throw new Error("Failed to save category. Please check your connection.");
        }
        setCategories((prev) => [...prev, newCategory]);
        return;
      }
      const newCategory = { ...category, id: generateUUID() };
      await catRepo.upsert(newCategory);
      setCategories((prev) => [...prev, newCategory]);

      if (!isLocal) {
        const autoBackup = await getSetting('autoBackup');
        if (API_URL && autoBackup !== 'false') {
          const syncData = { ...newCategory, userId: activeUserId };
          await enqueueAndTrigger('categories', 'create', newCategory.id, syncData);
        }
      }
    } catch (error) {
      console.error("Error adding category:", error);
    }
  }, [catRepo, activeUserId, isLocal]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      if (Platform.OS === "web") {
        // SPEC-36 CON-W-03 (v1.2): web writes API-direct.
        const { ok } = await authFetch(`categories/${id}`, { method: "DELETE" });
        if (!ok) {
          throw new Error("Failed to delete category. Please check your connection.");
        }
        setCategories((prev) => prev.filter((c) => c.id !== id));
        return;
      }
      await catRepo.deleteById(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));

      if (!isLocal) {
        const autoBackup = await getSetting('autoBackup');
        if (API_URL && autoBackup !== 'false') {
          await enqueueAndTrigger('categories', 'delete', id);
        }
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  }, [catRepo, isLocal]);

  const dataValue = useMemo(() => ({
    categories,
    loading,
  }), [categories, loading]);

  const actionsValue = useMemo(() => ({
    addCategory,
    deleteCategory,
    refetch: fetchCategories,
  }), [addCategory, deleteCategory, fetchCategories]);

  return (
    <CategoriesDataContext.Provider value={dataValue}>
      <CategoriesActionsContext.Provider value={actionsValue}>
        {children}
      </CategoriesActionsContext.Provider>
    </CategoriesDataContext.Provider>
  );
}

export function useCategoriesData(): CategoriesData {
  const context = useContext(CategoriesDataContext);
  if (!context) {
    throw new Error("useCategoriesData must be used within a CategoriesProvider");
  }
  return context;
}

export function useCategoriesActions(): CategoriesActions {
  const context = useContext(CategoriesActionsContext);
  if (!context) {
    throw new Error("useCategoriesActions must be used within a CategoriesProvider");
  }
  return context;
}

export function useCategories(): CategoriesData & CategoriesActions {
  return { ...useCategoriesData(), ...useCategoriesActions() };
}
