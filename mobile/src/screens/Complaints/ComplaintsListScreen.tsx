// Import React for UI lifecycle management and hooks for state/memoization
import React, { useState, useCallback } from 'react';
// Import layout and list rendering components
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, FAB, Surface, TouchableRipple, Menu, Button } from 'react-native-paper';
// Import global stores for domain data and session context
import { useComplaintsStore, useAuthStore } from '../../store';
// Import common UI components for consistent state feedback
import { StatusBadge, EmptyState, SectionHeader } from '../../components/Common';
// Import navigation hook to trigger data refreshes on focus
import { useFocusEffect } from '@react-navigation/native';

// ── Shared Configuration: Filter Options ──
const STATUS_FILTERS = [
  { label: 'All Statuses', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const CATEGORY_FILTERS = [
  { label: 'All Categories', value: '' },
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Electrical', value: 'electrical' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Security', value: 'security' },
  { label: 'Noise', value: 'noise' },
  { label: 'Parking', value: 'parking' },
  { label: 'Other', value: 'other' },
];

/**
 * ComplaintsListScreen:
 * An interface for residents to track their issues and for admins to manage the queue.
 */
export default function ComplaintsListScreen({ navigation }: any) {
  // Extract data layer methods and current list
  const { complaints, fetchComplaints, loading } = useComplaintsStore();
  // Extract current user to personalize the view if needed
  const { user } = useAuthStore();
  
  // ── Active Filters State ──
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  // ── UI Logic/Menu State ──
  const [refreshing, setRefreshing] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  /**
   * loadData:
   * Memoized function to sync the list with applied search criteria.
   */
  const loadData = useCallback(async () => {
    await fetchComplaints(statusFilter || undefined, categoryFilter || undefined);
  }, [statusFilter, categoryFilter]);

  // Sync with backend every time the screen is focused or filters change
  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  /**
   * onRefresh:
   * Handler for the pull-to-refresh swipe gesture.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Helper labels for the button anchors
  const statusLabel = STATUS_FILTERS.find(f => f.value === statusFilter)?.label || 'All Statuses';
  const categoryLabel = CATEGORY_FILTERS.find(f => f.value === categoryFilter)?.label || 'All Categories';

  return (
    <View style={styles.container}>
      {/* ── Top Strip: Interactive Filter Dropdowns ── */}
      <View style={styles.filterRow}>
        {/* Status Filter Dropdown */}
        <Menu
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setStatusMenuVisible(true)}
              icon="chevron-down"
              contentStyle={{ flexDirection: 'row-reverse' }}
              textColor={statusFilter ? '#7C4DFF' : '#888'}
              style={[styles.filterButton, statusFilter ? styles.filterButtonActive : null]}
              compact
            >
              {statusLabel}
            </Button>
          }
          contentStyle={{ backgroundColor: '#1A1A2E' }}
        >
          {STATUS_FILTERS.map(f => (
            <Menu.Item
              key={f.value}
              onPress={() => { setStatusFilter(f.value); setStatusMenuVisible(false); }}
              title={f.label}
              titleStyle={{ color: statusFilter === f.value ? '#7C4DFF' : '#C8C8D8' }}
            />
          ))}
        </Menu>

        {/* Category Filter Dropdown */}
        <Menu
          visible={categoryMenuVisible}
          onDismiss={() => setCategoryMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setCategoryMenuVisible(true)}
              icon="chevron-down"
              contentStyle={{ flexDirection: 'row-reverse' }}
              textColor={categoryFilter ? '#7C4DFF' : '#888'}
              style={[styles.filterButton, categoryFilter ? styles.filterButtonActive : null]}
              compact
            >
              {categoryLabel}
            </Button>
          }
          contentStyle={{ backgroundColor: '#1A1A2E' }}
        >
          {CATEGORY_FILTERS.map(f => (
            <Menu.Item
              key={f.value}
              onPress={() => { setCategoryFilter(f.value); setCategoryMenuVisible(false); }}
              title={f.label}
              titleStyle={{ color: categoryFilter === f.value ? '#7C4DFF' : '#C8C8D8' }}
            />
          ))}
        </Menu>
      </View>

      {/* ── Infinite/Scrollable List of Reported Issues ── */}
      <FlatList
        data={complaints}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon="comment-alert-outline" title="No complaints found" />}
        renderItem={({ item }) => (
          <TouchableRipple onPress={() => navigation.navigate('ComplaintDetail', { complaintId: item.id })}>
            <Surface style={styles.card} elevation={1}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="titleMedium" style={{ color: '#E8E8F0', flex: 1, fontWeight: '600' }} numberOfLines={1}>
                  {item.title}
                </Text>
                {/* Visual marker for ticket progress */}
                <StatusBadge status={item.status} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text variant="bodySmall" style={{ color: '#888' }}>
                  📁 {item.category}
                </Text>
                <Text variant="bodySmall" style={{ color: '#888' }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Surface>
          </TouchableRipple>
        )}
      />

      {/* Primary Action Button: File a new report */}
      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFF"
        onPress={() => navigation.navigate('CreateComplaint')}
      />
    </View>
  );
}

// ── Shared UI Architecture ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  filterRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterButton: { borderColor: '#3D3D5C', borderRadius: 10, backgroundColor: '#1A1A2E' },
  filterButtonActive: { borderColor: '#7C4DFF' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 10 },
  fab: { position: 'absolute', right: 24, bottom: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
});

