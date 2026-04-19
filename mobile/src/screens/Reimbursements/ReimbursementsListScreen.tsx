// Import React and hooks for managing data synchronization
import React, { useState, useCallback } from 'react';
// Import layout and list rendering components
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, TouchableRipple, FAB, SegmentedButtons } from 'react-native-paper';
// Import community icons for visual engagement
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import global stores for domain data and session context
import { useReimbursementsStore, useAuthStore } from '../../store';
// Import common UI components for consistent state feedback
import { StatusBadge, EmptyState, LoadingScreen } from '../../components/Common';
// Import shared TypeScript definitions
import { ReimbursementRequest } from '../../types';
// Import navigation focus hook to ensure data freshness
import { useFocusEffect } from '@react-navigation/native';

/**
 * ReimbursementsListScreen:
 * An interface for residents to claim out-of-pocket expenses 
 * and for admins to manage the approval pipeline.
 */
export default function ReimbursementsListScreen({ navigation }: any) {
  // Extract data layer methods and current requests list
  const { requests, loading, fetchRequests } = useReimbursementsStore();
  // Identify current user to personalize action rights (Residents can create, Admins audit)
  const user = useAuthStore(s => s.user);
  
  // ── UI View Management State ──
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'history'
  const [refreshing, setRefreshing] = useState(false);

  // Sync with backend every time the user focuses on this screen
  useFocusEffect(useCallback(() => { fetchRequests(); }, []));

  /**
   * onRefresh:
   * Handler for the pull-to-refresh swipe gesture.
   */
  const onRefresh = async () => { setRefreshing(true); await fetchRequests(); setRefreshing(false); };

  /**
   * Filter derived state: 
   * Segregates requests based on whether they are in-flight or finalized.
   */
  const filteredRequests = requests.filter(r => {
    const isHistory = ['rejected', 'paid'].includes(r.status);
    if (viewMode === 'active' && isHistory) return false;
    if (viewMode === 'history' && !isHistory) return false;
    return true;
  });

  /**
   * renderItem:
   * Renders a summary card for a single reimbursement claim.
   */
  const renderItem = ({ item }: { item: ReimbursementRequest }) => (
    <TouchableRipple onPress={() => navigation.navigate('ReimbursementDetail', { requestId: item.id })} borderless style={{ borderRadius: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.row}>
          {/* Visual token for category identification */}
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="cash-refund" size={24} color="#00E5FF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{item.title}</Text>
            <Text variant="bodySmall" style={{ color: '#888' }}>{item.category} • {item.expense_date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {/* Economic value and processing status */}
            <Text variant="titleSmall" style={{ color: '#E8E8F0', fontWeight: '700', paddingRight: 8 }}>₹{item.amount}</Text>
            <StatusBadge status={item.status} />
          </View>
        </View>
      </Surface>
    </TouchableRipple>
  );

  // Initial loading gate
  if (loading && requests.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* ── View Swapper Module ── */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={setViewMode}
          buttons={[
            { value: 'active', label: 'Active', icon: 'clock-outline' },
            { value: 'history', label: 'History', icon: 'history' },
          ]}
          style={styles.segments}
          // Themed contrast for the active segment
          theme={{ colors: { secondaryContainer: '#311B92', onSecondaryContainer: '#FFF', outline: '#3D3D5C' } }}
        />
      </View>

      {/* ── Infinite/Scrollable List of Requests ── */}
      <FlatList
        data={filteredRequests}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon={viewMode === 'active' ? "cash-multiple" : "history"} title={viewMode === 'active' ? "No pending requests" : "No history"} subtitle={viewMode === 'active' ? "Submit a new claim to get started" : "Past reimbursements will appear here"} />}
      />

      {/* Primary Action Button: Launch claim creation wizard (Resident only) */}
      {user?.role === 'resident' && (
        <FAB icon="plus" style={styles.fab} color="#FFF" onPress={() => navigation.navigate('CreateReimbursement')} />
      )}
    </View>
  );
}

// ── Local Design Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  filterContainer: { paddingHorizontal: 16, paddingTop: 12 },
  segments: { backgroundColor: '#1A1A2E' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0A2E3D', justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
});
