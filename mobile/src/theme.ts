// Import MD3DarkTheme for base Material Design 3 logic and configureFonts for typography setup
import { MD3DarkTheme, configureFonts } from 'react-native-paper';

/**
 * Typography Configuration:
 * Defines font sizes, weights, and spacing for consistent text hierarchy across the app.
 * Each variant follows the Material Design 3 type system.
 */
const fontConfig = {
  // Largest display text, typically for HERO sections
  displayLarge: { fontFamily: 'System', fontSize: 57, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 64 },
  // Medium display text
  displayMedium: { fontFamily: 'System', fontSize: 45, fontWeight: '400' as const, letterSpacing: 0, lineHeight: 52 },
  // Large header text for section titles
  headlineLarge: { fontFamily: 'System', fontSize: 32, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 40 },
  // Medium header text
  headlineMedium: { fontFamily: 'System', fontSize: 28, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 36 },
  // Small header text
  headlineSmall: { fontFamily: 'System', fontSize: 24, fontWeight: '600' as const, letterSpacing: 0, lineHeight: 32 },
  // Main title font for screens/cards
  titleLarge: { fontFamily: 'System', fontSize: 22, fontWeight: '500' as const, letterSpacing: 0, lineHeight: 28 },
  // Medium weight title
  titleMedium: { fontFamily: 'System', fontSize: 16, fontWeight: '500' as const, letterSpacing: 0.15, lineHeight: 24 },
  // Subtitle variants
  titleSmall: { fontFamily: 'System', fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.1, lineHeight: 20 },
  // Standard large paragraph text
  bodyLarge: { fontFamily: 'System', fontSize: 16, fontWeight: '400' as const, letterSpacing: 0.15, lineHeight: 24 },
  // Default body text
  bodyMedium: { fontFamily: 'System', fontSize: 14, fontWeight: '400' as const, letterSpacing: 0.25, lineHeight: 20 },
  // Small fine print
  bodySmall: { fontFamily: 'System', fontSize: 12, fontWeight: '400' as const, letterSpacing: 0.4, lineHeight: 16 },
  // UI labels for buttons and inputs
  labelLarge: { fontFamily: 'System', fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.1, lineHeight: 20 },
  // Smaller UI labels
  labelMedium: { fontFamily: 'System', fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.5, lineHeight: 16 },
  // Captions or tiny details
  labelSmall: { fontFamily: 'System', fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.5, lineHeight: 16 },
};

/**
 * Main Application Theme:
 * Customizes the MD3DarkTheme with a vibrant, premium 'Space' palette.
 */
export const theme = {
  // Inherit default MD3 Dark Theme properties
  ...MD3DarkTheme,
  colors: {
    // Merge existing MD3 colors with our custom brand palette
    ...MD3DarkTheme.colors,
    // Deep purple as the primary brand color
    primary: '#7C4DFF',
    // Darker variant for backgrounds of primary elements
    primaryContainer: '#311B92',
    // Cyan as the secondary accent color
    secondary: '#00E5FF',
    // Darker variant for secondary elements
    secondaryContainer: '#00697A',
    // Orange for tertiary warnings or highlights
    tertiary: '#FF6D00',
    // Deep orange for highlights
    tertiaryContainer: '#803500',
    // Deep navy surface colors for card backgrounds
    surface: '#1A1A2E',
    // Slightly lighter navy for secondary cards
    surfaceVariant: '#252542',
    // Near-black background for maximum contrast in OLED displays
    background: '#0F0F1A',
    // High-contrast red for alerts
    error: '#FF5252',
    // Background for error banners
    errorContainer: '#801A1A',
    // White text on primary backgrounds
    onPrimary: '#FFFFFF',
    // Dark navy text on cyan backgrounds
    onSecondary: '#003640',
    // White text on tertiary backgrounds
    onTertiary: '#FFFFFF',
    // Off-white text for general content
    onSurface: '#E8E8F0',
    // Subdued text for variants
    onSurfaceVariant: '#C4C4D4',
    // Main text color for backgrounds
    onBackground: '#E8E8F0',
    // Border color for inputs and dividers
    outline: '#3D3D5C',
    // Elevation levels using slightly different shades of navy
    elevation: {
      level0: 'transparent',
      level1: '#1E1E35',
      level2: '#252542',
      level3: '#2C2C50',
      level4: '#33335E',
      level5: '#3A3A6C',
    },
  },
  // Apply our custom font configuration via the Paper utility
  fonts: configureFonts({ config: fontConfig }),
  // Apply consistent 16px corner rounding for a modern aesthetic
  roundness: 16,
};


// ── Business Domain Colors ──

/**
 * Semantic status colors for badges and indicators (e.g., Billing, Complaints).
 * Each key maps to a background and text color pair for high-readability labels.
 */
export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  // Successful or completed states (Green shades)
  paid: { bg: '#1B5E20', text: '#81C784' },
  resolved: { bg: '#1B5E20', text: '#81C784' },
  approved: { bg: '#1B5E20', text: '#81C784' },
  overdue_paid: { bg: '#1B5E20', text: '#81C784' },
  
  // Pending or active industrial states (Blue shades)
  open: { bg: '#0D47A1', text: '#90CAF9' },
  submitted: { bg: '#0D47A1', text: '#90CAF9' },
  
  // States requiring attention or in-progress (Orange shades)
  due: { bg: '#E65100', text: '#FFB74D' },
  in_progress: { bg: '#E65100', text: '#FFB74D' },
  
  // Review specific states (Purple shades)
  under_review: { bg: '#4A148C', text: '#CE93D8' },
  
  // Critical or failure states (Red shades)
  overdue: { bg: '#B71C1C', text: '#EF9A9A' },
  rejected: { bg: '#B71C1C', text: '#EF9A9A' },
};
