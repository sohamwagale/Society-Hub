import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';

export default function PendingApprovalScreen() {
  const user = useAuthStore(s => s.user);
  const refreshUser = useAuthStore(s => s.refreshUser);
  const logout = useAuthStore(s => s.logout);
  const [refreshing, setRefreshing] = React.useState(false);

  const getStatusMessage = () => {
    if (!user) return 'Loading...';
    switch (user.resident_type) {
      case 'owner':
        return 'Your ownership is pending approval by the society administrator.';
      case 'owner_family':
        return 'Your request is pending approval by the flat owner.';
      case 'renter':
        return 'Your tenancy is pending approval by the flat owner.';
      case 'renter_family':
        return 'Your request is pending approval by the main renter.';
      default:
        return 'Your account is pending approval.';
    }
  };

  const getIconName = () => {
    switch (user?.resident_type) {
      case 'owner': return 'shield-account';
      case 'owner_family': return 'account-group';
      case 'renter': return 'key-variant';
      case 'renter_family': return 'account-group';
      default: return 'clock-outline';
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <MaterialCommunityIcons name={getIconName() as any} size={64} color="#7C4DFF" style={{ alignSelf: 'center', marginBottom: 16 }} />

        <Text variant="headlineSmall" style={styles.title}>Pending Approval</Text>

        <Text variant="bodyMedium" style={styles.message}>{getStatusMessage()}</Text>

        <Text variant="bodySmall" style={styles.hint}>
          Please wait for the relevant person to review and approve your request. You can check the status by tapping "Refresh" below.
        </Text>

        {refreshing ? (
          <ActivityIndicator color="#7C4DFF" style={{ marginTop: 20 }} />
        ) : (
          <Button
            mode="contained"
            onPress={handleRefresh}
            buttonColor="#7C4DFF"
            style={styles.button}
            icon="refresh"
          >
            Refresh Status
          </Button>
        )}

        <Button
          mode="outlined"
          onPress={logout}
          textColor="#FF5252"
          style={[styles.button, { borderColor: '#3D3D5C' }]}
          icon="logout"
        >
          Logout
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 28 },
  title: { color: '#E8E8F0', fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  message: { color: '#E8E8F0', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  hint: { color: '#888', textAlign: 'center', marginBottom: 4, lineHeight: 18 },
  button: { borderRadius: 12, marginTop: 16 },
});
