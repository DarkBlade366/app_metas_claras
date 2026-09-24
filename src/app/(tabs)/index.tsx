import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, IconButton, Text, useTheme } from 'react-native-paper';

import { AppLogo } from '@/components/app-logo';
import { Screen } from '@/components/screen';
import { TaskRow } from '@/components/task-row';
import { addDaysToKey, dayLabel, getDia, todayKey, toggleTareaEnFecha } from '@/lib/db';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';

export default function HoyScreen() {
  const theme = useTheme();
  const db = useDB();
  const [selectedDay, setSelectedDay] = useState(todayKey());

  const dia = useDbQuery(() => getDia(db, selectedDay), [selectedDay]);

  const isToday = selectedDay === todayKey();
  const pendientes = dia.data?.pendientes ?? [];
  const hechas = dia.data?.hechas ?? [];
  const atrasadas = dia.data?.atrasadas ?? [];
  const total = pendientes.length + hechas.length;
  const completadas = hechas.length;
  const avance = total > 0 ? completadas / total : 0;

  const toggle = async (tareaId: number) => {
    await toggleTareaEnFecha(db, tareaId, selectedDay);
    dataChanged();
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <AppLogo />
          <View style={styles.headerTitle}>
            <Text variant="headlineSmall" style={{ fontWeight: '800', color: theme.colors.onSurface }}>
              Metas Claras
            </Text>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Tus metas, tu día, algo de orden
            </Text>
          </View>
        </View>

        <View style={[styles.dayNav, { borderColor: theme.colors.outlineVariant }]}>
          <IconButton
            icon="chevron-left"
            size={22}
            onPress={() => setSelectedDay((k) => addDaysToKey(k, -1))}
          />
          <View style={styles.dayNavCenter}>
            <Text
              variant="titleSmall"
              numberOfLines={1}
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              {isToday ? 'Hoy' : dayLabel(selectedDay)}
            </Text>
            {isToday ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {dayLabel(selectedDay)}
              </Text>
            ) : (
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.primary, fontWeight: '600' }}
                onPress={() => setSelectedDay(todayKey())}
              >
                Volver a hoy
              </Text>
            )}
          </View>
          <IconButton
            icon="chevron-right"
            size={22}
            onPress={() => setSelectedDay((k) => addDaysToKey(k, 1))}
          />
        </View>

        <View style={[styles.progressCard, { borderColor: theme.colors.outlineVariant }]}>
          <View style={styles.progressTop}>
            <View style={styles.progressTopText}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                {total === 0 ? 'Sin metas este día' : `${completadas} de ${total} completadas`}
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {total - completadas > 0
                  ? `Te faltan ${total - completadas} por cumplir`
                  : total > 0
                    ? '¡Todo listo, día cumplido!'
                    : 'Todo claro por hoy'}
              </Text>
            </View>
            <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '800' }}>
              {Math.round(avance * 100)}%
            </Text>
          </View>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.colors.primary, width: `${Math.min(avance * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        {atrasadas.length > 0 ? (
          <View style={styles.section}>
            <Text variant="labelLarge" style={{ color: theme.colors.error, fontWeight: '700' }}>
              Atrasadas
            </Text>
            <View style={{ gap: 8 }}>
              {atrasadas.map((item) => (
                <TaskRow
                  key={item.tarea.id}
                  tarea={item.tarea}
                  hecha={false}
                  atrasada
                  subtotal={item.subtotal}
                  subhechas={item.subhechas}
                  onToggle={() => toggle(item.tarea.id)}
                  onPress={() => router.push(`/tarea/${item.tarea.id}`)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {pendientes.length > 0 ? (
          <View style={styles.section}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>
              Por hacer
            </Text>
            <View style={{ gap: 8 }}>
              {pendientes.map((item) => (
                <TaskRow
                  key={item.tarea.id}
                  tarea={item.tarea}
                  hecha={false}
                  subtotal={item.subtotal}
                  subhechas={item.subhechas}
                  onToggle={() => toggle(item.tarea.id)}
                  onPress={() => router.push(`/tarea/${item.tarea.id}`)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {hechas.length > 0 ? (
          <View style={styles.section}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>
              Completadas
            </Text>
            <View style={{ gap: 8 }}>
              {hechas.map((item) => (
                <TaskRow
                  key={item.tarea.id}
                  tarea={item.tarea}
                  hecha
                  subtotal={item.subtotal}
                  subhechas={item.subhechas}
                  onToggle={() => toggle(item.tarea.id)}
                  onPress={() => router.push(`/tarea/${item.tarea.id}`)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {total === 0 && atrasadas.length === 0 ? (
          <View style={styles.emptyHint}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              No tienes metas para este día. Crea una nueva para empezar.
            </Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerTitle: { flex: 1 },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  dayNavCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  progressCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12, marginBottom: 16 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTopText: { gap: 2, flex: 1 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  section: { gap: 8, marginBottom: 16 },
  emptyHint: { padding: 24, alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});