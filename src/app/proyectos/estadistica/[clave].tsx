import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { IssueRow } from '@/components/issue-row';
import { Screen } from '@/components/screen';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';
import { getIssuesFiltrados, getProyecto, toggleIssueResuelto } from '@/lib/proyectos';
import type { IssueConProyecto, FiltroIssue } from '@/lib/proyectos';

const CLAVES: Record<FiltroIssue | 'default', { titulo: string; tono: string }> = {
  abiertos: { titulo: 'Issues abiertos', tono: '#F5A623' },
  hoy: { titulo: 'Para hoy', tono: '#F5A623' },
  manana: { titulo: 'Para mañana', tono: '#64B5F6' },
  vencidos: { titulo: 'Vencidos sin resolver', tono: '#F87171' },
  resueltos: { titulo: 'Resueltos', tono: '#34D399' },
  default: { titulo: 'Issues', tono: '#34D399' },
};

export default function DetalleMetricaScreen() {
  const theme = useTheme();
  const db = useDB();
  const params = useLocalSearchParams<{ clave?: string; proyectoId?: string }>();
  const clave: FiltroIssue =
    params.clave && CLAVES[params.clave as FiltroIssue] ? (params.clave as FiltroIssue) : 'abiertos';
  const proyectoId = params.proyectoId ? Number(params.proyectoId) : undefined;

  const itemsQ = useDbQuery(() => getIssuesFiltrados(db, clave, proyectoId), [clave, proyectoId]);
  const proyectoQ = useDbQuery(
    () => (proyectoId != null ? getProyecto(db, proyectoId) : Promise.resolve(null)),
    [proyectoId]
  );

  const items = itemsQ.data ?? [];
  const info = CLAVES[clave] ?? CLAVES.default;

  const grupos: { nombre: string; id: number | null; issues: IssueConProyecto[] }[] = [];
  for (const it of items) {
    const key = it.proyecto?.id ?? -1;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.id === key) {
      ultimo.issues.push(it);
    } else {
      grupos.push({
        nombre: it.proyecto?.nombre ?? 'Sin proyecto',
        id: it.proyecto?.id ?? null,
        issues: [it],
      });
    }
  }

  const total = items.length;

  return (
    <Screen>
      <View style={styles.hero}>
        <Text variant="titleLarge" style={[styles.valor, { color: info.tono }]}>
          {total}
        </Text>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {info.titulo}
        </Text>
        {proyectoQ.data ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {proyectoQ.data.nombre}
          </Text>
        ) : (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {proyectoId != null ? '' : 'de todos tus proyectos'}
          </Text>
        )}
      </View>

      {grupos.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="check-circle-outline" size={34} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Nada que mostrar aquí por ahora.
          </Text>
        </View>
      ) : (
        grupos.map((g, i) => (
          <View key={i} style={styles.section}>
            {g.id != null ? (
              <Text
                variant="labelLarge"
                style={{ color: theme.colors.primary, fontWeight: '700' }}
                onPress={() => router.push(`/proyecto/${g.id}`)}
              >
                {g.nombre}
              </Text>
            ) : (
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>
                {g.nombre}
              </Text>
            )}
            <View style={{ gap: 8 }}>
              {g.issues.map(({ issue }) => (
                <IssueRow
                  key={issue.id}
                  issue={issue}
                  onToggle={async () => {
                    await toggleIssueResuelto(db, issue.id);
                    dataChanged();
                  }}
                  onPress={() => router.push(`/issue/${issue.id}`)}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 2, marginTop: 8, marginBottom: 20 },
  valor: { fontWeight: '800' },
  section: { gap: 8, marginBottom: 16 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
});