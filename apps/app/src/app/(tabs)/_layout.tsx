import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'today' : 'today-outline'} size={22} color={color as string} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={21} color={color as string} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color as string} /> }}
      />
    </Tabs>
  );
}
