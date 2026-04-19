// Import React and hooks for local state and UI triggers
import React, { useState } from 'react';
// Import essential layout components and alert handlers from React Native
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
// Import a wide range of themed MD3 components from React Native Paper for a premium profile experience
import { Text, Surface, Avatar, Button, Divider, TouchableRipple, Portal, Modal, TextInput } from 'react-native-paper';
// Import standard community icons for visual navigation
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import the global auth store for session management and profile syncing
import { useAuthStore } from '../../store';
// Import the centralized API layer for profile and security updates
import { authAPI } from '../../services/api';

/**
 * ProfileScreen:
 * A comprehensive user management hub allowing residents and admins to 
 * update their identities, security credentials, and navigate to key modules.
 */
export default function ProfileScreen({ navigation }: any) {
  // Extract user state and core actions from the global store
  const { user, logout, refreshUser } = useAuthStore();
  
  // ── UI Visibility State ──
  const [showEdit, setShowEdit] = useState(false);      // Controls the 'Edit Profile' modal
  const [showPassword, setShowPassword] = useState(false); // Controls the 'Change Password' modal
  
  // ── Local Form State (Profile) ──
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [paymentAddress, setPaymentAddress] = useState(user?.payment_address || '');
  
  // ── Local Form State (Security) ──
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // ── Processing State ──
  const [saving, setSaving] = useState(false); // Manages button loading indicators during API calls

  /**
   * handleEditProfile:
   * Commits biographical changes to the backend and synchronizes local state.
   */
  const handleEditProfile = async () => {
    setSaving(true); // Start spinner
    try {
      // API call to update the persistent record
      await authAPI.updateProfile({ name, phone, payment_address: paymentAddress });
      // Re-fetch the user object to update the global 'user' state across the app
      await refreshUser();
      // Dismiss the modal on success
      setShowEdit(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (e: any) { 
      // Handle and display specific backend error messages
      Alert.alert('Error', e.response?.data?.detail || 'Failed to update profile'); 
    } finally { 
      setSaving(false); // Stop spinner
    }
  };

  /**
   * handleChangePassword:
   * Validates and submits a security credential update.
   */
  const handleChangePassword = async () => {
    // Client-side guard: Match check
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'New passwords do not match'); return; }
    // Client-side guard: Minimum strength
    if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    
    setSaving(true);
    try {
      // API call using the current and new credentials
      await authAPI.changePassword({ old_password: oldPassword, new_password: newPassword });
      // Reset form and dismiss on success
      setShowPassword(false); setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    } catch (e: any) { 
      Alert.alert('Error', e.response?.data?.detail || 'Failed to change password'); 
    } finally { 
      setSaving(false); 
    }
  };

  /**
   * handleLogout:
   * Triggers the session termination flow with a confirmation safety check.
   */
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // ── Derived Branding Logic ──
  // Generate uppercase initials from the user's name for the default avatar
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 30 }}>
      
      {/* ── Section 1: User Identity & Location ── */}
      <Surface style={styles.profileCard} elevation={1}>
        {/* Large visual identifier */}
        <Avatar.Text size={72} label={initials} style={styles.avatar} color="#E8E8F0" />
        
        <Text variant="headlineSmall" style={styles.userName}>
          {user?.name}
        </Text>

        {/* Role identification badge (Admin vs Resident) */}
        <View style={styles.roleBadge}>
          <MaterialCommunityIcons name={user?.role === 'admin' ? 'shield-crown' : 'account'} size={14} color="#FFB74D" />
          <Text style={styles.roleText}>
            {user?.role}
          </Text>
        </View>

        <Divider style={styles.cardDivider} />

        {/* Contact Information List */}
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="email-outline" size={18} color="#888" />
          <Text style={styles.infoText}>{user?.email}</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="phone-outline" size={18} color="#888" />
          <Text style={styles.infoText}>{user?.phone || 'Not set'}</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="bank-outline" size={18} color="#888" />
          <Text style={styles.infoText}>UPI: {user?.payment_address || 'Not set'}</Text>
        </View>

        {/* Residence details block (Conditional: only shown if linked to a flat) */}
        {user?.flat_number && (
          <>
            <Divider style={styles.cardDivider} />
            <Text variant="labelMedium" style={styles.sectionLabel}>RESIDENCE</Text>
            <View style={styles.residenceRow}>
              <View>
                <Text style={styles.residenceLabel}>Block</Text>
                <Text style={styles.residenceValue}>{user.block || '-'}</Text>
              </View>
              <View>
                <Text style={styles.residenceLabel}>Flat</Text>
                <Text style={styles.residenceValue}>{user.flat_number}</Text>
              </View>
              <View>
                <Text style={styles.residenceLabel}>Floor</Text>
                <Text style={styles.residenceValue}>{user.floor || '-'}</Text>
              </View>
            </View>
          </>
        )}

        {/* Primary Profile Actions */}
        <View style={styles.editRow}>
          <Button mode="outlined" onPress={() => setShowEdit(true)} textColor="#7C4DFF"
            style={styles.actionButton} icon="pencil" compact>Edit Profile</Button>
          <Button mode="outlined" onPress={() => setShowPassword(true)} textColor="#7C4DFF"
            style={styles.actionButton} icon="lock" compact>Password</Button>
        </View>
      </Surface>

      {/* ── Section 2: Quick Links Navigation ── */}
      <Text variant="titleSmall" style={styles.groupLabel}>Quick Links</Text>
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
            <Text variant="titleSmall" style={styles.linkText}>{link.label}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#555" />
          </Surface>
        </TouchableRipple>
      ))}

      {/* ── Section 3: Destructive Actions ── */}
      <Button mode="contained" onPress={handleLogout} buttonColor="#FF5252" textColor="#FFF"
        style={styles.logoutButton} icon="logout">Logout</Button>

      {/* Footer padding to ensure scrollability on small screens */}
      <View style={{ height: 40 }} />

      {/* ── Overlay: Edit Profile UI ── */}
      <Portal>
        <Modal visible={showEdit} onDismiss={() => setShowEdit(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>Edit Profile</Text>
          <TextInput label="Name" value={name} onChangeText={setName} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Phone" value={phone} onChangeText={setPhone} mode="outlined" keyboardType="phone-pad"
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="UPI ID / Mobile" value={paymentAddress} onChangeText={setPaymentAddress} mode="outlined"
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <Button mode="contained" onPress={handleEditProfile} loading={saving} disabled={saving}
            buttonColor="#7C4DFF" style={styles.modalButton}>Save Changes</Button>
        </Modal>
      </Portal>

      {/* ── Overlay: Security Update UI ── */}
      <Portal>
        <Modal visible={showPassword} onDismiss={() => setShowPassword(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={styles.modalTitle}>Change Password</Text>
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
            buttonColor="#7C4DFF" style={styles.modalButton}>Change Password</Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

// ── Shared UI Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  profileCard: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 24, alignItems: 'center' },
  avatar: { backgroundColor: '#311B92' },
  userName: { color: '#E8E8F0', fontWeight: '700', marginTop: 12 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E2A0E',
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 6,
  },
  roleText: { color: '#FFB74D', fontSize: 12, fontWeight: '600', marginLeft: 4, textTransform: 'capitalize' },
  cardDivider: { backgroundColor: '#252542', marginVertical: 16, width: '100%' },
  infoItem: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 6 },
  infoText: { color: '#C4C4D4', marginLeft: 10 },
  sectionLabel: { color: '#888', marginBottom: 8, alignSelf: 'flex-start' },
  residenceRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  residenceLabel: { color: '#888', fontSize: 12 },
  residenceValue: { color: '#E8E8F0', fontWeight: '600' },
  editRow: { flexDirection: 'row', gap: 8, marginTop: 12, width: '100%' },
  actionButton: { borderRadius: 12, flex: 1, borderColor: '#3D3D5C' },
  groupLabel: { color: '#888', fontWeight: '600', marginTop: 20, marginBottom: 8 },
  linkCard: {
    backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 6,
    flexDirection: 'row', alignItems: 'center',
  },
  linkText: { color: '#E8E8F0', flex: 1, marginLeft: 12 },
  logoutButton: { borderRadius: 12, marginTop: 24 },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },
  modalTitle: { color: '#E8E8F0', fontWeight: '700', marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: '#1A1A2E' },
  modalButton: { borderRadius: 12 },
});
