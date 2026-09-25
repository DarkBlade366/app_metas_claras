import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { fechaRelativa } from '@/components/issue-row';
import { Screen } from '@/components/screen';
import { priorityColor, SEMANTIC } from '@/constants/theme';
import { todayKey } from '@/lib/db';
import { dataChanged, useDB, useDbQuery } from '@/lib/db-provider';
import { deleteIssue, getIssue, getProyecto, setIssueResuelto } from '@/lib/proyectos';
import type { Priority } from '@/lib/schema';

const PRIORIDAD_LABEL: Record<Priority, string> = {
  alta: 'Prioridad alta',
  media: 'Prioridad media',
  baja: 'Prioridad baja',
};

export default function IssueDetailScreen() {
  const theme = useTheme();
  const db = useDB();
  const { id } = useLocalSearchParams<{ id: string }>();
  const issueId = Number(id);
  const hoy = todayKey();
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const issueQ = useDbQuery(() => getIssue(db, issueId), [issueId]);
  const proyectoId = issueQ.data?.proyectoId;
  const proyectoQ = useDbQuery(
    () => (proyectoId != null ? getProyecto(db, proyectoId) : Promise.resolve(null)),
    [proyectoId]
  );

  const issue = issueQ.data;
  if (!issue) {
    return (
      <Screen>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {issueQ.error ? 'No se pudo cargar el issue.' : 'Buscando el issue…'}
        </Text>
      </Screen>
    );
  }

  const resuelto = issue.estado === 'resuelto';
  const cancelado = issue.estado === 'cancelado';
  const cerrado = resuelto || cancelado;
  const rel = fechaRelativa(issue.fechaPlaneada, hoy);

  const cambiarEstado = async () => {
    if (cancelado) {
      // Reabre un issue cancelado: pasa de nuevo a abierto.
      await setIssueResuelto(db, issue.id, false);
    } else {
      await setIssueResuelto(db, issue.id, !resuelto);
    }
    dataChanged();
  };

  const borrar = async () => {
    setConfirmarBorrar(false);
    await deleteIssue(db, issue.id);
    dataChanged();
    router.back();
  };

  return (
    <Screen>
      <Card mode="outlined" style={[styles.card, { borderColor: theme.colors.outlineVariant }]}>
        <View style={[styles.strip, { backgroundColor: cancelado ? theme.colors.outline : priorityColor(issue.prioridad) }]} />
        <Card.Content>
          <Text
            variant="headlineSmall"
            style={[
              { color: cerrado ? theme.colors.onSurfaceVariant : theme.colors.onSurface, fontWeight: '800' },
              cerrado && styles.tachado,
            ]}
          >
            {issue.titulo}
          </Text>
          {issue.descripcion ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              {issue.descripcion}
            </Text>
          ) : null}

          <View style={styles.frente}>
            <MiniText
              label="Proyecto"
              valor={proyectoQ.data?.nombre ?? '–'}
              onPress={proyectoQ.data ? () => router.push(`/proyecto/${proyectoQ.data!.id}`) : undefined}
            />
            <MiniText
              label="Estado"
              valor={resuelto ? 'Resuelto' : cancelado ? 'Cancelado' : 'Abierto'}
              color={resuelto ? SEMANTIC.success : cancelado ? theme.colors.onSurfaceVariant : theme.colors.onSurfaceVariant}
            />
          </View>
          <View style={styles.frente}>
            <MiniText
              label="Prioridad"
              valor={PRIORIDAD_LABEL[issue.prioridad]}
              color={cancelado ? theme.colors.onSurfaceVariant : priorityColor(issue.prioridad)}
            />
            <MiniText
              label="Planeado para"
              valor={rel.texto}
              color={
                rel.tono === 'peligro'
                  ? theme.colors.error
                  : rel.tono === 'hoy'
                    ? SEMANTIC.warning
                    : theme.colors.onSurfaceVariant
              }
            />
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        icon={({ color }) => (
          <MaterialCommunityIcons name={cerrado ? 'undo' : 'check'} size={18} color={color} />
        )}
        onPress={cambiarEstado}
        style={[styles.primaryBtn, { backgroundColor: cerrado ? theme.colors.onSurfaceVariant : theme.colors.primary }]}
      >
        {cancelado
          ? 'Reabrir issue'
          : resuelto
            ? 'Reabrir issue'
            : 'Marcar como resuelto'}
      </Button>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon={() => <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.colors.primary} />}
          onPress={() => router.push(`/issue/nueva?id=${issue.id}`)}
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
        title="¿Eliminar el issue?"
        message={`Se borrará "${issue.titulo}" de forma permanente.`}
        confirmLabel="Eliminar"
        destructive
      />
    </Screen>
  );
}

function MiniText({
  label,
  valor,
  color,
  onPress,
}: {
  label: string;
  valor: string;
  color?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const finalColor = color ?? theme.colors.onSurfaceVariant;
  return (
    <View style={styles.mini}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color: finalColor, fontWeight: '700' }} onPress={onPress}>
        {valor}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', marginBottom: 14 },
  strip: { height: 4 },
  tachado: { textDecorationLine: 'line-through' },
  frente: { flexDirection: 'row', gap: 28, marginTop: 14 },
  mini: { gap: 2, flexShrink: 1 },
  primaryBtn: { borderRadius: 10, marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10 },
});