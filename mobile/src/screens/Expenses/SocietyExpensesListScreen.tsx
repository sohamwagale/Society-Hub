// Import React and hooks for managing focus-driven data lifecycle
import React, { useState, useCallback } from 'react';
// Import layout and list rendering components
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, FAB, Surface, TouchableRipple, Menu, Button } from 'react-native-paper';
// Import global auth store to determine administrative creation rights
import { useAuthStore } from '../../store';
// Import expenses API for financial auditing
import { expensesAPI } from '../../services/api';
// Import shared TypeScript definitions
import { SocietyExpense } from '../../types';
// Import common UI components for state feedback
import { EmptyState, LoadingScreen } from '../../components/Common';
// Import navigation focus hook to ensure data freshness
import { useFocusEffect } from '@react-navigation/native';

// ── Shared Configuration: Sort Parameters ──
const SORT_OPTIONS = [
  { label: 'Newest Date', value: 'date_desc' },
  { label: 'Oldest Date', value: 'date_asc' },
  { label: 'Highest Amount', value: 'amount_desc' },
  { label: 'Lowest Amount', value: 'amount_asc' },
];

/**
 * SocietyExpensesListScreen:
 * An administrative ledger screen for tracking all society-wide expenditures.
 */
export default function SocietyExpensesListScreen({ navigation }: any) {
  // Extract user session to gate sensitive creation tools
  const { user } = useAuthStore();
  
  // ── Core Data State ──
  const [expenses, setExpenses] = useState<SocietyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ── UI Logic & Sorting State ──
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  /**
   * loadData:
   * Syncs the expense list with the backend using current sort parameters.
   */
  const loadData = useCallback(async () => {
    try {
      const data = await expensesAPI.list(sortBy);
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load society expenses', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  // Ensure data is refreshed whenever the screen is focused or sorting changes
  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  /**
   * onRefresh:
   * Standard pull-to-refresh handler.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Helper label for the sort button anchor
  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort By';

  // Loading Gate
  if (loading && !refreshing) return <LoadingScreen />;

  // Permission logic for the floating creation button
  const isAdmin = user?.role === 'admin';

  return (
    <View style={styles.container}>
      {/* ── Top Strip: Sort Selection ── */}
      <View style={styles.filterRow}>
        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setSortMenuVisible(true)}
              icon="sort"
              contentStyle={{ flexDirection: 'row-reverse' }}
              textColor="#7C4DFF"
              style={styles.filterButton}
              compact
            >
              {sortLabel}
            </Button>
          }
          contentStyle={{ backgroundColor: '#1A1A2E' }}
        >
          {SORT_OPTIONS.map(o => (
            <Menu.Item
              key={o.value}
              onPress={() => { setSortBy(o.value); setSortMenuVisible(false); }}
              title={o.label}
              titleStyle={{ color: sortBy === o.value ? '#7C4DFF' : '#C8C8D8' }}
            />
          ))}
        </Menu>
      </View>

      {/* ── Infinite/Scrollable Ledger of Expenditures ── */}
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon="receipt-text-outline" title="No society expenses recorded" />}
        renderItem={({ item }) => (
          <TouchableRipple onPress={() => navigation.navigate('SocietyExpenseDetail', { expenseId: item.id })}>
            <Surface style={styles.card} elevation={1}>
              <View style={styles.cardHeader}>
                {/* Visual focal point: Title and highlight color for amount (Red for expense) */}
                <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="titleMedium" style={styles.amount}>
                  ₹{item.amount.toLocaleString()}
                </Text>
              </View>
              {/* Optional brief context */}
              {item.description && (
                <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <View style={styles.cardFooter}>
                <Text variant="bodySmall" style={styles.date}>
                  {new Date(item.expense_date).toLocaleDateString()}
                </Text>
                {/* Visual indicator for digitized receipts */}
                {item.document_url && (
                  <Text variant="bodySmall" style={styles.attachment}>
                    📎 Attachment Available
                  </Text>
                )}
              </View>
            </Surface>
          </TouchableRipple>
        )}
      />

      {/* Global Action: Record a new society-wide expense (Admin only) */}
      {isAdmin && (
        <FAB
          icon="plus"
          style={styles.fab}
          color="#FFF"
          onPress={() => navigation.navigate('CreateSocietyExpense')}
        />
      )}
    </View>
  );
}

// ── Shared UI Architecture ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  filterRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterButton: { borderColor: '#7C4DFF', borderRadius: 10, backgroundColor: '#1A1A2E' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: '#E8E8F0', flex: 1, fontWeight: '600', marginRight: 8 },
  amount: { color: '#FF5252', fontWeight: 'bold' }, // Financial highlighting
  description: { color: '#AAA', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  date: { color: '#888' },
  attachment: { color: '#4CAF50', fontWeight: 'bold' },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
});
