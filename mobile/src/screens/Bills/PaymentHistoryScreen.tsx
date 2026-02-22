import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Surface, SegmentedButtons, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { billsAPI, expensesAPI } from '../../services/api';
import { BillPayment, SocietyExpense } from '../../types';
import { EmptyState, LoadingScreen } from '../../components/Common';
import { useAuthStore } from '../../store';
import { useFocusEffect } from '@react-navigation/native';

export default function PaymentHistoryScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [expenses, setExpenses] = useState<SocietyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = user?.role === 'admin';
  const [viewMode, setViewMode] = useState('payments');

  useFocusEffect(useCallback(() => { loadData(); }, [viewMode]));

  const loadData = async () => {
    try {
      if (viewMode === 'payments') {
        const data = await billsAPI.paymentHistory();
        setPayments(data);
      } else if (viewMode === 'expenses' && isAdmin) {
        const data = await expensesAPI.list('date_desc');
        setExpenses(data);
      }
    } catch {
      // Handle error implicitly
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const renderPaymentItem = ({ item }: { item: BillPayment }) => (
    <Surface style={styles.card} elevation={1}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name="check-circle" size={22} color="#4CAF50" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>₹{item.amount}</Text>
          <Text variant="bodySmall" style={{ color: '#888' }}>
            {item.payment_method || 'N/A'} • {new Date(item.paid_at).toLocaleDateString()}
          </Text>
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

  if (loading && !refreshing) return <LoadingScreen />;

  return (
    <View style={styles.container}>
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

      {viewMode === 'payments' ? (
        <>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  summaryCard: {
    backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, margin: 16, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#0E2E0E', justifyContent: 'center', alignItems: 'center' },
});
