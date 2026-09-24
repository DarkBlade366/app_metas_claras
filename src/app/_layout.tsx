import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppThemes } from '@/constants/theme';
import { DBProvider, useDataVersion, useDB } from '@/lib/db-provider';
import { notificacionesActivadas, syncNotificaciones } from '@/lib/notifications';

const DARK_THEME = AppThemes.dark;

const NAV_DARK_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: DARK_THEME.colors.background,
    card: DARK_THEME.colors.surface,
    text: DARK_THEME.colors.onSurface,
    border: DARK_THEME.colors.outlineVariant,
  },
};

function NotificacionesSync() {
  const db = useDB();
  const version = useDataVersion();

  useEffect(() => {
    (async () => {
      // Solo reprograma si el usuario ya dio permiso; nunca molesta solo.
      if (!(await notificacionesActivadas())) return;
      await syncNotificaciones(db);
    })().catch(() => {});
  }, [db, version]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={NAV_DARK_THEME}>
        <DBProvider>
          <PaperProvider theme={DARK_THEME}>
            <StatusBar style="light" />
            <NotificacionesSync />
            <Stack
              screenOptions={{
                headerTitleStyle: { fontWeight: '700' },
                headerTintColor: DARK_THEME.colors.onSurface,
                headerStyle: { backgroundColor: DARK_THEME.colors.surface },
                contentStyle: { backgroundColor: DARK_THEME.colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="tarea/nueva" options={{ title: 'Nueva meta' }} />
              <Stack.Screen name="tarea/[id]" options={{ title: 'Meta' }} />
            </Stack>
          </PaperProvider>
        </DBProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}