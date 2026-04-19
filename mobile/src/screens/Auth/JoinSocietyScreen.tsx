// Import React and hooks for lifecycle (fetch societies) and form state
import React, { useEffect, useState } from 'react';
// Import layout and UI feedback components from React Native
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, TextInput, Button, Surface, RadioButton } from 'react-native-paper';
// Import domain-specific APIs for fetching organization data and submitting requests
import { societyAPI, onboardingAPI } from '../../services/api';
// Import the global auth store for session refreshes
import { useAuthStore } from '../../store';
// Import shared TypeScript definitions for data structures
import { Society, SocietyFlatSummary, ResidentType } from '../../types';
// Import community-standard picker for dropdown selections
import { Picker } from '@react-native-picker/picker';

/**
 * RESIDENT_TYPES:
 * Defines the possible relationships a user can have with a flat.
 * Drives the radio-button list for role selection.
 */
const RESIDENT_TYPES: { value: ResidentType; label: string; description: string }[] = [
  { value: 'owner', label: 'Flat Owner', description: 'I own this flat (Aadhaar & PAN required)' },
  { value: 'owner_family', label: "Owner's Family", description: 'I am a family member of the flat owner' },
  { value: 'renter', label: 'Renter', description: 'I am renting this flat' },
  { value: 'renter_family', label: "Renter's Family", description: 'I am a family member of the renter' },
];

/**
 * JoinSocietyScreen:
 * A sequential onboarding form that allows a user to connect their profile with 
 * a specific flat in a registered housing society.
 */
export default function JoinSocietyScreen({ navigation }: any) {
  // Extract refreshUser to clear cache/update state after joining
  const refreshUser = useAuthStore(s => s.refreshUser);

  // ── Selections State ──
  const [societies, setSocieties] = useState<Society[]>([]);
  const [selectedSociety, setSelectedSociety] = useState('');
  const [flats, setFlats] = useState<SocietyFlatSummary[]>([]);
  const [selectedFlat, setSelectedFlat] = useState('');
  
  // ── Profile/KYC State ──
  const [residentType, setResidentType] = useState<ResidentType>('owner');
  const [aadhar, setAadhar] = useState('');
  const [pan, setPan] = useState('');
  
  // ── UI Logic State ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initial Fetch: Load all available societies on the platform
  useEffect(() => {
    societyAPI.listSocieties().then(setSocieties).catch(console.error);
  }, []);

  // Cascading Fetch: When a society is chosen, load its hierarchy of flats
  useEffect(() => {
    if (selectedSociety) {
      setSelectedFlat(''); // Reset flat selection if society changes
      societyAPI.listFlatsForSociety(selectedSociety).then(setFlats).catch(console.error);
    }
  }, [selectedSociety]);

  /**
   * handleSubmit:
   * Validates selections and submits the join request.
   */
  const handleSubmit = async () => {
    setError('');
    // ── Pre-flight Checks ──
    if (!selectedSociety) { setError('Please select a society'); return; }
    if (!selectedFlat) { setError('Please select a flat'); return; }
    
    // Ownership proof is mandatory to prevent unauthorized finance access
    if (residentType === 'owner') {
      if (!aadhar.trim()) { setError('Aadhaar number is required for owners'); return; }
      if (!pan.trim()) { setError('PAN number is required for owners'); return; }
    }

    setLoading(true);
    try {
      // Send the connection request to the backend
      await onboardingAPI.joinSociety({
        society_id: selectedSociety,
        flat_id: selectedFlat,
        resident_type: residentType,
        aadhar_number: aadhar.trim() || undefined,
        pan_number: pan.trim() || undefined,
      });
      // Force a user state refresh to pick up the new society_id/pending status
      await refreshUser();
      // Navigation is reactive; AppNavigator will now redirect to 'pending_approval' screen.
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to join society';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* Page Header */}
      <Text variant="headlineMedium" style={styles.title}>Join a Society</Text>
      <Text variant="bodyMedium" style={{ color: '#888', textAlign: 'center', marginBottom: 20 }}>
        Select your society and flat to get started.
      </Text>

      {/* ── 1. Society Selection ── */}
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

      {/* ── 2. Flat Selection (Conditional) ── */}
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

      {/* ── 3. Relationship/Role Selection (Conditional) ── */}
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

      {/* ── 4. KYC Details (Conditional) ── */}
      {selectedFlat ? (
        <Surface style={styles.card} elevation={2}>
          <Text variant="titleSmall" style={styles.label}>
            {residentType === 'owner' ? 'KYC Documents (Required)' : 'KYC Documents (Optional)'}
          </Text>
          {/* Social Proof: Aadhaar */}
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
          {/* Tax Identification: PAN */}
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

      {/* Dynamic Error Messaging */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Primary Onboarding Trigger */}
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

      {/* Back Navigation */}
      <Button mode="text" onPress={() => navigation.goBack()} textColor="#888" style={{ marginTop: 4, marginBottom: 30 }}>
        Back
      </Button>
    </ScrollView>
  );
}

// ── Shared UI Architecture ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  title: { color: '#E8E8F0', fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  // Card-like surfaces for grouping selection steps
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 16, marginBottom: 14 },
  label: { color: '#E8E8F0', marginBottom: 8, fontWeight: '600' },
  // Wrapper for the native Picker to control rounded corners and overflow
  pickerContainer: { backgroundColor: '#12121F', borderRadius: 12, overflow: 'hidden' },
  picker: { color: '#E8E8F0', backgroundColor: '#12121F' },
  // Horizontal layout for role options
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 4 },
  input: { marginBottom: 10, backgroundColor: '#1A1A2E' },
  error: { color: '#FF5252', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  submitButton: { borderRadius: 12, marginTop: 4 },
});
