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
import { useUserProfileData } from "./UserProfileContext";
import {
  resolveActivePlane,
  apiList,
  apiCreate,
  apiDelete,
} from "../utils/apiOnly";

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
  const { profile } = useUserProfileData();

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      // SPEC-34 CON-01/CON-02 — API-only plane reads live, zero repo I/O.
      const plane = await resolveActivePlane({
        platformOs: Platform.OS,
        isLocal,
        profileAutoBackup: profile?.autoBackup,
      });
      if (plane === "api-only") {
        if (API_URL && activeUserId) {
          const { ok, data } = await apiList("categories", activeUserId);
          if (ok && Array.isArray(data)) {
            setCategories(data as Category[]);
          }
        } else {
          setCategories([]);
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
  }, [activeUserId, catRepo, isLocal, showToast, profile?.autoBackup]);

  useEffect(() => {
    if (!activeUserId) return;
    fetchCategories();
  }, [activeUserId, fetchCategories]);

  const addCategory = useCallback(async (category: Omit<Category, "id">) => {
    try {
      const newCategory = { ...category, id: generateUUID() };
      // SPEC-34 CON-02 — API-only writes straight through.
      const plane = await resolveActivePlane({
        platformOs: Platform.OS,
        isLocal,
        profileAutoBackup: profile?.autoBackup,
      });
      if (plane === "api-only") {
        if (!API_URL || !activeUserId) {
          throw new Error("Cloud unavailable — check your connection.");
        }
        const res = await apiCreate(
          "categories",
          newCategory as unknown as Record<string, unknown>,
          activeUserId
        );
        if (!res.ok) {
          showToast("Couldn't save to cloud. Check your connection and retry.");
          throw new Error(`Cloud create failed (status ${res.status})`);
        }
        const created = (res.data && typeof res.data === "object"
          ? res.data as Category
          : newCategory);
        setCategories((prev) => [...prev, created]);
        return;
      }

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
  }, [catRepo, activeUserId, isLocal, showToast, profile?.autoBackup]);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      // SPEC-34 CON-02 — API-only DELETE straight through.
      const plane = await resolveActivePlane({
        platformOs: Platform.OS,
        isLocal,
        profileAutoBackup: profile?.autoBackup,
      });
      if (plane === "api-only") {
        if (API_URL && activeUserId) {
          const res = await apiDelete("categories", id);
          if (!res.ok) {
            showToast("Couldn't delete from cloud. Check your connection and retry.");
            return;
          }
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
  }, [catRepo, isLocal, activeUserId, showToast, profile?.autoBackup]);

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
