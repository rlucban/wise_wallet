import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuthData } from '../context/AuthContext';
import { isLocalAccountToken } from '../utils/authMode';

function getDeviceOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
        return navigator.onLine;
    }
    return true;
}

export function useCloudLink() {
    const { token, activeUserId } = useAuthData();
    const [isChecking, setIsChecking] = useState(false);

    const handleCheck = useCallback(async () => {
        if (!isLocalAccountToken(token)) return;
        if (!getDeviceOnline()) return;

        Alert.alert(
            "Secure Your Data",
            "You are currently using a local-only account. Link it to the cloud to enable cross-device sync and protect your data.",
            [
                { text: "Later", style: "cancel" },
                { text: "Link Now", onPress: () => performLink() }
            ]
        );
    }, [token]);

    useEffect(() => {
        if (isLocalAccountToken(token) && activeUserId) {
            handleCheck();
        }
    }, [token, activeUserId, handleCheck]);

    const performLink = async () => {
        setIsChecking(true);
        Alert.alert("Link to Cloud", "To secure your account, please re-verify your PIN in the settings.");
        setIsChecking(false);
    };

    return { isChecking };
}
