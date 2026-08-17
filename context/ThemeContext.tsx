import React, { createContext, useContext, useMemo, useCallback, useRef, ReactNode } from "react";
import { useColorScheme } from "react-native";
import {
    MD3LightTheme,
    MD3DarkTheme,
    adaptNavigationTheme,
    MD3Theme
} from "react-native-paper";
import {
    DefaultTheme as NavigationDefaultTheme,
    DarkTheme as NavigationDarkTheme,
    Theme as NavigationTheme
} from "@react-navigation/native";
import merge from "deepmerge";

const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
});

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
        background: '#F4F6FA',
        onBackground: '#1A1A2E',
        surface: '#FFFFFF',
        onSurface: '#1A1A2E',
        surfaceVariant: '#E8EDF5',
        onSurfaceVariant: '#3A3E4A',
        outline: '#9098A8',
        outlineVariant: '#D0D5E0',
        inverseSurface: '#2E3140',
        inverseOnSurface: '#F0F2F8',
        inversePrimary: '#AAC7FF',
        elevation: {
            level0: 'transparent',
            level1: '#F4F6FA',
            level2: '#EFF2F8',
            level3: '#EAEEF5',
            level4: '#E7ECF3',
            level5: '#E3E9F1',
        },
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

const CombinedDefaultTheme = {
    ...merge(LightTheme, CustomLightTheme),
    roundness: 3,
};
const CombinedDarkTheme = {
    ...merge(DarkTheme, CustomDarkTheme),
    roundness: 3,
};

interface ThemeData {
    isDarkMode: boolean;
    theme: MD3Theme & NavigationTheme;
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

    const theme = isDarkMode ? CombinedDarkTheme : CombinedDefaultTheme;

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
