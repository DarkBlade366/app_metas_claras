import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { ProjectCard } from '@/components/project-card';
import { Screen } from '@/components/screen';
import { StatCard } from '@/components/stat-card';
import { useDB, useDbQuery } from '@/lib/db-provider';
import { getMetricasProyectos, getProyectosConStats } from '@/lib/proyectos';
import type { FiltroIssue } from '@/lib/proyectos';

export default function EstadisticaProyectosScreen() {
  const theme = useTheme();
  const db = useDB();
  const metricasQ = useDbQuery(() => getMetricasProyectos(db));
  const proyectosQ = useDbQuery(() => getProyectosConStats(db));

  const m = metricasQ.data;
  const proyectos = proyectosQ.data ?? [];

  const ir = (clave: FiltroIssue) => {
    router.push({ pathname: '/proyectos/estadistica/[clave]', params: { clave } });
  };

  return (
    <Screen>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800', marginBottom: 12 }}>
        Métricas de proyectos
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: -8, marginBottom: 12 }}>
        Resumen de todo lo que tienes por resolver
      </Text>

      <View style={styles.statsRow}>
        <StatCard
          label="Proyectos"
          value={String(m?.totalProyectos ?? 0)}
          sublabel={m && m.totalProyectos > 0 ? `${m.proyectosConIssues} con issues` : 'sin proyectos todavía'}
          icon="briefcase-outline"
          tone="primary"
        />
        <StatCard
          label="Abiertos"
          value={String(m?.abiertos ?? 0)}
          sublabel={m ? `${m.hoy} para hoy` : '…'}
          icon="alert-circle-outline"
          tone="warning"
          onPress={() => ir('abiertos')}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Para hoy"
          value={String(m?.hoy ?? 0)}
          sublabel="issues del día"
          icon="calendar-today"
          tone="warning"
          onPress={() => ir('hoy')}
        />
        <StatCard
          label="Vencidos"
          value={String(m?.vencidos ?? 0)}
          sublabel={m && m.vencidos > 0 ? 'pásalos o re-planea' : 'todo al día'}
          icon="alert"
          tone="danger"
          onPress={() => ir('vencidos')}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Para mañana"
          value={String(m?.manana ?? 0)}
          sublabel="lo próximo en agenda"
          icon="calendar-arrow-right"
          tone="neutral"
          onPress={() => ir('manana')}
        />
        <StatCard
          label="Resueltos"
          value={String(m?.resueltos ?? 0)}
          sublabel="issues cerrados"
          icon="check-circle"
          tone="primary"
          onPress={() => ir('resueltos')}
        />
      </View>

      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800', marginTop: 8, marginBottom: 10 }}>
        Por proyecto
      </Text>
      {proyectos.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="briefcase-outline" size={36} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Crea un proyecto desde la pestaña Proyectos para empezar.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {proyectos.map((p) => (
            <ProjectCard
              key={p.id}
              proyecto={p}
              onPress={() => router.push(`/proyecto/${p.id}`)}
            />
          ))}
        </View>
      )}

      <View style={{ height: 20 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 24 },
});