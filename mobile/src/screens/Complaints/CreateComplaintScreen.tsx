// Import React and hooks for managing form state and side-effects
import React, { useState } from 'react';
// Import layout, interaction, and system-level media utilities
import { View, ScrollView, StyleSheet, Alert, Image } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, TextInput, Button, Surface, IconButton } from 'react-native-paper';
// Import expo image picker for multi-attachment evidence capture
import * as ImagePicker from 'expo-image-picker';
// Import complaints API for ticket creation and image upload orchestration
import { complaintsAPI } from '../../services/api';
// Import global store to refresh the community list after report submission
import { useComplaintsStore } from '../../store';
// Import shared TypeScript definitions
import { ComplaintCategory } from '../../types';

// ── Shared Configuration: Categorization Taxonomy ──
const CATEGORIES: { label: string; value: ComplaintCategory }[] = [
  { label: '🔧 Plumbing', value: 'plumbing' },
  { label: '⚡ Electrical', value: 'electrical' },
  { label: '🧹 Cleaning', value: 'cleaning' },
  { label: '🔒 Security', value: 'security' },
  { label: '🔊 Noise', value: 'noise' },
  { label: '🚗 Parking', value: 'parking' },
  { label: '🛗 Lift', value: 'lift' },
  { label: '🚰 Water supply', value: 'water supply' },
  { label: '❓ Other', value: 'other' },
];

/**
 * CreateComplaintScreen:
 * A formal interface for residents to report grievances.
 * Features multi-attachment support (max 3) and taxonomic classification.
 */
export default function CreateComplaintScreen({ navigation }: any) {
  // ── Form State: Narrative ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('other');
  
  // ── Form State: Binary Attachments (Evidence) ──
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { fetchComplaints } = useComplaintsStore();

  /**
   * pickImage:
   * Launches the system library for multi-image selection (up to 3 total).
   */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 3 - images.length, // Enforce the 3-image cap
    });
    if (!result.canceled) {
      // Append new selections while preserving the cap
      setImages([...images, ...result.assets.map(a => a.uri)].slice(0, 3));
    }
  };

  /**
   * takePhoto:
   * Native bridge to the device camera for real-time evidence capture.
   */
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera access is required to take real-time proof of the issue.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setImages([...images, result.assets[0].uri].slice(0, 3));
    }
  };

  /**
   * removeImage:
   * Discards a specific attachment from the staging array.
   */
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  /**
   * handleCreate:
   * Orchestrates the two-stage submission:
   * 1. Create the complaint record (JSON).
   * 2. Sequentially upload binary attachments (Best-effort).
   */
  const handleCreate = async () => {
    if (!title || !description) { 
      Alert.alert('Incomplete Form', 'Heading and Description are mandatory metrics.'); 
      return; 
    }
    
    setLoading(true);
    try {
      // Step 1: Create the logical case record
      const complaint = await complaintsAPI.create({ category, title, description });
      
      // Step 2: Binary synchronization cycle
      for (const uri of images) {
        try {
          await complaintsAPI.uploadImage(complaint.id, uri);
        } catch { 
          // Log and continue: Record takes priority over images
          console.warn('Image upload failed for uri:', uri);
        }
      }

      Alert.alert('Report Filed', 'Your complaint has been synchronized with society management.');
      await fetchComplaints(); // Refresh global list
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Submission Error', e.response?.data?.detail || 'Failed to file report');
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>
          Report a Grievance
        </Text>

        {/* ── Category Matrix ── */}
        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Issue Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.value}
              mode={category === cat.value ? 'contained' : 'outlined'}
              onPress={() => setCategory(cat.value)}
              style={styles.categoryBtn}
              buttonColor={category === cat.value ? '#311B92' : 'transparent'}
              textColor={category === cat.value ? '#E8E8F0' : '#888'}
              compact
            >
              {cat.label}
            </Button>
          ))}
        </View>

        {/* ── Identity Block ── */}
        <TextInput label="Grievance Title *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" placeholder="e.g. Water seepage in master bedroom" />
        
        <TextInput label="Detailed Narrative *" value={description} onChangeText={setDescription} mode="outlined"
          multiline numberOfLines={4} style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" placeholder="Please describe the issue in depth..." />

        {/* ── Attachment Evidence: Multi-Image ── */}
        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8, marginTop: 4 }}>
          Audit Evidence (Max 3 Images)
        </Text>
        <View style={styles.imageRow}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <IconButton
                icon="close-circle"
                size={18}
                iconColor="#FF5252"
                style={styles.removeBtn}
                onPress={() => removeImage(index)}
              />
            </View>
          ))}
        </View>
        
        {/* Interaction Gates for capture */}
        {images.length < 3 && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Button mode="outlined" onPress={pickImage} textColor="#00E5FF"
              style={{ borderRadius: 12, flex: 1, borderColor: '#3D3D5C' }} icon="image-plus" compact>
              Gallery
            </Button>
            <Button mode="outlined" onPress={takePhoto} textColor="#00E5FF"
              style={{ borderRadius: 12, flex: 1, borderColor: '#3D3D5C' }} icon="camera" compact>
              Camera
            </Button>
          </View>
        )}

        {/* Global Action Button */}
        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="send">
          File Report
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
  imageRow: { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  imageWrapper: { position: 'relative' },
  thumbnail: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#252542' },
  removeBtn: { position: 'absolute', top: -8, right: -8, margin: 0 },
});
