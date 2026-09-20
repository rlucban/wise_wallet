import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { Category } from "../types";
import { API_URL, getSetting } from "../utils/db";
import { authFetch } from "../utils/apiClient";
import { enqueueAndTrigger, processSyncQueue } from "../utils/syncProcessor";
import { useAuth } from "./AuthContext";
import { useRepositories } from "./RepositoryContext";
import { generateUUID } from "../utils/uuid";

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
  const { categories: catRepo } = useRepositories();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const localData = await catRepo.getAll();
      setCategories(localData);

      if (API_URL && activeUserId) {
        const { ok, data } = await authFetch("categories");

        if (ok && Array.isArray(data)) {
          await catRepo.upsertBulk(data);
          setCategories(data);
        }

        processSyncQueue();
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, catRepo]);

  useEffect(() => {
    if (!activeUserId) return;
    fetchCategories();
  }, [activeUserId, fetchCategories]);

  const addCategory = useCallback(async (category: Omit<Category, "id">) => {
    try {
      const newCategory = { ...category, id: generateUUID() };
      await catRepo.upsert(newCategory);
      setCategories((prev) => [...prev, newCategory]);

      const autoBackup = await getSetting('autoBackup');
      if (API_URL && autoBackup !== 'false') {
        const syncData = { ...newCategory, userId: activeUserId };
        await enqueueAndTrigger('categories', 'create', newCategory.id, syncData);
      }
    } catch (error) {
      console.error("Error adding category:", error);
    }
  }, [catRepo, activeUserId]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await catRepo.deleteById(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));

      const autoBackup = await getSetting('autoBackup');
      if (API_URL && autoBackup !== 'false') {
        await enqueueAndTrigger('categories', 'delete', id);
      }
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  }, [catRepo]);

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
