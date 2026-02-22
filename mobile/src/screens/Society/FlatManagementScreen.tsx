import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Surface, FAB, Button, TextInput, Portal, Modal, TouchableRipple, Searchbar, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { flatsAPI, residentsAPI, onboardingAPI } from '../../services/api';
import { Flat, ResidentInfo, PendingUser } from '../../types';
import { useAuthStore } from '../../store';
import { LoadingScreen, EmptyState } from '../../components/Common';
import { useFocusEffect } from '@react-navigation/native';

const RESIDENT_TYPE_LABELS: Record<string, string> = {
  owner: 'Flat Owner',
  owner_family: "Owner's Family",
  renter: 'Renter',
  renter_family: "Renter's Family",
};

const RESIDENT_TYPE_COLORS: Record<string, string> = {
  owner: '#FFB74D',
  owner_family: '#4FC3F7',
  renter: '#81C784',
  renter_family: '#CE93D8',
};

export default function FlatManagementScreen() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';

  const [flats, setFlats] = useState<Flat[]>([]);
  const [residents, setResidents] = useState<ResidentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Pending Approvals State
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Create Flat State
  const [showCreate, setShowCreate] = useState(false);
  const [flatNumber, setFlatNumber] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [creating, setCreating] = useState(false);

  // Assign Resident State
  const [showAssign, setShowAssign] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const [flatsData, residentsData] = await Promise.all([
        flatsAPI.list(), residentsAPI.list(),
      ]);
      setFlats(flatsData.sort((a, b) => a.flat_number.localeCompare(b.flat_number)));
      setResidents(residentsData);
    } catch { Alert.alert('Error', 'Failed to load data'); }
    finally { setLoading(false); }
    if (isAdmin) fetchPendingApprovals();
  };

  const fetchPendingApprovals = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await onboardingAPI.pendingApprovals();
      setPendingUsers(data);
    } catch { /* silently fail */ }
    finally { setPendingLoading(false); }
  }, []);

  const handleApproval = async (userId: string, approve: boolean) => {
    const action = approve ? 'approve' : 'reject';
    Alert.alert(
      `${approve ? 'Approve' : 'Reject'} Owner`,
      `Are you sure you want to ${action} this flat owner?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await onboardingAPI.approve(userId, approve);
              Alert.alert('Done', `Owner ${action}d successfully`);
              fetchPendingApprovals();
              loadData();
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.detail || `Failed to ${action} owner`);
            }
          },
        },
      ],
    );
  };

  const handleCreateFlat = async () => {
    if (!flatNumber || !block || !floor) { Alert.alert('Error', 'All fields required'); return; }
    setCreating(true);
    try {
      await flatsAPI.create({ flat_number: flatNumber, block, floor });
      setShowCreate(false); setFlatNumber(''); setBlock(''); setFloor('');
      loadData();
    } catch (e: any) { Alert.alert('Error', 'Failed to create flat'); }
    finally { setCreating(false); }
  };

  const handleAssign = async (userId: string) => {
    if (!selectedFlat) return;
    setAssigning(true);
    try {
      await flatsAPI.assignUser(userId, selectedFlat.id);
      setShowAssign(false); setSelectedFlat(null);
      loadData();
      Alert.alert('Success', 'Resident assigned');
    } catch { Alert.alert('Error', 'Failed to assign'); }
    finally { setAssigning(false); }
  };

  const handleUnassign = (flat: Flat) => {
    const resident = residents.find(r => r.flat_id === flat.id);
    if (!resident) return;
    Alert.alert('Unassign', `Remove ${resident.name} from this flat?`, [
      { text: 'Cancel' },
      {
        text: 'Unassign', style: 'destructive', onPress: async () => {
          try {
            await flatsAPI.assignUser(resident.id, null);
            loadData();
          } catch { Alert.alert('Error', 'Failed to unassign'); }
        }
      },
    ]);
  };

  const openAssignModal = (flat: Flat) => {
    setSelectedFlat(flat);
    setResidentSearch('');
    setShowAssign(true);
  };

  // derived state
  const filteredFlats = flats.filter(f =>
    f.flat_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.block.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableResidents = residents.filter(r => !r.flat_id || r.flat_id === selectedFlat?.id);
  const filteredResidents = residents.filter(r =>
    r.name.toLowerCase().includes(residentSearch.toLowerCase()) ||
    r.email.toLowerCase().includes(residentSearch.toLowerCase())
  );

  const getResidentForFlat = (flatId: string) => residents.find(r => r.flat_id === flatId);

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* Pending Owner Approvals Section */}
      {isAdmin && pendingUsers.length > 0 && (
        <View style={styles.pendingSection}>
          <View style={styles.pendingSectionHeader}>
            <MaterialCommunityIcons name="account-clock" size={22} color="#FFB74D" />
            <Text variant="titleSmall" style={{ color: '#FFB74D', fontWeight: '700', marginLeft: 8 }}>
              Pending Owner Approvals ({pendingUsers.length})
            </Text>
          </View>
          <ScrollView horizontal={false} style={{ maxHeight: 220 }}>
            {pendingUsers.map((p) => (
              <Surface key={p.id} style={styles.pendingCard} elevation={2}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall" style={{ color: '#E8E8F0', fontWeight: '600' }}>{p.name}</Text>
                    <Text variant="bodySmall" style={{ color: '#888' }}>{p.email}</Text>
                  </View>
                  <Chip
                    textStyle={{ color: RESIDENT_TYPE_COLORS[p.resident_type || ''] || '#888', fontSize: 10 }}
                    style={{ backgroundColor: '#12121F' }}
                    compact
                  >
                    {RESIDENT_TYPE_LABELS[p.resident_type || ''] || p.resident_type}
                  </Chip>
                </View>
                {p.flat_number && (
                  <Text variant="bodySmall" style={{ color: '#AAA', marginBottom: 8 }}>
                    Flat {p.flat_number} · Block {p.block} · Floor {p.floor}
                  </Text>
                )}
                <Divider style={{ backgroundColor: '#2D2D45', marginBottom: 8 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    mode="contained"
                    onPress={() => handleApproval(p.id, true)}
                    buttonColor="#4CAF50"
                    style={{ flex: 1, borderRadius: 10 }}
                    compact
                    icon="check"
                  >
                    Approve
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleApproval(p.id, false)}
                    textColor="#FF5252"
                    style={{ flex: 1, borderRadius: 10, borderColor: '#3D3D5C' }}
                    compact
                    icon="close"
                  >
                    Reject
                  </Button>
                </View>
              </Surface>
            ))}
          </ScrollView>
        </View>
      )}

      <Searchbar
        placeholder="Search flats..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={{ color: '#E8E8F0' }}
        iconColor="#888"
        placeholderTextColor="#666"
      />

      <FlatList
        data={filteredFlats}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={<EmptyState icon="home-city-outline" title="No flats found" />}
        renderItem={({ item }) => {
          const resident = getResidentForFlat(item.id);
          return (
            <Surface style={styles.card} elevation={1}>
              <View style={styles.row}>
                <View style={styles.iconBox}>
                  <Text style={{ color: '#7C4DFF', fontWeight: '700', fontSize: 16 }}>{item.flat_number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Block {item.block} • Floor {item.floor}</Text>
                  {resident ? (
                    <Text variant="titleSmall" style={{ color: '#4CAF50', marginTop: 2 }}>{resident.name}</Text>
                  ) : (
                    <Text variant="bodySmall" style={{ color: '#FF5252', marginTop: 2 }}>Vacant</Text>
                  )}
                </View>
                {resident ? (
                  <Button mode="outlined" compact onPress={() => handleUnassign(item)} textColor="#FF5252" style={{ borderColor: '#3D3D5C' }}>
                    Unassign
                  </Button>
                ) : (
                  <Button mode="outlined" compact onPress={() => openAssignModal(item)} textColor="#7C4DFF" style={{ borderColor: '#3D3D5C' }}>
                    Assign
                  </Button>
                )}
              </View>
            </Surface>
          );
        }}
      />

      <FAB icon="plus" style={styles.fab} color="#FFF" onPress={() => setShowCreate(true)} label="New Flat" />

      {/* Create Flat Modal */}
      <Portal>
        <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>Add New Flat</Text>
          <TextInput label="Flat Number" value={flatNumber} onChangeText={setFlatNumber} mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Block" value={block} onChangeText={setBlock} mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Floor" value={floor} onChangeText={setFloor} keyboardType="numeric" mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <Button mode="contained" onPress={handleCreateFlat} loading={creating} disabled={creating} buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Create Flat</Button>
        </Modal>
      </Portal>

      {/* Assign Resident Modal */}
      <Portal>
        <Modal visible={showAssign} onDismiss={() => setShowAssign(false)} contentContainerStyle={[styles.modal, { height: '60%' }]}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>
            Assign to {selectedFlat?.flat_number}
          </Text>
          <Searchbar
            placeholder="Search residents..."
            onChangeText={setResidentSearch}
            value={residentSearch}
            style={[styles.searchBar, { marginBottom: 12 }]}
            inputStyle={{ color: '#E8E8F0' }}
            iconColor="#888" placeholderTextColor="#666"
          />
          <FlatList
            data={filteredResidents}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableRipple onPress={() => handleAssign(item.id)} style={styles.residentItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="account-circle" size={32} color="#7C4DFF" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ color: '#E8E8F0', fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>{item.email}</Text>
                  </View>
                  {item.flat_id && item.flat_id !== selectedFlat?.id && (
                    <Text style={{ color: '#FF5252', fontSize: 10, marginLeft: 'auto' }}>Has Flat</Text>
                  )}
                </View>
              </TouchableRipple>
            )}
          />
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  pendingSection: { margin: 16, marginBottom: 0 },
  pendingSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pendingCard: { backgroundColor: '#1A1A2E', borderRadius: 14, padding: 14, marginBottom: 8 },
  searchBar: { margin: 16, backgroundColor: '#1A1A2E', borderRadius: 12, elevation: 2 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 8, marginHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#1A1A3E', justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },
  input: { marginBottom: 12, backgroundColor: '#1A1A2E' },
  residentItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#3D3D5C' },
});
