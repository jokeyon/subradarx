import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS = 'gmail_readonly_access_token';
const KEY_IMPORTED_IDS = '@subradar/gmail_imported_message_ids';

export async function saveGmailAccessToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getGmailAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_ACCESS);
}

export async function clearGmailAccessToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_ACCESS);
}

export async function loadImportedGmailMessageIds(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(KEY_IMPORTED_IDS);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export async function markGmailMessageImported(id: string): Promise<void> {
  const set = await loadImportedGmailMessageIds();
  set.add(id);
  const arr = [...set].slice(-2000);
  await AsyncStorage.setItem(KEY_IMPORTED_IDS, JSON.stringify(arr));
}

const KEY_CUSTOM_KW = '@subradar/email_import_keywords_csv';

export async function loadCustomKeywords(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY_CUSTOM_KW);
  if (!raw?.trim()) return [];
  return raw
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveCustomKeywordsCsv(csv: string): Promise<void> {
  await AsyncStorage.setItem(KEY_CUSTOM_KW, csv);
}
