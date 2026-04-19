// Import React and standard hooks for managing form state
import React, { useState } from 'react';
// Import layout, interaction, and system-level utilities
import { View, ScrollView, StyleSheet, Alert, Image, Platform, Keyboard } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, TextInput, Button, Surface, IconButton, TouchableRipple } from 'react-native-paper';
// Import expo media library for picking receipt images
import * as ImagePicker from 'expo-image-picker';
// Import native date picker for temporal accuracy
import DateTimePicker from '@react-native-community/datetimepicker';
// Import reimbursements API for submitting claims
import { reimbursementsAPI } from '../../services/api';
// Import global store to refresh the ledger after submission
import { useReimbursementsStore } from '../../store';
// Import shared TypeScript definitions
import { ReimbursementCategory } from '../../types';

// ── Shared Configuration: Categorization Tokens ──
const CATEGORIES: { label: string; value: ReimbursementCategory }[] = [
  { label: '🔧 Plumbing', value: 'plumbing' },
  { label: '⚡ Electrical', value: 'electrical' },
  { label: '🧹 Cleaning', value: 'cleaning' },
  { label: '🔨 Maintenance', value: 'maintenance' },
  { label: '🎉 Event', value: 'event' },
  { label: '❓ Other', value: 'other' },
];

/**
 * CreateReimbursementScreen:
 * A wizard interface for residents to document and 
 * submit out-of-pocket expenses for board approval.
 */
export default function CreateReimbursementScreen({ navigation }: any) {
  // ── Form State: Basic Meta ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  // ── Form State: Date Handling ──
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  /**
   * onDateChange:
   * Syncs the internal date state from the native system picker.
   */
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || expenseDate;
    // Android closes immediately on touch, iOS usually stays visible in modal flow
    setShowPicker(Platform.OS === 'ios');
    setExpenseDate(currentDate);
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // ── Form State: Media & Logic ──
  const [category, setCategory] = useState<ReimbursementCategory>('other');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { fetchRequests } = useReimbursementsStore();

  /**
   * pickReceipt:
   * Launches the device image library to select a proof of payment.
   */
  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      quality: 0.7 // Compress to save bandwidth
    });
    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  /**
   * handleCreate:
   * Orchestrates a two-stage submission: Data record creation + Optional Media Upload.
   */
  const handleCreate = async () => {
    // Validation guard: Mandatory fields check
    if (!title || !description || !amount || !expenseDate) {
      Alert.alert('Incomplete Form', 'Please fill in all mandatory fields denoted with *'); 
      return;
    }
    setLoading(true);
    try {
      // Stage 1: Create the textual claim record
      const request = await reimbursementsAPI.create({
        title, description, amount: parseFloat(amount), expense_date: formatDate(expenseDate), category
      });

      // Stage 2: Upload digital evidence if present
      if (receiptUri) {
        try {
          await reimbursementsAPI.uploadReceipt(request.id, receiptUri);
        } catch { 
          Alert.alert('Partial Success', 'Your request was created, but receipt upload failed. You can re-upload from details.'); 
        }
      }

      Alert.alert('Success', 'Your reimbursement claim has been submitted to the board.');
      await fetchRequests(); // Refresh the global list
      navigation.goBack();
    } catch (e: any) {
      // Comprehensive error decomposition
      const detail = e.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : (detail || 'Submission failed');
      Alert.alert('Error', msg);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>File a Claim</Text>

        {/* ── Category Selection Grid ── */}
        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Select Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(c => (
            <Button key={c.value} mode={category === c.value ? 'contained' : 'outlined'}
              onPress={() => setCategory(c.value)} style={styles.categoryBtn}
              buttonColor={category === c.value ? '#311B92' : 'transparent'}
              textColor={category === c.value ? '#E8E8F0' : '#888'} compact>
              {c.label}
            </Button>
          ))}
        </View>

        {/* ── Transaction Specifics ── */}
        <TextInput label="Expense Title *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" placeholder="e.g. Lobby light replacement" />
        
        <TextInput label="Detailed Description *" value={description} onChangeText={setDescription} mode="outlined" multiline
          numberOfLines={3} style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
        
        <TextInput label="Amount (₹) *" value={amount} onChangeText={setAmount} mode="outlined" keyboardType="numeric"
          left={<TextInput.Icon icon="currency-inr" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        {/* ── Date Selection Trigger ── */}
        <TouchableRipple onPress={() => { Keyboard.dismiss(); setShowPicker(true); }} style={{ marginBottom: 14 }}>
          <View pointerEvents="none">
            <TextInput
              label="Date of Expense *"
              value={formatDate(expenseDate)}
              mode="outlined"
              left={<TextInput.Icon icon="calendar" />}
              style={styles.input}
              outlineColor="#3D3D5C"
              activeOutlineColor="#7C4DFF"
              editable={false}
            />
          </View>
        </TouchableRipple>

        {/* Lazy-loaded Native Picker */}
        {showPicker && (
          <DateTimePicker
            value={expenseDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        {/* ── Evidence Attachment Module ── */}
        <View style={{ marginBottom: 16 }}>
          <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Physical Proof (Receipt/Invoice)</Text>
          {receiptUri ? (
            <View style={{ position: 'relative', width: 100, height: 100 }}>
              <Image source={{ uri: receiptUri }} style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: '#252542' }} />
              <IconButton icon="close-circle" size={20} iconColor="#FF5252" style={{ position: 'absolute', top: -10, right: -10 }} onPress={() => setReceiptUri(null)} />
            </View>
          ) : (
            <Button mode="outlined" onPress={pickReceipt} textColor="#00E5FF" style={{ borderColor: '#3D3D5C', borderRadius: 12 }} icon="camera">
              Attach Receipt Proof
            </Button>
          )}
        </View>

        {/* Primary Action Button */}
        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="send">
          Submit for Approval
        </Button>
      </Surface>
    </ScrollView>
  );
}

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryBtn: { borderRadius: 12, borderColor: '#3D3D5C' },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  button: { borderRadius: 12, marginTop: 8 },
});
