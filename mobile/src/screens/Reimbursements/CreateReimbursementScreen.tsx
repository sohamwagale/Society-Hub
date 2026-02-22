import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image, Platform, Keyboard } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, TouchableRipple } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { reimbursementsAPI } from '../../services/api';
import { useReimbursementsStore } from '../../store';
import { ReimbursementCategory } from '../../types';

const CATEGORIES: { label: string; value: ReimbursementCategory }[] = [
  { label: '🔧 Plumbing', value: 'plumbing' },
  { label: '⚡ Electrical', value: 'electrical' },
  { label: '🧹 Cleaning', value: 'cleaning' },
  { label: '🔨 Maintenance', value: 'maintenance' },
  { label: '🎉 Event', value: 'event' },
  { label: '❓ Other', value: 'other' },
];

export default function CreateReimbursementScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || expenseDate;
    setShowPicker(Platform.OS === 'ios');
    setExpenseDate(currentDate);
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const [category, setCategory] = useState<ReimbursementCategory>('other');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { fetchRequests } = useReimbursementsStore();

  const pickReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!title || !description || !amount || !expenseDate) {
      Alert.alert('Error', 'Please fill all fields'); return;
    }
    setLoading(true);
    try {
      const request = await reimbursementsAPI.create({
        title, description, amount: parseFloat(amount), expense_date: formatDate(expenseDate), category
      });

      if (receiptUri) {
        try {
          await reimbursementsAPI.uploadReceipt(request.id, receiptUri);
        } catch { Alert.alert('Warning', 'Request created but receipt upload failed'); }
      }

      Alert.alert('Success', 'Request submitted!');
      await fetchRequests();
      navigation.goBack();
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : (detail || 'Failed');
      Alert.alert('Error', msg);
    }
    finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>Submit Reimbursement</Text>

        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Category</Text>
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

        <TextInput label="Expense Title *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
        <TextInput label="Description *" value={description} onChangeText={setDescription} mode="outlined" multiline
          numberOfLines={3} style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
        <TextInput label="Amount (₹) *" value={amount} onChangeText={setAmount} mode="outlined" keyboardType="numeric"
          left={<TextInput.Icon icon="currency-inr" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        <TouchableRipple onPress={() => { Keyboard.dismiss(); setShowPicker(true); }} style={{ marginBottom: 14 }}>
          <View pointerEvents="none">
            <TextInput
              label="Expense Date *"
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

        {showPicker && (
          <DateTimePicker
            value={expenseDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        <View style={{ marginBottom: 16 }}>
          <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Receipt / Proof</Text>
          {receiptUri ? (
            <View style={{ position: 'relative', width: 100, height: 100 }}>
              <Image source={{ uri: receiptUri }} style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: '#252542' }} />
              <IconButton icon="close-circle" size={20} iconColor="#FF5252" style={{ position: 'absolute', top: -10, right: -10 }} onPress={() => setReceiptUri(null)} />
            </View>
          ) : (
            <Button mode="outlined" onPress={pickReceipt} textColor="#00E5FF" style={{ borderColor: '#3D3D5C', borderRadius: 12 }} icon="camera">
              Attach Receipt
            </Button>
          )}
        </View>

        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="send">
          Submit Request
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryBtn: { borderRadius: 12, borderColor: '#3D3D5C' },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  button: { borderRadius: 12, marginTop: 8 },
});
