// Import React to access state hooks for UI polling
import React from 'react';
// Import essential layout components from React Native
import { View, StyleSheet } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, Button, ActivityIndicator } from 'react-native-paper';
// Import icons to illustrate the specific wait status
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import global state to refresh the user profile and check for approval status changes
import { useAuthStore } from '../../store';

/**
 * PendingApprovalScreen:
 * A non-bypassable "waiting room" for users whose association with a society 
 * has not yet been verified by an administrator or flat owner.
 */
export default function PendingApprovalScreen() {
  // Bind to the reactive user object and refresh/logout actions
  const user = useAuthStore(s => s.user);
  const refreshUser = useAuthStore(s => s.refreshUser);
  const logout = useAuthStore(s => s.logout);
  // local loading state for the 'Refresh' button
  const [refreshing, setRefreshing] = React.useState(false);

  /**
   * getStatusMessage:
   * Maps the user's resident type to a human-readable explanation of who they are waiting for.
   */
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

  /**
   * getIconName:
   * Selects a semantically relevant icon based on the user's role.
   */
  const getIconName = () => {
    switch (user?.resident_type) {
      case 'owner': return 'shield-account';
      case 'owner_family': return 'account-group';
      case 'renter': return 'key-variant';
      case 'renter_family': return 'account-group';
      default: return 'clock-outline';
    }
  };

  /**
   * handleRefresh:
   * Manually triggers a re-fetch of the user object from the backend to see if 'is_fully_approved' is now true.
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      // If approved, AppNavigator's state machine will automatically unmount this screen.
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* High-elevation surface to highlight the "locked" state of the app */}
      <Surface style={styles.card} elevation={2}>
        {/* Large centered brand icon */}
        <MaterialCommunityIcons name={getIconName() as any} size={64} color="#7C4DFF" style={{ alignSelf: 'center', marginBottom: 16 }} />

        <Text variant="headlineSmall" style={styles.title}>Pending Approval</Text>

        {/* The dynamic message explaining the current bottleneck */}
        <Text variant="bodyMedium" style={styles.message}>{getStatusMessage()}</Text>

        <Text variant="bodySmall" style={styles.hint}>
          Please wait for the relevant person to review and approve your request. You can check the status by tapping "Refresh" below.
        </Text>

        {/* Polling/Refresh Trigger */}
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

        {/* Allow users to switch accounts or exit if they are stuck */}
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

// ── Local Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 28 },
  title: { color: '#E8E8F0', fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  message: { color: '#E8E8F0', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  hint: { color: '#888', textAlign: 'center', marginBottom: 4, lineHeight: 18 },
  button: { borderRadius: 12, marginTop: 16 },
});
