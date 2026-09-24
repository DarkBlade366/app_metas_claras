import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import type { Tarea } from '@/lib/schema';

interface TaskRowProps {
  tarea: Tarea;
  hecha: boolean;
  subtotal?: number;
  subhechas?: number;
  atrasada?: boolean;
  onToggle?: () => void;
  onPress?: () => void;
}

const TIPO_LABELS: Record<Tarea['tipo'], string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  general: 'General',
};

export function TaskRow({
  tarea,
  hecha,
  subtotal = 0,
  subhechas = 0,
  atrasada = false,
  onToggle,
  onPress,
}: TaskRowProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant },
      ]}
    >
      <View style={[styles.strip, { backgroundColor: tarea.color }]} />
      <Pressable onPress={onToggle} hitSlop={8} style={styles.check}>
        <MaterialCommunityIcons
          name={hecha ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
          size={26}
          color={hecha ? theme.colors.primary : theme.colors.onSurfaceVariant}
        />
      </Pressable>
      <Pressable onPress={onPress} style={styles.main}>
        <Text
          variant="bodyLarge"
          numberOfLines={2}
          style={[
            { color: hecha ? theme.colors.onSurfaceVariant : theme.colors.onSurface },
            hecha && styles.tachado,
          ]}
        >
          {tarea.titulo}
        </Text>
        <View style={styles.meta}>
          {tarea.hora ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {tarea.hora}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <MaterialCommunityIcons
              name={
                tarea.tipo === 'diaria'
                  ? 'repeat-variant'
                  : tarea.tipo === 'semanal'
                    ? 'calendar-week'
                    : 'target'
              }
              size={13}
              color={theme.colors.primary}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              {TIPO_LABELS[tarea.tipo]}
            </Text>
          </View>
          {subtotal > 0 ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {subhechas}/{subtotal} {subtotal === 1 ? 'subtarea' : 'subtareas'}
            </Text>
          ) : null}
          {atrasada ? (
            <Text variant="labelSmall" style={{ color: theme.colors.error, fontWeight: '700' }}>
              Atrasada
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