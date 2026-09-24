import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput, useTheme } from 'react-native-paper';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Screen } from '@/components/screen';
import {
  addSubtarea,
  deleteSubtarea,
  deleteTarea,
  dayLabel,
  getLogro,
  getSubtareas,
  getTarea,
  toggleSubtarea,
  toggleTareaEnFecha,
  todayKey,
  weekdayNames,
} from '@/lib/db';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';

const PRIORIDAD_LABEL: Record<string, string> = {
  alta: 'Prioridad alta',
  media: 'Prioridad media',
  baja: 'Prioridad baja',
};

export default function TareaDetailScreen() {
  const theme = useTheme();
  const db = useDB();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tareaId = Number(id);
  const hoy = todayKey();

  const [nuevaSubtarea, setNuevaSubtarea] = useState('');
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const tareaQ = useDbQuery(() => getTarea(db, tareaId), [tareaId]);
  const subsQ = useDbQuery(() => getSubtareas(db, tareaId), [tareaId]);
  const logroHoyQ = useDbQuery(() => getLogro(db, tareaId, hoy), [tareaId]);

  const tarea = tareaQ.data;
  const subtareas = subsQ.data ?? [];

  const hechasHome = subtareas.filter((s) => s.hecha).length;

  if (!tarea) {
    return (
      <Screen>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {tareaQ.error ? 'No se pudo cargar la meta.' : 'Buscando tu meta…'}
        </Text>
      </Screen>
    );
  }

  const recurrencia =
    tarea.tipo === 'diaria'
      ? 'Todos los días'
      : tarea.tipo === 'semanal'
        ? `Cada ${weekdayNames(tarea.diasSemana)}`
        : tarea.fecha
          ? `Con vencimiento el ${dayLabel(tarea.fecha)}`
          : 'Sin fecha';

  const marcarHoy = async () => {
    await toggleTareaEnFecha(db, tarea.id, hoy);
    dataChanged();
  };

  const agregarSubtarea = async () => {
    const t = nuevaSubtarea.trim();
    if (!t) return;
    await addSubtarea(db, tarea.id, t);
    setNuevaSubtarea('');
    dataChanged();
  };

  const borrar = async () => {
    setConfirmarBorrar(false);
    await deleteTarea(db, tarea.id);
    dataChanged();
    router.back();
  };

  const yaHechaHoy = tarea.tipo === 'general' ? tarea.completada : logroHoyQ.data === true;

  return (
    <Screen>
      <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
        <View style={[styles.strip, { backgroundColor: tarea.color }]} />
        <Card.Content>
          <View style={styles.titleRow}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '800', flex: 1 }}>
              {tarea.titulo}
            </Text>
          </View>
          {tarea.descripcion ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              {tarea.descripcion}
            </Text>
          ) : null}

          <View style={styles.badges}>
            <Badge icon="repeat-variant" text={tarea.tipo === 'general' ? 'General' : 'Recurrente'} color={theme.colors.primary} />
            <Badge
              icon={tarea.tipo === 'general' ? 'target' : 'calendar-week'}
              text={recurrencia}
              color={theme.colors.onSurfaceVariant}
            />
            {tarea.hora ? (
              <Badge icon="clock-outline" text={`${tarea.hora}`} color={theme.colors.onSurfaceVariant} />
            ) : null}
            <Badge
              icon={
                tarea.prioridad === 'alta'
                  ? 'alert'
                  : tarea.prioridad === 'baja'
                    ? 'arrow-down-circle-outline'
                    : 'minus-circle-outline'
              }
              text={PRIORIDAD_LABEL[tarea.prioridad]}
              color={
                tarea.prioridad === 'alta'
                  ? theme.colors.error
                  : tarea.prioridad === 'baja'
                    ? theme.colors.secondary
                    : theme.colors.onSurfaceVariant
              }
            />
          </View>

          {subtareas.length > 0 ? (
            <>
              <Divider style={styles.divider} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Subtareas: {hechasHome} de {subtareas.length} hechas
              </Text>
            </>
          ) : null}
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon={({ color }) => (
          <MaterialCommunityIcons
            name={yaHechaHoy ? 'undo' : 'check'}
            size={18}
            color={color}
          />
        )}
        onPress={marcarHoy}
        style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
      >
        {yaHechaHoy ? 'Desmarcar de hoy' : 'Marcar como hecha hoy'}
      </Button>

      <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
        <Card.Title
          title="Subtareas"
          titleVariant="titleMedium"
          subtitle="Divide tu meta en pasos pequeños"
          left={() => (
            <MaterialCommunityIcons name="format-list-checks" size={24} color={theme.colors.primary} />
          )}
        />
        {subtareas.length > 0 ? (
          <View>
            {subtareas.map((s, index) => (
              <View key={s.id}>
                {index > 0 ? <Divider /> : null}
                <View style={styles.subRow}>
                  <Pressable onPress={async () => { await toggleSubtarea(db, s.id); dataChanged(); }} hitSlop={8}>
                    <MaterialCommunityIcons
                      name={s.hecha ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                      size={24}
                      color={s.hecha ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                  </Pressable>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.subTitle,
                      { color: s.hecha ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
                      s.hecha && styles.tachado,
                    ]}
                  >
                    {s.titulo}
                  </Text>
                  <IconButton
                    icon="delete-outline"
                    iconColor={theme.colors.onSurfaceVariant}
                    size={18}
                    onPress={async () => { await deleteSubtarea(db, s.id); dataChanged(); }}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 8 }}>
              Sin subtareas todavía. Agrega la primera abajo.
            </Text>
          </Card.Content>
        )}
        <View style={styles.addSub}>
          <TextInput
            mode="outlined"
            value={nuevaSubtarea}
            onChangeText={setNuevaSubtarea}
            placeholder="Nueva subtarea"
            onSubmitEditing={agregarSubtarea}
            style={{ flex: 1 }}
          />
          <IconButton
            icon="plus-circle"
            iconColor={theme.colors.primary}
            size={30}
            onPress={agregarSubtarea}
          />
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon={() => <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />}
          onPress={() => router.push(`/tarea/nueva?id=${tarea.id}`)}
          style={styles.actionBtn}
        >
          Editar
        </Button>
        <Button
          mode="outlined"
          icon={({ color }) => (
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={color} />
          )}
          onPress={() => setConfirmarBorrar(true)}
          textColor={theme.colors.error}
          style={styles.actionBtn}
        >
          Eliminar
        </Button>
      </View>

      <ConfirmDialog
        visible={confirmarBorrar}
        onDismiss={() => setConfirmarBorrar(false)}
        onConfirm={borrar}
        title="¿Eliminar la meta?"
        message={`Se borrará "${tarea.titulo}" junto con sus subtareas. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
      />
    </Screen>
  );
}

function Badge({ icon, text, color }: { icon: string; text: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.surfaceVariant }]}>
      <MaterialCommunityIcons name={icon as never} size={13} color={color} />
      <Text variant="labelSmall" style={{ color }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  strip: { height: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  divider: { marginVertical: 14 },
  primaryBtn: { borderRadius: 10, marginBottom: 14 },
  subRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 2 },
  subTitle: { flex: 1, paddingVertical: 10 },
  tachado: { textDecorationLine: 'line-through' },
  addSub: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 4 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10 },
});