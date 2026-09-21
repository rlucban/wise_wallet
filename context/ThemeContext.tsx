import React, { createContext, useContext, useMemo, useCallback, useRef, ReactNode } from "react";
import { useColorScheme } from "react-native";
import {
    MD3LightTheme,
    MD3DarkTheme,
    MD3Theme
} from "react-native-paper";

// Navigation theme placeholder — replaced by react-navigation migration
const DefaultNavTheme = {
    colors: {
        background: '#FFFFFF',
        card: '#FFF',
        border: '#F2F2F2',
        error: '#D50000',
        primary: '#424242',
        onPrimary: '#FFF',
        onBackground: '#000',
        onSurface: '#000',
        outline: '#848484',
        onOutline: '#1A1A1A',
    },
    dark: false,
};

const DarkNavTheme = {
    colors: {
        background: '#1B1B1D',
        card: '#252527',
        border: '#353537',
        error: '#EF4444',
        primary: '#A0A0B0',
        onPrimary: '#FFFFFF',
        onBackground: '#FFFFFF',
        onSurface: '#F5F5F5',
        outline: '#545458',
        onOutline: '#F5F5F5',
    },
    dark: true,
};

interface ThemeData {
    isDarkMode: boolean;
    theme: MD3Theme;
}

interface ThemeActions {
    toggleTheme: () => void;
}

const ThemeDataContext = createContext<ThemeData | undefined>(undefined);
const ThemeActionsContext = createContext<ThemeActions | undefined>(undefined);

import { useUserProfile } from "./UserProfileContext";

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { profile, updateProfile } = useUserProfile();
    const systemColorScheme = useColorScheme();

    const isDarkMode = profile ? profile.isDarkMode : systemColorScheme === 'dark';

    const isDarkModeRef = useRef(isDarkMode);
    isDarkModeRef.current = isDarkMode;

    const toggleTheme = useCallback(() => {
        updateProfile({ isDarkMode: !isDarkModeRef.current });
    }, [updateProfile]);

    // Merge our custom theme colors into MD3
    const CustomLightTheme = {
        ...MD3LightTheme,
        colors: {
            ...MD3LightTheme.colors,
            primary: '#1B3F7A',
            onPrimary: '#FFFFFF',
            primaryContainer: '#D6E4FF',
            onPrimaryContainer: '#001D3D',
            secondary: '#2D9CDB',
            onSecondary: '#FFFFFF',
            secondaryContainer: '#C8E6FF',
            onSecondaryContainer: '#001F2A',
            tertiary: '#27AE60',
            onTertiary: '#FFFFFF',
            tertiaryContainer: '#A7F5C5',
            onTertiaryContainer: '#002110',
            error: '#D32F2F',
            onError: '#FFFFFF',
            errorContainer: '#FFDAD4',
            onErrorContainer: '#410001',
        },
    };

    const CustomDarkTheme = {
        ...MD3DarkTheme,
        colors: {
            ...MD3DarkTheme.colors,
            primary: '#4A90D9',
            onPrimary: '#001F4D',
            primaryContainer: '#003580',
            secondary: '#56CCF2',
            background: '#0D1117',
            surface: '#161B22',
            onBackground: '#E6EDF3',
            onSurface: '#E6EDF3',
        },
    };

    const theme = isDarkMode ? CustomDarkTheme : CustomLightTheme;

    const dataValue = useMemo(() => ({
        isDarkMode,
        theme,
    }), [isDarkMode, theme]);

    const actionsValue = useMemo(() => ({
        toggleTheme,
    }), [toggleTheme]);

    return (
        <ThemeDataContext.Provider value={dataValue}>
            <ThemeActionsContext.Provider value={actionsValue}>
                {children}
            </ThemeActionsContext.Provider>
        </ThemeDataContext.Provider>
    );
}

export function useThemeData(): ThemeData {
    const context = useContext(ThemeDataContext);
    if (!context) {
        throw new Error("useThemeData must be used within a ThemeProvider");
    }
    return context;
}

export function useThemeActions(): ThemeActions {
    const context = useContext(ThemeActionsContext);
    if (!context) {
        throw new Error("useThemeActions must be used within a ThemeProvider");
    }
    return context;
}

export function useAppTheme(): ThemeData & ThemeActions {
    return { ...useThemeData(), ...useThemeActions() };
}
