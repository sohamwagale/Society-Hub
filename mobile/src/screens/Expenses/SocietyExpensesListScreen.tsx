import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, FAB, Surface, TouchableRipple, Menu, Button } from 'react-native-paper';
import { useAuthStore } from '../../store';
import { expensesAPI } from '../../services/api';
import { SocietyExpense } from '../../types';
import { EmptyState, LoadingScreen } from '../../components/Common';
import { useFocusEffect } from '@react-navigation/native';

const SORT_OPTIONS = [
  { label: 'Newest Date', value: 'date_desc' },
  { label: 'Oldest Date', value: 'date_asc' },
  { label: 'Highest Amount', value: 'amount_desc' },
  { label: 'Lowest Amount', value: 'amount_asc' },
];

export default function SocietyExpensesListScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [expenses, setExpenses] = useState<SocietyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('date_desc');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await expensesAPI.list(sortBy);
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label || 'Sort By';

  if (loading && !refreshing) return <LoadingScreen />;

  const isAdmin = user?.role === 'admin';

  return (
    <View style={styles.container}>
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

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon="receipt-text-outline" title="No expenses recorded" />}
        renderItem={({ item }) => (
          <TouchableRipple onPress={() => navigation.navigate('SocietyExpenseDetail', { expenseId: item.id })}>
            <Surface style={styles.card} elevation={1}>
              <View style={styles.cardHeader}>
                <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="titleMedium" style={styles.amount}>
                  ₹{item.amount.toLocaleString()}
                </Text>
              </View>
              {item.description && (
                <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <View style={styles.cardFooter}>
                <Text variant="bodySmall" style={styles.date}>
                  {new Date(item.expense_date).toLocaleDateString()}
                </Text>
                {item.document_url && (
                  <Text variant="bodySmall" style={styles.attachment}>
                    📎 Attachment
                  </Text>
                )}
              </View>
            </Surface>
          </TouchableRipple>
        )}
      />

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  filterRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterButton: { borderColor: '#7C4DFF', borderRadius: 10, backgroundColor: '#1A1A2E' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { color: '#E8E8F0', flex: 1, fontWeight: '600', marginRight: 8 },
  amount: { color: '#FF5252', fontWeight: 'bold' },
  description: { color: '#AAA', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  date: { color: '#888' },
  attachment: { color: '#4CAF50', fontWeight: 'bold' },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
});
