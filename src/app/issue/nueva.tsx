import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import type { SQLiteDatabase } from 'expo-sqlite';

import { PickField } from '@/components/pick-field';
import { Screen } from '@/components/screen';
import { pad2, todayKey } from '@/lib/db';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';
import { getIssue, saveIssue } from '@/lib/proyectos';
import type { Priority, Issue } from '@/lib/schema';

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

export default function IssueFormScreen() {
  const db = useDB();
  const params = useLocalSearchParams<{ proyectoId?: string; id?: string }>();
  const proyectoId = params.proyectoId ? Number(params.proyectoId) : null;
  const id = params.id ? Number(params.id) : null;

  const { data: existente } = useDbQuery(
    () => (id ? getIssue(db, id) : Promise.resolve(null)),
    [id]
  );

  if (id && !existente) {
    return (
      <Screen>
        <Text variant="bodyMedium">Buscando el issue…</Text>
      </Screen>
    );
  }

  return (
    <IssueForm key={id ?? 'nueva'} db={db} id={id} proyectoId={proyectoId} existente={existente ?? null} />
  );
}

function IssueForm({
  db,
  id,
  proyectoId,
  existente,
}: {
  db: SQLiteDatabase;
  id: number | null;
  proyectoId: number | null;
  existente: Issue | null;
}) {
  const theme = useTheme();
  const hoy = todayKey();
  const [titulo, setTitulo] = useState(existente?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '');
  const [prioridad, setPrioridad] = useState<Priority>(existente?.prioridad ?? 'media');
  const [fecha, setFecha] = useState<Date | null>(() =>
    existente?.fechaPlaneada ? keyToDate(existente.fechaPlaneada) : keyToDate(hoy)
  );
  const [error, setError] = useState<string | null>(null);

  if (!proyectoId) {
    return (
      <Screen>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Este issue no tiene proyecto asignado.
        </Text>
      </Screen>
    );
  }

  const guardar = async () => {
    if (titulo.trim().length === 0) {
      setError('Escribe qué tienes que resolver.');
      return;
    }
    setError(null);
    await saveIssue(
      db,
      {
        proyectoId,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        prioridad,
        fechaPlaneada: fecha ? dateToKey(fecha) : null,
      },
      id ?? undefined
    );
    dataChanged();
    router.back();
  };

  return (
    <Screen>
      <TextInput
        label="Qué hay que resolver"
        mode="outlined"
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Ej: Arreglar el login"
        style={styles.input}
      />

      <PickField
        label="Fecha en que piensas resolverlo"
        icon="calendar"
        value={fecha}
        mode="date"
        minimumDate={keyToDate(hoy)}
        onChange={setFecha}
        onClear={() => setFecha(null)}
      />
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
        Lo normal es resolverlo hoy o mañana; puedes elegir otro día o dejarlo sin fecha.
      </Text>

      <Text variant="labelMedium" style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
        Prioridad
      </Text>
      <SegmentedButtons
        value={prioridad}
        onValueChange={(v) => setPrioridad(v as Priority)}
        density="small"
        buttons={PRIORIDADES.map((p) => ({ value: p.value, label: p.label }))}
        style={styles.segmented}
      />

      <TextInput
        label="Detalles (opcional)"
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
        {id ? 'Guardar cambios' : 'Crear issue'}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { marginBottom: 4 },
  fieldLabel: { marginTop: 16, marginBottom: 6 },
  segmented: { marginBottom: 4 },
  saveBtn: { marginTop: 20, borderRadius: 10 },
});