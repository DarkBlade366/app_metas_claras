import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { priorityColor, SEMANTIC } from '@/constants/theme';
import { addDaysToKey, todayKey } from '@/lib/db';
import type { Issue, Priority } from '@/lib/schema';

const PRIORIDAD_LABEL: Record<Priority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

interface IssueRowProps {
  issue: Issue;
  onToggle?: () => void;
  onPress?: () => void;
  /** Muestra la fecha con etiqueta relativa (Hoy / Mañana / fecha). */
  relativa?: boolean;
}

/** Etiqueta relativa de una fecha respecto a hoy: Hoy, Mañana o fecha corta. */
export function fechaRelativa(fecha: string | null, hoy: string): { texto: string; tono: 'peligro' | 'hoy' | 'normal' } {
  if (!fecha) return { texto: 'Sin fecha', tono: 'normal' };
  if (fecha === hoy) return { texto: 'Hoy', tono: 'hoy' };
  if (fecha === addDaysToKey(hoy, 1)) return { texto: 'Mañana', tono: 'normal' };
  if (fecha < hoy) return { texto: `Vencido · ${fecha}`, tono: 'peligro' };
  const [y, m, d] = fecha.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  return { texto: label, tono: 'normal' };
}

export function IssueRow({ issue, onToggle, onPress, relativa = true }: IssueRowProps) {
  const theme = useTheme();
  const hoy = todayKey();
  const resuelto = issue.estado === 'resuelto';
  const cancelado = issue.estado === 'cancelado';
  const cerrado = resuelto || cancelado;
  const rel = relativa ? fechaRelativa(issue.fechaPlaneada, hoy) : { texto: '', tono: 'normal' as const };

  const fechaColor =
    rel.tono === 'peligro'
      ? theme.colors.error
      : rel.tono === 'hoy'
        ? SEMANTIC.warning
        : theme.colors.onSurfaceVariant;

  const estadoColor = cancelado
    ? theme.colors.onSurfaceVariant
    : resuelto
      ? SEMANTIC.success
      : theme.colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, opacity: cerrado ? 0.65 : 1 },
      ]}
    >
      <View style={[styles.strip, { backgroundColor: cancelado ? theme.colors.outline : priorityColor(issue.prioridad) }]} />
      <Pressable onPress={onToggle} hitSlop={8} style={styles.check}>
        <MaterialCommunityIcons
          name={resuelto ? 'check-circle' : cancelado ? 'cancel' : 'circle-outline'}
          size={24}
          color={estadoColor}
        />
      </Pressable>
      <Pressable onPress={onPress} style={styles.main}>
        <Text
          variant="bodyLarge"
          numberOfLines={2}
          style={[
            { color: cerrado ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
            cerrado && styles.tachado,
          ]}
        >
          {issue.titulo}
        </Text>
        <View style={styles.meta}>
          {issue.prioridad !== 'media' && !cerrado ? (
            <View style={styles.metaItem}>
              <Text variant="labelSmall" style={{ color: priorityColor(issue.prioridad), fontWeight: '700' }}>
                {PRIORIDAD_LABEL[issue.prioridad]}
              </Text>
            </View>
          ) : null}
          {relativa && !cerrado ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar-outline" size={13} color={fechaColor} />
              <Text variant="labelSmall" style={{ color: fechaColor }}>
                {rel.texto}
              </Text>
            </View>
          ) : null}
          {resuelto ? (
            <Text variant="labelSmall" style={{ color: SEMANTIC.success, fontWeight: '700' }}>
              Resuelto
            </Text>
          ) : null}
          {cancelado ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>
              Cancelado
            </Text>
          ) : null}
        </View>
      </Pressable>
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} style={styles.chevron} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  strip: { width: 4, alignSelf: 'stretch' },
  check: { paddingHorizontal: 10, paddingVertical: 12 },
  main: { flex: 1, paddingVertical: 10, paddingRight: 6, gap: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chevron: { marginRight: 10 },
  tachado: { textDecorationLine: 'line-through' },
});