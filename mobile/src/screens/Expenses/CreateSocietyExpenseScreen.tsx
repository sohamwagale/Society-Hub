// Import React and hooks for form state management
import React, { useState } from 'react';
// Import layout, interaction, and system-level media/keyboard utilities
import { View, ScrollView, StyleSheet, Alert, Image, Platform, Keyboard } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, TextInput, Button, Surface, TouchableRipple, IconButton } from 'react-native-paper';
// Import expo image picker for capturing or selecting receipt evidence
import * as ImagePicker from 'expo-image-picker';
// Import native date picker for precise financial recording
import DateTimePicker from '@react-native-community/datetimepicker';
// Import expenses API for persisting society-wide expenditure
import { expensesAPI } from '../../services/api';
// Import global auth store to verify administrative clearance
import { useAuthStore } from '../../store';

/**
 * CreateSocietyExpenseScreen:
 * An administrative toolkit for logging organizational costs (e.g. repairs, utility bills).
 * Supports digital receipt capture and verification.
 */
export default function CreateSocietyExpenseScreen({ navigation }: any) {
  // Extract user session to gate organizational fund management
  const { user } = useAuthStore();
  
  // ── Form State: Quantitative & Qualitative ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  
  // ── Form State: Temporal ──
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  
  // ── Form State: Digital Evidence ──
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── RBAC Guard: Enforce strict administrative access ──
  if (user?.role !== 'admin') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#E8E8F0' }}>Access Denied: Administrative Privilege Required.</Text>
      </View>
    );
  }

  /**
   * onDateChange:
   * Synchronizes the internal date state from the native system picker.
   */
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || expenseDate;
    // Android closes immediately on touch; iOS usually persists in modal flow
    setShowPicker(Platform.OS === 'ios');
    setExpenseDate(currentDate);
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  /**
   * pickImage:
   * Launches the device image library for selecting a stored receipt.
   */
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Rejected', 'Gallery access is essential to attach digitized receipts.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Allow user to crop receipt precisely
      quality: 0.8,
    });
    if (!result.canceled) {
      setDocumentUri(result.assets[0].uri);
    }
  };

  /**
   * takePhoto:
   * Direct shortcut to the device camera for immediate evidence capture.
   */
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Rejected', 'Camera access is required for real-time receipt scanning.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setDocumentUri(result.assets[0].uri);
    }
  };

  const removeDocument = () => setDocumentUri(null);

  /**
   * handleCreate:
   * Validates the ledger entry and commits the record (and binary evidence) to the vault.
   */
  const handleCreate = async () => {
    if (!title || !amount) {
      Alert.alert('Incomplete Entry', 'Please provide a descriptive title and the exact expenditure amount.');
      return;
    }

    setLoading(true);
    try {
      await expensesAPI.create(
        {
          title,
          description: description || undefined,
          amount: parseFloat(amount),
          expense_date: formatDate(expenseDate),
        },
        documentUri || undefined // Optional binary payload
      );

      Alert.alert('Ledger Updated', 'Society expense has been recorded successfully.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Write Error', e.response?.data?.detail || 'Failed to synchronize with society ledger.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>
          Record Expenditure
        </Text>

        {/* ── Core Particulars ── */}
        <TextInput
          label="Expense Descriptor *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
          placeholder="e.g. Elevator AMC Payment"
        />

        <TextInput
          label="Detailed Context"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
        />

        <TextInput
          label="Monetary Amount (₹) *"
          value={amount}
          onChangeText={setAmount}
          mode="outlined"
          keyboardType="numeric"
          left={<TextInput.Icon icon="currency-inr" />}
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
        />

        {/* ── Transaction Date ── */}
        <TouchableRipple onPress={() => { Keyboard.dismiss(); setShowPicker(true); }} style={{ marginBottom: 14 }}>
          <View pointerEvents="none">
            <TextInput
              label="Date of Transaction *"
              value={formatDate(expenseDate)}
              mode="outlined"
              left={<TextInput.Icon icon="calendar" />}
              style={styles.input}
              outlineColor="#3D3D5C"
              activeOutlineColor="#7C4DFF"
              textColor="#E8E8F0"
              editable={false}
            />
          </View>
        </TouchableRipple>

        {/* Native Selection Intersection */}
        {showPicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={expenseDate}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={onDateChange}
          />
        )}

        {/* ── Evidence Module (Receipts) ── */}
        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8, marginTop: 4 }}>
          Audit Evidence (Receipt/Invoice)
        </Text>

        {documentUri ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: documentUri }} style={styles.thumbnail} />
            <IconButton
              icon="close-circle"
              size={24}
              iconColor="#FF5252"
              style={styles.removeBtn}
              onPress={removeDocument}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Button
              mode="outlined"
              onPress={pickImage}
              textColor="#00E5FF"
              style={{ borderRadius: 12, flex: 1, borderColor: '#3D3D5C' }}
              icon="image-plus"
              compact
            >
              Vault
            </Button>
            <Button
              mode="outlined"
              onPress={takePhoto}
              textColor="#00E5FF"
              style={{ borderRadius: 12, flex: 1, borderColor: '#3D3D5C' }}
              icon="camera"
              compact
            >
              Scan
            </Button>
          </View>
        )}

        {/* Final Execution Button */}
        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 6 }}
          buttonColor="#7C4DFF"
          icon="check-decagram"
        >
          Commit to Ledger
        </Button>
      </Surface>
    </ScrollView>
  );
}

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  button: { borderRadius: 12, marginTop: 8 },
  // Styled wrapper for captured evidence previews
  imageWrapper: { position: 'relative', marginBottom: 16, alignSelf: 'flex-start' },
  thumbnail: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#252542' },
  removeBtn: { position: 'absolute', top: -12, right: -12, margin: 0 },
});
