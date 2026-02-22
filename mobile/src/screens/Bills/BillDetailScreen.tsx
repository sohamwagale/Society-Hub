import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image, Linking, FlatList } from 'react-native';
import { Text, Surface, Button, TextInput, Divider, IconButton, Portal, Modal, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { billsAPI, societyAPI } from '../../services/api';
import { Bill, BillResidentStatus } from '../../types';
import { StatusBadge, LoadingScreen } from '../../components/Common';
import { useBillsStore, useAuthStore } from '../../store';

export default function BillDetailScreen({ route, navigation }: any) {
  const { billId } = route.params;
  const { user } = useAuthStore();
  const [bill, setBill] = useState<Bill | null>(null);
  const [residentStatus, setResidentStatus] = useState<BillResidentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const { fetchBills } = useBillsStore();

  // Edit Mode state
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadBill(); }, [billId]);

  const loadBill = async () => {
    try {
      const data = await billsAPI.get(billId);
      setBill(data);
      setEditTitle(data.title);
      setEditAmount(data.amount.toString());

      if (user?.role === 'admin') {
        const residents = await billsAPI.getResidentStatus(billId);
        setResidentStatus(residents);
      } else {
        // If bill is already paid, find the payment ID from history
        const status = data.payment_status;
        if (status === 'paid' || status === 'overdue_paid') {
          try {
            const history = await billsAPI.paymentHistory();
            const match = history.find((p) => p.bill_id === billId);
            if (match) setPaymentId(match.id);
          } catch { }
        }
      }
    } catch { Alert.alert('Error', 'Failed to load bill'); }
    finally { setLoading(false); }
  };

  const handlePayViaUPI = async () => {
    if (!bill) return;
    try {
      const info = await societyAPI.getInfo();
      const upiInfo = info.find(i => i.key.toLowerCase().includes('upi'));
      if (!upiInfo || !upiInfo.value) {
        Alert.alert('Notice', 'Society UPI ID not found. Please ask your admin to add a UPI ID in Society Info.');
        return;
      }

      const txnRef = `TXN${Date.now()}`;
      const amountFormatted = Number(bill.amount).toFixed(2);

      const upiUrl =
        `upi://pay?pa=${encodeURIComponent(upiInfo.value)}` +
        `&pn=${encodeURIComponent('Society')}` +
        `&am=${amountFormatted}` +
        `&cu=INR` +
        `&tn=${encodeURIComponent("Bill Payment")}` +
        `&tr=${txnRef}`;

      // const upiUrl =
      //   `upi://pay?pa=sunilwagale@oksbi` +
      //   `&pn=Test` +
      //   `&am=2` +
      //   `&cu=INR`;
      // const upiUrl = `upi://pay?pa=${upiInfo.value}&pn=Society&am=${bill.amount}&cu=INR&tn=Bill%20Payment`;
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
        Alert.alert(
          'Payment Check',
          'Did you successfully complete the payment in your UPI app?',
          [
            { text: 'No, cancel', style: 'cancel' },
            { text: 'Yes, I paid', onPress: () => recordPayment('UPI') }
          ]
        );
      } else {
        Alert.alert('Notice', 'No UPI app found on your phone. You can use the "Mark as Paid Manually" button instead.');
      }
    } catch {
      Alert.alert('Error', 'Failed to open UPI app');
    }
  };

  const recordPayment = async (method = 'Manual') => {
    if (!bill) return;
    setPaying(true);
    try {
      const payment = await billsAPI.pay({
        bill_id: bill.id,
        amount: bill.amount,
        payment_method: method,
        transaction_ref: transactionRef || undefined,
      });
      setPaymentId(payment.id);
      Alert.alert('Success', 'Payment recorded successfully!', [
        { text: 'Download Receipt', onPress: () => handleDownloadReceipt(payment.id) },
        { text: 'Upload Screenshot', onPress: () => pickReceipt(payment.id) },
        { text: 'OK', style: 'cancel' }
      ]);
      await fetchBills();
      loadBill();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Payment failed');
    } finally { setPaying(false); }
  };

  const handleDownloadReceipt = async (pId: string) => {
    try {
      const url = await billsAPI.getReceiptUrl(pId);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Failed to open receipt');
    }
  };

  const pickReceipt = async (pId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      try {
        await billsAPI.uploadReceipt(pId, result.assets[0].uri);
        Alert.alert('Success', 'Screenshot uploaded');
      } catch { Alert.alert('Error', 'Failed to upload screenshot'); }
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Bill', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await billsAPI.delete(billId);
            await fetchBills();
            navigation.goBack();
          } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed to delete'); }
        }
      }
    ]);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await billsAPI.update(billId, { title: editTitle, amount: parseFloat(editAmount) });
      await fetchBills();
      loadBill();
      setShowEdit(false);
      Alert.alert('Success', 'Bill updated');
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Update failed'); }
    finally { setSaving(false); }
  };

  const toggleArchive = async () => {
    try {
      await billsAPI.update(billId, { is_active: !bill?.is_active });
      await fetchBills();
      loadBill();
      Alert.alert('Success', `Bill ${bill?.is_active ? 'archived' : 'unarchived'}`);
    } catch (e) {
      Alert.alert('Error', 'Action failed');
    }
  };

  if (loading) return <LoadingScreen />;
  if (!bill) return null;

  const isAdmin = user?.role === 'admin';
  const isPaid = bill.payment_status === 'paid' || bill.payment_status === 'overdue_paid';

  // Deduplicate resident status by flat for Admin view
  const uniqueFlatsMap = new Map<string, BillResidentStatus>();
  residentStatus.forEach(r => {
    // Group by flat number, fallback to user_id if NA
    const key = r.flat && r.flat !== 'N/A' ? r.flat : r.user_id;
    if (!uniqueFlatsMap.has(key)) {
      uniqueFlatsMap.set(key, r);
    } else {
      // If we already have this flat, but the current record is 'paid', prefer it
      if (r.status === 'paid') {
        uniqueFlatsMap.set(key, r);
      }
    }
  });
  const flatStatuses = Array.from(uniqueFlatsMap.values());

  // Stats for Admin
  const paidCount = flatStatuses.filter(r => r.status === 'paid').length;
  const totalCount = flatStatuses.length;
  const progress = totalCount > 0 ? paidCount / totalCount : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Admin Actions */}
      {isAdmin && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
          {/* Only show Archive/Activate if NOT fully paid (auto-archived) */}
          {progress < 1 && (
            <Button
              mode="outlined"
              icon={bill.is_active ? "archive" : "archive-arrow-up"}
              compact
              onPress={toggleArchive}
              textColor={bill.is_active ? "#FFB74D" : "#4CAF50"}
              style={{ borderColor: '#3D3D5C' }}
            >
              {bill.is_active ? "Archive" : "Activate"}
            </Button>
          )}
          <Button mode="outlined" icon="pencil" compact onPress={() => setShowEdit(true)} textColor="#7C4DFF" style={{ borderColor: '#3D3D5C' }}>Edit</Button>
          <Button mode="outlined" icon="delete" compact onPress={handleDelete} textColor="#FF5252" style={{ borderColor: '#3D3D5C' }}>Delete</Button>
        </View>
      )}

      {/* Bill Info */}
      <Surface style={styles.card} elevation={1}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBox, { backgroundColor: bill.bill_type === 'maintenance' ? '#1A1A3E' : '#2E1A1A' }]}>
            <MaterialCommunityIcons
              name={bill.bill_type === 'maintenance' ? 'home-city' : 'cash-plus'}
              size={32} color={bill.bill_type === 'maintenance' ? '#7C4DFF' : '#FF6D00'}
            />
          </View>
          {!isAdmin && <StatusBadge status={bill.payment_status || 'due'} />}
          {isAdmin && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StatusBadge status={bill.payment_status || 'due'} />
              <View style={{ backgroundColor: bill.is_active ? '#1A1A3E' : '#2E1A1A', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: bill.is_active ? '#7C4DFF' : '#888', fontWeight: '700', fontSize: 12 }}>
                  {bill.is_active ? 'ACTIVE' : 'ARCHIVED'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700', marginTop: 16 }}>{bill.title}</Text>
        {bill.description && <Text variant="bodyMedium" style={{ color: '#888', marginTop: 4 }}>{bill.description}</Text>}

        <Divider style={{ marginVertical: 16, backgroundColor: '#252542' }} />

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Amount</Text>
          <Text variant="titleLarge" style={{ color: '#00E5FF', fontWeight: '700' }}>₹{bill.amount.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Type</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>{bill.bill_type === 'maintenance' ? 'Maintenance' : 'Extra Fund'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Due Date</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>{bill.due_date}</Text>
        </View>
        {bill.creator_name && (
          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={{ color: '#888' }}>Created By</Text>
            <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>{bill.creator_name}</Text>
          </View>
        )}
      </Surface>

      {/* Admin: Collection Status */}
      {isAdmin && (
        <Surface style={[styles.card, { marginTop: 12 }]} elevation={1}>
          <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600', marginBottom: 12 }}>
            Collection Status
          </Text>
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text variant="bodySmall" style={{ color: '#888' }}>Progress</Text>
              <Text variant="bodySmall" style={{ color: '#4CAF50', fontWeight: '700' }}>
                {paidCount} / {totalCount} Paid
              </Text>
            </View>
            <ProgressBar progress={progress} color="#4CAF50" style={{ height: 8, borderRadius: 4, backgroundColor: '#252542' }} />
          </View>

          {/* List of Residents (grouped by flat) */}
          {merchantResidentsList(flatStatuses, bill.amount)}
        </Surface>
      )}

      {/* Payment Actions */}
      {!isPaid && !isAdmin && (
        <Surface style={[styles.card, { marginTop: 12 }]} elevation={1}>
          <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600', marginBottom: 16 }}>
            💳 Pay ₹{bill.amount.toLocaleString()}
          </Text>
          <View style={{ gap: 12 }}>
            <Button mode="contained" onPress={handlePayViaUPI} loading={paying} disabled={paying}
              style={{ borderRadius: 12 }} buttonColor="#7C4DFF" icon="cellphone-nfc">
              Pay via UPI App
            </Button>
            <Button mode="outlined" onPress={() => recordPayment('Manual')} loading={paying} disabled={paying}
              style={{ borderRadius: 12, borderColor: '#1B5E20' }} textColor="#4CAF50" icon="cash-check">
              Mark as Paid Manually (₹{bill.amount.toLocaleString()})
            </Button>
          </View>
        </Surface>
      )}

      {isPaid && !isAdmin && (
        <Surface style={[styles.card, { marginTop: 12, borderLeftColor: '#1B5E20', borderLeftWidth: 4 }]} elevation={1}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#81C784" />
            <Text variant="titleMedium" style={{ color: '#81C784', fontWeight: '600' }}>Payment Completed</Text>
          </View>
          {paymentId && awaitDownloadButtons(paymentId, handleDownloadReceipt, pickReceipt)}
        </Surface>
      )}

      {/* Edit Modal */}
      <Portal>
        <Modal visible={showEdit} onDismiss={() => setShowEdit(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>Edit Bill</Text>
          <TextInput label="Title" value={editTitle} onChangeText={setEditTitle} mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Amount" value={editAmount} onChangeText={setEditAmount} keyboardType="numeric" mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <Button mode="contained" onPress={handleUpdate} loading={saving} disabled={saving} buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Update Bill</Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

// Helpers to keep render clean
const merchantResidentsList = (list: BillResidentStatus[], amount: number) => (
  <View style={{ maxHeight: 300 }}>
    {list.map((r, i) => (
      <View key={r.user_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#252542' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: r.status === 'paid' ? '#1B5E20' : '#2E1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>{r.flat.split('-')[1] || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ color: '#E8E8F0', fontWeight: '600' }}>{r.name}</Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>{r.flat} • ₹{r.amount !== undefined ? r.amount.toLocaleString() : amount.toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: r.status === 'paid' ? '#4CAF50' : '#FF5252', fontWeight: '700', fontSize: 13 }}>
            {r.status === 'paid' ? 'PAID' : 'DUE'}
          </Text>
          {r.paid_at && <Text style={{ color: '#888', fontSize: 10 }}>{new Date(r.paid_at).toLocaleDateString()}</Text>}
        </View>
      </View>
    ))}
  </View>
);

const awaitDownloadButtons = (pid: string, dl: any, up: any) => (
  <View style={{ gap: 8 }}>
    <Button mode="contained" icon="file-pdf-box" onPress={() => dl(pid)} buttonColor="#311B92" textColor="#E8E8F0" style={{ borderRadius: 10 }}>
      Download Receipt
    </Button>
    <Button mode="outlined" icon="camera" onPress={() => up(pid)} textColor="#888" style={{ borderColor: '#3D3D5C', borderRadius: 10 }}>
      Upload Payment Screenshot
    </Button>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: '#1A1A2E' },
  payButton: { borderRadius: 12, marginTop: 4 },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },
});
