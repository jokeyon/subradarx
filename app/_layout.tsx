import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nProvider } from '../contexts/I18nContext';
import { SubRadarProvider } from '../contexts/SubRadarContext';

/** Open app on tab bar, not a redirect route. */
export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
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
            name="paywall"
            options={{
              presentation: 'modal',
              title: '',
              headerShown: true,
              gestureEnabled: true,
              headerBackButtonDisplayMode: 'minimal',
            }}
          />
        </Stack>
      </SubRadarProvider>
    </I18nProvider>
  );
}
