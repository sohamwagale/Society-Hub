import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, ActivityIndicator, Button, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { STATUS_COLORS } from '../theme';

// ── Status Badge ──
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = STATUS_COLORS[status] || { bg: '#333', text: '#999' };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <Chip
      mode="flat"
      textStyle={{ color: colors.text, fontSize: 11, fontWeight: '700', marginVertical: 0, marginHorizontal: 0 }}
      style={{ backgroundColor: colors.bg, borderRadius: 12, height: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}
    >
      {label}
    </Chip>
  );
};

// ── Loading Screen ──
export const LoadingScreen: React.FC = () => (
  <View style={styles.centered}>
    <ActivityIndicator size="large" color="#7C4DFF" />
  </View>
);

// ── Empty State ──
export const EmptyState: React.FC<{ icon: string; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <View style={styles.centered}>
    <MaterialCommunityIcons name={icon as any} size={64} color="#3D3D5C" />
    <Text variant="titleMedium" style={{ color: '#888', marginTop: 16 }}>{title}</Text>
    {subtitle && <Text variant="bodySmall" style={{ color: '#666', marginTop: 4 }}>{subtitle}</Text>}
  </View>
);

// ── Section Header ──
export const SectionHeader: React.FC<{ title: string; action?: { label: string; onPress: () => void } }> = ({ title, action }) => (
  <View style={styles.sectionHeader}>
    <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600' }}>{title}</Text>
    {action && (
      <Button mode="text" compact onPress={action.onPress} textColor="#7C4DFF">
        {action.label}
      </Button>
    )}
  </View>
);

// ── Stat Card ──
export const StatCard: React.FC<{
  icon: string; label: string; value: string | number;
  color?: string; onPress?: () => void;
}> = ({ icon, label, value, color = '#7C4DFF', onPress }) => {
  const content = (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700', marginTop: 4 }}>
        {value}
      </Text>
      <Text variant="bodySmall" style={{ color: '#888' }}>{label}</Text>
    </View>
  );

  if (onPress) {
    return (
      <React.Fragment>
        {/* @ts-ignore */}
        <TouchableRipple onPress={onPress} borderless style={{ flex: 1, borderRadius: 16, marginHorizontal: 4 }}>
          {content}
        </TouchableRipple>
      </React.Fragment>
    );
  }
  return content;
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8,
  },
  statCard: {
    backgroundColor: '#1E1E35', borderRadius: 16, padding: 16, flex: 1,
    borderLeftWidth: 4, minWidth: 100,
  },
});
