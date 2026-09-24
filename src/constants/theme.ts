import { MD3DarkTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

/**
 * Tema oscuro de Metas Claras. Paleta violeta/índigo pensada para fondo
 * oscuro (#141318): colores claros con contraste 4.5:1 o más sobre él.
 */
const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 6,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#B39DFF',
    onPrimary: '#2A1F4F',
    primaryContainer: '#4A3B85',
    onPrimaryContainer: '#E8DEFF',
    secondary: '#98C4FF',
    onSecondary: '#001D38',
    secondaryContainer: '#153255',
    onSecondaryContainer: '#D3E4FF',
    tertiary: '#F1B0FF',
    onTertiary: '#4A0064',
    tertiaryContainer: '#670086',
    onTertiaryContainer: '#FFD6FF',
    error: '#FFB4AB',
    onError: '#690005',
    errorContainer: '#93000A',
    onErrorContainer: '#FFDAD6',
    background: '#141318',
    onBackground: '#E6E1E9',
    surface: '#141318',
    onSurface: '#E6E1E9',
    surfaceVariant: '#48464E',
    onSurfaceVariant: '#C9C5CF',
    outline: '#928F99',
    outlineVariant: '#48464E',
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#E6E1E9',
    inverseOnSurface: '#2F2D34',
    inversePrimary: '#6A5BAF',
    surfaceDisabled: 'rgba(230,225,233,0.12)',
    onSurfaceDisabled: 'rgba(230,225,233,0.38)',
    backdrop: 'rgba(28,26,33,0.4)',
  },
};

export const SEMANTIC = {
  success: '#34D399',
  warning: '#F5A623',
  danger: '#F87171',
  neutral: '#9AA5A1',
  info: '#64B5F6',
} as const;

/** Color de marca de cada tipo de tarea (usado en iconos y marcas del calendario). */
export const TYPE_COLORS = {
  diaria: '#B39DFF',
  semanal: '#64B5F6',
  general: '#F5A623',
} as const;

export const AppThemes = { dark: darkTheme } as const;