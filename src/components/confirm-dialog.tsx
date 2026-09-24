import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function ConfirmDialog({
  visible,
  onDismiss,
  onConfirm,
  title,
  message,
  confirmLabel = 'Aceptar',
  icon = 'help-circle-outline',
  destructive = false,
  loading = false,
}: {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  icon?: IconName;
  destructive?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  const accent = destructive ? '#F87171' : theme.colors.primary;
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={loading ? () => {} : onDismiss} style={styles.dialog}>
        <View style={styles.center}>
          <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
            <MaterialCommunityIcons name={icon} size={34} color={accent} />
          </View>
        </View>
        <Dialog.Title style={styles.title}>{title}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {message}
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button onPress={onDismiss} disabled={loading} textColor={theme.colors.onSurfaceVariant}>
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            disabled={loading}
            loading={loading}
            buttonColor={accent}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { borderRadius: 20 },
  center: { alignItems: 'center', marginTop: 22 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textAlign: 'center', fontWeight: '800', marginTop: 8 },
  content: { paddingBottom: 0 },
  actions: { justifyContent: 'center', gap: 4, marginTop: 8, marginBottom: 6 },
});