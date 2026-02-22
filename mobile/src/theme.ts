import { MD3DarkTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  displayLarge: { fontFamily: 'System', fontSize: 57, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 64 },
  displayMedium: { fontFamily: 'System', fontSize: 45, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 52 },
  headlineLarge: { fontFamily: 'System', fontSize: 32, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 40 },
  headlineMedium: { fontFamily: 'System', fontSize: 28, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 36 },
  headlineSmall: { fontFamily: 'System', fontSize: 24, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 32 },
  titleLarge: { fontFamily: 'System', fontSize: 22, fontWeight: '500' as const, letterSpacing: 0, lineHeight: 28 },
  titleMedium: { fontFamily: 'System', fontSize: 16, fontWeight: '500' as const, letterSpacing: 0.15, lineHeight: 24 },
  titleSmall: { fontFamily: 'System', fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.1, lineHeight: 20 },
  bodyLarge: { fontFamily: 'System', fontSize: 16, fontWeight: '400' as const, letterSpacing: 0.15, lineHeight: 24 },
  bodyMedium: { fontFamily: 'System', fontSize: 14, fontWeight: '400' as const, letterSpacing: 0.25, lineHeight: 20 },
  bodySmall: { fontFamily: 'System', fontSize: 12, fontWeight: '400' as const, letterSpacing: 0.4, lineHeight: 16 },
  labelLarge: { fontFamily: 'System', fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.1, lineHeight: 20 },
  labelMedium: { fontFamily: 'System', fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.5, lineHeight: 16 },
  labelSmall: { fontFamily: 'System', fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.5, lineHeight: 16 },
};

export const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#7C4DFF',
    primaryContainer: '#311B92',
    secondary: '#00E5FF',
    secondaryContainer: '#00697A',
    tertiary: '#FF6D00',
    tertiaryContainer: '#803500',
    surface: '#1A1A2E',
    surfaceVariant: '#252542',
    background: '#0F0F1A',
    error: '#FF5252',
    errorContainer: '#801A1A',
    onPrimary: '#FFFFFF',
    onSecondary: '#003640',
    onTertiary: '#FFFFFF',
    onSurface: '#E8E8F0',
    onSurfaceVariant: '#C4C4D4',
    onBackground: '#E8E8F0',
    outline: '#3D3D5C',
    elevation: {
      level0: 'transparent',
      level1: '#1E1E35',
      level2: '#252542',
      level3: '#2C2C50',
      level4: '#33335E',
      level5: '#3A3A6C',
    },
  },
  fonts: configureFonts({ config: fontConfig }),
  roundness: 16,
};

// Status colors
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid: { bg: '#1B5E20', text: '#81C784' },
  due: { bg: '#E65100', text: '#FFB74D' },
  overdue: { bg: '#B71C1C', text: '#EF9A9A' },
  open: { bg: '#0D47A1', text: '#90CAF9' },
  in_progress: { bg: '#E65100', text: '#FFB74D' },
  resolved: { bg: '#1B5E20', text: '#81C784' },
  submitted: { bg: '#0D47A1', text: '#90CAF9' },
  under_review: { bg: '#4A148C', text: '#CE93D8' },
  approved: { bg: '#1B5E20', text: '#81C784' },
  rejected: { bg: '#B71C1C', text: '#EF9A9A' },
  overdue_paid: { bg: '#1B5E20', text: '#81C784' },
};
