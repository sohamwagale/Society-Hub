import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Linking, Alert } from 'react-native';
import { Text, Surface, Searchbar, Avatar, TouchableRipple, Button, Portal, Modal, TextInput, Menu, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { residentsAPI } from '../../services/api';
import { ResidentInfo, ResidentStats } from '../../types';
import { EmptyState, LoadingScreen, StatCard } from '../../components/Common';
import { useAuthStore } from '../../store';
import { useFocusEffect } from '@react-navigation/native';

export default function ResidentDirectoryScreen() {
  const { user } = useAuthStore();
  const [residents, setResidents] = useState<ResidentInfo[]>([]);
  const [stats, setStats] = useState<ResidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Committee Management State
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [editResident, setEditResident] = useState<ResidentInfo | null>(null);
  const [committeeRole, setCommitteeRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const [resList, statsData] = await Promise.all([residentsAPI.list(), residentsAPI.stats()]);
      setResidents(resList);
      setStats(statsData);
    } catch { } finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleSetCommittee = async () => {
    if (!editResident) return;
    setSaving(true);
    try {
      await residentsAPI.setCommittee(editResident.id, true, committeeRole);
      setResidents(prev => prev.map(r => r.id === editResident.id ? { ...r, is_committee: true, committee_role: committeeRole } : r));
      setShowModal(false);
      Alert.alert('Success', 'Committee member updated');
    } catch { Alert.alert('Error', 'Failed to update role'); }
    finally { setSaving(false); }
  };

  const handleRemoveCommittee = async (id: string) => {
    Alert.alert('Remove from Committee', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await residentsAPI.setCommittee(id, false, '');
            setResidents(prev => prev.map(r => r.id === id ? { ...r, is_committee: false, committee_role: undefined } : r));
          } catch { Alert.alert('Error', 'Failed to remove'); }
        }
      }
    ]);
  };

  const openEditModal = (resident: ResidentInfo) => {
    setEditResident(resident);
    setCommitteeRole(resident.committee_role || '');
    setShowModal(true);
    setMenuVisible(null);
  };

  const filtered = residents.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.flat_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.block || '').toLowerCase().includes(search.toLowerCase())
  );

  const committeeList = filtered.filter(r => r.is_committee);
  const otherResidents = filtered.filter(r => !r.is_committee);

  const callResident = (phone: string) => Linking.openURL(`tel:${phone}`);

  const renderItem = ({ item }: { item: ResidentInfo }) => { // Standard list item
    const initials = item.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const isAdmin = user?.role === 'admin';

    return (
      <Surface style={styles.card} elevation={1}>
        <View style={styles.row}>
          <Avatar.Text size={44} label={initials} style={{ backgroundColor: item.role === 'admin' ? '#311B92' : (item.is_committee ? '#FF6F00' : '#252542') }} color="#E8E8F0" />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{item.name}</Text>
              {item.role === 'admin' && (
                <View style={styles.badge}><Text style={[styles.badgeText, { color: '#FFB74D' }]}>ADMIN</Text></View>
              )}
              {item.is_committee && !item.role.includes('admin') && (
                <View style={[styles.badge, { backgroundColor: '#2E1C0E' }]}><Text style={[styles.badgeText, { color: '#FF9800' }]}>{item.committee_role || 'COMMITTEE'}</Text></View>
              )}
            </View>
            <Text variant="bodySmall" style={{ color: '#888' }}>
              {item.flat_number ? `${item.block}-${item.flat_number}` : 'No flat'} • {item.is_committee ? item.committee_role : `Floor ${item.floor || '-'}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row' }}>
            {item.phone && (
              <IconButton icon="phone" iconColor="#4CAF50" size={20} onPress={() => callResident(item.phone!)} />
            )}

            {isAdmin && (
              <Menu
                visible={menuVisible === item.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={<IconButton icon="dots-vertical" iconColor="#888" size={20} onPress={() => setMenuVisible(item.id)} />}
                contentStyle={{ backgroundColor: '#1A1A2E' }}
              >
                <Menu.Item onPress={() => openEditModal(item)} title={item.is_committee ? "Edit Role" : "Add to Committee"} titleStyle={{ color: '#E8E8F0' }} />
                {item.is_committee && (
                  <Menu.Item onPress={() => { setMenuVisible(null); handleRemoveCommittee(item.id); }} title="Remove from Committee" titleStyle={{ color: '#FF5252' }} />
                )}
              </Menu>
            )}
          </View>
        </View>
      </Surface>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text variant="titleMedium" style={{ color: '#7C4DFF', fontWeight: '700' }}>{title}</Text>
      <View style={{ backgroundColor: '#311B92', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{count}</Text>
      </View>
    </View>
  );

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Stats row */}
      {stats && (
        <View style={styles.statsRow}>
          <StatCard icon="account-group" label="Residents" value={stats.total_residents} color="#7C4DFF" />
          <StatCard icon="home-city" label="Occupied" value={stats.occupied_flats} color="#4CAF50" />
          <StatCard icon="home-outline" label="Vacant" value={stats.vacant_flats} color="#FF6D00" />
        </View>
      )}

      <Searchbar
        placeholder="Search..."
        value={search} onChangeText={setSearch}
        style={styles.searchbar} inputStyle={{ color: '#E8E8F0' }}
        iconColor="#888" placeholderTextColor="#666"
      />

      <FlatList
        data={search ? filtered : otherResidents}
        renderItem={({ item }) => renderItem({ item })}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
        ListHeaderComponent={
          !search && committeeList.length > 0 ? (
            <View>
              {renderSectionHeader("Committee Members", committeeList.length)}
              {committeeList.map(item => <View key={item.id} style={{ marginBottom: 8 }}>{renderItem({ item })}</View>)}
              {renderSectionHeader("All Residents", otherResidents.length)}
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState icon="account-search" title="No residents found" subtitle="Try a different search" />}
      />

      {/* Edit Committee Role Modal */}
      <Portal>
        <Modal visible={showModal} onDismiss={() => setShowModal(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>
            {editResident?.is_committee ? 'Edit Role' : 'Add to Committee'}
          </Text>
          <Text variant="bodyMedium" style={{ color: '#888', marginBottom: 12 }}>
            Assign a role for {editResident?.name} (e.g. Treasurer, Secretary)
          </Text>
          <TextInput
            label="Role (e.g. Secretary)"
            value={committeeRole}
            onChangeText={setCommitteeRole}
            mode="outlined"
            style={styles.input}
            outlineColor="#3D3D5C"
            activeOutlineColor="#7C4DFF"
            textColor="#E8E8F0"
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Button onPress={() => setShowModal(false)} textColor="#888">Cancel</Button>
            <Button mode="contained" onPress={handleSetCommittee} loading={saving} buttonColor="#7C4DFF">Save</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8 },
  searchbar: { backgroundColor: '#1A1A2E', marginHorizontal: 16, marginVertical: 8, borderRadius: 12 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { backgroundColor: '#2E2A0E', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },
  input: { marginBottom: 20, backgroundColor: '#1A1A2E' },
});
