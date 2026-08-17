import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuthData } from '../context/AuthContext';
import { API_URL } from '../utils/db';

export function useCloudLink() {
    const { token, activeUserId } = useAuthData();
    const [isChecking, setIsChecking] = useState(false);

    const checkConnection = async () => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
        try {
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 2000)
            );
            const response = await Promise.race([
                fetch(`${API_URL}/system/health`), 
                timeout
            ]) as Response;
            return response.ok;
        } catch {
            return false;
        }
    };

    const handleCheck = useCallback(async () => {
        const isOnline = await checkConnection();
        if (!isOnline) return;

        // User is online and on an offline account
        Alert.alert(
            "Secure Your Data",
            "You are currently using a local-only account. Link it to the cloud to enable cross-device sync and protect your data.",
            [
                { text: "Later", style: "cancel" },
                { text: "Link Now", onPress: () => performLink() }
            ]
        );
    }, []);

    useEffect(() => {
        if (token === 'offline_token' && activeUserId) {
            handleCheck();
        }
    }, [token, activeUserId, handleCheck]);

    const performLink = async () => {
        setIsChecking(true);
        // In a real app, we'd need to ask for their PIN again or use the cached one.
        // For this demo, we'll assume we can't 'upgrade' without a credentials verify.
        // But for pragmatism, we'll redirect them to a special 'Upgrade' screen 
        // or just reuse the handleRegister logic if we had their password.
        
        Alert.alert("Link to Cloud", "To secure your account, please re-verify your PIN in the settings.");
        setIsChecking(false);
    };

    return { isChecking };
}
