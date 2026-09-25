import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, FAB, IconButton, Modal, Portal, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { IssueRow } from '@/components/issue-row';
import { Screen } from '@/components/screen';
import { priorityColor, SEMANTIC } from '@/constants/theme';
import { addDaysToKey, pad2, todayKey } from '@/lib/db';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';
import {
  agruparIssues,
  cambiarEstadoProyecto,
  deleteProyecto,
  getIssues,
  getProyecto,
  getResumenProyecto,
  saveIssue,
  toggleIssueResuelto,
} from '@/lib/proyectos';
import type { FiltroIssue } from '@/lib/proyectos';
import type { Priority, ProyectoEstado } from '@/lib/schema';

export default function ProyectoDetailScreen() {
  const theme = useTheme();
  const db = useDB();
  const { id } = useLocalSearchParams<{ id: string }>();
  const proyectoId = Number(id);
  const [nuevoIssue, setNuevoIssue] = useState('');
  const [prioridadNueva, setPrioridadNueva] = useState<Priority>('media');
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [calAbierto, setCalAbierto] = useState(false);
  const [estadoAccion, setEstadoAccion] = useState<ProyectoEstado | null>(null);
  const [msgEstado, setMsgEstado] = useState<string | null>(null);

  const proyectoQ = useDbQuery(() => getProyecto(db, proyectoId), [proyectoId]);
  const issuesQ = useDbQuery(() => getIssues(db, proyectoId), [proyectoId]);
  const resumenQ = useDbQuery(() => getResumenProyecto(db, proyectoId), [proyectoId]);

  const proyecto = proyectoQ.data;
  if (!proyecto) {
    return (
      <Screen>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {proyectoQ.error ? 'No se pudo cargar el proyecto.' : 'Buscando el proyecto…'}
        </Text>
      </Screen>
    );
  }

  const r = resumenQ.data;
  const grupos = agruparIssues(issuesQ.data ?? [], todayKey());

  const irMetrica = (clave: FiltroIssue) => {
    router.push({ pathname: '/proyectos/estadistica/[clave]', params: { clave, proyectoId: String(proyectoId) } });
  };

  const agregarIssue = async (fecha: string) => {
    const titulo = nuevoIssue.trim();
    if (!titulo) return;
    await saveIssue(db, {
      proyectoId,
      titulo,
      descripcion: null,
      prioridad: prioridadNueva,
      fechaPlaneada: fecha,
    });
    setNuevoIssue('');
    dataChanged();
  };

  const borrar = async () => {
    setConfirmarBorrar(false);
    await deleteProyecto(db, proyectoId);
    dataChanged();
    router.back();
  };

  const confirmarCambioEstado = async () => {
    if (!estadoAccion) return;
    const res = await cambiarEstadoProyecto(db, proyectoId, estadoAccion);
    setEstadoAccion(null);
    setMsgEstado(res.ok ? null : (res.mensaje ?? null));
    dataChanged();
  };

  const reactivar = async () => {
    setMsgEstado(null);
    await cambiarEstadoProyecto(db, proyectoId, 'activo');
    dataChanged();
  };

  const esActivo = proyecto.estado === 'activo';
  const estadoInfo =
    proyecto.estado === 'completado'
      ? { icon: 'check-circle', color: SEMANTIC.success, texto: 'Completado' }
      : proyecto.estado === 'cancelado'
        ? { icon: 'close-circle', color: theme.colors.error, texto: 'Cancelado' }
        : null;

  return (
    <>
      <View style={{ flex: 1 }}>
        <Screen>
          <View style={[styles.hero, { borderColor: theme.colors.outlineVariant }]}>
            <View style={[styles.strip, { backgroundColor: priorityColor(proyecto.prioridad) }]} />
            <View style={styles.heroBody}>
              <View style={styles.heroTop}>
                <Text
                  variant="titleLarge"
                  numberOfLines={2}
                  style={{ color: theme.colors.onSurface, fontWeight: '800', flex: 1 }}
                >
                  {proyecto.nombre}
                </Text>
                <IconButton
                  icon="pencil-outline"
                  size={20}
                  iconColor={theme.colors.onSurfaceVariant}
                  onPress={() => router.push(`/proyecto/nueva?id=${proyectoId}`)}
                />
              </View>
              {proyecto.descripcion ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {proyecto.descripcion}
                </Text>
              ) : null}

              <View style={styles.stats}>
                <MiniStat
                  label="Abiertos"
                  valor={r?.abiertos ?? 0}
                  color={theme.colors.onSurfaceVariant}
                  onPress={() => irMetrica('abiertos')}
                />
                <MiniStat
                  label="Para hoy"
                  valor={r?.hoy ?? 0}
                  color={SEMANTIC.warning}
                  onPress={() => irMetrica('hoy')}
                />
                <MiniStat
                  label="Vencidos"
                  valor={r?.vencidos ?? 0}
                  color={r && r.vencidos > 0 ? theme.colors.error : theme.colors.onSurfaceVariant}
                  onPress={() => irMetrica('vencidos')}
                />
                <MiniStat
                  label="Resueltos"
                  valor={r?.resueltos ?? 0}
                  color={SEMANTIC.success}
                  onPress={() => irMetrica('resueltos')}
                />
              </View>
            </View>
          </View>

          {estadoInfo ? (
            <View style={[styles.estadoBanner, { backgroundColor: estadoInfo.color }]}>
              <MaterialCommunityIcons name={estadoInfo.icon as never} size={18} color="#fff" />
              <Text variant="labelLarge" style={{ color: '#fff', fontWeight: '700', flex: 1 }}>
                Proyecto {estadoInfo.texto}
              </Text>
            </View>
          ) : null}

          <View style={styles.estadoRow}>
            {esActivo ? (
              <>
                <Button
                  mode="outlined"
                  compact
                  icon="check-circle-outline"
                  onPress={() => setEstadoAccion('completado')}
                  style={styles.estadoBtn}
                >
                  Completar
                </Button>
                <Button
                  mode="outlined"
                  compact
                  icon="close-circle-outline"
                  textColor={theme.colors.error}
                  onPress={() => setEstadoAccion('cancelado')}
                  style={styles.estadoBtn}
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <Button mode="outlined" icon="refresh" onPress={reactivar} style={styles.estadoBtnFull}>
                Reactivar proyecto
              </Button>
            )}
          </View>

          {msgEstado ? (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error, textAlign: 'center', marginBottom: 12 }}
            >
              {msgEstado}
            </Text>
          ) : null}

          {esActivo ? (
            <>
              <View style={[styles.quickAdd, { borderColor: theme.colors.outlineVariant }]}>
                <TextInput
                  mode="outlined"
                  value={nuevoIssue}
                  onChangeText={setNuevoIssue}
                  placeholder="Nuevo issue…"
                  onSubmitEditing={() => agregarIssue(todayKey())}
                  style={styles.quickInput}
                  dense
                />
                <IconButton
                  icon="plus-circle"
                  iconColor={theme.colors.primary}
                  size={32}
                  onPress={() => agregarIssue(todayKey())}
                />
              </View>
            <View style={styles.quickRow}>
              <Button mode="text" compact icon="calendar-today" onPress={() => agregarIssue(todayKey())}>
                Hoy
              </Button>
              <Button
                mode="text"
                compact
                icon="calendar-arrow-right"
                onPress={() => agregarIssue(addDaysToKey(todayKey(), 1))}
              >
                Mañana
              </Button>
              <Button mode="text" compact icon="calendar-plus-outline" onPress={() => setCalAbierto(true)}>
                Elegir día
              </Button>
            </View>
            <SegmentedButtons
              value={prioridadNueva}
              onValueChange={(v) => setPrioridadNueva(v as Priority)}
              density="small"
              buttons={[
                { value: 'alta', label: 'Alta', icon: 'flag' },
                { value: 'media', label: 'Media', icon: 'flag-outline' },
                { value: 'baja', label: 'Baja', icon: 'flag-checkered' },
              ]}
              style={styles.prioridadSeg}
            />
            </>
          ) : (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginVertical: 16 }}
            >
              Este proyecto está {estadoInfo ? estadoInfo.texto.toLowerCase() : 'cerrado'}. Acaba tus issues
              resueltos en las secciones de abajo o reactívalo para seguir trabajando en él.
            </Text>
          )}

          {calAbierto ? (
            <MiniCalendario onClose={() => setCalAbierto(false)} onElegir={agregarIssue} />
          ) : null}

          {grupos.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={34} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Este proyecto no tiene issues todavía. Agrega el primero arriba o con el botón +.
              </Text>
            </View>
          ) : (
            grupos.map((g) => (
              <View key={g.clave} style={styles.section}>
                <Text
                  variant="labelLarge"
                  style={{
                    color:
                      g.clave === 'vencidos'
                        ? theme.colors.error
                        : g.clave === 'hoy'
                          ? SEMANTIC.warning
                          : g.clave === 'cancelados'
                            ? theme.colors.onSurfaceVariant
                            : theme.colors.primary,
                    fontWeight: '700',
                  }}
                >
                  {g.titulo}
                </Text>
                <View style={{ gap: 8 }}>
                  {g.issues.map((issue) => (
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

          <Button
            mode="outlined"
            icon={({ color }) => (
              <MaterialCommunityIcons name="trash-can-outline" size={18} color={color} />
            )}
            onPress={() => setConfirmarBorrar(true)}
            textColor={theme.colors.error}
            style={styles.dangerBtn}
          >
            Eliminar proyecto
          </Button>
        </Screen>

        {esActivo ? (
          <FAB
            icon="plus"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push(`/issue/nueva?proyectoId=${proyectoId}`)}
          />
        ) : null}
      </View>

      <ConfirmDialog
        visible={estadoAccion != null}
        onDismiss={() => setEstadoAccion(null)}
        onConfirm={confirmarCambioEstado}
        title={estadoAccion === 'completado' ? '¿Completar proyecto?' : '¿Cancelar proyecto?'}
        message={
          estadoAccion === 'completado'
            ? 'El proyecto pasará a completado y dejará de contar como pendiente. Podrás reactivarlo cuando quieras.'
            : 'El proyecto pasará a cancelado y todos sus issues abiertos se cancelarán. Podrás reactivarlo cuando quieras.'
        }
        confirmLabel={estadoAccion === 'completado' ? 'Completar' : 'Cancelar'}
        destructive={estadoAccion === 'cancelado'}
      />

      <ConfirmDialog
        visible={confirmarBorrar}
        onDismiss={() => setConfirmarBorrar(false)}
        onConfirm={borrar}
        title="¿Eliminar el proyecto?"
        message={`Se borrará "${proyecto.nombre}" junto con todos sus issues. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
      />
    </>
  );
}

function MiniStat({
  label,
  valor,
  color,
  onPress,
}: {
  label: string;
  valor: number;
  color: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={4} style={styles.statItem}>
      <Text variant="bodyMedium" style={{ color, fontWeight: '800' }}>
        {valor}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      {onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={12} color={theme.colors.onSurfaceVariant} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  strip: { width: 5 },
  heroBody: { flex: 1, padding: 14, gap: 4 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stats: { flexDirection: 'row', gap: 18, marginTop: 8 },
  statItem: { gap: 0 },
  estadoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  estadoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  estadoBtn: { flex: 1, borderRadius: 10 },
  estadoBtnFull: { borderRadius: 10 },
  quickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingLeft: 8,
    paddingRight: 4,
    marginBottom: 8,
  },
  quickInput: { flex: 1, backgroundColor: 'transparent' },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  prioridadSeg: { marginBottom: 8 },
  calCard: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  section: { gap: 8, marginBottom: 16 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 24 },
  dangerBtn: { borderRadius: 10, borderColor: 'rgba(248,113,113,0.4)', marginTop: 4 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});

function MiniCalendario({
  onClose,
  onElegir,
}: {
  onClose: () => void;
  onElegir: (_fecha: string) => void;
}) {
  const theme = useTheme();
  const [fechaSel, setFechaSel] = useState(() => keyToDate(todayKey()));
  const minimo = keyToDate(todayKey());

  const onCambio = (ev: DateTimePickerEvent, d?: Date) => {
    if (!d) return;
    setFechaSel(d);
    if (Platform.OS !== 'ios') {
      elegir(d);
    }
  };

  const elegir = (d: Date) => {
    onClose();
    onElegir(dateToKey(d));
  };

  return (
    <Portal>
      <Modal visible contentContainerStyle={[styles.calCard, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleSmall" style={{ marginBottom: 10 }}>
          Agendar para…
        </Text>
        <DateTimePicker
          value={fechaSel}
          mode="date"
          minimumDate={minimo}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onCambio}
        />
        {Platform.OS === 'ios' ? (
          <Button mode="text" onPress={() => elegir(fechaSel)} style={{ marginTop: 12 }}>
            Listo
          </Button>
        ) : null}
      </Modal>
    </Portal>
  );
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}