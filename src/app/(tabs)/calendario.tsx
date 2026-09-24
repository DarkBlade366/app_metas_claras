import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB, IconButton, Text, useTheme } from 'react-native-paper';

import { CalendarGrid } from '@/components/calendar-grid';
import { Screen } from '@/components/screen';
import { TaskRow } from '@/components/task-row';
import { TYPE_COLORS } from '@/constants/theme';
import {
  getDia,
  getMarcasMes,
  pad2,
  shortDayLabel,
  todayKey,
  toggleTareaEnFecha,
} from '@/lib/db';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';

const TODAY = todayKey();

export default function CalendarioScreen() {
  const theme = useTheme();
  const db = useDB();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(TODAY);

  const marcas = useDbQuery(() => getMarcasMes(db, year, month), [year, month]);
  const dia = useDbQuery(() => getDia(db, selected), [selected]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString('es-CU', {
    month: 'long',
    year: 'numeric',
  });

  const moveMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    const ny = next.getFullYear();
    const nm = next.getMonth();
    setYear(ny);
    setMonth(nm);
    const todaysKey = todayKey();
    const startsWithTodayMonth = `${todaysKey.slice(0, 7)}` === `${ny}-${pad2(nm + 1)}`;
    setSelected(startsWithTodayMonth ? todaysKey : `${ny}-${pad2(nm + 1)}-01`);
  };

  const goToday = () => {
    const t = todayKey();
    const [y, m] = t.split('-').map(Number);
    setYear(y);
    setMonth(m - 1);
    setSelected(t);
  };

  const toggle = async (tareaId: number) => {
    await toggleTareaEnFecha(db, tareaId, selected);
    dataChanged();
  };

  const atrasadas = dia.data?.atrasadas ?? [];
  const pendientes = dia.data?.pendientes ?? [];
  const hechas = dia.data?.hechas ?? [];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={[styles.monthNav, { borderColor: theme.colors.outlineVariant }]}>
          <IconButton icon="chevron-left" size={22} onPress={() => moveMonth(-1)} />
          <View style={styles.monthNavCenter}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
              {monthLabel}
            </Text>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.primary, fontWeight: '600' }}
              onPress={goToday}
            >
              Ir a hoy
            </Text>
          </View>
          <IconButton icon="chevron-right" size={22} onPress={() => moveMonth(1)} />
        </View>

        <View style={[styles.calendarCard, { borderColor: theme.colors.outlineVariant }]}>
          <CalendarGrid
            year={year}
            month={month}
            marks={marcas.data ?? {}}
            selectedKey={selected}
            todayKey={TODAY}
            onSelect={setSelected}
          />
        </View>

        <View style={styles.legend}>
          <LegendDot color={TYPE_COLORS.diaria} label="Diarias" />
          <LegendDot color={TYPE_COLORS.semanal} label="Semanales" />
          <LegendDot color={TYPE_COLORS.general} label="Generales" />
        </View>

        <View style={styles.dayHeader}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            {selected === TODAY ? 'Hoy' : shortDayLabel(selected)}
          </Text>
          {selected !== TODAY ? (
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.primary, fontWeight: '600' }}
              onPress={goToday}
            >
              Ver hoy
            </Text>
          ) : null}
        </View>

        {atrasadas.length === 0 && pendientes.length === 0 && hechas.length === 0 ? (
          <View style={styles.emptyHint}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Sin metas para este día.
            </Text>
          </View>
        ) : null}

        {atrasadas.length > 0 ? (
          <View style={{ gap: 8, marginBottom: 12 }}>
            {atrasadas.map((it) => (
              <TaskRow
                key={it.tarea.id}
                tarea={it.tarea}
                hecha={false}
                atrasada
                subtotal={it.subtotal}
                subhechas={it.subhechas}
                onToggle={() => toggle(it.tarea.id)}
                onPress={() => router.push(`/tarea/${it.tarea.id}`)}
              />
            ))}
          </View>
        ) : null}

        {pendientes.length > 0 ? (
          <View style={{ gap: 8, marginBottom: 12 }}>
            {pendientes.map((it) => (
              <TaskRow
                key={it.tarea.id}
                tarea={it.tarea}
                hecha={false}
                subtotal={it.subtotal}
                subhechas={it.subhechas}
                onToggle={() => toggle(it.tarea.id)}
                onPress={() => router.push(`/tarea/${it.tarea.id}`)}
              />
            ))}
          </View>
        ) : null}

        {hechas.length > 0 ? (
          <View style={{ gap: 8, marginBottom: 12 }}>
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

function LegendDot({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  monthNavCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  calendarCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  legend: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  emptyHint: { paddingVertical: 16, alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});