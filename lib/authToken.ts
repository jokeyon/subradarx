import * as SecureStore from 'expo-secure-store';

const KEY = 'subradar_api_token';

// DISABLED - No cloud sync, no API token needed
// export async function getApiToken(): Promise<string | null> {
//   try {
//     return await SecureStore.getItemAsync(KEY);
//   } catch {
//     return null;
//   }
// }

// export async function setApiToken(token: string | null): Promise<void> {
//   if (token === null) {
//     await SecureStore.deleteItemAsync(KEY);
//     return;
//   }
//   await SecureStore.setItemAsync(KEY, token);
// }

// Placeholder functions to avoid breaking imports
export async function getApiToken(): Promise<null> {
  return null;
}

export async function setApiToken(_token: string | null): Promise<void> {
  // No-op
}
