import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, FAB, SegmentedButtons, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/screen';
import { TaskRow } from '@/components/task-row';
import { getTareasConEstado, todayKey, toggleTareaEnFecha } from '@/lib/db';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';
import type { TareaDelDia } from '@/lib/db';
import type { TaskType } from '@/lib/schema';

type Filtro = 'todas' | TaskType;

const GRUPO_ORDEN: Record<TaskType, number> = { diaria: 0, semanal: 1, puntual: 2, general: 3 };

export default function TareasScreen() {
  const theme = useTheme();
  const db = useDB();
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const { data } = useDbQuery(() => getTareasConEstado(db));

  const items = useMemo(() => {
    if (!data) return [];
    return data.filter((it) => filtro === 'todas' || it.tarea.tipo === filtro);
  }, [data, filtro]);

  const pendientes = useMemo(() => items.filter((it) => !it.hecha), [items]);
  const hechas = useMemo(() => items.filter((it) => it.hecha), [items]);

  const groups = useMemo(() => {
    const sinCompletadas: { tipo: TaskType; lista: TareaDelDia[] }[] = [];
    const porTipo = new Map<TaskType, TareaDelDia[]>();
    for (const it of [...pendientes]) {
      if (!porTipo.has(it.tarea.tipo)) porTipo.set(it.tarea.tipo, []);
      porTipo.get(it.tarea.tipo)!.push(it);
    }
    for (const [tipo, lista] of porTipo.entries()) {
      lista.sort((a, b) => a.tarea.titulo.localeCompare(b.tarea.titulo));
      sinCompletadas.push({ tipo, lista });
    }
    sinCompletadas.sort((a, b) => GRUPO_ORDEN[a.tipo] - GRUPO_ORDEN[b.tipo]);
    return sinCompletadas;
  }, [pendientes]);

  const toggle = async (tareaId: number) => {
    await toggleTareaEnFecha(db, tareaId, todayKey());
    dataChanged();
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            Tus metas
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {data ? `${pendientes.length} pendientes · ${hechas.length} hechas hoy` : 'Cargando…'}
          </Text>
        </View>

        <SegmentedButtons
          value={filtro}
          onValueChange={(v) => setFiltro(v as Filtro)}
          buttons={[
            { value: 'todas', label: 'Todas' },
            { value: 'diaria', label: 'Diarias', icon: 'repeat-variant' },
            { value: 'semanal', label: 'Semanales', icon: 'calendar-week' },
            { value: 'puntual', label: 'Día', icon: 'calendar-star' },
            { value: 'general', label: 'Generales', icon: 'target' },
          ]}
          style={styles.segmented}
        />

        {groups.length === 0 && hechas.length === 0 ? (
          <View style={styles.emptyHint}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={34} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {filtro === 'todas'
                ? 'Aún no tienes metas. Crea tu primera meta con el botón +.'
                : 'No hay metas de este tipo todavía.'}
            </Text>
          </View>
        ) : null}

        {groups.map((g) => (
          <View key={g.tipo} style={styles.section}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {g.tipo === 'diaria'
                ? 'Diarias'
                : g.tipo === 'semanal'
                  ? 'Semanales'
                  : g.tipo === 'puntual'
                    ? 'Día específico'
                    : 'Generales'}
            </Text>
            <View style={{ gap: 8 }}>
              {g.lista.map((it) => (
                <TaskRow
                  key={it.tarea.id}
                  tarea={it.tarea}
                  hecha={it.hecha}
                  subtotal={it.subtotal}
                  subhechas={it.subhechas}
                  onToggle={() => toggle(it.tarea.id)}
                  onPress={() => router.push(`/tarea/${it.tarea.id}`)}
                />
              ))}
            </View>
          </View>
        ))}

        {hechas.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.doneHeader}>
              <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>
                Completadas
              </Text>
              <Badge style={styles.doneBadge}>{hechas.length}</Badge>
            </View>
            <View style={{ gap: 8 }}>
              {hechas.map((it) => (
                <TaskRow
                  key={it.tarea.id}
                  tarea={it.tarea}
                  hecha
                  subtotal={it.subtotal}
                  subhechas={it.subhechas}
                  onToggle={() => toggle(it.tarea.id)}
                  onPress={() => router.push(`/tarea/${it.tarea.id}`)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </Screen>
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/tarea/nueva')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 2, marginBottom: 12 },
  segmented: { marginBottom: 16 },
  section: { gap: 8, marginBottom: 16 },
  doneHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneBadge: { alignSelf: 'center' },
  emptyHint: { alignItems: 'center', gap: 10, paddingVertical: 40, paddingHorizontal: 24 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});