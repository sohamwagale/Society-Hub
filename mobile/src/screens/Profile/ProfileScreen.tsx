import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Surface, Avatar, Button, Divider, TouchableRipple, Portal, Modal, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';
import { authAPI } from '../../services/api';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout, refreshUser } = useAuthStore();
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [paymentAddress, setPaymentAddress] = useState(user?.payment_address || '');
  const [saving, setSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleEditProfile = async () => {
    setSaving(true);
    try {
      await authAPI.updateProfile({ name, phone, payment_address: paymentAddress });
      await refreshUser();
      setShowEdit(false);
      Alert.alert('Success', 'Profile updated');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (newPassword.length < 6) { Alert.alert('Error', 'Must be 6+ characters'); return; }
    setSaving(true);
    try {
      await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });
      setShowPassword(false); setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      Alert.alert('Success', 'Password changed');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 30 }}>
      {/* Avatar + Info Card */}
      <Surface style={styles.profileCard} elevation={1}>
        <Avatar.Text size={72} label={initials} style={{ backgroundColor: '#311B92' }} color="#E8E8F0" />
        <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700', marginTop: 12 }}>
          {user?.name}
        </Text>
        <View style={styles.roleBadge}>
          <MaterialCommunityIcons name={user?.role === 'admin' ? 'shield-crown' : 'account'} size={14} color="#FFB74D" />
          <Text style={{ color: '#FFB74D', fontSize: 12, fontWeight: '600', marginLeft: 4, textTransform: 'capitalize' }}>
            {user?.role}
          </Text>
        </View>

        <Divider style={{ backgroundColor: '#252542', marginVertical: 16, width: '100%' }} />

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="email-outline" size={18} color="#888" />
          <Text style={{ color: '#C4C4D4', marginLeft: 10 }}>{user?.email}</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="phone-outline" size={18} color="#888" />
          <Text style={{ color: '#C4C4D4', marginLeft: 10 }}>{user?.phone || 'Not set'}</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="bank-outline" size={18} color="#888" />
          <Text style={{ color: '#C4C4D4', marginLeft: 10 }}>UPI: {user?.payment_address || 'Not set'}</Text>
        </View>

        {user?.flat_number && (
          <>
            <Divider style={{ backgroundColor: '#252542', marginVertical: 16, width: '100%' }} />
            <Text variant="labelMedium" style={{ color: '#888', marginBottom: 8, alignSelf: 'flex-start' }}>RESIDENCE</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <View>
                <Text style={{ color: '#888', fontSize: 12 }}>Block</Text>
                <Text style={{ color: '#E8E8F0', fontWeight: '600' }}>{user.block || '-'}</Text>
              </View>
              <View>
                <Text style={{ color: '#888', fontSize: 12 }}>Flat</Text>
                <Text style={{ color: '#E8E8F0', fontWeight: '600' }}>{user.flat_number}</Text>
              </View>
              <View>
                <Text style={{ color: '#888', fontSize: 12 }}>Floor</Text>
                <Text style={{ color: '#E8E8F0', fontWeight: '600' }}>{user.floor || '-'}</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.editRow}>
          <Button mode="outlined" onPress={() => setShowEdit(true)} textColor="#7C4DFF"
            style={{ borderRadius: 12, flex: 1, borderColor: '#3D3D5C' }} icon="pencil" compact>Edit Profile</Button>
          <Button mode="outlined" onPress={() => setShowPassword(true)} textColor="#7C4DFF"
            style={{ borderRadius: 12, flex: 1, borderColor: '#3D3D5C' }} icon="lock" compact>Password</Button>
        </View>
      </Surface>

      {/* Quick Links */}
      <Text variant="titleSmall" style={{ color: '#888', fontWeight: '600', marginTop: 20, marginBottom: 8 }}>Quick Links</Text>
      {[
        { icon: 'bullhorn', label: 'Announcements', route: 'Announcements', color: '#7C4DFF' },
        { icon: 'account-group', label: 'Resident Directory', route: 'ResidentDirectory', color: '#00E5FF' },
        { icon: 'shield-home', label: 'Society Info', route: 'SocietyInfo', color: '#4CAF50' },
        { icon: 'history', label: 'Payment History', route: 'PaymentHistory', color: '#FFB74D' },
        { icon: 'cash-refund', label: 'Reimbursements', route: 'ReimbursementsList', color: '#E91E63' },
        { icon: 'bell-outline', label: 'Notifications', route: 'Notifications', color: '#FF6D00' },
      ].map(link => (
        <TouchableRipple key={link.route} onPress={() => navigation.navigate(link.route)} borderless style={{ borderRadius: 16 }}>
          <Surface style={styles.linkCard} elevation={1}>
            <MaterialCommunityIcons name={link.icon as any} size={22} color={link.color} />
            <Text variant="titleSmall" style={{ color: '#E8E8F0', flex: 1, marginLeft: 12 }}>{link.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
          </Surface>
        </TouchableRipple>
      ))}

      {/* Logout */}
      <Button mode="contained" onPress={handleLogout} buttonColor="#FF5252" textColor="#FFF"
        style={{ borderRadius: 12, marginTop: 24 }} icon="logout">Logout</Button>

      <View style={{ height: 40 }} />

      {/* Edit Profile Modal */}
      <Portal>
        <Modal visible={showEdit} onDismiss={() => setShowEdit(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>Edit Profile</Text>
          <TextInput label="Name" value={name} onChangeText={setName} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Phone" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad"
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="UPI ID / Mobile" value={paymentAddress} onChangeText={setPaymentAddress} mode="outlined"
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <Button mode="contained" onPress={handleEditProfile} loading={saving} disabled={saving}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Save Changes</Button>
        </Modal>
      </Portal>

      {/* Change Password Modal */}
      <Portal>
        <Modal visible={showPassword} onDismiss={() => setShowPassword(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>Change Password</Text>
          <TextInput label="Current Password" value={oldPassword} onChangeText={setOldPassword}
            secureTextEntry mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="New Password" value={newPassword} onChangeText={setNewPassword}
            secureTextEntry mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword}
            secureTextEntry mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <Button mode="contained" onPress={handleChangePassword} loading={saving} disabled={saving}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Change Password</Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  profileCard: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 24, alignItems: 'center' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E2A0E',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 6,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 6 },
  editRow: { flexDirection: 'row', gap: 8, marginTop: 12, width: '100%' },
  linkCard: {
    backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },
  input: { marginBottom: 12, backgroundColor: '#1A1A2E' },
});
