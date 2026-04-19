// Import React and hooks for managing component state and focus-driven updates
import React, { useState, useCallback } from 'react';
// Import layout, interaction, and system-level linking (for phone calls)
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
// Import a broad suite of MD3 thematic components from React Native Paper
import { Text, Surface, TouchableRipple, Divider, FAB, Portal, Modal, TextInput, Button, IconButton } from 'react-native-paper';
// Import standard community icons for visual metadata representation
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import society API for fetching and updating organization-level records
import { societyAPI } from '../../services/api';
// Import shared TypeScript definitions
import { SocietyInfoItem, EmergencyContact } from '../../types';
// Import common UI loading state handler
import { LoadingScreen } from '../../components/Common';
// Import global auth store to derive administrative role permissions
import { useAuthStore } from '../../store';
// Import navigation focus hook to ensure information is always current
import { useFocusEffect } from '@react-navigation/native';

// ── Icon Mapping: Mapping internal keys to Material Design visuals ──
const INFO_ICONS: Record<string, string> = {
  society_name: 'home-city', address: 'map-marker', phone: 'phone', email: 'email',
  registration_no: 'file-document', total_floors: 'stairs', total_flats: 'door',
  year_built: 'calendar', maintenance_day: 'cash-clock', meeting_schedule: 'calendar-clock',
};

// ── Contact Theming: Visual tokens for common service roles ──
const CONTACT_ICONS: Record<string, { icon: string; color: string }> = {
  Plumber: { icon: 'water-pump', color: '#00E5FF' },
  Electrician: { icon: 'flash', color: '#FFB74D' },
  Hospital: { icon: 'hospital-building', color: '#FF5252' },
  'Fire Department': { icon: 'fire-truck', color: '#FF6D00' },
  Police: { icon: 'shield', color: '#7C4DFF' },
  'Security Guard': { icon: 'security', color: '#4CAF50' },
  Doctor: { icon: 'stethoscope', color: '#E91E63' },
};

/**
 * SocietyInfoScreen:
 * The "digital notice board" for the society. Displays statutory info, 
 * organization details, and a one-tap emergency contact directory.
 */
export default function SocietyInfoScreen() {
  // ── Core Data State ──
  const [info, setInfo] = useState<SocietyInfoItem[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Modal & Logic Gates ──
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddInfo, setShowAddInfo] = useState(false);

  // ── Form State: Property Updates (Admin Only) ──
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Form State: Custom Detail Addition (Admin Only) ──
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [addingInfo, setAddingInfo] = useState(false);

  // ── Form State: Emergency Contact Creation (Admin Only) ──
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [creating, setCreating] = useState(false);

  // Derive administrative status from user session
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';

  // Synchronize data whenever the screen gains focus
  useFocusEffect(useCallback(() => { loadData(); }, []));

  /**
   * loadData:
   * Aggregates organization details and contacts from multiple API endpoints.
   */
  const loadData = async () => {
    try {
      const [infoData, contactsData] = await Promise.all([
        societyAPI.getInfo(), societyAPI.getEmergencyContacts(),
      ]);
      setInfo(infoData); 
      setContacts(contactsData);
    } catch { 
      // Silently fail if data is temporarily unavailable
    } finally { 
      setLoading(false); 
    }
  };

  /**
   * openEdit:
   * Pre-loads the specialized edit modal with existing property data.
   */
  const openEdit = (item: SocietyInfoItem) => {
    setEditKey(item.key);
    setEditValue(item.value);
    setShowEdit(true);
  };

  /**
   * handleUpdateInfo:
   * Commits a property change (e.g., updating the meeting schedule) to the backend.
   */
  const handleUpdateInfo = async () => {
    if (!editValue) { Alert.alert('Validation', 'Please provide a value'); return; }
    setSaving(true);
    try {
      await societyAPI.updateInfo(editKey, editValue);
      setShowEdit(false);
      loadData();
    } catch { 
      Alert.alert('Save Error', 'Could not update society parameter'); 
    } finally { 
      setSaving(false); 
    }
  };

  /**
   * handleAddInfo:
   * Dynamically adds a new society parameter (e.g., "Solar Vendor Contact").
   */
  const handleAddInfo = async () => {
    if (!newKey || !newValue) { Alert.alert('Validation', 'Label and Value are mandatory'); return; }
    setAddingInfo(true);
    try {
      // Transform human label into a programmatic snake_case key
      const formattedKey = newKey.trim().toLowerCase().replace(/\s+/g, '_');
      await societyAPI.updateInfo(formattedKey, newValue);
      setShowAddInfo(false);
      setNewKey('');
      setNewValue('');
      loadData();
    } catch { 
      Alert.alert('Add Error', 'Failed to persist new society detail'); 
    } finally { 
      setAddingInfo(false); 
    }
  };

  /**
   * handleAddContact:
   * Enrolls a new service provider in the emergency directory.
   */
  const handleAddContact = async () => {
    if (!name || !phone || !role) { Alert.alert('Validation', 'Please fill all fields for the contact'); return; }
    setCreating(true);
    try {
      await societyAPI.createEmergencyContact({ name, phone, role });
      setShowAdd(false); 
      setName(''); 
      setPhone(''); 
      setRole('');
      loadData();
    } catch (e: any) { 
      Alert.alert('Contact Error', 'Could not add to directory'); 
    } finally { 
      setCreating(false); 
    }
  };

  /**
   * handleDeleteContact:
   * Prunes a contact from the emergency list with a confirmation safeguard.
   */
  const handleDeleteContact = (id: string) => {
    Alert.alert('Prune Contact', 'Are you sure? This will remove the one-tap dial option for all residents.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: async () => { await societyAPI.deleteEmergencyContact(id); loadData(); } },
    ]);
  };

  // Initial loading state gate
  if (loading) return <LoadingScreen />;

  // Utility to prettify snake_case keys into human-readable headers
  const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* ── Section: Statutory & Org Details ── */}
      <Text variant="titleMedium" style={{ color: '#888', fontWeight: '600', marginBottom: 12 }}>Society Credentials</Text>
      <Surface style={styles.card} elevation={1}>
        {info.map((item, i) => (
          <View key={item.key}>
            <View style={styles.infoRow}>
              {/* Context-aware iconography */}
              <MaterialCommunityIcons name={(INFO_ICONS[item.key] || 'information') as any} size={20} color="#7C4DFF" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="bodySmall" style={{ color: '#888' }}>{formatKey(item.key)}</Text>
                <Text variant="bodyMedium" style={{ color: '#E8E8F0' }}>{item.value}</Text>
              </View>
              {/* Administrative Edit Path */}
              {isAdmin && (
                <IconButton icon="pencil" size={16} iconColor="#4CAF50" onPress={() => openEdit(item)} />
              )}
            </View>
            {/* Visual separator for row clarity */}
            {i < info.length - 1 && <Divider style={{ backgroundColor: '#252542', marginVertical: 8 }} />}
          </View>
        ))}
      </Surface>

      {/* Admin Action: Extend society metadata */}
      {isAdmin && (
        <Button mode="outlined" onPress={() => setShowAddInfo(true)} textColor="#7C4DFF"
          style={{ borderRadius: 12, borderColor: '#3D3D5C', marginTop: 12 }} icon="plus-box">
          Add Custom Attribute
        </Button>
      )}

      {/* ── Section: Critical & Service Contacts ── */}
      <Text variant="titleMedium" style={{ color: '#888', fontWeight: '600', marginBottom: 12, marginTop: 24 }}>
        One-Tap Emergency Dial
      </Text>
      {contacts.map(c => {
        // Derive theme from role or fallback to default
        const cConfig = CONTACT_ICONS[c.role] || { icon: 'phone', color: '#888' };
        return (
          <TouchableRipple key={c.id} onPress={() => Linking.openURL(`tel:${c.phone}`)} borderless style={{ borderRadius: 16, marginBottom: 8 }}>
            <Surface style={styles.contactCard} elevation={1}>
              <View style={styles.row}>
                {/* Visual token for the service category */}
                <View style={[styles.iconBox, { backgroundColor: `${cConfig.color}20` }]}>
                  <MaterialCommunityIcons name={cConfig.icon as any} size={22} color={cConfig.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{c.name}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>{c.role} • {c.phone}</Text>
                </View>
                <MaterialCommunityIcons name="phone-outgoing" size={20} color="#4CAF50" />
              </View>
              {/* Administrative Removal (Quick Close) */}
              {isAdmin && (
                <TouchableRipple onPress={() => handleDeleteContact(c.id)} borderless style={{ position: 'absolute', top: 8, right: 8, padding: 4 }}>
                  <MaterialCommunityIcons name="close-circle" size={16} color="#FF5252" />
                </TouchableRipple>
              )}
            </Surface>
          </TouchableRipple>
        );
      })}

      {/* Admin Action: Directory Expansion */}
      {isAdmin && (
        <Button mode="outlined" onPress={() => setShowAdd(true)} textColor="#7C4DFF"
          style={{ borderRadius: 12, borderColor: '#3D3D5C', marginTop: 12 }} icon="account-plus">
          Register New Service
        </Button>
      )}

      {/* ── Portal Flow: Administrative Modals ── */}
      
      {/* Utility: Edit Existing Property */}
      <Portal>
        <Modal visible={showEdit} onDismiss={() => setShowEdit(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>
            Modify {formatKey(editKey)}
          </Text>
          <TextInput label="Updated Value" value={editValue} onChangeText={setEditValue} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" multiline={editKey === 'address'} />
          <Button mode="contained" onPress={handleUpdateInfo} loading={saving} disabled={saving}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Save changes</Button>
        </Modal>
      </Portal>

      {/* Utility: Append New society Attribute */}
      <Portal>
        <Modal visible={showAddInfo} onDismiss={() => setShowAddInfo(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>
            New Society Parameter
          </Text>
          <TextInput label="Descriptor (e.g. GST Number)" value={newKey} onChangeText={setNewKey} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Value" value={newValue} onChangeText={setNewValue} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" multiline />
          <Button mode="contained" onPress={handleAddInfo} loading={addingInfo} disabled={addingInfo}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Commit record</Button>
        </Modal>
      </Portal>

      {/* Utility: Directory Enrollment */}
      <Portal>
        <Modal visible={showAdd} onDismiss={() => setShowAdd(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>Service Registry</Text>
          <TextInput label="Full Name / Agency *" value={name} onChangeText={setName} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Phone Number *" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad"
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Designation (e.g. Lift Operator) *" value={role} onChangeText={setRole} mode="outlined"
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <Button mode="contained" onPress={handleAddContact} loading={creating} disabled={creating}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Save to Directory</Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 16 },
  contactCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },
  input: { marginBottom: 12, backgroundColor: '#1A1A2E' },
});
