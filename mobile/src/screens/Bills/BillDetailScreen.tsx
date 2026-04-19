// Import React and standard hooks for side effects, animation references, and local state
import React, { useEffect, useRef, useState } from 'react';
// Import layout, animation, and system utility components from React Native
import { Animated, View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
// Import themed MD3 components from React Native Paper for a high-fidelity UI
import { Text, Surface, Button, TextInput, Divider, Portal, Modal, ProgressBar } from 'react-native-paper';
// Import icons for visual branding and status indication
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import expo-image-picker for handling payment receipt uploads
import * as ImagePicker from 'expo-image-picker';
// Import bills API for fetching details, initiating payments, and record management
import { billsAPI } from '../../services/api';
// Import shared TypeScript types for data consistency
import { Bill, BillPayment, BillResidentStatus } from '../../types';
// Import common UI components for consistent state feedback
import { StatusBadge, LoadingScreen } from '../../components/Common';
// Import global stores for aggregated billing data and user session context
import { useBillsStore, useAuthStore } from '../../store';

/**
 * PaymentSuccessView:
 * A high-engagement, animated overlay displayed immediately after a successful financial transaction.
 * Designed to provides positive reinforcement and quick access to post-payment actions (receipts).
 */
function PaymentSuccessView({
  bill,
  payment,
  onDownloadReceipt,
  onUploadScreenshot,
  onDone,
}: {
  bill: Bill;
  payment: BillPayment;
  onDownloadReceipt: () => void;
  onUploadScreenshot: () => void;
  onDone: () => void;
}) {
  // Animation value references for coordinating a smooth entrance
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(60)).current;

  // Trigger sequence of animations on component mount
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Format the payment timestamp for the visual receipt strip
  const paidAt = payment.paid_at
    ? new Date(payment.paid_at).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    : 'Just now';

  return (
    <Animated.View style={[styles.successOverlay, { opacity }]}>
      <Animated.View style={[styles.successCard, { transform: [{ scale }, { translateY: slideUp }] }]}>
        {/* Visual focal point: Pulsing success icon wrap */}
        <View style={styles.successIconWrap}>
          <View style={styles.successIconOuter}>
            <View style={styles.successIconInner}>
              <MaterialCommunityIcons name="check-bold" size={44} color="#fff" />
            </View>
          </View>
        </View>

        {/* Transaction Summary Headings */}
        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successAmount}>₹{Number(payment.amount).toLocaleString('en-IN')}</Text>
        <Text style={styles.successSubtitle}>for {bill.title}</Text>

        {/* Pseudo-Receipt Strip: Organized transaction metadata */}
        <View style={styles.receiptStrip}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Method</Text>
            <Text style={styles.receiptValue}>Razorpay</Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Transaction ID</Text>
            <Text style={styles.receiptValue} numberOfLines={1} ellipsizeMode="middle">
              {payment.transaction_ref || '—'}
            </Text>
          </View>
          <View style={styles.stripDivider} />
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Paid At</Text>
            <Text style={styles.receiptValue}>{paidAt}</Text>
          </View>
        </View>

        {/* Immediate Post-Payment Tasks */}
        <Button
          mode="contained"
          icon="file-pdf-box"
          onPress={onDownloadReceipt}
          buttonColor="#4527A0"
          style={styles.successBtn}
          contentStyle={{ paddingVertical: 4 }}
        >
          Download Receipt (PDF)
        </Button>
        <Button
          mode="outlined"
          icon="camera"
          onPress={onUploadScreenshot}
          textColor="#888"
          style={[styles.successBtn, { borderColor: '#3D3D5C' }]}
          contentStyle={{ paddingVertical: 4 }}
        >
          Upload Payment Screenshot
        </Button>
        <Button
          mode="text"
          onPress={onDone}
          textColor="#7C4DFF"
          style={{ marginTop: 4 }}
        >
          Done
        </Button>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * BillDetailScreen:
 * The primary interface for inspecting and resolving a specific financial bill.
 * Handles Razorpay checkout flow, administrative auditing, and manual payment verification.
 */
export default function BillDetailScreen({ route, navigation }: any) {
  // Extract identifier from navigation route params
  const { billId } = route.params;
  
  // Extract user context to determine UI authority (Audit vs Action)
  const { user } = useAuthStore();
  
  // ── Core Data State ──
  const [bill, setBill] = useState<Bill | null>(null);
  const [residentStatus, setResidentStatus] = useState<BillResidentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ── Interaction State ──
  const [paying, setPaying] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [successPayment, setSuccessPayment] = useState<BillPayment | null>(null); // State to trigger success overlay
  
  // ── Global Store Actions ──
  const { fetchBills } = useBillsStore();

  // ── Administrative Edit State ──
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Initial load logic
  useEffect(() => { loadBill(); }, [billId]);

  /**
   * loadBill:
   * Fetches the full bill object and conditional metadata (Resident Status list for Admins).
   */
  const loadBill = async () => {
    try {
      const data = await billsAPI.get(billId);
      setBill(data);
      setEditTitle(data.title);
      setEditAmount(data.amount.toString());

      // If user is admin, fetch the full audit list of who has paid
      if (user?.role === 'admin') {
        const residents = await billsAPI.getResidentStatus(billId);
        setResidentStatus(residents);
      } else {
        // If resident, check if they have a payment ID for valid receipts
        const status = data.payment_status;
        if (status === 'paid' || status === 'overdue_paid') {
          try {
            const history = await billsAPI.paymentHistory();
            const match = history.find((p) => p.bill_id === billId);
            if (match) setPaymentId(match.id);
          } catch { /* Silent fail for history lookup */ }
        }
      }
    } catch { 
      Alert.alert('Error', 'Failed to load bill'); 
    } finally { 
      setLoading(false); 
    }
  };

  /**
   * handlePayViaRazorpay:
   * Orchestrates the 3-stage payment cycle:
   * 1. Order Creation (Backend)
   * 2. UI Checkout (Native SDK)
   * 3. Signature Verification (Backend with Network Resilience)
   */
  const handlePayViaRazorpay = async () => {
    if (!bill) return;
    setPaying(true);

    // Progression tracking for precise error handling
    let stage: 'order' | 'razorpay' | 'verify' = 'order';
    let rzpPaymentId: string | undefined;

    try {
      // ── Stage 1: Security Handshake ──
      const order = await billsAPI.createRazorpayOrder(bill.id);

      // ── Stage 2: Native Interaction ──
      stage = 'razorpay';
      const RazorpayCheckout = require('react-native-razorpay').default;
      const options = {
        description: bill.title,
        currency: order.currency,
        key: order.key_id,
        amount: order.amount_paise,
        order_id: order.razorpay_order_id,
        name: 'Society Hub',
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: '',
        },
        theme: { color: '#7C4DFF' },
      };

      const paymentData = await RazorpayCheckout.open(options);
      // Entry point after successful native swipe/UPI interaction
      rzpPaymentId = paymentData.razorpay_payment_id;

      // Debugging trace for environment-specific field names
      console.log('[Razorpay SDK SUCCESS] Full paymentData:', JSON.stringify(paymentData));

      // ── Stage 3: Integrity Check ──
      // Retrying logic to account for Android's temporary network drop post-Razorpay sheet
      stage = 'verify';
      const verifyBody = {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      };

      let payment = null;
      const maxAttempts = 4;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`[Razorpay Verify] Attempt ${attempt}/${maxAttempts}...`);
          payment = await billsAPI.verifyRazorpayPayment(bill.id, verifyBody);
          console.log('[Razorpay Verify] Success on attempt', attempt);
          break; // Exit loop on backend confirmation
        } catch (retryErr: any) {
          const isNetworkError = !retryErr?.response;
          console.log(`[Razorpay Verify] Attempt ${attempt} failed:`, retryErr?.code, retryErr?.message);
          if (isNetworkError && attempt < maxAttempts) {
            // Exponential backoff or simple delay for network recovery
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          } else {
            throw retryErr; // Bubbles up to main catch block
          }
        }
      }

      // ── Success State Transitions ──
      if (!payment) throw new Error('Payment verification failed after all retries');
      setPaymentId(payment.id);
      setSuccessPayment(payment); // Triggers visual celebration overlay
      await fetchBills(); // Sync global list
      loadBill(); // Sync current screen details

    } catch (e: any) {
      console.log('[Razorpay] Error at stage:', stage, JSON.stringify(e));

      if (stage === 'razorpay') {
        // Handle explicit user cancellation versus technical declination
        const isCancelled =
          e?.code === 0 ||
          e?.code === 'PAYMENT_CANCELLED' ||
          String(e?.description ?? '').toLowerCase().includes('cancel') ||
          String(e?.reason ?? '').toLowerCase().includes('cancel');

        if (!isCancelled) {
          Alert.alert(
            'Payment Declined',
            e?.description || e?.message || 'Your payment could not be processed.',
            [{ text: 'Try Again', style: 'default' }],
          );
        }

      } else if (stage === 'verify') {
        // Critical scenario: User was charged but backend verification failed
        const serverError = e?.response?.data?.detail || e?.message || 'Unknown server error';
        const httpStatus = e?.response?.status ?? 'N/A';
        console.log('[Razorpay Verify] Server error:', serverError, 'Status:', httpStatus);
        Alert.alert(
          '⚠️ Server Error (Diagnostic)',
          `Payment ID: ${rzpPaymentId ?? 'N/A'}\nHTTP ${httpStatus}: ${serverError}`,
          [{ text: 'OK' }],
        );

      } else {
        Alert.alert(
          'Could Not Initiate Payment',
          e?.response?.data?.detail || e?.message || 'Failed to start the payment process.',
        );
      }
    } finally {
      setPaying(false);
    }
  };

  /**
   * recordPayment:
   * Manual fallback for offline payments (Cash/Check) recorded by the resident.
   */
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
      Alert.alert('Payment Recorded', 'Payment has been recorded successfully.', [
        { text: 'Download Receipt', onPress: () => handleDownloadReceipt(payment.id) },
        { text: 'Upload Screenshot', onPress: () => pickReceipt(payment.id) },
        { text: 'OK', style: 'cancel' },
      ]);
      await fetchBills();
      loadBill();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Payment failed');
    } finally { setPaying(false); }
  };

  /**
   * handleDownloadReceipt:
   * Redirects user to the direct PDF link for their transaction record.
   */
  const handleDownloadReceipt = async (pId: string) => {
    try {
      const url = await billsAPI.getReceiptUrl(pId);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Failed to open receipt');
    }
  };

  /**
   * pickReceipt:
   * Multi-stage image selection and upload for financial verification screenshots.
   */
  const pickReceipt = async (pId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      try {
        await billsAPI.uploadReceipt(pId, result.assets[0].uri);
        Alert.alert('Success', 'Screenshot uploaded');
      } catch { Alert.alert('Error', 'Failed to upload screenshot'); }
    }
  };

  /**
   * handleDelete:
   * Permanent destructive action for bill records (Admin Only).
   */
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

  /**
   * handleUpdate:
   * Standard form submission for administrative modifications.
   */
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

  /**
   * toggleArchive:
   * Logic to soft-remove a bill from active rotation (Admin Only).
   */
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

  // ── Global Context Derived Logic ──
  if (loading) return <LoadingScreen />;
  if (!bill) return null;

  const isAdmin = user?.role === 'admin';
  const isPaid = bill.payment_status === 'paid' || bill.payment_status === 'overdue_paid';

  // Audit Logic: Deduplicate and sort resident payment status by flat for Admin audit views
  const uniqueFlatsMap = new Map<string, BillResidentStatus>();
  residentStatus.forEach(r => {
    const key = r.flat && r.flat !== 'N/A' ? r.flat : r.user_id;
    if (!uniqueFlatsMap.has(key)) {
      uniqueFlatsMap.set(key, r);
    } else {
      if (r.status === 'paid') uniqueFlatsMap.set(key, r);
    }
  });
  const flatStatuses = Array.from(uniqueFlatsMap.values());
  const paidCount = flatStatuses.filter(r => r.status === 'paid').length;
  const totalCount = flatStatuses.length;
  const progress = totalCount > 0 ? paidCount / totalCount : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F1A' }}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        
        {/* ── Action Strip (Admin Only) ── */}
        {isAdmin && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
            {/* Archive toggle: only available if collection is not 100% complete for active bills */}
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

        {/* ── Bill Metadata Display ── */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.headerRow}>
            {/* Visual Icon based on fund category */}
            <View style={[styles.iconBox, { backgroundColor: bill.bill_type === 'maintenance' ? '#1A1A3E' : '#2E1A1A' }]}>
              <MaterialCommunityIcons
                name={bill.bill_type === 'maintenance' ? 'home-city' : 'cash-plus'}
                size={32} color={bill.bill_type === 'maintenance' ? '#7C4DFF' : '#FF6D00'}
              />
            </View>
            {/* Context-aware badges */}
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

          {/* Core Economic Details */}
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

        {/* ── Collection Audit (Admin Only) ── */}
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
            {/* Scrollable list of resident statuses */}
            {merchantResidentsList(flatStatuses, bill.amount)}
          </Surface>
        )}

        {/* ── Payment Module (Resident Only) ── */}
        {!isPaid && !isAdmin && (
          <Surface style={[styles.card, { marginTop: 12 }]} elevation={1}>
            <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600', marginBottom: 16 }}>
              💳 Pay ₹{bill.amount.toLocaleString()}
            </Text>
            <View style={{ gap: 12 }}>
              {/* Primary: Online Digital Payment Flow */}
              <Button
                mode="contained"
                onPress={handlePayViaRazorpay}
                loading={paying}
                disabled={paying}
                style={{ borderRadius: 12 }}
                buttonColor="#7C4DFF"
                icon="credit-card-outline"
                contentStyle={{ paddingVertical: 4 }}
              >
                Pay via Razorpay
              </Button>
              {/* Secondary: Manual Override for Cash/Check collection */}
              <Button
                mode="outlined"
                onPress={() => recordPayment('Manual')}
                loading={paying}
                disabled={paying}
                style={{ borderRadius: 12, borderColor: '#1B5E20' }}
                textColor="#4CAF50"
                icon="cash-check"
              >
                Mark as Paid Manually
              </Button>
            </View>
          </Surface>
        )}

        {/* ── Transaction Record Module (Resident After Payment) ── */}
        {isPaid && !isAdmin && !successPayment && (
          <Surface style={[styles.card, { marginTop: 12, borderLeftColor: '#1B5E20', borderLeftWidth: 4 }]} elevation={1}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#81C784" />
              <Text variant="titleMedium" style={{ color: '#81C784', fontWeight: '600' }}>Payment Completed</Text>
            </View>
            {paymentId && awaitDownloadButtons(paymentId, handleDownloadReceipt, pickReceipt)}
          </Surface>
        )}

        {/* ── Administrative Edit Overlays ── */}
        <Portal>
          <Modal visible={showEdit} onDismiss={() => setShowEdit(false)} contentContainerStyle={styles.modal}>
            <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>Edit Bill</Text>
            <TextInput label="Title" value={editTitle} onChangeText={setEditTitle} mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
            <TextInput label="Amount" value={editAmount} onChangeText={setEditAmount} keyboardType="numeric" mode="outlined" style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
            <Button mode="contained" onPress={handleUpdate} loading={saving} disabled={saving} buttonColor="#7C4DFF" style={{ borderRadius: 12 }}>Update Bill</Button>
          </Modal>
        </Portal>
      </ScrollView>

      {/* Logic for high-engagement celebration overlay */}
      {successPayment && bill && (
        <PaymentSuccessView
          bill={bill}
          payment={successPayment}
          onDownloadReceipt={() => handleDownloadReceipt(successPayment.id)}
          onUploadScreenshot={() => pickReceipt(successPayment.id)}
          onDone={() => {
            setSuccessPayment(null);
            navigation.goBack(); // Return to list view after acknowledgment
          }}
        />
      )}
    </View>
  );
}

// ── Shared Helper UI Components ──

/**
 * merchantResidentsList:
 * Renders a compact, detailed list of audit records for the society administrator.
 */
const merchantResidentsList = (list: BillResidentStatus[], amount: number) => (
  <View style={{ maxHeight: 300 }}>
    {list.map((r, i) => (
      <View key={r.user_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#252542' }}>
        {/* Unit identifier icon */}
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: r.status === 'paid' ? '#1B5E20' : '#2E1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>{r.flat.split('-')[1] || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMedium" style={{ color: '#E8E8F0', fontWeight: '600' }}>{r.name}</Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>{r.flat} • ₹{r.amount !== undefined ? r.amount.toLocaleString() : amount.toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {/* Status highlight based on liability resolution */}
          <Text style={{ color: r.status === 'paid' ? '#4CAF50' : '#FF5252', fontWeight: '700', fontSize: 13 }}>
            {r.status === 'paid' ? 'PAID' : 'DUE'}
          </Text>
          {r.paid_at && <Text style={{ color: '#888', fontSize: 10 }}>{new Date(r.paid_at).toLocaleDateString()}</Text>}
        </View>
      </View>
    ))}
  </View>
);

/**
 * awaitDownloadButtons:
 * Resident-specific actions available once a bill is resolved.
 */
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

// ── Local Design Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: '#1A1A2E' },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },

  /* ── Post-Payment Success Overlay Tokens ── */
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 20, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  successIconWrap: { marginBottom: 20 },
  successIconOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(124, 77, 255, 0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  successIconInner: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  successTitle: {
    fontSize: 26, fontWeight: '800', color: '#E8E8F0',
    marginBottom: 4, letterSpacing: -0.5,
  },
  successAmount: {
    fontSize: 40, fontWeight: '900', color: '#7C4DFF',
    letterSpacing: -1, marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14, color: '#888', marginBottom: 24,
    textAlign: 'center',
  },
  receiptStrip: {
    width: '100%', backgroundColor: '#0F0F1A',
    borderRadius: 16, padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: '#252542',
  },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  receiptLabel: { color: '#888', fontSize: 13 },
  receiptValue: { color: '#E8E8F0', fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  stripDivider: { height: 1, backgroundColor: '#1A1A3E', marginVertical: 2 },
  successBtn: { width: '100%', borderRadius: 12, marginBottom: 10 },
});
