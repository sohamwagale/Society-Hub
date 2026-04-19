// Import React and hooks for managing complex nested state (Societies + Flats)
import React, { useState } from 'react';
// Import layout and UI feedback components from React Native
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, TextInput, Button, Surface, IconButton } from 'react-native-paper';
// Import APIs for submitting the organization data
import { onboardingAPI, authAPI } from '../../services/api';
// Import global state to refresh user identity after administration rights are granted
import { useAuthStore } from '../../store';

/**
 * FlatEntry:
 * Defines the structure for a single flat definition during society setup.
 */
interface FlatEntry {
  flat_number: string;
  block: string;
  floor: string;
}

/**
 * CreateSocietyScreen:
 * A wizard-style form for administrators to define their housing society
 * and pre-register the physical inventory of flats.
 */
export default function CreateSocietyScreen({ navigation }: any) {
  // Extract refreshUser to update session state (society_id and is_admin) post-creation
  const refreshUser = useAuthStore(s => s.refreshUser);

  // ── Core Society State ──
  const [societyName, setSocietyName] = useState('');
  const [societyAddress, setSocietyAddress] = useState('');

  // ── Dynamic Dynamic Flats List State ──
  // Starts with one empty entry to guide the user
  const [flats, setFlats] = useState<FlatEntry[]>([{ flat_number: '', block: 'A', floor: '1' }]);

  // ── UI Control State ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * addFlat:
   * Appends a new empty flat object to the list.
   */
  const addFlat = () => {
    setFlats([...flats, { flat_number: '', block: 'A', floor: '1' }]);
  };

  /**
   * removeFlat:
   * Deletes a flat entry by index, enforcing a minimum of 1 flat.
   */
  const removeFlat = (index: number) => {
    if (flats.length <= 1) return;
    setFlats(flats.filter((_, i) => i !== index));
  };

  /**
   * updateFlat:
   * High-order state updater for specific fields within a flat entry.
   */
  const updateFlat = (index: number, field: keyof FlatEntry, value: string) => {
    const updated = [...flats];
    updated[index] = { ...updated[index], [field]: value };
    setFlats(updated);
  };

  /**
   * handleSubmit:
   * Validates the schema and pushes the entire society structure to the backend.
   */
  const handleSubmit = async () => {
    setError('');
    // ── Validation Guard ──
    if (!societyName.trim()) { setError('Society name is required'); return; }

    // Filter out rows where the user hasn't provided a flat number
    const validFlats = flats.filter(f => f.flat_number.trim());
    if (validFlats.length === 0) { setError('Add at least one flat'); return; }

    setLoading(true);
    try {
      // API call to persist the new organization and its inventory
      await onboardingAPI.createSociety({
        society_name: societyName.trim(),
        society_address: societyAddress.trim() || undefined,
        flats: validFlats.map(f => ({
          flat_number: f.flat_number.trim(),
          block: f.block.trim() || 'A',
          floor: f.floor.trim() || '1',
        })),
      });
      // Synchronize local session with the new administrative profile
      await refreshUser();
      // Show confirmation to provide clear feedback before navigation redirection
      Alert.alert('Success', 'Society created! You are now the administrator.', [
        { text: 'OK' },
      ]);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Failed to create society';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      {/* Header Section */}
      <Text variant="headlineMedium" style={styles.title}>Create a Society</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        You will become the administrator of this society.
      </Text>

      {/* ── Section A: Identity ── */}
      <Surface style={styles.card} elevation={2}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Society Details</Text>
        <TextInput
          label="Society Name *"
          value={societyName}
          onChangeText={setSocietyName}
          mode="outlined"
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
          left={<TextInput.Icon icon="home-city" />}
        />
        <TextInput
          label="Address"
          value={societyAddress}
          onChangeText={setSocietyAddress}
          mode="outlined"
          multiline
          numberOfLines={2}
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
          left={<TextInput.Icon icon="map-marker" />}
        />
      </Surface>

      {/* ── Section B: Inventory ── */}
      <Surface style={styles.card} elevation={2}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Flats</Text>
          {/* Action to expand the form dynamically */}
          <Button mode="outlined" onPress={addFlat} textColor="#7C4DFF" compact
            style={{ borderColor: '#3D3D5C', borderRadius: 10 }} icon="plus">
            Add Flat
          </Button>
        </View>

        {/* Iterate over the list of flat entries */}
        {flats.map((flat, index) => (
          <Surface key={index} style={styles.flatCard} elevation={1}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="labelLarge" style={{ color: '#888' }}>Flat #{index + 1}</Text>
              {/* Allow deletion if more than one entry exists */}
              {flats.length > 1 && (
                <IconButton icon="delete" iconColor="#FF5252" size={20} onPress={() => removeFlat(index)} />
              )}
            </View>
            {/* Horizontal row for compact flat parameters */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                label="Flat No *"
                value={flat.flat_number}
                onChangeText={(v) => updateFlat(index, 'flat_number', v)}
                mode="outlined"
                style={[styles.input, { flex: 2 }]}
                outlineColor="#3D3D5C"
                activeOutlineColor="#7C4DFF"
                textColor="#E8E8F0"
              />
              <TextInput
                label="Block"
                value={flat.block}
                onChangeText={(v) => updateFlat(index, 'block', v)}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineColor="#3D3D5C"
                activeOutlineColor="#7C4DFF"
                textColor="#E8E8F0"
              />
              <TextInput
                label="Floor"
                value={flat.floor}
                onChangeText={(v) => updateFlat(index, 'floor', v)}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                outlineColor="#3D3D5C"
                activeOutlineColor="#7C4DFF"
                textColor="#E8E8F0"
              />
            </View>
          </Surface>
        ))}
      </Surface>

      {/* Logic-driven Error Feedback */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Primary Global Action */}
      <Button
        mode="contained"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        buttonColor="#7C4DFF"
        style={styles.submitButton}
        contentStyle={{ paddingVertical: 6 }}
        icon="check-circle"
      >
        Create Society
      </Button>
    </ScrollView>
  );
}

// ── Shared UI Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  title: { color: '#E8E8F0', fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 20 },
  // Root card styling
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#E8E8F0', marginBottom: 8, fontWeight: '600' },
  input: { marginBottom: 10, backgroundColor: '#1A1A2E' },
  // Nested card styling for individual flat entries
  flatCard: { backgroundColor: '#12121F', borderRadius: 12, padding: 12, marginBottom: 10 },
  error: { color: '#FF5252', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  submitButton: { borderRadius: 12, marginTop: 4, marginBottom: 40 },
});
