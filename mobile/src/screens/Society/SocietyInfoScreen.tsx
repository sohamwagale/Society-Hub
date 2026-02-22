import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { Text, Surface, TouchableRipple, Divider, FAB, Portal, Modal, TextInput, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { societyAPI } from '../../services/api';
import { SocietyInfoItem, EmergencyContact } from '../../types';
import { LoadingScreen } from '../../components/Common';
import { useAuthStore } from '../../store';
import { useFocusEffect } from '@react-navigation/native';

const INFO_ICONS: Record<string, string> = {
  society_name: 'home-city', address: 'map-marker', phone: 'phone', email: 'email',
  registration_no: 'file-document', total_floors: 'stairs', total_flats: 'door',
  year_built: 'calendar', maintenance_day: 'cash-clock', meeting_schedule: 'calendar-clock',
};

const CONTACT_ICONS: Record<string, { icon: string; color: string }> = {
  Plumber: { icon: 'water-pump', color: '#00E5FF' },
  Electrician: { icon: 'flash', color: '#FFB74D' },
  Hospital: { icon: 'hospital-building', color: '#FF5252' },
  'Fire Department': { icon: 'fire-truck', color: '#FF6D00' },
  Police: { icon: 'shield', color: '#7C4DFF' },
  'Security Guard': { icon: 'security', color: '#4CAF50' },
  Doctor: { icon: 'stethoscope', color: '#E91E63' },
};

export default function SocietyInfoScreen() {
  const [info, setInfo] = useState<SocietyInfoItem[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  // Edit Info State
  const [showEdit, setShowEdit] = useState(false);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Add Info State
  const [showAddInfo, setShowAddInfo] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [addingInfo, setAddingInfo] = useState(false);

  // Add Contact State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [creating, setCreating] = useState(false);

  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'admin';

  useFocusEffect(useCallback(() => { loadData(); }, []));
  const loadData = async () => {
    try {
      const [infoData, contactsData] = await Promise.all([
        societyAPI.getInfo(), societyAPI.getEmergencyContacts(),
      ]);
      setInfo(infoData); setContacts(contactsData);
    } catch { } finally { setLoading(false); }
  };

  const openEdit = (item: SocietyInfoItem) => {
    setEditKey(item.key);
    setEditValue(item.value);
    setShowEdit(true);
  };

  const handleUpdateInfo = async () => {
    if (!editValue) { Alert.alert('Error', 'Value required'); return; }
    setSaving(true);
    try {
      await societyAPI.updateInfo(editKey, editValue);
      setShowEdit(false);
      loadData();
    } catch { Alert.alert('Error', 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleAddInfo = async () => {
    if (!newKey || !newValue) { Alert.alert('Error', 'Both label and value are required'); return; }
    setAddingInfo(true);
    try {
      const formattedKey = newKey.trim().toLowerCase().replace(/\s+/g, '_');
      await societyAPI.updateInfo(formattedKey, newValue);
      setShowAddInfo(false);
      setNewKey('');
      setNewValue('');
      loadData();
    } catch { Alert.alert('Error', 'Failed to add info'); }
    finally { setAddingInfo(false); }
  };

  const handleAddContact = async () => {
    if (!name || !phone || !role) { Alert.alert('Error', 'All fields required'); return; }
    setCreating(true);
    try {
      await societyAPI.createEmergencyContact({ name, phone, role });
      setShowAdd(false); setName(''); setPhone(''); setRole('');
      loadData();
    } catch (e: any) { Alert.alert('Error', 'Failed to add'); }
    finally { setCreating(false); }
  };

  const handleDeleteContact = (id: string) => {
    Alert.alert('Delete', 'Remove this contact?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await societyAPI.deleteEmergencyContact(id); loadData(); } },
    ]);
  };

  if (loading) return <LoadingScreen />;

  const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Society Info */}
      <Text variant="titleMedium" style={{ color: '#888', fontWeight: '600', marginBottom: 8 }}>Society Details</Text>
      <Surface style={styles.card} elevation={1}>
        {info.map((item, i) => (
          <View key={item.key}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name={(INFO_ICONS[item.key] || 'information') as any} size={20} color="#7C4DFF" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="bodySmall" style={{ color: '#888' }}>{formatKey(item.key)}</Text>
                <Text variant="bodyMedium" style={{ color: '#E8E8F0' }}>{item.value}</Text>
              </View>
              {isAdmin && (
                <IconButton icon="pencil" size={16} iconColor="#4CAF50" onPress={() => openEdit(item)} />
              )}
            </View>
            {i < info.length - 1 && <Divider style={{ backgroundColor: '#252542', marginVertical: 8 }} />}
          </View>
        ))}
      </Surface>

      {isAdmin && (
        <Button mode="outlined" onPress={() => setShowAddInfo(true)} textColor="#7C4DFF"
          style={{ borderRadius: 12, borderColor: '#3D3D5C', marginTop: 12 }} icon="plus">
          Add Society Detail
        </Button>
      )}

      {/* Emergency Contacts */}
      <Text variant="titleMedium" style={{ color: '#888', fontWeight: '600', marginBottom: 8, marginTop: 20 }}>
        Emergency Contacts
      </Text>
      {contacts.map(c => {
        const cConfig = CONTACT_ICONS[c.role] || { icon: 'phone', color: '#888' };
        return (
          <TouchableRipple key={c.id} onPress={() => Linking.openURL(`tel:${c.phone}`)} borderless style={{ borderRadius: 16 }}>
            <Surface style={styles.contactCard} elevation={1}>
              <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: `${cConfig.color}20` }]}>
                  <MaterialCommunityIcons name={cConfig.icon as any} size={22} color={cConfig.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{c.name}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>{c.role} • {c.phone}</Text>
                </View>
                <MaterialCommunityIcons name="phone-outgoing" size={20} color="#4CAF50" />
              </View>
              {isAdmin && (
                <TouchableRipple onPress={() => handleDeleteContact(c.id)} borderless style={{ position: 'absolute', top: 8, right: 8, padding: 4 }}>
                  <MaterialCommunityIcons name="close" size={16} color="#FF5252" />
                </TouchableRipple>
              )}
            </Surface>
          </TouchableRipple>
        );
      })}

      {isAdmin && (
        <Button mode="outlined" onPress={() => setShowAdd(true)} textColor="#7C4DFF"
          style={{ borderRadius: 12, borderColor: '#3D3D5C', marginTop: 12 }} icon="plus">
          Add Emergency Contact
        </Button>
      )}

      {/* Edit Info Modal */}
      <Portal>
        <Modal visible={showEdit} onDismiss={() => setShowEdit(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>
            Edit {formatKey(editKey)}
          </Text>
          <TextInput label="Value" value={editValue} onChangeText={setEditValue} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" multiline={editKey === 'address'} />
          <Button mode="contained" onPress={handleUpdateInfo} loading={saving} disabled={saving}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Update</Button>
        </Modal>
      </Portal>

      {/* Add Info Modal */}
      <Portal>
        <Modal visible={showAddInfo} onDismiss={() => setShowAddInfo(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>
            Add New Detail
          </Text>
          <TextInput label="Label (e.g. Registration No)" value={newKey} onChangeText={setNewKey} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Value" value={newValue} onChangeText={setNewValue} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" multiline />
          <Button mode="contained" onPress={handleAddInfo} loading={addingInfo} disabled={addingInfo}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Save</Button>
        </Modal>
      </Portal>

      {/* Add Contact Modal */}
      <Portal>
        <Modal visible={showAdd} onDismiss={() => setShowAdd(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>Add Contact</Text>
          <TextInput label="Name *" value={name} onChangeText={setName} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Phone *" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad"
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Role (e.g. Plumber, Doctor) *" value={role} onChangeText={setRole} mode="outlined"
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <Button mode="contained" onPress={handleAddContact} loading={creating} disabled={creating}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Save Contact</Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

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
