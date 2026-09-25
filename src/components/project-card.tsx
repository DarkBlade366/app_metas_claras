import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { priorityColor } from '@/constants/theme';
import type { ProyectoEstado } from '@/lib/schema';
import type { ProyectoConStats } from '@/lib/proyectos';

const ESTADO_CARD: Record<ProyectoEstado, { icon: string; color: string; label: string }> = {
  activo: { icon: 'circle-outline', color: 'rgba(0,0,0,0.4)', label: '' },
  completado: { icon: 'check-circle', color: '#2ECC71', label: 'Completado' },
  cancelado: { icon: 'close-circle', color: '#E74C3C', label: 'Cancelado' },
};

export function ProjectCard({ proyecto, onPress }: { proyecto: ProyectoConStats; onPress?: () => void }) {
  const theme = useTheme();

  const resumen: string[] = [];
  if (proyecto.abiertos > 0) resumen.push(`${proyecto.abiertos} ${proyecto.abiertos === 1 ? 'abierto' : 'abiertos'}`);
  if (proyecto.hoy > 0) resumen.push(`${proyecto.hoy} para hoy`);
  if (proyecto.vencidos > 0) resumen.push(`${proyecto.vencidos} vencidos`);

  const noActivo = proyecto.estado !== 'activo';
  const estadoInfo = ESTADO_CARD[proyecto.estado];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: noActivo ? theme.colors.outlineVariant : theme.colors.outlineVariant,
          opacity: noActivo ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.strip, { backgroundColor: noActivo ? estadoInfo.color : priorityColor(proyecto.prioridad) }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          {noActivo ? (
            <MaterialCommunityIcons name={estadoInfo.icon as never} size={18} color={estadoInfo.color} />
          ) : null}
          <Text
            variant="titleMedium"
            numberOfLines={1}
            style={{ color: theme.colors.onSurface, fontWeight: '700', flex: 1 }}
          >
            {proyecto.nombre}
          </Text>
          {noActivo ? (
            <Text variant="labelMedium" style={{ color: estadoInfo.color, fontWeight: '700' }}>
              {estadoInfo.label}
            </Text>
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
          )}
        </View>
        {proyecto.descripcion ? (
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {proyecto.descripcion}
          </Text>
        ) : null}
        {resumen.length > 0 && !noActivo ? (
          <View style={styles.metaRow}>
            {resumen.map((r, i) => (
              <Text
                key={i}
                variant="labelSmall"
                style={{
                  color:
                    r.endsWith('vencidos') || r.includes('vencido')
                      ? theme.colors.error
                      : theme.colors.onSurfaceVariant,
                  fontWeight: r.includes('vencid') ? '700' : '400',
                }}
              >
                {r}
              </Text>
            ))}
          </View>
        ) : (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Sin issues
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  strip: { width: 5, alignSelf: 'stretch' },
  body: { flex: 1, padding: 14, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
});