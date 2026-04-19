import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Renewal } from './types';
import { STORAGE_KEYS } from './constants';

function normalizeRenewal(r: Renewal): Renewal {
  const cancelUrl = typeof r.cancelUrl === 'string' ? r.cancelUrl.trim() : '';
  return {
    ...r,
    cancelUrl: cancelUrl || undefined,
  };
}

export async function loadRenewals(): Promise<Renewal[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.renewals);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Renewal[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => normalizeRenewal(row as Renewal));
  } catch {
    return [];
  }
}

export async function saveRenewals(items: Renewal[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.renewals, JSON.stringify(items));
}

export async function loadDevProFlag(): Promise<boolean> {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.devPro);
  return v === '1';
}

export async function setDevProFlag(on: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.devPro, on ? '1' : '0');
}
