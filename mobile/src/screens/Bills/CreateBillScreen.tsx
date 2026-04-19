// Import React and hooks for managing complex form states (including map-based overrides)
import React, { useState } from 'react';
// Import layout, interaction, and platform-specific keyboard management
import { View, ScrollView, StyleSheet, Alert, Platform, Keyboard } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, TextInput, Button, Surface, SegmentedButtons, TouchableRipple, Portal, Modal, Switch } from 'react-native-paper';
// Import native date picker for precise financial deadline setting
import DateTimePicker from '@react-native-community/datetimepicker';
// Import bills and society APIs for orchestration
import { billsAPI, societyAPI } from '../../services/api';
// Import global stores for data synchronization and session authority
import { useBillsStore, useAuthStore } from '../../store';
// Import shared TypeScript definitions
import { SocietyFlatSummary, FlatAmountOverride } from '../../types';

/**
 * CreateBillScreen:
 * An administrative command center for generating society-wide financial demands.
 * Features a sophisticated "Per-Flat Override" system to handle exemptions or tiered rates.
 */
export default function CreateBillScreen({ navigation }: any) {
  // ── Form State: Core Metadata ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [billType, setBillType] = useState('maintenance');
  const [loading, setLoading] = useState(false);

  // Connectivity to global state
  const { fetchBills } = useBillsStore();
  const { user } = useAuthStore();

  // ── Form State: Granular Customization ──
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [flats, setFlats] = useState<SocietyFlatSummary[]>([]);
  // Mapping of Flat ID -> { exclusion_status, custom_rate }
  const [customFlats, setCustomFlats] = useState<Record<string, { excluded: boolean; amount: string }>>({});

  /**
   * onDateChange:
   * Synchronizes the internal temporal state from the native system picker.
   */
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dueDate;
    setShowPicker(Platform.OS === 'ios');
    setDueDate(currentDate);
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  /**
   * openCustomModal:
   * Fetches the flat inventory to allow the admin to tweak individual billing rates.
   */
  const openCustomModal = async () => {
    if (!user?.society_id) {
      Alert.alert('System Error', 'Active Society context not found. Please log in again.');
      return;
    }
    try {
      const data = await societyAPI.listFlatsForSociety(user.society_id);
      setFlats(data);
      setShowCustomModal(true);
    } catch {
      Alert.alert('Network Error', 'Unable to retrieve society flat inventory.');
    }
  };

  /**
   * handleCreate:
   * Validates the ledger entry and computes the final override array 
   * for multi-flat billing generation.
   */
  const handleCreate = async () => {
    if (!title || !amount || !dueDate) {
      Alert.alert('Incomplete Batch', 'Please provide a title, a base amount, and a deadline.');
      return;
    }

    // Process the granular customization map into the DTO format expected by the backend
    const overrides: FlatAmountOverride[] = [];
    Object.entries(customFlats).forEach(([flatId, data]) => {
      if (data.excluded) {
        // Exclusion is treated as a 0-rate override
        overrides.push({ flat_id: flatId, amount: 0 });
      } else if (data.amount && data.amount.trim() !== '' && parseFloat(data.amount) !== parseFloat(amount)) {
        // Only include actual deviations from the base rate
        overrides.push({ flat_id: flatId, amount: parseFloat(data.amount) });
      }
    });

    setLoading(true);
    try {
      await billsAPI.create({
        title,
        description: description || undefined,
        bill_type: billType as any,
        amount: parseFloat(amount),
        due_date: formatDate(dueDate),
        flat_overrides: overrides.length > 0 ? overrides : undefined,
      });
      Alert.alert('Batch Generated', 'Billing cycle has been successfully initiated.');
      await fetchBills();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Transaction Error', e.response?.data?.detail || 'Failed to generate billing batch.');
    } finally { 
      setLoading(false); 
    }
  };

  /**
   * renderFlatOverride:
   * Logical component for a single row in the customization ledger.
   */
  const renderFlatOverride = (flat: SocietyFlatSummary) => {
    const isExcluded = customFlats[flat.id]?.excluded || false;
    const customAmt = customFlats[flat.id]?.amount || '';

    return (
      <View key={flat.id} style={styles.flatRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#E8E8F0', fontWeight: 'bold' }}>{flat.block}-{flat.flat_number}</Text>
          <Text style={{ color: '#888', fontSize: 12 }}>Level {flat.floor}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#888', marginRight: 8, fontSize: 12 }}>Exempt</Text>
            <Switch
              value={isExcluded}
              onValueChange={(val) => {
                setCustomFlats(prev => ({
                  ...prev,
                  [flat.id]: { ...prev[flat.id], excluded: val, amount: val ? '0' : prev[flat.id]?.amount || '' }
                }));
              }}
              color="#FF5252"
            />
          </View>
          {/* Amount override input (Active only if not exempt) */}
          {!isExcluded && (
            <TextInput
              mode="outlined"
              placeholder={amount || 'Base Rate'}
              value={customAmt}
              onChangeText={(txt) => {
                setCustomFlats(prev => ({
                  ...prev,
                  [flat.id]: { ...prev[flat.id], excluded: false, amount: txt }
                }));
              }}
              keyboardType="numeric"
              style={{ height: 36, width: 100, backgroundColor: '#1A1A2E' }}
              textColor="#E8E8F0"
              outlineColor="#3D3D5C"
              activeOutlineColor="#7C4DFF"
              dense
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>
          Generate Billing Cycle
        </Text>

        {/* ── Cycle Classification ── */}
        <SegmentedButtons
          value={billType}
          onValueChange={setBillType}
          buttons={[
            { value: 'maintenance', label: '🏠 Maintenance' },
            { value: 'extra', label: '💰 Extra Fund' },
          ]}
          style={{ marginBottom: 20 }}
        />

        {/* ── Particulars ── */}
        <TextInput label="Billing Label *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" placeholder="e.g. October 2023 Dues" />
        
        <TextInput label="Context / Instructions" value={description} onChangeText={setDescription} mode="outlined" multiline numberOfLines={3}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
        
        <TextInput label="Standard Base Rate (₹) *" value={amount} onChangeText={setAmount} mode="outlined" keyboardType="numeric"
          left={<TextInput.Icon icon="currency-inr" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        {/* ── Temporal Deadline ── */}
        <TouchableRipple onPress={() => { Keyboard.dismiss(); setShowPicker(true); }} style={{ marginBottom: 14 }}>
          <View pointerEvents="none">
            <TextInput
              label="Settlement Deadline *"
              value={formatDate(dueDate)}
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

        {showPicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={dueDate}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={onDateChange}
          />
        )}

        {/* ── Advanced Configuration Gate ── */}
        <Button mode="outlined" onPress={openCustomModal} icon="cog" style={{ marginBottom: 20, borderColor: '#3D3D5C' }} textColor="#00E5FF">
          Granular Flat Customization
        </Button>

        {/* Global Action Block */}
        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="rocket-outline">
          Initiate Billing Batch
        </Button>
      </Surface>

      {/* ── Granular Ledger Modal ── */}
      <Portal>
        <Modal visible={showCustomModal} onDismiss={() => setShowCustomModal(false)} contentContainerStyle={styles.modal}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700' }}>Rate Customization</Text>
            <Button onPress={() => setShowCustomModal(false)}>Apply</Button>
          </View>
          <View style={{ backgroundColor: '#252542', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: '#aaa', fontSize: 12 }}>
              Standard rate applied: ₹{amount || '0'}. Exemption results in ₹0. Custom entries override standard rates for specific units.
            </Text>
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            {flats.map(renderFlatOverride)}
          </ScrollView>
        </Modal>
      </Portal>

    </ScrollView>
  );
}

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  button: { borderRadius: 12, marginTop: 8 },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },
  flatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomColor: '#3D3D5C', borderBottomWidth: 1 },
});
