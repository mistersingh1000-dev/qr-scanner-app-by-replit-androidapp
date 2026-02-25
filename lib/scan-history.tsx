import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const STORAGE_KEY = '@qr_scan_history';

export type ScanType = 'url' | 'text' | 'email' | 'phone' | 'wifi' | 'unknown';

export interface ScanItem {
  id: string;
  data: string;
  type: ScanType;
  timestamp: number;
}

interface ScanHistoryContextValue {
  history: ScanItem[];
  addScan: (data: string) => Promise<ScanItem>;
  removeScan: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  isLoading: boolean;
}

const ScanHistoryContext = createContext<ScanHistoryContextValue | null>(null);

function detectScanType(data: string): ScanType {
  const trimmed = data.trim();
  if (/^https?:\/\//i.test(trimmed) || /^www\./i.test(trimmed)) return 'url';
  if (/^mailto:/i.test(trimmed) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
  if (/^tel:/i.test(trimmed) || /^\+?\d[\d\s\-()]{6,}$/.test(trimmed)) return 'phone';
  if (/^WIFI:/i.test(trimmed)) return 'wifi';
  if (trimmed.length > 0) return 'text';
  return 'unknown';
}

export function ScanHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<ScanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load scan history:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveHistory(items: ScanItem[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save scan history:', e);
    }
  }

  const addScan = useCallback(async (data: string): Promise<ScanItem> => {
    const newItem: ScanItem = {
      id: Crypto.randomUUID(),
      data,
      type: detectScanType(data),
      timestamp: Date.now(),
    };
    const updated = [newItem, ...history];
    setHistory(updated);
    await saveHistory(updated);
    return newItem;
  }, [history]);

  const removeScan = useCallback(async (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    await saveHistory(updated);
  }, [history]);

  const clearHistory = useCallback(async () => {
    setHistory([]);
    await saveHistory([]);
  }, []);

  const value = useMemo(() => ({
    history,
    addScan,
    removeScan,
    clearHistory,
    isLoading,
  }), [history, addScan, removeScan, clearHistory, isLoading]);

  return (
    <ScanHistoryContext.Provider value={value}>
      {children}
    </ScanHistoryContext.Provider>
  );
}

export function useScanHistory() {
  const context = useContext(ScanHistoryContext);
  if (!context) {
    throw new Error('useScanHistory must be used within a ScanHistoryProvider');
  }
  return context;
}
