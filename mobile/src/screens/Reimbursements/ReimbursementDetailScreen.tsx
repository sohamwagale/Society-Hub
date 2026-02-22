import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import { Text, Surface, Button, TextInput, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reimbursementsAPI } from '../../services/api';
import { ReimbursementRequest } from '../../types';
import { StatusBadge, LoadingScreen } from '../../components/Common';
import { useAuthStore, useReimbursementsStore } from '../../store';
import { useFocusEffect } from '@react-navigation/native';

export default function ReimbursementDetailScreen({ route }: any) {
  const { requestId } = route.params;
  const [req, setReq] = useState<ReimbursementRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const user = useAuthStore(s => s.user);
  const { fetchRequests } = useReimbursementsStore();

  useFocusEffect(useCallback(() => { loadReq(); }, []));

  const loadReq = async () => {
    try {
      const data = await reimbursementsAPI.get(requestId);
      setReq(data);
      setApprovedAmount(data.approved_amount?.toString() || data.amount.toString());
      setAdminNotes(data.admin_notes || '');
    } catch { Alert.alert('Error', 'Failed to load'); }
    finally { setLoading(false); }
  };

  const handleReview = async (status: string) => {
    setUpdating(true);
    try {
      await reimbursementsAPI.review(requestId, {
        status,
        approved_amount: parseFloat(approvedAmount) || undefined,
        admin_notes: adminNotes || undefined,
      });
      Alert.alert('Success', `Request ${status.replace('_', ' ')}`);
      await fetchRequests();
      loadReq();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setUpdating(false); }
  };

  const handleMarkPaid = async () => {
    setUpdating(true);
    try {
      await reimbursementsAPI.markPaid(requestId, {
        amount: parseFloat(approvedAmount), payment_method: 'Bank Transfer',
        payment_date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('Success', 'Payment recorded');
      await fetchRequests();
      loadReq();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setUpdating(false); }
  };

  const handlePayViaUPI = async () => {
    if (!req?.payment_address) {
      Alert.alert('Error', 'Resident has not provided a UPI ID or Mobile Number in their profile.');
      return;
    }

    const finalAmount = Number(approvedAmount || req.amount).toFixed(2);
    const txnRef = `TXN${Date.now()}`;
    const upiUrl = `upi://pay?pa=${req.payment_address}&pn=${encodeURIComponent('Resident')}&am=${finalAmount}&cu=INR&tn=${encodeURIComponent('Reimbursement')}&tr=${txnRef}`;
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      } else {
        Alert.alert('Notice', 'No UPI app found on your phone or invalid UPI ID format. You can manually transfer and use the Mark as Paid button.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open UPI app');
    }
  };

  if (loading) return <LoadingScreen />;
  if (!req) return null;
  const isAdmin = user?.role === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700', flex: 1 }}>{req.title}</Text>
          <StatusBadge status={req.status} />
        </View>
        <Text variant="bodySmall" style={{ color: '#00E5FF', marginTop: 8, textTransform: 'capitalize' }}>{req.category}</Text>

        <Divider style={{ marginVertical: 16, backgroundColor: '#252542' }} />

        <Text variant="bodyLarge" style={{ color: '#C4C4D4', lineHeight: 24 }}>{req.description}</Text>

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

        <View style={styles.meta}>
          <Text variant="bodySmall" style={{ color: '#888' }}>Expense Date: {req.expense_date}</Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>Submitted: {new Date(req.created_at).toLocaleDateString()}</Text>
        </View>

        {req.admin_notes && (
          <Surface style={styles.notesBox} elevation={0}>
            <Text variant="titleSmall" style={{ color: '#FFB74D', marginBottom: 4 }}>Admin Notes</Text>
            <Text variant="bodyMedium" style={{ color: '#C4C4D4' }}>{req.admin_notes}</Text>
          </Surface>
        )}
      </Surface>

      {/* Admin Actions */}
      {isAdmin && req.status === 'submitted' && (
        <Surface style={[styles.card, { marginTop: 12 }]} elevation={1}>
          <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600', marginBottom: 12 }}>Review</Text>
          <TextInput label="Approved Amount" value={approvedAmount} onChangeText={setApprovedAmount} mode="outlined"
            keyboardType="numeric" left={<TextInput.Icon icon="currency-inr" />}
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Admin Notes" value={adminNotes} onChangeText={setAdminNotes} mode="outlined" multiline
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button mode="contained" onPress={() => handleReview('approved')} loading={updating}
              style={{ flex: 1, borderRadius: 12 }} buttonColor="#1B5E20" icon="check">Approve</Button>
            <Button mode="contained" onPress={() => handleReview('rejected')} loading={updating}
              style={{ flex: 1, borderRadius: 12 }} buttonColor="#B71C1C" icon="close">Reject</Button>
          </View>
        </Surface>
      )}

      {isAdmin && req.status === 'approved' && (
        <Surface style={[styles.card, { marginTop: 12 }]} elevation={1}>
          <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600', marginBottom: 12 }}>Payment</Text>

          <View style={{ marginBottom: 16 }}>
            <Text variant="bodySmall" style={{ color: '#888' }}>Resident's UPI ID / Mobile</Text>
            <Text variant="titleMedium" style={{ color: '#FFB74D', fontWeight: 'bold' }}>
              {req.payment_address || 'Not provided by resident'}
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            <Button mode="contained" onPress={handlePayViaUPI} loading={updating}
              style={{ borderRadius: 12 }} buttonColor="#7C4DFF" icon="cellphone-nfc">
              Pay via UPI App
            </Button>
            <Button mode="outlined" onPress={handleMarkPaid} loading={updating}
              style={{ borderRadius: 12, borderColor: '#1B5E20' }} textColor="#4CAF50" icon="cash-check">
              Mark as Paid Manually (₹{approvedAmount})
            </Button>
          </View>
        </Surface>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 16 },
  meta: { marginTop: 12, gap: 4 },
  notesBox: { backgroundColor: '#252542', borderRadius: 12, padding: 12, marginTop: 16 },
  input: { marginBottom: 12, backgroundColor: '#1A1A2E' },
});
