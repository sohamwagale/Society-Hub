// Import React and standard hooks for managing focus-driven data syncing
import React, { useState, useCallback } from 'react';
// Import layout and list rendering components
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, SegmentedButtons, TouchableRipple } from 'react-native-paper';
// Import community icons for visual feedback
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import APIs for financial auditing (Payments and Society Expenses)
import { billsAPI, expensesAPI } from '../../services/api';
// Import shared TypeScript definitions
import { BillPayment, SocietyExpense } from '../../types';
// Import common UI components for state feedback
import { EmptyState, LoadingScreen } from '../../components/Common';
// Import global auth store to determine administrative viewing rights
import { useAuthStore } from '../../store';
// Import navigation hook to trigger data refreshes on focus
import { useFocusEffect } from '@react-navigation/native';

/**
 * PaymentHistoryScreen:
 * A historical ledger that allows residents to track their own spends
 * and admins to audit society-wide expenditures.
 */
export default function PaymentHistoryScreen({ navigation }: any) {
  // Extract user session to gate sensitive expense data
  const { user } = useAuthStore();
  
  // ── Core Data State ──
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [expenses, setExpenses] = useState<SocietyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── View Logic State ──
  const isAdmin = user?.role === 'admin';
  const [viewMode, setViewMode] = useState('payments'); // 'payments' | 'expenses'

  // Sync data whenever the screen regains focus or the toggle switch is clicked
  useFocusEffect(useCallback(() => { loadData(); }, [viewMode]));

  /**
   * loadData:
   * Aggregates financial records based on the active view mode.
   */
  const loadData = async () => {
    try {
      if (viewMode === 'payments') {
        // Fetch personal payment trail
        const data = await billsAPI.paymentHistory();
        setPayments(data);
      } else if (viewMode === 'expenses' && isAdmin) {
        // Fetch global society audit trail (Admin only)
        const data = await expensesAPI.list('date_desc');
        setExpenses(data);
      }
    } catch {
      // Errors handled silently as data will simply not update
    } finally {
      setLoading(false);
    }
  };

  /**
   * onRefresh:
   * Standard pull-to-refresh handler.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Derived Statistics ──
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  /**
   * renderPaymentItem:
   * Renders a single row representing a successful inward transaction.
   */
  const renderPaymentItem = ({ item }: { item: BillPayment }) => (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.row}>
        {/* Visual cue for success */}
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="check-circle" size={22} color="#4CAF50" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>₹{item.amount}</Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>
            {item.payment_method || 'N/A'} • {new Date(item.paid_at).toLocaleDateString()}
          </Text>
          {/* Detailed reference if available for auditing */}
          {item.transaction_ref && (
            <Text variant="bodySmall" style={{ color: '#555', fontSize: 10 }}>
              Ref: {item.transaction_ref}
            </Text>
          )}
        </View>
        <MaterialCommunityIcons name="receipt" size={18} color="#7C4DFF" />
      </View>
    </Surface>
  );

  /**
   * renderExpenseItem:
   * Renders a single row representing an outward society expenditure.
   */
  const renderExpenseItem = ({ item }: { item: SocietyExpense }) => (
    <TouchableRipple onPress={() => navigation.navigate('SocietyExpenseDetail', { expenseId: item.id })}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: '#2E1A1A' }]}>
            <MaterialCommunityIcons name="receipt-text-outline" size={22} color="#FF5252" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: '#E8E8F0' }} numberOfLines={1}>{item.title}</Text>
            <Text variant="titleSmall" style={{ color: '#FF5252', fontWeight: 'bold' }}>₹{item.amount.toLocaleString()}</Text>
            <Text variant="bodySmall" style={{ color: '#888' }}>
              {new Date(item.expense_date).toLocaleDateString()}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#888" />
        </View>
      </Surface>
    </TouchableRipple>
  );

  // Loading Gate
  if (loading && !refreshing) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* ── View Toggle Module (Admin Only) ── */}
      {isAdmin && (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <SegmentedButtons
            value={viewMode}
            onValueChange={setViewMode}
            buttons={[
              { value: 'payments', label: 'My Payments' },
              { value: 'expenses', label: 'Society Expenses' },
            ]}
          />
        </View>
      )}

      {/* ── Conditional List Rendering based on ViewMode ── */}
      {viewMode === 'payments' ? (
        <>
          {/* Visual Financial Summary: Personal Outflow */}
          <Surface style={styles.summaryCard} elevation={1}>
            <MaterialCommunityIcons name="wallet-outline" size={28} color="#4CAF50" />
            <View style={{ marginLeft: 12 }}>
              <Text variant="bodySmall" style={{ color: '#888' }}>Total Paid</Text>
              <Text variant="headlineSmall" style={{ color: '#4CAF50', fontWeight: '700' }}>
                ₹{totalPaid.toLocaleString()}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: '#888', marginLeft: 'auto' }}>
              {payments.length} payment{payments.length !== 1 ? 's' : ''}
            </Text>
          </Surface>

          <FlatList
            data={payments}
            renderItem={renderPaymentItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
            ListEmptyComponent={<EmptyState icon="cash-remove" title="No payments yet" subtitle="Your payment history will appear here" />}
          />
        </>
      ) : (
        <>
          {/* Visual Financial Summary: Society-Wide Expenditure */}
          <Surface style={styles.summaryCard} elevation={1}>
            <MaterialCommunityIcons name="finance" size={28} color="#FF5252" />
            <View style={{ marginLeft: 12 }}>
              <Text variant="bodySmall" style={{ color: '#888' }}>Total Expenses</Text>
              <Text variant="headlineSmall" style={{ color: '#FF5252', fontWeight: '700' }}>
                ₹{totalExpenses.toLocaleString()}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: '#888', marginLeft: 'auto' }}>
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
            </Text>
          </Surface>

          <FlatList
            data={expenses}
            renderItem={renderExpenseItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
            ListEmptyComponent={<EmptyState icon="receipt-text-outline" title="No expenses yet" subtitle="Society expenses will appear here" />}
          />
        </>
      )}
    </View>
  );
}

// ── Local Design Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  // Summary banner styling
  summaryCard: {
    backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, margin: 16, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  // Generic list item styling
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Boxed icons for category identification
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#0E2E0E', justifyContent: 'center', alignItems: 'center' },
});
