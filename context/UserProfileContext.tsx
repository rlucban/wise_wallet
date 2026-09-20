import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react";
import { API_URL, setSetting } from "../utils/db";
import { authFetch } from "../utils/apiClient";
import { useAuth } from "./AuthContext";
import { useRepositories } from "./RepositoryContext";

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
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    resetProfileToDefaults: () => Promise<void>;
    refetch: () => Promise<void>;
}

const UserProfileDataContext = createContext<UserProfileData | undefined>(undefined);
const UserProfileActionsContext = createContext<UserProfileActions | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const { activeUserId } = useAuth();
    const repos = useRepositories();
    const { profiles: profileRepo } = repos;
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const profileRef = useRef(profile);
    useEffect(() => { profileRef.current = profile; }, [profile]);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const local = await profileRepo.getById('default');

              if (API_URL && activeUserId) {
                  const { ok, data: cloudProfile } = await authFetch(`userProfiles?userId=${activeUserId}`);

                   if (ok && cloudProfile && (cloudProfile as Record<string, unknown>).name) {
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
    }, [activeUserId, profileRepo]);

    useEffect(() => {
        if (!activeUserId) {
            setIsLoading(false);
            setProfile(null);
            return;
        }
        fetchProfile();
    }, [activeUserId, fetchProfile]);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        const currentProfile = profileRef.current;
        if (!currentProfile) return;
        const newProfile = { ...currentProfile, ...updates };

        await profileRepo.upsert(newProfile as UserProfile);
        setProfile(newProfile);

        if (API_URL && activeUserId) {
            try {
                await authFetch(`userProfiles/${activeUserId}`, {
                    method: "PUT",
                    body: JSON.stringify(newProfile)
                });
            } catch (e) {
                console.error("Cloud profile sync error:", e);
            }
        }
    }, [profileRepo, activeUserId]);

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
