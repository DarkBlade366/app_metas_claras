import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';

import { Screen } from '@/components/screen';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';
import { getProyecto, saveProyecto } from '@/lib/proyectos';
import type { Proyecto } from '@/lib/proyectos';
import type { Priority } from '@/lib/schema';

const PRIORIDADES: { value: Priority; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

export default function ProyectoFormScreen() {
  const db = useDB();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;

  const { data: existente } = useDbQuery(
    () => (id ? getProyecto(db, id) : Promise.resolve(null)),
    [id]
  );

  if (id && !existente) {
    return (
      <Screen>
        <Text variant="bodyMedium">Buscando el proyecto…</Text>
      </Screen>
    );
  }

  return <ProyectoForm key={id ?? 'nueva'} db={db} id={id} existente={existente ?? null} />;
}

function ProyectoForm({
  db,
  id,
  existente,
}: {
  db: ReturnType<typeof useDB>;
  id: number | null;
  existente: Proyecto | null;
}) {
  const theme = useTheme();
  const [nombre, setNombre] = useState(existente?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(existente?.descripcion ?? '');
  const [prioridad, setPrioridad] = useState<Priority>(existente?.prioridad ?? 'media');
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (nombre.trim().length === 0) {
      setError('Ponle un nombre a tu proyecto.');
      return;
    }
    setError(null);
    await saveProyecto(db, { nombre: nombre.trim(), descripcion: descripcion.trim() || null, prioridad }, id ?? undefined);
    dataChanged();
    router.back();
  };

  return (
    <Screen>
      <TextInput
        label="Nombre"
        mode="outlined"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Ej: App Finanzas"
        style={styles.input}
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
        {id ? 'Guardar cambios' : 'Crear proyecto'}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { marginBottom: 4 },
  fieldLabel: { marginTop: 14, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: { flex: 1 },
  saveBtn: { marginTop: 20, borderRadius: 10 },
});