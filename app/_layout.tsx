import { Stack } from 'expo-router';
import * as Updates from 'expo-updates';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { I18nProvider } from '@/contexts/I18nContext';
import { SubRadarProvider } from '@/contexts/SubRadarContext';

const OTA_RETRY_MS = 2500;
const OTA_ATTEMPTS = 3;

async function pullOtaOnce(): Promise<boolean> {
  if (!Updates.isEnabled) return false;
  try {
    const r = await Updates.checkForUpdateAsync();
    if (!r.isAvailable) return false;
    const fetched = await Updates.fetchUpdateAsync();
    if (!fetched.isNew) return false;
    await Updates.reloadAsync();
    return true;
  } catch {
    return false;
  }
}

async function pullOtaWithRetries(): Promise<void> {
  for (let attempt = 0; attempt < OTA_ATTEMPTS; attempt++) {
    try {
      const reloaded = await pullOtaOnce();
      if (reloaded) return;
      return;
    } catch {
      if (attempt < OTA_ATTEMPTS - 1) {
        await new Promise((res) => setTimeout(res, OTA_RETRY_MS));
      }
    }
  }
}

/** Open app on tab bar, not a redirect route. */
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    if (__DEV__) return;

    void pullOtaWithRetries();

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void (async () => {
        try {
          await pullOtaOnce();
        } catch {
          /* resume: one attempt; user may have toggled network */
        }
      })();
    });

    return () => sub.remove();
  }, []);

  return (
    <I18nProvider>
      <SubRadarProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#F8FAFC',
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: '#0B1220' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="subscription/new"
              options={{
                presentation: 'modal',
                title: '',
                headerShown: true,
                gestureEnabled: true,
                /** Hide previous route name (e.g. "(tabs)" truncated to "tab）") beside the back chevron on iOS. */
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
            <Stack.Screen
              name="subscription/[id]"
              options={{
                title: '',
                headerShown: true,
                /** Custom back lives in screen via <Stack.Screen options /> — hide default chevron. */
                headerBackVisible: false,
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
            <Stack.Screen
              name="email-import"
              options={{
                title: '',
                headerShown: true,
                headerBackButtonDisplayMode: 'minimal',
              }}
            />
        </Stack>
      </SubRadarProvider>
    </I18nProvider>
  );
}
