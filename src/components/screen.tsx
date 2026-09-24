import type { PropsWithChildren } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps {
  scroll?: boolean;
  padded?: boolean;
}

const MAX_CONTENT_WIDTH = 760;
const EXTRA_LIFT = -32;

export function Screen({ children, scroll = true, padded = true }: PropsWithChildren<ScreenProps>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const background = { backgroundColor: theme.colors.background };
  const bottomPad = padded ? 16 + insets.bottom : 0;

  if (!scroll) {
    return (
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={EXTRA_LIFT} style={styles.flex}>
        <View
          style={[styles.flex, styles.centerContent, background, padded && styles.padded, { paddingBottom: bottomPad }]}
          onTouchStart={Keyboard.dismiss}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    );
  }
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={EXTRA_LIFT} style={styles.flex}>
      <ScrollView
        style={[styles.flex, background]}
        contentContainerStyle={[styles.grow, padded && styles.padded, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={[styles.grow, styles.centerContent]} onTouchStart={Keyboard.dismiss}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  padded: { padding: 16, paddingBottom: 32 },
  centerContent: { width: '100%', alignSelf: 'center', maxWidth: MAX_CONTENT_WIDTH },
});