import React, { useState, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Linking } from 'react-native';
import { Text, Surface, TouchableRipple, SegmentedButtons, FAB, ActivityIndicator, IconButton, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBillsStore, useAuthStore } from '../../store';
import { StatusBadge, EmptyState, LoadingScreen } from '../../components/Common';
import { Bill } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import { billsAPI } from '../../services/api';

export default function BillsListScreen({ navigation }: any) {
  const { bills, loading, fetchBills } = useBillsStore();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  // For Admin: 'active' = current bills, 'history' = archived bills
  // For Resident: 'active' = due/overdue, 'history' = paid
  const [viewMode, setViewMode] = useState('active'); // active | history
  const [typeFilter, setTypeFilter] = useState('all'); // all | maintenance | extra
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

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
                buttonColor="#1A2E1A" // Dark green tint for background
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

  useFocusEffect(useCallback(() => {
    loadBills();
  }, [viewMode]));

  const loadBills = async () => {
    // Fetch all bills (no active_only filter) so we can sort paid into history
    await fetchBills();
  };

  const onRefresh = async () => { setRefreshing(true); await loadBills(); setRefreshing(false); };

  const filteredBills = bills.filter(b => {
    // 1. Filter by View Mode
    if (!isAdmin) {
      // Resident Logic
      const isPaid = b.payment_status === 'paid' || b.payment_status === 'overdue_paid';
      if (viewMode === 'active' && isPaid) return false;
      if (viewMode === 'history' && !isPaid) return false;
    } else {
      // Admin Logic: "History" = archived OR fully paid, "Active" = active AND not fully paid
      const isFullyPaid = b.payment_status === 'paid';
      if (viewMode === 'active' && (!b.is_active || isFullyPaid)) return false;
      if (viewMode === 'history' && b.is_active && !isFullyPaid) return false;
    }

    // 2. Filter by Type
    if (typeFilter === 'maintenance') return b.bill_type === 'maintenance';
    if (typeFilter === 'extra') return b.bill_type === 'extra';
    return true;
  });

  const renderBill = ({ item }: { item: Bill }) => (
    <TouchableRipple onPress={() => navigation.navigate('BillDetail', { billId: item.id })} borderless style={{ borderRadius: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardHeader}>
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
          <StatusBadge status={item.payment_status || 'due'} />
        </View>
        <View style={styles.cardFooter}>
          <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '700' }}>₹{item.amount.toLocaleString()}</Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>
            {item.payment_status === 'paid' ? 'Paid' : item.payment_status === 'overdue' ? 'Overdue' : `Due: ${item.due_date}`}
          </Text>
        </View>
      </Surface>
    </TouchableRipple>
  );

  if (loading && bills.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        {/* Main View Toggle */}
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

        {/* Type Filter Chips */}
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

      <FlatList
        data={filteredBills}
        renderItem={renderBill}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon={viewMode === 'active' ? "check-circle-outline" : "history"} title={viewMode === 'active' ? "No active bills" : "No payment history"} subtitle={viewMode === 'active' ? "You're all caught up!" : "Past bills will appear here"} />}
      />

      {isAdmin && (
        <FAB icon="plus" style={styles.fab} color="#FFF" onPress={() => navigation.navigate('CreateBillScreen')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  filterContainer: { paddingHorizontal: 16, paddingTop: 12 },
  segments: { backgroundColor: '#1A1A2E', borderRadius: 24, overflow: 'hidden' },
  chip: { backgroundColor: '#1A1A2E', borderRadius: 20, borderWidth: 1, borderColor: '#3D3D5C', overflow: 'hidden' },
  chipActive: { backgroundColor: '#311B92', borderColor: '#7C4DFF' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252542' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
});
