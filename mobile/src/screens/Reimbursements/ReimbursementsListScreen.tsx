import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Surface, TouchableRipple, FAB, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useReimbursementsStore, useAuthStore } from '../../store';
import { StatusBadge, EmptyState, LoadingScreen } from '../../components/Common';
import { ReimbursementRequest } from '../../types';
import { useFocusEffect } from '@react-navigation/native';

export default function ReimbursementsListScreen({ navigation }: any) {
  const { requests, loading, fetchRequests } = useReimbursementsStore();
  const user = useAuthStore(s => s.user);
  const [viewMode, setViewMode] = useState('active'); // active | history
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchRequests(); }, []));
  const onRefresh = async () => { setRefreshing(true); await fetchRequests(); setRefreshing(false); };

  const filteredRequests = requests.filter(r => {
    const isHistory = ['rejected', 'paid'].includes(r.status);
    if (viewMode === 'active' && isHistory) return false;
    if (viewMode === 'history' && !isHistory) return false;
    return true;
  });

  const renderItem = ({ item }: { item: ReimbursementRequest }) => (
    <TouchableRipple onPress={() => navigation.navigate('ReimbursementDetail', { requestId: item.id })} borderless style={{ borderRadius: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.row}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="cash-refund" size={24} color="#00E5FF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{item.title}</Text>
            <Text variant="bodySmall" style={{ color: '#888' }}>{item.category} • {item.expense_date}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text variant="titleSmall" style={{ color: '#E8E8F0', fontWeight: '700', paddingRight: 8 }}>₹{item.amount}</Text>
            <StatusBadge status={item.status} />
          </View>
        </View>
      </Surface>
    </TouchableRipple>
  );

  if (loading && requests.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
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
      </View>

      <FlatList
        data={filteredRequests}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon={viewMode === 'active' ? "cash-multiple" : "history"} title={viewMode === 'active' ? "No pending requests" : "No history"} subtitle={viewMode === 'active' ? "Submit a new claim to get started" : "Past reimbursements will appear here"} />}
      />
      {user?.role === 'resident' && (
        <FAB icon="plus" style={styles.fab} color="#FFF" onPress={() => navigation.navigate('CreateReimbursement')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  filterContainer: { paddingHorizontal: 16, paddingTop: 12 },
  segments: { backgroundColor: '#1A1A2E' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0A2E3D', justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
});
