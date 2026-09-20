import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { initDb, initMasterDb, setOnFatalError } from '../utils/db';

const DbRecoveryContext = createContext<{
  triggerRecovery: () => void;
}>({
  triggerRecovery: () => {},
});

export const useDbRecovery = () => useContext(DbRecoveryContext);

export const DbRecoveryProvider = ({ children }: { children: React.ReactNode }) => {
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    setOnFatalError(() => {
      setIsRecovering(true);
    });
  }, []);

  const triggerRecovery = useCallback(() => {
    setIsRecovering(true);
  }, []);

  useEffect(() => {
    if (isRecovering) {
      const performRecovery = async () => {
        try {
          console.warn("Self-Healing: Starting database recovery sequence...");
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.clear();

          await initMasterDb();
          await initDb();
          console.info("Self-Healing: Recovery successful.");
        } catch (e) {
          console.error("Self-Healing: Recovery sequence failed", e);
        } finally {
          setIsRecovering(false);
        }
      };
      performRecovery();
    }
  }, [isRecovering]);

  const value = useMemo(() => ({ triggerRecovery }), [triggerRecovery]);

  if (isRecovering) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.title}>Recovering App State...</Text>
        <Text style={styles.subtitle}>Healing database connections and restoring stability.</Text>
      </View>
    );
  }

  return (
    <DbRecoveryContext.Provider value={value}>
      {children}
    </DbRecoveryContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  title: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
