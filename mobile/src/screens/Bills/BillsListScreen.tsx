// Import React and hooks for managing complex filtering states
import React, { useState, useCallback, useEffect } from 'react';
// Import layout, interaction, and system integration (Alert/Linking) components
import { View, FlatList, StyleSheet, RefreshControl, Alert, Linking } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, TouchableRipple, SegmentedButtons, FAB, ActivityIndicator, IconButton, Button } from 'react-native-paper';
// Import community icons for visual categorization of billing types
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import global stores for financial data and user context
import { useBillsStore, useAuthStore } from '../../store';
// Import reusable common UI components
import { StatusBadge, EmptyState, LoadingScreen } from '../../components/Common';
// Import shared TypeScript definitions
import { Bill } from '../../types';
// Import navigation hooks for focus-based logic
import { useFocusEffect } from '@react-navigation/native';
// Import specific API for administrative report generation
import { billsAPI } from '../../services/api';

/**
 * BillsListScreen:
 * A comprehensive ledger view for residents to view their dues and for 
 * admins to manage society-wide billing cycles.
 */
export default function BillsListScreen({ navigation }: any) {
  // Extract data and methods from the bills store
  const { bills, loading, fetchBills } = useBillsStore();
  // Extract user to drive role-specific feature sets
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  // ── View State ──
  // 'active' = current bills, 'history' = archived/paid bills
  const [viewMode, setViewMode] = useState('active'); 
  // 'all' | 'maintenance' | 'extra'
  const [typeFilter, setTypeFilter] = useState('all'); 
  
  // ── UI Logic State ──
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Dynamic Header: Inject the "Share" button for Admins
  useEffect(() => {
    if (isAdmin) {
      navigation.setOptions({
        headerRight: () => (
          <View style={{ marginRight: 8, justifyContent: 'center', alignItems: 'center' }}>
            {exporting ? (
              <ActivityIndicator size="small" color="#7C4DFF" style={{ padding: 12 }} />
            ) : (
              <Button
                mode="contained-tonal"
                icon="file-pdf-box"
                textColor="#4CAF50"
                buttonColor="#1A2E1A" // Dark green tint to denote success/finance
                onPress={handleExport}
                compact
                style={{ borderWidth: 1, borderColor: '#2E7D32', borderRadius: 12 }}
                labelStyle={{ fontSize: 12, fontWeight: '600' }}
              >
                Share as pdf
              </Button>
            )}
          </View>
        ),
      });
    }
  }, [navigation, isAdmin, exporting]);

  /**
   * handleExport:
   * Triggers the backend PDF generation and opens the download link.
   */
  const handleExport = async () => {
    setExporting(true);
    try {
      const url = await billsAPI.getExportReportUrl();
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to export report. Make sure there are active bills.');
    } finally {
      setExporting(false);
    }
  };

  // Re-fetch data whenever the screen regains focus or view mode changes
  useFocusEffect(useCallback(() => {
    loadBills();
  }, [viewMode]));

  /**
   * loadBills:
   * Syncs the local ledger with the server.
   */
  const loadBills = async () => {
    await fetchBills();
  };

  /**
   * onRefresh:
   * Handler for the pull-to-refresh gesture.
   */
  const onRefresh = async () => { setRefreshing(true); await loadBills(); setRefreshing(false); };

  /**
   * filteredBills:
   * Complex derived state that partitions the bills list based on Role and ViewMode.
   */
  const filteredBills = bills.filter(b => {
    // ── 1. Temporal Logic Filter ──
    if (!isAdmin) {
      // Residents: Simple binary split based on receipt status
      const isPaid = b.payment_status === 'paid' || b.payment_status === 'overdue_paid';
      if (viewMode === 'active' && isPaid) return false;
      if (viewMode === 'history' && !isPaid) return false;
    } else {
      // Admins: "Active" means currently live cycles; "History" means archived or terminated cycles.
      const isFullyPaid = b.payment_status === 'paid';
      if (viewMode === 'active' && (!b.is_active || isFullyPaid)) return false;
      if (viewMode === 'history' && b.is_active && !isFullyPaid) return false;
    }

    // ── 2. Type Category Filter ──
    if (typeFilter === 'maintenance') return b.bill_type === 'maintenance';
    if (typeFilter === 'extra') return b.bill_type === 'extra';
    return true;
  });

  /**
   * renderBill:
   * Renders a interactive card representing a specific financial liability.
   */
  const renderBill = ({ item }: { item: Bill }) => (
    <TouchableRipple onPress={() => navigation.navigate('BillDetail', { billId: item.id })} borderless style={{ borderRadius: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardHeader}>
          {/* Visual Indicator of Bill Type */}
          <View style={[styles.iconBox, { backgroundColor: item.bill_type === 'maintenance' ? '#1A1A3E' : '#2E1A1A' }]}>
            <MaterialCommunityIcons
              name={item.bill_type === 'maintenance' ? 'home-city' : 'cash-plus'}
              size={24}
              color={item.bill_type === 'maintenance' ? '#7C4DFF' : '#FF6D00'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{item.title}</Text>
            <Text variant="bodySmall" style={{ color: '#888' }}>
              {item.bill_type === 'maintenance' ? 'Maintenance' : 'Extra Fund'}
            </Text>
          </View>
          {/* Visual status badge (Due, Paid, Overdue) */}
          <StatusBadge status={item.payment_status || 'due'} />
        </View>
        
        <View style={styles.cardFooter}>
          {/* Prominent Amount Display */}
          <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '700' }}>₹{item.amount.toLocaleString()}</Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>
            {item.payment_status === 'paid' ? 'Paid' : item.payment_status === 'overdue' ? 'Overdue' : `Due: ${item.due_date}`}
          </Text>
        </View>
      </Surface>
    </TouchableRipple>
  );

  // Loading Gate
  if (loading && bills.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {/* ── Filter Module: Temporal Toggle ── */}
        <SegmentedButtons
          value={viewMode}
          onValueChange={setViewMode}
          buttons={[
            { value: 'active', label: 'Active', icon: 'clock-outline' },
            { value: 'history', label: 'History', icon: 'history' },
          ]}
          style={styles.segments}
          theme={{ colors: { secondaryContainer: '#311B92', onSecondaryContainer: '#FFF', outline: '#3D3D5C' } }}
        />

        {/* ── Filter Module: Category Chips ── */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {['all', 'maintenance', 'extra'].map(t => (
            <Surface
              key={t}
              mode="flat"
              style={[
                styles.chip,
                typeFilter === t && styles.chipActive
              ]}
            >
              <TouchableRipple onPress={() => setTypeFilter(t)} borderless style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                <Text style={{ color: typeFilter === t ? '#FFF' : '#888', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                  {t}
                </Text>
              </TouchableRipple>
            </Surface>
          ))}
        </View>
      </View>

      {/* ── Scrollable List of Bills ── */}
      <FlatList
        data={filteredBills}
        renderItem={renderBill}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon={viewMode === 'active' ? "check-circle-outline" : "history"} title={viewMode === 'active' ? "No active bills" : "No payment history"} subtitle={viewMode === 'active' ? "You're all caught up!" : "Past bills will appear here"} />}
      />

      {/* Admin Quick Action: Launch Bill Creation Wizard */}
      {isAdmin && (
        <FAB icon="plus" style={styles.fab} color="#FFF" onPress={() => navigation.navigate('CreateBillScreen')} />
      )}
    </View>
  );
}

// ── Shared UI Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  filterContainer: { paddingHorizontal: 16, paddingTop: 12 },
  segments: { backgroundColor: '#1A1A2E', borderRadius: 24, overflow: 'hidden' },
  // Styled chips for category filtering
  chip: { backgroundColor: '#1A1A2E', borderRadius: 20, borderWidth: 1, borderColor: '#3D3D5C', overflow: 'hidden' },
  chipActive: { backgroundColor: '#311B92', borderColor: '#7C4DFF' },
  // Layout for individual bill cards
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252542' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
});
