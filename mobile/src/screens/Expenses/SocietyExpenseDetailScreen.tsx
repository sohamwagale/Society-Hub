import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image, Linking, ActivityIndicator } from 'react-native';
import { Text, Surface, Button, Divider, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { expensesAPI } from '../../services/api';
import { SocietyExpense } from '../../types';
import { LoadingScreen } from '../../components/Common';

export default function SocietyExpenseDetailScreen({ route, navigation }: any) {
  const { expenseId } = route.params;
  const [expense, setExpense] = useState<SocietyExpense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpense();
  }, [expenseId]);

  const loadExpense = async () => {
    try {
      const data = await expensesAPI.get(expenseId);
      setExpense(data);
    } catch {
      Alert.alert('Error', 'Failed to load expense details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocument = async () => {
    if (!expense?.document_url) return;
    try {
      const url = expensesAPI.getDocumentUrl(expense.document_url);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Failed to open document');
    }
  };

  if (loading) return <LoadingScreen />;
  if (!expense) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="receipt-text-outline" size={32} color="#7C4DFF" />
          </View>
        </View>

        <Text variant="headlineSmall" style={styles.title}>{expense.title}</Text>
        {expense.description && (
          <Text variant="bodyMedium" style={styles.description}>{expense.description}</Text>
        )}

        <Divider style={styles.divider} />

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Amount</Text>
          <Text variant="titleLarge" style={{ color: '#FF5252', fontWeight: '700' }}>
            ₹{expense.amount.toLocaleString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Expense Date</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>
            {new Date(expense.expense_date).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Recorded On</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>
            {new Date(expense.created_at).toLocaleDateString()}
          </Text>
        </View>

        {expense.document_url && (
          <View style={styles.documentContainer}>
            <Text variant="titleMedium" style={{ color: '#E8E8F0', marginBottom: 12 }}>
              Attached Document
            </Text>

            {expense.document_url.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
              <Image
                source={{ uri: expensesAPI.getDocumentUrl(expense.document_url) }}
                style={styles.imageDoc}
                resizeMode="cover"
              />
            ) : null}

            <Button
              mode="contained"
              icon="open-in-new"
              onPress={handleOpenDocument}
              buttonColor="#3D3D5C"
              style={{ marginTop: 12 }}
            >
              Open Full Document
            </Button>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#1A1A3E', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#E8E8F0', fontWeight: '700' },
  description: { color: '#888', marginTop: 8 },
  divider: { marginVertical: 16, backgroundColor: '#252542' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  documentContainer: { marginTop: 24, padding: 16, backgroundColor: '#252542', borderRadius: 12 },
  imageDoc: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#0F0F1A' }
});
