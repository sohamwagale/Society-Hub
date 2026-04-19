// Import React to define functional components
import React from 'react';
// Import essential layout and styling utilities from React Native
import { View, StyleSheet } from 'react-native';
// Import high-level UI components from React Native Paper (MD3)
import { Text, Chip, ActivityIndicator, Button, TouchableRipple } from 'react-native-paper';
// Import community-standard icons for visual cues
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import the centralized status color map for consistent branding
import { STATUS_COLORS } from '../theme';

/**
 * ── 1. StatusBadge ──
 * A color-coded chip used to display a record's current state (e.g., 'Paid', 'Pending').
 */
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  // Retrieve the background/text color pair based on status key, defaulting to neutral dark
  const colors = STATUS_COLORS[status] || { bg: '#333', text: '#999' };
  // Transform 'pending_approval' into 'Pending Approval' for the UI
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  return (
    <Chip
      mode="flat"
      // Apply semantic colors and dense typography
      textStyle={{ color: colors.text, fontSize: 11, fontWeight: '700', marginVertical: 0, marginHorizontal: 0 }}
      style={{ backgroundColor: colors.bg, borderRadius: 12, height: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}
    >
      {label}
    </Chip>
  );
};

/**
 * ── 2. LoadingScreen ──
 * A full-height centered spinner used as a placeholder during async data fetching.
 */
export const LoadingScreen: React.FC = () => (
  <View style={styles.centered}>
    {/* Use the primary brand color for the infinite spinner */}
    <ActivityIndicator size="large" color="#7C4DFF" />
  </View>
);

/**
 * ── 3. EmptyState ──
 * A visual fallback for lists with zero results, providing feedback to the user.
 */
export const EmptyState: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <View style={styles.centered}>
    {/* Large muted icon to signify lack of content */}
    <MaterialCommunityIcons name={icon as any} size={64} color="#3D3D5C" />
    <Text variant="titleMedium" style={{ color: '#888', marginTop: 16 }}>{title}</Text>
    {/* Optional descriptive text for further clarification */}
    {subtitle && <Text variant="bodySmall" style={{ color: '#666', marginTop: 4 }}>{subtitle}</Text>}
  </View>
);

/**
 * ── 4. SectionHeader ──
 * A horizontal layout providing a section title and an optional trailing action button.
 */
export const SectionHeader: React.FC<{ title: string; action?: { label: string; onPress: () => void } }> = ({ title, action }) => (
  <View style={styles.sectionHeader}>
    {/* Use the 'titleMedium' variant for strong section separation */}
    <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600' }}>{title}</Text>
    {/* Render action button (e.g., 'View All') if provided in props */}
    {action && (
      <Button mode="text" compact onPress={action.onPress} textColor="#7C4DFF">
        {action.label}
      </Button>
    )}
  </View>
);

/**
 * ── 5. StatCard ──
 * A specialized card for the dashboard showing a single metric with a themed icon.
 */
export const StatCard: React.FC<{
  icon: string; label: string; value: string | number;
  color?: string; onPress?: () => void;
}> = ({ icon, label, value, color = '#7C4DFF', onPress }) => {
  // Inner layout containing the metric and label
  const content = (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700', marginTop: 4 }}>
        {value}
      </Text>
      <Text variant="bodySmall" style={{ color: '#888' }}>{label}</Text>
    </View>
  );

  // If an onPress handler is provided, wrap in an interactive ripple effect
  if (onPress) {
    return (
      <React.Fragment>
        {/* @ts-ignore - Ignore type error for borderless ripple on custom view */}
        <TouchableRipple onPress={onPress} borderless style={{ flex: 1, borderRadius: 16, marginHorizontal: 4 }}>
          {content}
        </TouchableRipple>
      </React.Fragment>
    );
  }
  // Return static layout if not interactive
  return content;
};

// ── Shared Stylesheet ──
const styles = StyleSheet.create({
  // Flex-centered container for loading/empty states
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  // Row layout for section boundaries
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  // Card layout with a thick left-border for semantic color coding
  statCard: {
    backgroundColor: '#1E1E35', borderRadius: 16, padding: 16, flex: 1,
    borderLeftWidth: 4, minWidth: 100,
  },
});
