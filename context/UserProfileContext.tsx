import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import { API_URL, setSetting } from "../utils/db";
import { authFetch } from "../utils/apiClient";
import { useAuth } from "./AuthContext";
import { useRepositories } from "./RepositoryContext";
import { useIsLocalAccount } from "../utils/authMode";
import {
  resolveActivePlane,
  normalizeUserProfileResponse,
  ensureCloudProfile,
  apiList,
} from "../utils/apiOnly";

interface UserProfile {
    name: string;
    isFirstRun: boolean;
    initialBalance: number;
    isDarkMode: boolean;
    language: string;
    currency: string;
    decimalPoints: number;
    autoBackup: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
    name: "",
    isFirstRun: true,
    initialBalance: 0,
    isDarkMode: false,
    language: "en",
    currency: "PHP",
    decimalPoints: 2,
    autoBackup: true
};

interface UserProfileData {
    profile: UserProfile | null;
    isLoading: boolean;
}

interface UserProfileActions {
    completeSetup: (name: string, balance: number) => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
    resetProfileToDefaults: () => Promise<void>;
    refetch: () => Promise<void>;
}

const UserProfileDataContext = createContext<UserProfileData | undefined>(undefined);
const UserProfileActionsContext = createContext<UserProfileActions | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const { activeUserId } = useAuth();
    const isLocal = useIsLocalAccount();
    const repos = useRepositories();
    const { profiles: profileRepo } = repos;
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const profileRef = useRef(profile);
    useEffect(() => { profileRef.current = profile; }, [profile]);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            // SPEC-34 CON-01 — plane resolves from store flag with own-state fallback.
            const plane = await resolveActivePlane({
                platformOs: Platform.OS,
                isLocal,
                profileAutoBackup: profileRef.current?.autoBackup,
            });
            if (plane === "api-only") {
                if (API_URL && activeUserId) {
                    const { ok, data } = await apiList("userProfiles", activeUserId);
                    const found = ok
                        ? normalizeUserProfileResponse(data, activeUserId)
                        : null;
                    if (found) {
                        setProfile({ ...DEFAULT_PROFILE, ...found } as UserProfile);
                        return;
                    }
                }
                setProfile(DEFAULT_PROFILE);
                return;
            }

            const local = await profileRepo.getById('default');

              if (!isLocal && API_URL && activeUserId) {
                  const { ok, data } = await apiList("userProfiles", activeUserId);
                  const cloudProfile = ok
                      ? normalizeUserProfileResponse(data, activeUserId)
                      : null;

                   if (cloudProfile) {
                      const merged = { ...DEFAULT_PROFILE, ...cloudProfile } as UserProfile;
                      setProfile(merged);
                      await profileRepo.upsert(merged as UserProfile);
                      await setSetting('autoBackup', String(merged.autoBackup));
                      return;
                  }
             }

            if (local) {
                setProfile({ ...DEFAULT_PROFILE, ...local });
            } else {
                setProfile(DEFAULT_PROFILE);
            }
        } catch (e) {
            console.error("Error fetching profile:", e);
            setProfile(DEFAULT_PROFILE);
        } finally {
            setIsLoading(false);
        }
    }, [activeUserId, profileRepo, isLocal]);

    useEffect(() => {
        if (!activeUserId) {
            setIsLoading(false);
            setProfile(null);
            return;
        }
        fetchProfile();
    }, [activeUserId, fetchProfile]);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>): Promise<boolean> => {
        const currentProfile = profileRef.current;
        if (!currentProfile) return false;
        const newProfile = { ...currentProfile, ...updates };

        // SPEC-34 CON-01/CON-02 — API-only: memory + verified cloud write, no
        // repo I/O; returns whether the cloud write was confirmed.
        const plane = await resolveActivePlane({
            platformOs: Platform.OS,
            isLocal,
            profileAutoBackup: currentProfile.autoBackup,
        });
        if (plane === "api-only") {
            setProfile(newProfile);
            if (!API_URL || !activeUserId) return false;
            try {
                return await ensureCloudProfile(
                    activeUserId,
                    newProfile as unknown as Record<string, unknown>
                );
            } catch (e) {
                console.error("Cloud profile sync error:", e);
                return false;
            }
        }

        await profileRepo.upsert(newProfile as UserProfile);
        setProfile(newProfile);

        if (!isLocal && API_URL && activeUserId) {
            try {
                await authFetch(`userProfiles/${activeUserId}`, {
                    method: "PUT",
                    body: JSON.stringify(newProfile)
                });
            } catch (e) {
                console.error("Cloud profile sync error:", e);
            }
        }
        return true;
    }, [profileRepo, activeUserId, isLocal]);

    const resetProfileToDefaults = useCallback(async () => {
        const currentProfile = profileRef.current;
        if (!currentProfile) return;
        await updateProfile({
            ...DEFAULT_PROFILE,
            name: currentProfile.name,
            isFirstRun: false
        });
    }, [updateProfile]);

    const completeSetup = useCallback(async (name: string, balance: number) => {
        try {
            await updateProfile({
                name,
                initialBalance: balance,
                isFirstRun: false
            });
        } catch (error) {
            console.error("Error completing setup:", error);
            throw error;
        }
    }, [updateProfile]);

    const dataValue = useMemo(() => ({ profile, isLoading }), [profile, isLoading]);

    const actionsValue = useMemo(() => ({
        completeSetup,
        updateProfile,
        resetProfileToDefaults,
        refetch: fetchProfile,
    }), [completeSetup, updateProfile, resetProfileToDefaults, fetchProfile]);

    return (
        <UserProfileDataContext.Provider value={dataValue}>
            <UserProfileActionsContext.Provider value={actionsValue}>
                {children}
            </UserProfileActionsContext.Provider>
        </UserProfileDataContext.Provider>
    );
}

export function useUserProfileData(): UserProfileData {
    const context = useContext(UserProfileDataContext);
    if (!context) {
        throw new Error("useUserProfileData must be used within a UserProfileProvider");
    }
    return context;
}

export function useUserProfileActions(): UserProfileActions {
    const context = useContext(UserProfileActionsContext);
    if (!context) {
        throw new Error("useUserProfileActions must be used within a UserProfileProvider");
    }
    return context;
}

export function useUserProfile(): UserProfileData & UserProfileActions {
    return { ...useUserProfileData(), ...useUserProfileActions() };
}
