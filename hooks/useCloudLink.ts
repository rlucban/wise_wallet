import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuthData } from '../context/AuthContext';
import { isLocalAccountToken } from '../utils/authMode';
import { getDeviceOnline } from '../utils/localGate';

// SPEC-30 CON-04/DEC-01 — all Local promotion entries route to the single
// re-registration flow in Settings ("Register Online Account").
// Web-safe: no Alert (invisible on web), routing only, never auto-navigates.

export function useCloudLink() {
    const { token, activeUserId } = useAuthData();
    const router = useRouter();

    const shouldPrompt =
        isLocalAccountToken(token) && !!activeUserId && getDeviceOnline();

    const goToSettings = useCallback(() => {
        router.push("/(tabs)/settings");
    }, [router]);

    return { isChecking: false, shouldPrompt, goToSettings };
}
