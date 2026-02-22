import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Text, Surface, Button, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { onboardingAPI } from '../../services/api';
import { PendingUser } from '../../types';
import { useAuthStore } from '../../store';
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

export default function ApprovalManagementScreen() {
  const user = useAuthStore(s => s.user);
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPending = useCallback(async () => {
    try {
      const data = await onboardingAPI.pendingApprovals();
      setPending(data);
    } catch {
      Alert.alert('Error', 'Failed to load pending approvals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPending(); }, [fetchPending]));

  const handleApprove = async (userId: string, approve: boolean) => {
    const action = approve ? 'approve' : 'reject';
    Alert.alert(
      `${approve ? 'Approve' : 'Reject'} User`,
      `Are you sure you want to ${action} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await onboardingAPI.approve(userId, approve);
              Alert.alert('Done', `User ${action}d successfully`);
              fetchPending();
            } catch (e: any) {
              const msg = e.response?.data?.detail || `Failed to ${action} user`;
              Alert.alert('Error', msg);
            }
          },
        },
      ],
    );
  };

  const handleRevokeRenter = async (userId: string) => {
    Alert.alert(
      'Revoke Renter',
      'This will remove the renter and all their family members from this flat. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await onboardingAPI.revokeRenter(userId);
              Alert.alert('Done', result.detail);
              fetchPending();
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to revoke renter');
            }
          },
        },
      ],
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPending();
  };

  const getRoleDescription = () => {
    if (user?.role === 'admin') return 'As admin, you can approve flat owners.';
    if (user?.resident_type === 'owner') return 'As flat owner, you can approve family members and renters.';
    if (user?.resident_type === 'renter') return "As renter, you can approve your family members.";
    return '';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C4DFF" />}
    >
      <Text variant="bodyMedium" style={styles.subtitle}>{getRoleDescription()}</Text>

      {loading && <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>Loading...</Text>}

      {!loading && pending.length === 0 && (
        <Surface style={styles.emptyCard} elevation={1}>
          <MaterialCommunityIcons name="check-circle-outline" size={48} color="#4CAF50" />
          <Text variant="titleMedium" style={{ color: '#E8E8F0', marginTop: 12 }}>All Caught Up!</Text>
          <Text variant="bodySmall" style={{ color: '#888', marginTop: 4 }}>No pending approvals right now.</Text>
        </Surface>
      )}

      {pending.map((p) => (
        <Surface key={p.id} style={styles.card} elevation={2}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600' }}>{p.name}</Text>
              <Text variant="bodySmall" style={{ color: '#888' }}>{p.email}</Text>
              {p.phone && <Text variant="bodySmall" style={{ color: '#888' }}>{p.phone}</Text>}
            </View>
            <Chip
              textStyle={{ color: RESIDENT_TYPE_COLORS[p.resident_type || ''] || '#888', fontSize: 11 }}
              style={{ backgroundColor: '#12121F' }}
            >
              {RESIDENT_TYPE_LABELS[p.resident_type || ''] || p.resident_type}
            </Chip>
          </View>

          {p.flat_number && (
            <Text variant="bodySmall" style={{ color: '#AAA', marginBottom: 8 }}>
              Flat {p.flat_number} · Block {p.block} · Floor {p.floor}
            </Text>
          )}

          <Divider style={{ backgroundColor: '#2D2D45', marginBottom: 12 }} />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              mode="contained"
              onPress={() => handleApprove(p.id, true)}
              buttonColor="#4CAF50"
              style={{ flex: 1, borderRadius: 10 }}
              compact
              icon="check"
            >
              Approve
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleApprove(p.id, false)}
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

      {/* Show revoke renter option for owners */}
      {user?.resident_type === 'owner' && (
        <Button
          mode="text"
          textColor="#FF8A65"
          onPress={() => {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 16 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 12 },
  emptyCard: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 32, alignItems: 'center', marginTop: 40 },
});
