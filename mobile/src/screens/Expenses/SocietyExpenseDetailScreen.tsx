// Import React and hooks for managing data lifecycle
import React, { useEffect, useState } from 'react';
// Import layout, interaction, media, and system linking utilities
import { View, ScrollView, StyleSheet, Alert, Image, Linking, ActivityIndicator } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, Button, Divider, IconButton } from 'react-native-paper';
// Import community icons for visual categorization
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import expenses API for auditing specific transactions
import { expensesAPI } from '../../services/api';
// Import shared TypeScript definitions
import { SocietyExpense } from '../../types';
// Import common UI components for state feedback
import { LoadingScreen } from '../../components/Common';

/**
 * SocietyExpenseDetailScreen:
 * A granular view of a specific society-wide expenditure, 
 * primarily used for financial transparency and auditing.
 */
export default function SocietyExpenseDetailScreen({ route, navigation }: any) {
  // Extract expense identifier from navigation parameters
  const { expenseId } = route.params;
  
  // ── Core Data State ──
  const [expense, setExpense] = useState<SocietyExpense | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the detailed record on mount or ID change
  useEffect(() => {
    loadExpense();
  }, [expenseId]);

  /**
   * loadExpense:
   * Fetches the full expenditure record from the backend.
   */
  const loadExpense = async () => {
    try {
      const data = await expensesAPI.get(expenseId);
      setExpense(data);
    } catch {
      // Graceful fallback for missing or unauthorized records
      Alert.alert('Error', 'Failed to load expense details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleOpenDocument:
   * Directs the user to the full digitized receipt or invoice in the system browser.
   */
  const handleOpenDocument = async () => {
    if (!expense?.document_url) return;
    try {
      const url = expensesAPI.getDocumentUrl(expense.document_url);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Failed to open the attached document');
    }
  };

  // Initial loading gate
  if (loading) return <LoadingScreen />;
  if (!expense) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* ── Core Detail Card ── */}
      <Surface style={styles.card} elevation={1}>
        <View style={styles.headerRow}>
          {/* Visual categorization icon */}
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="receipt-text-outline" size={32} color="#7C4DFF" />
          </View>
        </View>

        {/* Primary Identification Metadata */}
        <Text variant="headlineSmall" style={styles.title}>{expense.title}</Text>
        {expense.description && (
          <Text variant="bodyMedium" style={styles.description}>{expense.description}</Text>
        )}

        <Divider style={styles.divider} />

        {/* Financial Specifics */}
        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Amount</Text>
          <Text variant="titleLarge" style={{ color: '#FF5252', fontWeight: '700' }}>
            ₹{expense.amount.toLocaleString()}
          </Text>
        </View>

        {/* Temporal Metadata: When happened vs When recorded */}
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

        {/* ── Attachment Preview Module ── */}
        {expense.document_url && (
          <View style={styles.documentContainer}>
            <Text variant="titleMedium" style={{ color: '#E8E8F0', marginBottom: 12 }}>
              Digitized Receipt
            </Text>

            {/* Smart Detection: Render image preview only for visual media types */}
            {expense.document_url.match(/\.(jpeg|jpg|gif|png)$/) != null ? (
              <Image
                source={{ uri: expensesAPI.getDocumentUrl(expense.document_url) }}
                style={styles.imageDoc}
                resizeMode="cover"
              />
            ) : null}

            {/* Link to external viewer for PDFs or full resolution images */}
            <Button
              mode="contained"
              icon="open-in-new"
              onPress={handleOpenDocument}
              buttonColor="#3D3D5C"
              style={{ marginTop: 12 }}
            >
              View Full Document
            </Button>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

// ── Shared UI Architecture ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#1A1A3E', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#E8E8F0', fontWeight: '700' },
  description: { color: '#888', marginTop: 8 },
  divider: { marginVertical: 16, backgroundColor: '#252542' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  // Attachment module styling with high-contrast background
  documentContainer: { marginTop: 24, padding: 16, backgroundColor: '#252542', borderRadius: 12 },
  imageDoc: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#0F0F1A' }
});
