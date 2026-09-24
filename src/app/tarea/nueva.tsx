import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import type { SQLiteDatabase } from 'expo-sqlite';

import { PickField } from '@/components/pick-field';
import { Screen } from '@/components/screen';
import { getTarea, pad2, saveTarea, todayKey, weekdayOfKey } from '@/lib/db';
import type { Priority, Tarea, TaskType } from '@/lib/schema';
import { DIAS_SEMANA_LABELS, TODOS_LOS_DIAS } from '@/lib/schema';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';
import { pedirPermisoNotificaciones } from '@/lib/notifications';

const COLORES = ['#B39DFF', '#64B5F6', '#F5A623', '#34D399', '#F87171', '#F1B0FF'] as const;
const PRIORIDADES: { value: Priority; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function horaInicial(existente: Tarea | null): Date | null {
  if (!existente?.hora) return null;
  const [hh, mm] = existente.hora.split(':').map(Number);
  return new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), hh, mm);
}

function fechaInicial(existente: Tarea | null): Date {
  if (existente?.tipo === 'general' && existente.fecha) return keyToDate(existente.fecha);
  return new Date();
}

export default function TareaFormScreen() {
  const db = useDB();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;

  const { data: existente } = useDbQuery(
    () => (id ? getTarea(db, id) : Promise.resolve(null)),
    [id]
  );

  if (id && !existente) {
    return (
      <Screen>
        <Text variant="bodyMedium">Buscando tu meta…</Text>
      </Screen>
    );
  }

  return <TareaForm key={id ?? 'nueva'} db={db} id={id} existente={existente ?? null} />;
}

function TareaForm({
  db,
  id,
  existente,
}: {
  db: SQLiteDatabase;
  id: number | null;
  existente: Tarea | null;
}) {
  const theme = useTheme();
  const [titulo, setTitulo] = useState(existente?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '');
  const [tipo, setTipo] = useState<TaskType>(existente?.tipo ?? 'diaria');
  const [diasSemana, setDiasSemana] = useState<number[]>(() => {
    if (existente && existente.diasSemana.length > 0) return existente.diasSemana;
    return [weekdayOfKey(todayKey())];
  });
  const [fecha, setFecha] = useState<Date | null>(() => fechaInicial(existente));
  const [hora, setHora] = useState<Date | null>(() => horaInicial(existente));
  const [prioridad, setPrioridad] = useState<Priority>(existente?.prioridad ?? 'media');
  const [color, setColor] = useState<string>(existente?.color || COLORES[0]);
  const [error, setError] = useState<string | null>(null);

  const toggleDia = (d: number) => {
    setDiasSemana((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const guardar = async () => {
    if (titulo.trim().length === 0) {
      setError('Escribe un título para tu meta.');
      return;
    }
    if (tipo === 'semanal' && diasSemana.length === 0) {
      setError('Selecciona al menos un día de la semana.');
      return;
    }

    setError(null);
    const horaTexto = hora ? `${pad2(hora.getHours())}:${pad2(hora.getMinutes())}` : null;

    await saveTarea(
      db,
      {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        tipo,
        diasSemana: tipo === 'semanal' ? diasSemana : TODOS_LOS_DIAS,
        fecha: tipo === 'general' && fecha ? dateToKey(fecha) : null,
        hora: horaTexto,
        prioridad,
        color,
      },
      id ?? undefined
    );
    if (horaTexto) {
      void pedirPermisoNotificaciones();
    }
    dataChanged();
    router.back();
  };

  return (
    <Screen>
      <TextInput
        label="Título"
        mode="outlined"
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Ej: Meditar 10 minutos"
        style={styles.input}
      />

      <Text variant="labelMedium" style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
        Tipo de meta
      </Text>
      <SegmentedButtons
        value={tipo}
        onValueChange={(v) => {
          setTipo(v as TaskType);
          if (v === 'diaria') setDiasSemana(TODOS_LOS_DIAS);
          else if (v === 'semanal')
            setDiasSemana((prev) => (prev.length === 7 ? [weekdayOfKey(todayKey())] : prev));
        }}
        density="small"
        buttons={[
          { value: 'diaria', label: 'Diaria', icon: 'repeat-variant' },
          { value: 'semanal', label: 'Semanal', icon: 'calendar-week' },
          { value: 'general', label: 'General', icon: 'target' },
        ]}
        style={styles.segmented}
      />

      {tipo !== 'diaria' ? (
        <Text variant="labelSmall" style={[styles.help, { color: theme.colors.onSurfaceVariant }]}>
          {tipo === 'semanal'
            ? 'Se repite cada semana en los días que marques.'
            : 'Meta de una sola vez con fecha límite y subtareas.'}
        </Text>
      ) : null}

      {tipo === 'semanal' ? (
        <View style={styles.diasRow}>
          {DIAS_SEMANA_LABELS.map((label, i) => {
            const activo = diasSemana.includes(i);
            return (
              <Pressable
                key={label}
                onPress={() => toggleDia(i)}
                style={[
                  styles.diaBtn,
                  {
                    backgroundColor: activo ? theme.colors.primary : theme.colors.surfaceVariant,
                    borderColor: activo ? theme.colors.primary : theme.colors.outline,
                  },
                ]}
              >
                <Text
                  variant="titleSmall"
                  style={{ color: activo ? theme.colors.onPrimary : theme.colors.onSurface, fontWeight: '700' }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {tipo === 'general' ? (
        <PickField
          label="Fecha límite"
          icon="calendar"
          value={fecha}
          mode="date"
          onChange={setFecha}
        />
      ) : null}

      <PickField
        label="Hora (opcional)"
        icon="clock-outline"
        value={hora}
        mode="time"
        onChange={setHora}
        onClear={() => setHora(null)}
      />

      <Text variant="labelMedium" style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
        Prioridad
      </Text>
      <View style={styles.chipsRow}>
        {PRIORIDADES.map((p) => (
          <Button
            key={p.value}
            mode={prioridad === p.value ? 'contained' : 'outlined'}
            compact
            onPress={() => setPrioridad(p.value)}
            style={styles.chip}
          >
            {p.label}
          </Button>
        ))}
      </View>

      <Text variant="labelMedium" style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
        Color
      </Text>
      <View style={styles.colorsRow}>
        {COLORES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c },
              color === c && styles.swatchActive,
            ]}
          >
            {color === c ? <MaterialCommunityIcons name="check" size={18} color="#141318" /> : null}
          </Pressable>
        ))}
      </View>

      <TextInput
        label="Descripción (opcional)"
        mode="outlined"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      {error ? (
        <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4 }}>
          {error}
        </Text>
      ) : null}

      <Button
        mode="contained"
        icon={() => <MaterialCommunityIcons name="check" size={18} color={theme.colors.onPrimary} />}
        onPress={guardar}
        style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
      >
        {id ? 'Guardar cambios' : 'Crear meta'}
      </Button>

      {id ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
          Las tareas diarias y semanales marcan cada día; las generales se completan una vez.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { marginBottom: 4 },
  fieldLabel: { marginTop: 14, marginBottom: 6 },
  segmented: { marginBottom: 4 },
  help: { marginTop: 4 },
  diasRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  diaBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1 },
  colorsRow: { flexDirection: 'row', gap: 12 },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: { borderWidth: 2, borderColor: '#ffffff' },
  saveBtn: { marginTop: 20, borderRadius: 10 },
});