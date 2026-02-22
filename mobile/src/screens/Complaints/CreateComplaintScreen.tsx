import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { complaintsAPI } from '../../services/api';
import { useComplaintsStore } from '../../store';
import { ComplaintCategory } from '../../types';

const CATEGORIES: { label: string; value: ComplaintCategory }[] = [
  { label: '🔧 Plumbing', value: 'plumbing' },
  { label: '⚡ Electrical', value: 'electrical' },
  { label: '🧹 Cleaning', value: 'cleaning' },
  { label: '🔒 Security', value: 'security' },
  { label: '🔊 Noise', value: 'noise' },
  { label: '🚗 Parking', value: 'parking' },
  { label: ' Lift', value: 'lift' },
  { label: ' Water supply', value: 'water supply' },
  { label: '❓ Other', value: 'other' },
];

export default function CreateComplaintScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('other');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { fetchComplaints } = useComplaintsStore();

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 3,
    });
    if (!result.canceled) {
      setImages([...images, ...result.assets.map(a => a.uri)].slice(0, 3));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      setImages([...images, result.assets[0].uri].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title || !description) { Alert.alert('Error', 'Please fill all fields'); return; }
    setLoading(true);
    try {
      const complaint = await complaintsAPI.create({ category, title, description });
      // Upload images after complaint creation
      for (const uri of images) {
        try {
          await complaintsAPI.uploadImage(complaint.id, uri);
        } catch { /* image upload is best-effort */ }
      }
      Alert.alert('Success', 'Complaint submitted!');
      await fetchComplaints();
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>
          Raise a Complaint
        </Text>

        {/* Category Radio Buttons */}
        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Category</Text>
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

        <TextInput label="Title *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
        <TextInput label="Description *" value={description} onChangeText={setDescription} mode="outlined"
          multiline numberOfLines={4} style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        {/* Image Upload Section */}
        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8, marginTop: 4 }}>
          Attach Photos (max 3)
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

        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="send">
          Submit Complaint
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
  imageRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  imageWrapper: { position: 'relative' },
  thumbnail: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#252542' },
  removeBtn: { position: 'absolute', top: -8, right: -8, margin: 0 },
});
