import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, AppState, AppStateStatus } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthData } from '../context/AuthContext';
import { API_URL } from '../utils/db';
import { useRouter } from 'expo-router';

export function CloudLinkBanner() {
    const { token } = useAuthData();
    const [isVisible, setIsVisible] = useState(false);
    const router = useRouter();
    const appStateRef = useRef(AppState.currentState);

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

    useEffect(() => {
        if (token !== 'offline_token') {
            setIsVisible(false);
            return;
        }

        checkConnection().then((online) => {
            setIsVisible(online);
        });

        const sub = AppState.addEventListener("change", (nextState: AppStateStatus) => {
            if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
                checkConnection().then((online) => {
                    setIsVisible(online);
                });
            }
            appStateRef.current = nextState;
        });

        return () => sub.remove();
    }, [token]);

    if (!isVisible) return null;

    return (
        <View style={styles.banner}>
            <View style={styles.content}>
                <MaterialCommunityIcons name="cloud-sync-outline" size={24} color="#FFF" style={styles.icon} />
                <View style={styles.textContainer}>
                    <Text style={styles.title}>Secure Your Account</Text>
                    <Text style={styles.subtitle}>Link to cloud to enable cross-device sync.</Text>
                </View>
            </View>
            <TouchableOpacity 
                style={styles.button} 
                onPress={() => router.push("/auth")} // Redirect to Auth screen to 're-register' or link
            >
                <Text style={styles.buttonText}>LINK NOW</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        backgroundColor: '#3949ab',
        padding: 16,
        margin: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...Platform.select({
            web: { boxShadow: '0px 4px 12px rgba(57, 73, 171, 0.3)' },
            default: { elevation: 4 }
        })
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    icon: {
        marginRight: 12
    },
    textContainer: {
        flex: 1
    },
    title: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12
    },
    button: {
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 8
    },
    buttonText: {
        color: '#3949ab',
        fontWeight: '800',
        fontSize: 12
    }
});
