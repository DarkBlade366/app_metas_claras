import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { TYPE_COLORS } from '@/constants/theme';
import type { MarcaDia } from '@/lib/db';
import { pad2 } from '@/lib/db';
import { DIAS_SEMANA_LABELS } from '@/lib/schema';

interface CalendarGridProps {
  year: number;
  month: number;
  marks: Record<string, MarcaDia>;
  selectedKey: string;
  todayKey: string;
  onSelect: (_key: string) => void;
}

export function CalendarGrid({
  year,
  month,
  marks,
  selectedKey,
  todayKey,
  onSelect,
}: CalendarGridProps) {
  const theme = useTheme();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: React.ReactNode[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    cells.push(<View key={`empty-${i}`} style={styles.cell} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${pad2(month + 1)}-${pad2(d)}`;
    const marca = marks[key];
    const isToday = key === todayKey;
    const isSelected = key === selectedKey;

    cells.push(
      <View key={key} style={styles.cell}>
        <Pressable
          onPress={() => onSelect(key)}
          style={[
            styles.dayCircle,
            isSelected && { backgroundColor: theme.colors.primary },
            !isSelected && isToday && { borderWidth: 1.5, borderColor: theme.colors.primary },
          ]}
        >
          <Text
            variant="bodyMedium"
            style={[
              styles.dayText,
              {
                color: isSelected
                  ? theme.colors.onPrimary
                  : isToday
                    ? theme.colors.primary
                    : theme.colors.onSurface,
                fontWeight: isToday || isSelected ? '800' : '400',
              },
            ]}
          >
            {d}
          </Text>
          <View style={styles.dots}>
            {marca?.diaria ? <View style={[styles.dot, { backgroundColor: TYPE_COLORS.diaria }]} /> : null}
            {marca?.semanal ? <View style={[styles.dot, { backgroundColor: TYPE_COLORS.semanal }]} /> : null}
            {marca?.general ? <View style={[styles.dot, { backgroundColor: TYPE_COLORS.general }]} /> : null}
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {DIAS_SEMANA_LABELS.map((label, i) => (
          <View key={label} style={styles.cell}>
            <Text
              variant="labelSmall"
              style={{ color: i === 0 || i === 6 ? theme.colors.error : theme.colors.onSurfaceVariant }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>{cells}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2 },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { lineHeight: 18 },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});