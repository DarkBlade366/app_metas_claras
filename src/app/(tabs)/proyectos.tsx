import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { FAB, IconButton, Text, useTheme } from 'react-native-paper';

import { AppLogo } from '@/components/app-logo';
import { ProjectCard } from '@/components/project-card';
import { Screen } from '@/components/screen';
import { getProyectosConStats } from '@/lib/proyectos';
import { useDB, useDbQuery } from '@/lib/db-provider';

export default function ProyectosScreen() {
  const theme = useTheme();
  const db = useDB();
  const { data } = useDbQuery(() => getProyectosConStats(db));

  const todos = data ?? [];
  const activos = todos.filter((p) => p.estado === 'activo');
  const cerrados = todos.filter((p) => p.estado !== 'activo');

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <AppLogo />
          <View style={styles.headerTitle}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
              Proyectos
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Organiza los issues que quieres resolver
            </Text>
          </View>
          <IconButton
            icon="chart-box-outline"
            size={24}
            iconColor={theme.colors.primary}
            onPress={() => router.push('/proyectos/estadistica')}
            accessibilityLabel="Métricas de proyectos"
          />
        </View>

        {todos.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="briefcase-outline" size={40} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Aún no tienes proyectos. Crea el primero con el botón +.
            </Text>
          </View>
        ) : (
          <>
            {activos.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginVertical: 24 }}>
                No tienes proyectos en marcha. ¡Reabre uno o crea otro!
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {activos.map((p) => (
                  <ProjectCard
                    key={p.id}
                    proyecto={p}
                    onPress={() => router.push(`/proyecto/${p.id}`)}
                  />
                ))}
              </View>
            )}

            {cerrados.length > 0 ? (
              <>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 20, marginBottom: 8 }}>
                  Completados y cancelados
                </Text>
                <View style={{ gap: 10 }}>
                  {cerrados.map((p) => (
                    <ProjectCard
                      key={p.id}
                      proyecto={p}
                      onPress={() => router.push(`/proyecto/${p.id}`)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </Screen>
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/proyecto/nueva')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerTitle: { flex: 1 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 24 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});