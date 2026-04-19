// Import React and hooks for managing focus-driven data lifecycle
import React, { useState, useCallback } from 'react';
// Import layout, interaction, and system linking for financial apps
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, Button, TextInput, Divider } from 'react-native-paper';
// Import community icons for visual categorization and currency tokens
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import reimbursements API for claim lifecycle management
import { reimbursementsAPI } from '../../services/api';
// Import shared TypeScript definitions
import { ReimbursementRequest } from '../../types';
// Import common UI components for state feedback
import { StatusBadge, LoadingScreen } from '../../components/Common';
// Import global stores for domain data and user context
import { useAuthStore, useReimbursementsStore } from '../../store';
// Import navigation focus hook to ensure data freshness
import { useFocusEffect } from '@react-navigation/native';

/**
 * ReimbursementDetailScreen:
 * A focal point for claim resolution, facilitating administrative review,
 * financial adjustments, and direct UPI-based settlements.
 */
export default function ReimbursementDetailScreen({ route }: any) {
  // Extract identifier for the specific financial request
  const { requestId } = route.params;
  
  // ── Core Data State ──
  const [req, setReq] = useState<ReimbursementRequest | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ── Administrative Review State ──
  const [updating, setUpdating] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  
  // Identify user to determine if they can perform reviews
  const user = useAuthStore(s => s.user);
  // Extract list refresh logic to keep the main ledger in sync
  const { fetchRequests } = useReimbursementsStore();

  // Load latest claim state whenever the user focuses this interface
  useFocusEffect(useCallback(() => { loadReq(); }, []));

  /**
   * loadReq:
   * Fetches the full claim record and populates review fields with defaults.
   */
  const loadReq = async () => {
    try {
      const data = await reimbursementsAPI.get(requestId);
      setReq(data);
      // Default the approved amount to the claimed amount for admin convenience
      setApprovedAmount(data.approved_amount?.toString() || data.amount.toString());
      setAdminNotes(data.admin_notes || '');
    } catch { 
      Alert.alert('Error', 'Failed to load request details'); 
    } finally { 
      setLoading(false); 
    }
  };

  /**
   * handleReview:
   * (Admin Only) Submits final decision (Approve/Reject) with optional adjustment.
   */
  const handleReview = async (status: string) => {
    setUpdating(true);
    try {
      await reimbursementsAPI.review(requestId, {
        status,
        approved_amount: parseFloat(approvedAmount) || undefined,
        admin_notes: adminNotes || undefined,
      });
      Alert.alert('Success', `Claim ${status.replace('_', ' ')} successfully.`);
      await fetchRequests(); // Sync global list
      loadReq(); // Refresh current detail
    } catch (e: any) { 
      Alert.alert('Error', e.response?.data?.detail || 'Failed to submit review'); 
    } finally { 
      setUpdating(false); 
    }
  };

  /**
   * handleMarkPaid:
   * (Admin Only) Records a successful bank transfer in the database.
   */
  const handleMarkPaid = async () => {
    setUpdating(true);
    try {
      await reimbursementsAPI.markPaid(requestId, {
        amount: parseFloat(approvedAmount), 
        payment_method: 'Bank Transfer',
        payment_date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Success', 'Payment record finalized.');
      await fetchRequests();
      loadReq();
    } catch (e: any) { 
      Alert.alert('Error', e.response?.data?.detail || 'Failed to record payment'); 
    } finally { 
      setUpdating(false); 
    }
  };

  /**
   * handlePayViaUPI:
   * (Admin Only) Deep-links to the system's UPI payment apps (PhonePe, GPay, etc.)
   * Pre-populates amount and transaction details for a friction-less payoff.
   */
  const handlePayViaUPI = async () => {
    // UPI Address is required for the URL scheme
    if (!req?.payment_address) {
      Alert.alert('Missing Detail', 'The resident has not provided a UPI ID or mobile number in their profile.');
      return;
    }

    const finalAmount = Number(approvedAmount || req.amount).toFixed(2);
    const txnRef = `TXN${Date.now()}`; // Unique ref for tracking
    // RFC Standardized UPI deep-link URL scheme
    const upiUrl = `upi://pay?pa=${req.payment_address}&pn=${encodeURIComponent('Resident')}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent('Society Reimbursement')}&tr=${txnRef}`;
    
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      } else {
        Alert.alert('Notice', 'No compatible UPI apps found. Please transfer manually and use "Mark as Paid".');
      }
    } catch {
      Alert.alert('System Error', 'Could not open the UPI payment interface');
    }
  };

  // Initial loading gate
  if (loading) return <LoadingScreen />;
  if (!req) return null;
  
  const isAdmin = user?.role === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      
      {/* ── Core Request Metadata Card ── */}
      <Surface style={styles.card} elevation={1}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700', flex: 1 }}>{req.title}</Text>
          {/* Visual phase indicator */}
          <StatusBadge status={req.status} />
        </View>
        <Text variant="bodySmall" style={{ color: '#00E5FF', marginTop: 8, textTransform: 'capitalize' }}>{req.category}</Text>

        <Divider style={{ marginVertical: 16, backgroundColor: '#252542' }} />

        {/* Narrative provided by the resident */}
        <Text variant="bodyLarge" style={{ color: '#C4C4D4', lineHeight: 24 }}>{req.description}</Text>

        {/* Financial Recap: Original vs Verified amounts */}
        <View style={styles.amountRow}>
          <View>
            <Text variant="bodySmall" style={{ color: '#888' }}>Claimed Amount</Text>
            <Text variant="titleLarge" style={{ color: '#FF6D00', fontWeight: '700' }}>₹{req.amount}</Text>
          </View>
          {req.approved_amount && (
            <View>
              <Text variant="bodySmall" style={{ color: '#888' }}>Approved Amount</Text>
              <Text variant="titleLarge" style={{ color: '#81C784', fontWeight: '700' }}>₹{req.approved_amount}</Text>
            </View>
          )}
        </View>

        {/* Audit timestamps */}
        <View style={styles.meta}>
          <Text variant="bodySmall" style={{ color: '#888' }}>Expense Incurred: {req.expense_date}</Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>Request Submitted: {new Date(req.created_at).toLocaleDateString()}</Text>
        </View>

        {/* Post-review rationale from governance */}
        {req.admin_notes && (
          <Surface style={styles.notesBox} elevation={0}>
            <Text variant="titleSmall" style={{ color: '#FFB74D', marginBottom: 4 }}>Reviewer Notes</Text>
            <Text variant="bodyMedium" style={{ color: '#C4C4D4' }}>{req.admin_notes}</Text>
          </Surface>
        )}
      </Surface>

      {/* ── Reviewer Interaction: Approve/Reject flow ── */}
      {isAdmin && req.status === 'submitted' && (
        <Surface style={[styles.card, { marginTop: 12 }]} elevation={1}>
          <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600', marginBottom: 12 }}>Review Verdict</Text>
          {/* Audit input for adjustments */}
          <TextInput label="Approved Amount" value={approvedAmount} onChangeText={setApprovedAmount} mode="outlined"
            keyboardType="numeric" left={<TextInput.Icon icon="currency-inr" />}
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Adjustment Rationale (Visible to resident)" value={adminNotes} onChangeText={setAdminNotes} mode="outlined" multiline
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button mode="contained" onPress={() => handleReview('approved')} loading={updating}
              style={{ flex: 1, borderRadius: 12 }} buttonColor="#1B5E20" icon="check">Approve</Button>
            <Button mode="contained" onPress={() => handleReview('rejected')} loading={updating}
              style={{ flex: 1, borderRadius: 12 }} buttonColor="#B71C1C" icon="close">Reject</Button>
          </View>
        </Surface>
      )}

      {/* ── Disbursement Module: Digital Settlement flow ── */}
      {isAdmin && req.status === 'approved' && (
        <Surface style={[styles.card, { marginTop: 12 }]} elevation={1}>
          <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600', marginBottom: 12 }}>Disbursement Options</Text>

          <View style={{ marginBottom: 16 }}>
            <Text variant="bodySmall" style={{ color: '#888' }}>Payee UPI ID</Text>
            <Text variant="titleMedium" style={{ color: '#FFB74D', fontWeight: 'bold' }}>
              {req.payment_address || 'ID not found in profile'}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Button mode="contained" onPress={handlePayViaUPI} loading={updating}
              style={{ borderRadius: 12 }} buttonColor="#7C4DFF" icon="cellphone-nfc">
              Initiate UPI Payment
            </Button>
            <Button mode="outlined" onPress={handleMarkPaid} loading={updating}
              style={{ borderRadius: 12, borderColor: '#1B5E20' }} textColor="#4CAF50" icon="cash-check">
              Archive as Paid (₹{approvedAmount})
            </Button>
          </View>
        </Surface>
      )}
    </ScrollView>
  );
}

// ── Shared UI Architecture ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 16 },
  meta: { marginTop: 12, gap: 4 },
  notesBox: { backgroundColor: '#252542', borderRadius: 12, padding: 12, marginTop: 16 },
  input: { marginBottom: 12, backgroundColor: '#1A1A2E' },
});
