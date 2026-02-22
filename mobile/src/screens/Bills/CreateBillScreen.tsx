import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform, Keyboard } from 'react-native';
import { Text, TextInput, Button, Surface, SegmentedButtons, TouchableRipple, Portal, Modal, Switch } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { billsAPI, societyAPI } from '../../services/api';
import { useBillsStore, useAuthStore } from '../../store';
import { SocietyFlatSummary, FlatAmountOverride } from '../../types';

export default function CreateBillScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [billType, setBillType] = useState('maintenance');
  const [loading, setLoading] = useState(false);

  const { fetchBills } = useBillsStore();
  const { user } = useAuthStore();

  const [showCustomModal, setShowCustomModal] = useState(false);
  const [flats, setFlats] = useState<SocietyFlatSummary[]>([]);
  const [customFlats, setCustomFlats] = useState<Record<string, { excluded: boolean; amount: string }>>({});

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dueDate;
    setShowPicker(Platform.OS === 'ios');
    setDueDate(currentDate);
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const openCustomModal = async () => {
    if (!user?.society_id) {
      Alert.alert('Error', 'Society ID not round.');
      return;
    }
    try {
      const data = await societyAPI.listFlatsForSociety(user.society_id);
      setFlats(data);
      setShowCustomModal(true);
    } catch {
      Alert.alert('Error', 'Failed to load flats.');
    }
  };

  const handleCreate = async () => {
    if (!title || !amount || !dueDate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const overrides: FlatAmountOverride[] = [];
    Object.entries(customFlats).forEach(([flatId, data]) => {
      if (data.excluded) {
        overrides.push({ flat_id: flatId, amount: 0 });
      } else if (data.amount && data.amount.trim() !== '' && parseFloat(data.amount) !== parseFloat(amount)) {
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
      Alert.alert('Success', 'Bill created successfully!');
      await fetchBills();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create bill');
    } finally { setLoading(false); }
  };

  const renderFlatOverride = (flat: SocietyFlatSummary) => {
    const isExcluded = customFlats[flat.id]?.excluded || false;
    const customAmt = customFlats[flat.id]?.amount || '';

    return (
      <View key={flat.id} style={styles.flatRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#E8E8F0', fontWeight: 'bold' }}>{flat.block}-{flat.flat_number}</Text>
          <Text style={{ color: '#888', fontSize: 12 }}>Floor {flat.floor}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#888', marginRight: 8, fontSize: 12 }}>Exclude</Text>
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
          {!isExcluded && (
            <TextInput
              mode="outlined"
              placeholder={amount || 'Amount'}
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
          Create New Bill
        </Text>

        <SegmentedButtons
          value={billType}
          onValueChange={setBillType}
          buttons={[
            { value: 'maintenance', label: '🏠 Maintenance' },
            { value: 'extra', label: '💰 Extra Fund' },
          ]}
          style={{ marginBottom: 20 }}
        />

        <TextInput label="Bill Title *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
        <TextInput label="Description" value={description} onChangeText={setDescription} mode="outlined" multiline numberOfLines={3}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
        <TextInput label="Base Amount (₹) *" value={amount} onChangeText={setAmount} mode="outlined" keyboardType="numeric"
          left={<TextInput.Icon icon="currency-inr" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        <TouchableRipple onPress={() => { Keyboard.dismiss(); setShowPicker(true); }} style={{ marginBottom: 14 }}>
          <View pointerEvents="none">
            <TextInput
              label="Due Date *"
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

        <Button mode="outlined" onPress={openCustomModal} icon="cog" style={{ marginBottom: 20, borderColor: '#3D3D5C' }} textColor="#00E5FF">
          Customize by Flat
        </Button>

        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="check">
          Create Bill
        </Button>
      </Surface>

      <Portal>
        <Modal visible={showCustomModal} onDismiss={() => setShowCustomModal(false)} contentContainerStyle={styles.modal}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700' }}>Customize Rates</Text>
            <Button onPress={() => setShowCustomModal(false)}>Done</Button>
          </View>
          <View style={{ backgroundColor: '#252542', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: '#aaa', fontSize: 12 }}>
              Base amount is ₹{amount || '0'}. Excluded flats pay ₹0 and are not shown the bill. Custom amounts override base amount.
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  button: { borderRadius: 12, marginTop: 8 },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },
  flatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomColor: '#3D3D5C', borderBottomWidth: 1 },
});
