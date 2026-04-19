// Import React hooks for managing component-level state and memoized callbacks
import React, { useState, useCallback } from 'react';
// Import fundamental layout, interaction, and feedback components from the React Native runtime
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
// Import Material Design 3 (Paper) components for consistent brand-compliant UI elements
import { Text, Surface, Button, Chip, Divider } from 'react-native-paper';
// Import community-standard vector icons for visual context and improved UX
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import the centralized onboarding API service to communicate with backend verification endpoints
import { onboardingAPI } from '../../services/api';
// Import structural TypeScript interfaces for domain entities
import { PendingUser } from '../../types';
// Import the global authentication state manager to check user permissions/roles
import { useAuthStore } from '../../store';
// Import the useFocusEffect hook to trigger data refreshes upon screen entry
import { useFocusEffect } from '@react-navigation/native';

/**
 * RESIDENT_TYPE_LABELS:
 * A dictionary to resolve technical role keys into human-readable display strings.
 */
const RESIDENT_TYPE_LABELS: Record<string, string> = {
  // Label for primary flat purchasers
  owner: 'Flat Owner',
  // Label for relatives of the owner
  owner_family: "Owner's Family",
  // Label for independent leaseholders
  renter: 'Renter',
  // Label for relatives of the leaseholder
  renter_family: "Renter's Family",
};

/**
 * RESIDENT_TYPE_COLORS:
 * A color palette mapping to distinguish different resident categories visually.
 */
const RESIDENT_TYPE_COLORS: Record<string, string> = {
  // Orange for primary owners
  owner: '#FFB74D',
  // Light blue for family
  owner_family: '#4FC3F7',
  // Green for tenants
  renter: '#81C784',
  // Purple for tenant relatives
  renter_family: '#CE93D8',
};

/**
 * ApprovalManagementScreen:
 * The primary administrative queue where society board members and homeowners 
 * validate identity requests before granting access to specific flats or data.
 */
export default function ApprovalManagementScreen() {
  // Extract the currently authenticated user from the reactive store
  const user = useAuthStore(s => s.user);
  
  // ── 1. Local State Definition ──
  // Array of users waiting for a verification decision
  const [pending, setPending] = useState<PendingUser[]>([]);
  // Boolean flag to drive the initial loading activity indicator
  const [loading, setLoading] = useState(true);
  // Boolean flag to drive the pull-to-refresh UI state
  const [refreshing, setRefreshing] = useState(false);

  /**
   * fetchPending:
   * Memoized asynchronous function to pull the queue from the server.
   */
  const fetchPending = useCallback(async () => {
    try {
      // Execute the GET request to the pending-approvals endpoint
      const data = await onboardingAPI.pendingApprovals();
      // Commit the resulting array to the local state
      setPending(data);
    } catch {
      // Surface connectivity or authorization errors to the user
      Alert.alert('Error', 'Failed to load pending approvals');
    } finally {
      // Terminate any active loading/refreshing visual states
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Screen Focus Hook:
   * Triggers a sync every time the administrator navigates back to this screen.
   */
  useFocusEffect(useCallback(() => {
    // Invoke the fetch logic
    fetchPending(); 
  }, [fetchPending]));

  /**
   * handleApprove:
   * Dispatches a binary decision (Accept/Deny) to the onboarding service.
   */
  const handleApprove = async (userId: string, approve: boolean) => {
    // Derive human-readable action name for the confirmation dialog
    const action = approve ? 'approve' : 'reject';
    // Present a destructive confirmation dialog to prevent accidental clicks
    Alert.alert(
      // Dialog Title
      `${approve ? 'Approve' : 'Reject'} User`,
      // Dialog Body
      `Are you sure you want to ${action} this user?`,
      [
        // Safe cancellation option
        { text: 'Cancel', style: 'cancel' },
        {
          // Primary action label
          text: approve ? 'Approve' : 'Reject',
          // Use destructive style for rejections (Red text on iOS)
          style: approve ? 'default' : 'destructive',
          // Logic to execute upon confirmation
          onPress: async () => {
            try {
              // Transmit the decision to the cloud database
              await onboardingAPI.approve(userId, approve);
              // Provide positive feedback
              Alert.alert('Done', `User ${action}d successfully`);
              // Mirror the remote state locally by re-fetching
              fetchPending();
            } catch (e: any) {
              // Extract specific server-side rejection reasons if available
              const msg = e.response?.data?.detail || `Failed to ${action} user`;
              // Alert the admin of the failure
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  /**
   * handleRevokeRenter:
   * specialized utility for homeowners to evict a tenant's digital access via the app.
   */
  const handleRevokeRenter = async (userId: string) => {
    // Warning: Critical destructive action notification
    Alert.alert(
      'Revoke Renter',
      'This will remove the renter and all their family members from this flat. This cannot be undone.',
      [
        // Abort option
        { text: 'Cancel', style: 'cancel' },
        {
          // Execution button
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call the revocation service
              const result = await onboardingAPI.revokeRenter(userId);
              // Report success based on server detail
              Alert.alert('Done', result.detail);
              // Sync the board
              fetchPending();
            } catch (e: any) {
              // Surface detailed errors (e.g. "User is not a renter")
              Alert.alert('Error', e.response?.data?.detail || 'Failed to revoke renter');
            }
          },
        },
      ],
    );
  };

  /**
   * onRefresh:
   * Handler for the pull-to-refresh gesture.
   */
  const onRefresh = () => {
    // Set refreshing state to true to show the spinner
    setRefreshing(true);
    // Re-run the data acquisition logic
    fetchPending();
  };

  /**
   * getRoleDescription:
   * Returns a localized string explaining why the user has authority over this queue.
   */
  const getRoleDescription = () => {
    // Global app admins can see everything related to society onboarding
    if (user?.role === 'admin') return 'As admin, you can approve flat owners.';
    // Owners can manage their own units
    if (user?.resident_type === 'owner') return 'As flat owner, you can approve family members and renters.';
    // Primary renters can manage their households
    if (user?.resident_type === 'renter') return "As renter, you can approve your family members.";
    // Fallback for default users (should technically not reach here if nav is secured)
    return '';
  };

  return (
    <ScrollView
      // Base layout style
      style={styles.container}
      // Content padding for interior elements
      contentContainerStyle={{ padding: 16 }}
      // Standard native pull-to-refresh control
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C4DFF" />}
    >
      {/* 2. Contextual Instruction Header */}
      <Text variant="bodyMedium" style={styles.subtitle}>{getRoleDescription()}</Text>

      {/* 3. Skeleton Loading Placeholder */}
      {loading && <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>Loading...</Text>}

      {/* 4. Empty State UX */}
      {!loading && pending.length === 0 && (
        <Surface style={styles.emptyCard} elevation={1}>
          {/* Success Check Icon */}
          <MaterialCommunityIcons name="check-circle-outline" size={48} color="#4CAF50" />
          {/* Headline */}
          <Text variant="titleMedium" style={{ color: '#E8E8F0', marginTop: 12 }}>All Caught Up!</Text>
          {/* Supporting Text */}
          <Text variant="bodySmall" style={{ color: '#888', marginTop: 4 }}>No pending approvals right now.</Text>
        </Surface>
      )}

      {/* 5. Iterative Rendering of Pending Requests */}
      {pending.map((p) => (
        <Surface key={p.id} style={styles.card} elevation={2}>
          {/* Top row: Identity and Role Chip */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              {/* User Display Name */}
              <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600' }}>{p.name}</Text>
              {/* Communication Metadata */}
              <Text variant="bodySmall" style={{ color: '#888' }}>{p.email}</Text>
              {/* Conditional Phone rendering */}
              {p.phone && <Text variant="bodySmall" style={{ color: '#888' }}>{p.phone}</Text>}
            </View>
            {/* Visual Chip for Requested residency type */}
            <Chip
              // Dynamic text color from the brand palette
              textStyle={{ color: RESIDENT_TYPE_COLORS[p.resident_type || ''] || '#888', fontSize: 11 }}
              // Dark opaque background for contrast
              style={{ backgroundColor: '#12121F' }}
            >
              {// Lookup human-readable label or fallback to raw ID
              RESIDENT_TYPE_LABELS[p.resident_type || ''] || p.resident_type}
            </Chip>
          </View>

          {/* Location row: Unit, Block, and Floor details */}
          {p.flat_number && (
            <Text variant="bodySmall" style={{ color: '#AAA', marginBottom: 8 }}>
              Flat {p.flat_number} · Block {p.block} · Floor {p.floor}
            </Text>
          )}

          {/* Visual separator */}
          <Divider style={{ backgroundColor: '#2D2D45', marginBottom: 12 }} />

          {/* 6. Action Row: Decision Buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              // Primary decision type
              mode="contained"
              // Handler invocation with positive bit
              onPress={() => handleApprove(p.id, true)}
              // Green success color
              buttonColor="#4CAF50"
              // Layout tweaks
              style={{ flex: 1, borderRadius: 10 }}
              compact
              icon="check"
            >
              Approve
            </Button>
            <Button
              // Secondary decision type
              mode="outlined"
              // Handler invocation with negative bit
              onPress={() => handleApprove(p.id, false)}
              // Red alarm color
              textColor="#FF5252"
              // Layout and border color
              style={{ flex: 1, borderRadius: 10, borderColor: '#3D3D5C' }}
              compact
              icon="close"
            >
              Reject
            </Button>
          </View>
        </Surface>
      ))}

      {/* 7. Footer: Admin/Owner Tools */}
      {user?.resident_type === 'owner' && (
        <Button
          mode="text"
          textColor="#FF8A65"
          onPress={() => {
            // Provide instructions on how to evict existing verified residents
            Alert.alert('Revoke Renter', 'To revoke a renter, go to the Resident Directory and find the renter on your flat.');
          }}
          style={{ marginTop: 16 }}
          icon="account-remove"
        >
          Need to revoke a renter?
        </Button>
      )}
    </ScrollView>
  );
}

// ── 8. Styling Architecture ──
const styles = StyleSheet.create({
  // Main background theme
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  // Subtext layout
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 16 },
  // Individual request card styling
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 12 },
  // Layout for the "No Pending" screen state
  emptyCard: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 32, alignItems: 'center', marginTop: 40 },
});
