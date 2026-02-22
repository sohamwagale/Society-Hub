import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton } from 'react-native-paper';
import { onboardingAPI, authAPI } from '../../services/api';
import { useAuthStore } from '../../store';

interface FlatEntry {
  flat_number: string;
  block: string;
  floor: string;
}

export default function CreateSocietyScreen({ navigation }: any) {
  const refreshUser = useAuthStore(s => s.refreshUser);

  // Society fields
  const [societyName, setSocietyName] = useState('');
  const [societyAddress, setSocietyAddress] = useState('');

  // Flats
  const [flats, setFlats] = useState<FlatEntry[]>([{ flat_number: '', block: 'A', floor: '1' }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addFlat = () => {
    setFlats([...flats, { flat_number: '', block: 'A', floor: '1' }]);
  };

  const removeFlat = (index: number) => {
    if (flats.length <= 1) return;
    setFlats(flats.filter((_, i) => i !== index));
  };

  const updateFlat = (index: number, field: keyof FlatEntry, value: string) => {
    const updated = [...flats];
    updated[index] = { ...updated[index], [field]: value };
    setFlats(updated);
  };

  const handleSubmit = async () => {
    setError('');
    if (!societyName.trim()) { setError('Society name is required'); return; }

    const validFlats = flats.filter(f => f.flat_number.trim());
    if (validFlats.length === 0) { setError('Add at least one flat'); return; }

    setLoading(true);
    try {
      await onboardingAPI.createSociety({
        society_name: societyName.trim(),
        society_address: societyAddress.trim() || undefined,
        flats: validFlats.map(f => ({
          flat_number: f.flat_number.trim(),
          block: f.block.trim() || 'A',
          floor: f.floor.trim() || '1',
        })),
      });
      await refreshUser();
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
      <Text variant="headlineMedium" style={styles.title}>Create a Society</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        You will become the administrator of this society.
      </Text>

      {/* Society Details */}
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

      {/* Flats */}
      <Surface style={styles.card} elevation={2}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Flats</Text>
          <Button mode="outlined" onPress={addFlat} textColor="#7C4DFF" compact
            style={{ borderColor: '#3D3D5C', borderRadius: 10 }} icon="plus">
            Add Flat
          </Button>
        </View>

        {flats.map((flat, index) => (
          <Surface key={index} style={styles.flatCard} elevation={1}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="labelLarge" style={{ color: '#888' }}>Flat #{index + 1}</Text>
              {flats.length > 1 && (
                <IconButton icon="delete" iconColor="#FF5252" size={20} onPress={() => removeFlat(index)} />
              )}
            </View>
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

      {error ? <Text style={styles.error}>{error}</Text> : null}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  title: { color: '#E8E8F0', fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#888', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 16, marginBottom: 16 },
  sectionTitle: { color: '#E8E8F0', marginBottom: 8, fontWeight: '600' },
  input: { marginBottom: 10, backgroundColor: '#1A1A2E' },
  flatCard: { backgroundColor: '#12121F', borderRadius: 12, padding: 12, marginBottom: 10 },
  error: { color: '#FF5252', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  submitButton: { borderRadius: 12, marginTop: 4, marginBottom: 40 },
});
