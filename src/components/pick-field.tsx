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
export function PickField({ label, icon, value, mode, onChange, minimumDate }: PickFieldProps) {
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
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outline }]}
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 6,
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