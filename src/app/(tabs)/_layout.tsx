import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useTheme } from 'react-native-paper';

const OUTLINE_ICONS: Record<string, string> = {
  'calendar-check': 'calendar-check-outline',
  'format-list-checks': 'format-list-checks',
  'calendar-month': 'calendar-month-outline',
  briefcase: 'briefcase-outline',
  cog: 'cog-outline',
};

function tabIcon(base: string) {
  return function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
    const name = focused ? base : (OUTLINE_ICONS[base] ?? base);
    return <MaterialCommunityIcons name={name as never} size={size} color={color as string} />;
  };
}

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
        sceneStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: { fontWeight: '700' },
        headerTintColor: theme.colors.onSurface,
        headerStyle: { backgroundColor: theme.colors.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoy',
          tabBarIcon: tabIcon('calendar-check'),
        }}
      />
      <Tabs.Screen
        name="tareas"
        options={{
          title: 'Metas',
          tabBarIcon: tabIcon('format-list-checks'),
        }}
      />
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Calendario',
          tabBarIcon: tabIcon('calendar-month'),
        }}
      />
      <Tabs.Screen
        name="proyectos"
        options={{
          title: 'Proyectos',
          tabBarIcon: tabIcon('briefcase'),
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: 'Ajustes',
          tabBarIcon: tabIcon('cog'),
        }}
      />
    </Tabs>
  );
}