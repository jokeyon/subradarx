import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@subradax_app_locale';

export type AppLocalePreference = 'system' | 'zh' | 'en';

export async function getLocalePreference(): Promise<AppLocalePreference> {
  const v = await AsyncStorage.getItem(KEY);
  if (v === 'zh' || v === 'en' || v === 'system') return v;
  return 'system';
}

export async function setLocalePreference(pref: AppLocalePreference): Promise<void> {
  await AsyncStorage.setItem(KEY, pref);
}
