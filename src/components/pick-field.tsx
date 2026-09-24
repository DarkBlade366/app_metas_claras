import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { pad2 } from '@/lib/db';

interface PickFieldProps {
  label: string;
  icon: string;
  value: Date | null;
  mode: 'date' | 'time';
  onChange: (_date: Date) => void;
  minimumDate?: Date;
  /** Muestra un botón para quitar el valor (por ejemplo, limpiar la hora). */
  onClear?: () => void;
}

function formatValue(value: Date, mode: 'date' | 'time'): string {
  if (mode === 'date') {
    const [y, m, d] = [
      value.getFullYear(),
      pad2(value.getMonth() + 1),
      pad2(value.getDate()),
    ];
    return `${d}/${m}/${y}`;
  }
  return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
}

function isSet(event: DateTimePickerEvent) {
  return event.type === 'set' || event.type === 'neutralButtonPressed';
}

/**
 * Campo que abre el calendario (fecha) o el reloj (hora) nativos del sistema.
 * En Android abre el diálogo del sistema al tocarlo; en iOS/web muestra un
 * selector en un modal.
 */
export function PickField({ label, icon, value, mode, onChange, minimumDate, onClear }: PickFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  const baseValue = value ?? minimumDate ?? new Date();
  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setOpen(false);
    if (isSet(event) && date) onChange(date);
  };

  const picker = open ? (
    <DateTimePicker
      value={baseValue}
      mode={mode}
      display={mode === 'date' ? 'calendar' : 'clock'}
      is24Hour
      minimumDate={minimumDate}
      onChange={handleChange}
    />
  ) : null;

  return (
    <>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
        {label}
      </Text>
      <View style={styles.fieldRow}>
        <Pressable
          onPress={() => setOpen(true)}
          style={[
            styles.field,
            { flex: 1, backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline },
          ]}
        >
          <MaterialCommunityIcons name={icon as never} size={20} color={theme.colors.primary} />
          <Text
            variant="bodyLarge"
            style={{
              color: value ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
              flex: 1,
            }}
          >
            {value ? formatValue(value, mode) : `Elegir ${mode === 'date' ? 'fecha' : 'hora'}`}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
        </Pressable>
        {onClear && value ? (
          <Pressable
            onPress={onClear}
            hitSlop={6}
            accessibilityLabel={`Quitar ${mode === 'date' ? 'fecha' : 'hora'}`}
            style={[
              styles.clearBtn,
              { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline },
            ]}
          >
            <MaterialCommunityIcons name="close" size={18} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>

      {Platform.OS === 'android' || Platform.OS === 'web' ? (
        picker
      ) : (
        <Portal>
          <Modal
            visible={open}
            onDismiss={() => setOpen(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="titleMedium" style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
              {label}
            </Text>
            {picker}
            <View style={styles.modalActions}>
              <Button onPress={() => setOpen(false)} textColor={theme.colors.onSurfaceVariant}>
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  onChange(baseValue);
                  setOpen(false);
                }}
              >
                Listo
              </Button>
            </View>
          </Modal>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  clearBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  modal: {
    margin: 24,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalTitle: { fontWeight: '700', marginBottom: 16 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    width: '100%',
    marginTop: 16,
  },
});