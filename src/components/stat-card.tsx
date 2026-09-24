import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { SEMANTIC } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: string;
  tone?: 'primary' | 'warning' | 'danger' | 'neutral';
  onPress?: () => void;
}

const TONE_COLORS: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: SEMANTIC.success,
  warning: SEMANTIC.warning,
  danger: SEMANTIC.danger,
  neutral: SEMANTIC.neutral,
};

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  tone = 'primary',
  onPress,
}: StatCardProps) {
  const theme = useTheme();
  const color = TONE_COLORS[tone];

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}>
          <MaterialCommunityIcons name={icon as never} size={22} color={color} />
        </View>
        {onPress ? (
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
        ) : null}
      </View>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleLarge" style={[styles.value, { color: theme.colors.onSurface }]}>
        {value}
      </Text>
      {sublabel ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {sublabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flex: 1,
    minHeight: 132,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: { fontWeight: '800' },
});