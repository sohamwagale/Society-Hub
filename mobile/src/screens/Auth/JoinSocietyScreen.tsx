import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, RadioButton } from 'react-native-paper';
import { societyAPI, onboardingAPI } from '../../services/api';
import { useAuthStore } from '../../store';
import { Society, SocietyFlatSummary, ResidentType } from '../../types';
import { Picker } from '@react-native-picker/picker';

const RESIDENT_TYPES: { value: ResidentType; label: string; description: string }[] = [
  { value: 'owner', label: 'Flat Owner', description: 'I own this flat (Aadhaar & PAN required)' },
  { value: 'owner_family', label: "Owner's Family", description: 'I am a family member of the flat owner' },
  { value: 'renter', label: 'Renter', description: 'I am renting this flat' },
  { value: 'renter_family', label: "Renter's Family", description: 'I am a family member of the renter' },
];

export default function JoinSocietyScreen({ navigation }: any) {
  const refreshUser = useAuthStore(s => s.refreshUser);

  const [societies, setSocieties] = useState<Society[]>([]);
  const [selectedSociety, setSelectedSociety] = useState('');
  const [flats, setFlats] = useState<SocietyFlatSummary[]>([]);
  const [selectedFlat, setSelectedFlat] = useState('');
  const [residentType, setResidentType] = useState<ResidentType>('owner');
  const [aadhar, setAadhar] = useState('');
  const [pan, setPan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    societyAPI.listSocieties().then(setSocieties).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedSociety) {
      setSelectedFlat('');
      societyAPI.listFlatsForSociety(selectedSociety).then(setFlats).catch(console.error);
    }
  }, [selectedSociety]);

  const handleSubmit = async () => {
    setError('');
    if (!selectedSociety) { setError('Please select a society'); return; }
    if (!selectedFlat) { setError('Please select a flat'); return; }
    if (residentType === 'owner') {
      if (!aadhar.trim()) { setError('Aadhaar number is required for owners'); return; }
      if (!pan.trim()) { setError('PAN number is required for owners'); return; }
    }

    setLoading(true);
    try {
      await onboardingAPI.joinSociety({
        society_id: selectedSociety,
        flat_id: selectedFlat,
        resident_type: residentType,
        aadhar_number: aadhar.trim() || undefined,
        pan_number: pan.trim() || undefined,
      });
      await refreshUser();
      // Navigator will auto-detect → PendingApproval or MainTabs
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to join society';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text variant="headlineMedium" style={styles.title}>Join a Society</Text>
      <Text variant="bodyMedium" style={{ color: '#888', textAlign: 'center', marginBottom: 20 }}>
        Select your society and flat to get started.
      </Text>

      {/* Society Picker */}
      <Surface style={styles.card} elevation={2}>
        <Text variant="titleSmall" style={styles.label}>Select Society</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedSociety}
            onValueChange={setSelectedSociety}
            style={styles.picker}
            dropdownIconColor="#7C4DFF"
          >
            <Picker.Item label="-- Select a society --" value="" color="#888" />
            {societies.map(s => (
              <Picker.Item key={s.id} label={s.name} value={s.id} color="#E8E8F0" />
            ))}
          </Picker>
        </View>
      </Surface>

      {/* Flat Picker */}
      {selectedSociety ? (
        <Surface style={styles.card} elevation={2}>
          <Text variant="titleSmall" style={styles.label}>Select Flat</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedFlat}
              onValueChange={setSelectedFlat}
              style={styles.picker}
              dropdownIconColor="#7C4DFF"
            >
              <Picker.Item label="-- Select a flat --" value="" color="#888" />
              {flats.map(f => (
                <Picker.Item
                  key={f.id}
                  label={`${f.flat_number} · Block ${f.block} · Floor ${f.floor}`}
                  value={f.id}
                  color="#E8E8F0"
                />
              ))}
            </Picker>
          </View>
        </Surface>
      ) : null}

      {/* Resident Type */}
      {selectedFlat ? (
        <Surface style={styles.card} elevation={2}>
          <Text variant="titleSmall" style={styles.label}>I am a...</Text>
          <RadioButton.Group onValueChange={(v) => setResidentType(v as ResidentType)} value={residentType}>
            {RESIDENT_TYPES.map(rt => (
              <View key={rt.value} style={styles.radioRow}>
                <RadioButton.Android value={rt.value} color="#7C4DFF" uncheckedColor="#555" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#E8E8F0', fontWeight: '600' }}>{rt.label}</Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>{rt.description}</Text>
                </View>
              </View>
            ))}
          </RadioButton.Group>
        </Surface>
      ) : null}

      {/* KYC (for owners: required; for others: optional) */}
      {selectedFlat ? (
        <Surface style={styles.card} elevation={2}>
          <Text variant="titleSmall" style={styles.label}>
            {residentType === 'owner' ? 'KYC Documents (Required)' : 'KYC Documents (Optional)'}
          </Text>
          <TextInput
            label={residentType === 'owner' ? 'Aadhaar Number *' : 'Aadhaar Number'}
            value={aadhar}
            onChangeText={setAadhar}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            outlineColor="#3D3D5C"
            activeOutlineColor="#7C4DFF"
            textColor="#E8E8F0"
            left={<TextInput.Icon icon="card-account-details" />}
          />
          <TextInput
            label={residentType === 'owner' ? 'PAN Number *' : 'PAN Number'}
            value={pan}
            onChangeText={setPan}
            mode="outlined"
            autoCapitalize="characters"
            style={styles.input}
            outlineColor="#3D3D5C"
            activeOutlineColor="#7C4DFF"
            textColor="#E8E8F0"
            left={<TextInput.Icon icon="card-text" />}
          />
        </Surface>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading || !selectedSociety || !selectedFlat}
        buttonColor="#7C4DFF"
        style={styles.submitButton}
        contentStyle={{ paddingVertical: 6 }}
        icon="check"
      >
        Join Society
      </Button>

      <Button mode="text" onPress={() => navigation.goBack()} textColor="#888" style={{ marginTop: 4, marginBottom: 30 }}>
        Back
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  title: { color: '#E8E8F0', fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 16, marginBottom: 14 },
  label: { color: '#E8E8F0', marginBottom: 8, fontWeight: '600' },
  pickerContainer: { backgroundColor: '#12121F', borderRadius: 12, overflow: 'hidden' },
  picker: { color: '#E8E8F0', backgroundColor: '#12121F' },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 4 },
  input: { marginBottom: 10, backgroundColor: '#1A1A2E' },
  error: { color: '#FF5252', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  submitButton: { borderRadius: 12, marginTop: 4 },
});
