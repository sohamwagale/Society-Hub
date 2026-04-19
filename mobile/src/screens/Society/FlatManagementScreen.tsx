// Import React and hooks for state management and focus-driven synchronization
import React, { useState, useCallback } from 'react';
// Import layout, list rendering, and feedback components
import { View, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
// Import a comprehensive set of MD3 components from React Native Paper
import { Text, Surface, FAB, Button, TextInput, Portal, Modal, TouchableRipple, Searchbar, Chip, Divider } from 'react-native-paper';
// Import community icons for visual state representation (e.g., account-clock)
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import specialized APIs for flats, residents, and the registration bottleneck (onboarding)
import { flatsAPI, residentsAPI, onboardingAPI } from '../../services/api';
// Import shared TypeScript definitions
import { Flat, ResidentInfo, PendingUser } from '../../types';
// Import global auth store to verify administrative clearance
import { useAuthStore } from '../../store';
// Import common UI states for loading and empty sets
import { LoadingScreen, EmptyState } from '../../components/Common';
// Import navigation focus hook to ensure occupancy data is always accurate
import { useFocusEffect } from '@react-navigation/native';

// ── Shared Tokens: Human-readable mapping for resident archetypes ──
const RESIDENT_TYPE_LABELS: Record<string, string> = {
  owner: 'Flat Owner',
  owner_family: "Owner's Family",
  renter: 'Renter',
  renter_family: "Renter's Family",
};

// ── Shared Tokens: Visual status indicators ──
const RESIDENT_TYPE_COLORS: Record<string, string> = {
  owner: '#FFB74D',
  owner_family: '#4FC3F7',
  renter: '#81C784',
  renter_family: '#CE93D8',
};

/**
 * FlatManagementScreen:
 * The command center for society occupancy. 
 * Handles Admin tasks: Onboarding Approval, Flat Creation, and Resident Assignment.
 */
export default function FlatManagementScreen() {
  // Extract user session to gate sensitive moderation tools
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';

  // ── Core Data State ──
  const [flats, setFlats] = useState<Flat[]>([]);
  const [residents, setResidents] = useState<ResidentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Approval Pipeline State (Pending Registration Queue) ──
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // ── Creation Wizard State ──
  const [showCreate, setShowCreate] = useState(false);
  const [flatNumber, setFlatNumber] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Mapping Wizard State (Assigning Resident -> Asset) ──
  const [showAssign, setShowAssign] = useState(false);
  const [selectedFlat, setSelectedFlat] = useState<Flat | null>(null);
  const [residentSearch, setResidentSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Synchronize data whenever the screen becomes active
  useFocusEffect(useCallback(() => { loadData(); }, []));

  /**
   * loadData:
   * Aggregates the physical inventory (flats) and human directory (residents).
   */
  const loadData = async () => {
    try {
      const [flatsData, residentsData] = await Promise.all([
        flatsAPI.list(), residentsAPI.list(),
      ]);
      // Alphabetical sort for predictable navigation
      setFlats(flatsData.sort((a, b) => a.flat_number.localeCompare(b.flat_number)));
      setResidents(residentsData);
    } catch { 
      Alert.alert('Sync Error', 'Could not retrieve occupancy database'); 
    } finally { 
      setLoading(false); 
    }
    // Context-sensitive fetch: Admins need to see the KYC bottleneck
    if (isAdmin) fetchPendingApprovals();
  };

  /**
   * fetchPendingApprovals:
   * Retrieves users who have registered but aren't yet validated as stakeholders.
   */
  const fetchPendingApprovals = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await onboardingAPI.pendingApprovals();
      setPendingUsers(data);
    } catch { 
      /* Graceful failure: User may not have permission yet */
    } finally { 
      setPendingLoading(false); 
    }
  }, []);

  /**
   * handleApproval:
   * (Admin Only) Validates or Rejects a user's claim to be a society member.
   */
  const handleApproval = async (userId: string, approve: boolean) => {
    const action = approve ? 'approve' : 'reject';
    Alert.alert(
      `${approve ? 'Approve' : 'Reject'} Entry`,
      `Are you sure you want to ${action} this potential stakeholder?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Grant Access' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await onboardingAPI.approve(userId, approve);
              Alert.alert('Status Changed', `User has been ${action}d successfully`);
              fetchPendingApprovals(); // Clear from queue
              loadData(); // Update directory
            } catch (e: any) {
              Alert.alert('Process Error', e.response?.data?.detail || `Operation failed`);
            }
          },
        },
      ],
    );
  };

  /**
   * handleCreateFlat:
   * (Admin Only) Registers a new physical address in the society dataset.
   */
  const handleCreateFlat = async () => {
    if (!flatNumber || !block || !floor) { Alert.alert('Invalid Form', 'All structural details are mandatory'); return; }
    setCreating(true);
    try {
      await flatsAPI.create({ flat_number: flatNumber, block, floor });
      setShowCreate(false); 
      setFlatNumber(''); setBlock(''); setFloor('');
      loadData();
    } catch (e: any) { 
      Alert.alert('Database Error', 'Failed to register the new flat'); 
    } finally { 
      setCreating(false); 
    }
  };

  /**
   * handleAssign:
   * Maps a validated user to a specific physical flat.
   */
  const handleAssign = async (userId: string) => {
    if (!selectedFlat) return;
    setAssigning(true);
    try {
      await flatsAPI.assignUser(userId, selectedFlat.id);
      setShowAssign(false); 
      setSelectedFlat(null);
      loadData();
      Alert.alert('Relational Success', 'Resident has been linked to the flat.');
    } catch { 
      Alert.alert('Assignment Error', 'Could not establish resident link'); 
    } finally { 
      setAssigning(false); 
    }
  };

  /**
   * handleUnassign:
   * Safely severs the link between a resident and a flat (Vacating the property).
   */
  const handleUnassign = (flat: Flat) => {
    const resident = residents.find(r => r.flat_id === flat.id);
    if (!resident) return;
    Alert.alert('Vacate Property', `Are you sure you want to remove ${resident.name} from the record of this flat?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unassign', style: 'destructive', onPress: async () => {
          try {
            await flatsAPI.assignUser(resident.id, null);
            loadData();
          } catch { 
            Alert.alert('Error', 'Failed to update occupancy record'); 
          }
        }
      },
    ]);
  };

  /**
   * openAssignModal:
   * Launches the resident lookup interface for a specific flat.
   */
  const openAssignModal = (flat: Flat) => {
    setSelectedFlat(flat);
    setResidentSearch('');
    setShowAssign(true);
  };

  // ── Computed / Derived State ──
  // Filtering the master flat list based on user search tokens
  const filteredFlats = flats.filter(f =>
    f.flat_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.block.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtering the human directory to find relevant residents for mapping
  const filteredResidents = residents.filter(r =>
    r.name.toLowerCase().includes(residentSearch.toLowerCase()) ||
    r.email.toLowerCase().includes(residentSearch.toLowerCase())
  );

  const getResidentForFlat = (flatId: string) => residents.find(r => r.flat_id === flatId);

  // Initial loading gate
  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* ── Pending Approvals: The Administrative Entry Gate ── */}
      {isAdmin && pendingUsers.length > 0 && (
        <View style={styles.pendingSection}>
          <View style={styles.pendingSectionHeader}>
            <MaterialCommunityIcons name="account-clock" size={22} color="#FFB74D" />
            <Text variant="titleSmall" style={{ color: '#FFB74D', fontWeight: '700', marginLeft: 8 }}>
              Stakeholder Validation Required ({pendingUsers.length})
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
                {/* Proposed occupancy details */}
                {p.flat_number && (
                  <Text variant="bodySmall" style={{ color: '#AAA', marginBottom: 8 }}>
                    Proposed: Flat {p.flat_number} · Block {p.block} · Floor {p.floor}
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
                    icon="check-circle"
                  >
                    Approve
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleApproval(p.id, false)}
                    textColor="#FF5252"
                    style={{ flex: 1, borderRadius: 10, borderColor: '#3D3D5C' }}
                    compact
                    icon="close-circle"
                  >
                    Reject
                  </Button>
                </View>
              </Surface>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Master List Section ── */}
      <Searchbar
        placeholder="Filter by flat number or block..."
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
        ListEmptyComponent={<EmptyState icon="home-city-outline" title="Inventory Empty" subtitle="No flats match your query." />}
        renderItem={({ item }) => {
          const resident = getResidentForFlat(item.id);
          return (
            <Surface style={styles.card} elevation={1}>
              <View style={styles.row}>
                {/* Physical Location Visual */}
                <View style={styles.iconBox}>
                  <Text style={{ color: '#7C4DFF', fontWeight: '700', fontSize: 16 }}>{item.flat_number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Block {item.block} • Floor {item.floor}</Text>
                  {/* Human Link Visualization */}
                  {resident ? (
                    <Text variant="titleSmall" style={{ color: '#4CAF50', marginTop: 2 }}>{resident.name}</Text>
                  ) : (
                    <Text variant="bodySmall" style={{ color: '#FF5252', marginTop: 2 }}>Vacant / Unassigned</Text>
                  )}
                </View>
                {/* Contextual Mapping Actions */}
                {resident ? (
                  <Button mode="outlined" compact onPress={() => handleUnassign(item)} textColor="#FF5252" style={{ borderColor: '#3D3D5C' }}>
                    Vacate
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

      {/* High-level action: Inventory Expansion */}
      <FAB icon="plus" style={styles.fab} color="#FFF" onPress={() => setShowCreate(true)} label="Add Asset" />

      {/* ── Wizards: Interaction Portals ── */}
      
      {/* Creation Wizard: Asset Registration */}
      <Portal>
        <Modal visible={showCreate} onDismiss={() => setShowCreate(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>Physical Inventory Entry</Text>
          <TextInput label="Flat / Unit Number" value={flatNumber} onChangeText={setFlatNumber} mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Block / wing" value={block} onChangeText={setBlock} mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Floor Level" value={floor} onChangeText={setFloor} keyboardType="numeric" mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <Button mode="contained" onPress={handleCreateFlat} loading={creating} disabled={creating} buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Commit Asset</Button>
        </Modal>
      </Portal>

      {/* Mapping Wizard: Relational Enrollment */}
      <Portal>
        <Modal visible={showAssign} onDismiss={() => setShowAssign(false)} contentContainerStyle={[styles.modal, { height: '60%' }]}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>
            Locating Resident for {selectedFlat?.flat_number}
          </Text>
          <Searchbar
            placeholder="Search by name or email..."
            onChangeText={setResidentSearch}
            value={residentSearch}
            style={[styles.searchBar, { marginBottom: 12, marginHorizontal: 0 }]}
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
                  {/* Occupancy Guard Visualization */}
                  {item.flat_id && item.flat_id !== selectedFlat?.id && (
                    <View style={{ marginLeft: 'auto', backgroundColor: '#311B92', paddingHorizontal: 6, borderRadius: 4 }}>
                      <Text style={{ color: '#FF5252', fontSize: 10 }}>Conflict: Occupied</Text>
                    </View>
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

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  // Styled section for administrative KYC
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
