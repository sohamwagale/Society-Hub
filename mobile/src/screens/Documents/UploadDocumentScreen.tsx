import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { documentsAPI } from '../../services/api';

export default function UploadDocumentScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  const [loading, setLoading] = useState(false);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setFileUri(asset.uri);
        setFileName(asset.name);
        const ext = asset.name.split('.').pop()?.toLowerCase() || '';
        setFileType(['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image' : 'pdf');
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setFileUri(result.assets[0].uri);
      setFileName('photo.jpg');
      setFileType('image');
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title'); return;
    }
    if (!fileUri) {
      Alert.alert('Error', 'Please select a file'); return;
    }

    setLoading(true);
    try {
      await documentsAPI.upload(title.trim(), fileUri, description.trim() || undefined);
      Alert.alert('Success', 'Document uploaded successfully!');
      navigation.goBack();
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : (detail || 'Upload failed');
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>
          Upload Document
        </Text>

        <TextInput
          label="Document Title *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
        />

        <TextInput
          label="Description (optional)"
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

        {/* File Selection */}
        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>File *</Text>

        {fileUri ? (
          <View style={styles.filePreview}>
            {fileType === 'image' ? (
              <Image source={{ uri: fileUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.pdfPreview}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#FF5252', fontSize: 32 }}>📄</Text>
                  <Text variant="bodySmall" style={{ color: '#E8E8F0', marginTop: 4 }}>{fileName}</Text>
                </View>
              </View>
            )}
            <IconButton
              icon="close-circle"
              size={24}
              iconColor="#FF5252"
              style={{ position: 'absolute', top: -12, right: -12 }}
              onPress={() => { setFileUri(null); setFileName(null); setFileType(null); }}
            />
          </View>
        ) : (
          <View style={styles.pickerRow}>
            <Button
              mode="outlined"
              onPress={pickDocument}
              textColor="#00E5FF"
              style={styles.pickerBtn}
              icon="file-document"
            >
              Browse Files
            </Button>
            <Button
              mode="outlined"
              onPress={pickImage}
              textColor="#00E5FF"
              style={styles.pickerBtn}
              icon="camera"
            >
              Gallery
            </Button>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleUpload}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 6 }}
          buttonColor="#7C4DFF"
          icon="upload"
        >
          Upload Document
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  filePreview: { position: 'relative', marginBottom: 20, alignSelf: 'flex-start' },
  previewImage: { width: 160, height: 160, borderRadius: 12, backgroundColor: '#252542' },
  pdfPreview: {
    width: 160, height: 120, borderRadius: 12, backgroundColor: '#252542',
    justifyContent: 'center', alignItems: 'center',
  },
  pickerRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickerBtn: { flex: 1, borderColor: '#3D3D5C', borderRadius: 12 },
  button: { borderRadius: 12, marginTop: 8 },
});
