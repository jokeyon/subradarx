import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useI18n } from '../../contexts/I18nContext';

export default function TabsLayout() {
  const { t, locale } = useI18n();

  return (
    <Tabs
      key={locale}
      initialRouteName="hub"
      screenOptions={{
        headerStyle: { backgroundColor: '#0F172A' },
        headerTintColor: '#F8FAFC',
        tabBarStyle: { backgroundColor: '#0F172A', borderTopColor: '#1E293B' },
        tabBarActiveTintColor: '#A5B4FC',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen
        name="hub"
        options={{
          title: t('tabs.hub'),
          tabBarLabel: t('tabs.hub'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="layers-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
