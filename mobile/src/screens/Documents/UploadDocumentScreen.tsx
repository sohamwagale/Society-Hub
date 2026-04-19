// Import React and hooks for managing form state
import React, { useState } from 'react';
// Import layout, interaction, and media display utilities
import { View, ScrollView, StyleSheet, Alert, Image } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, TextInput, Button, Surface, IconButton } from 'react-native-paper';
// Import system-level file and image pickers
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
// Import documents API for persisting community resources
import { documentsAPI } from '../../services/api';

/**
 * UploadDocumentScreen:
 * An interface for contributing statutory records or resources.
 * Supports PDF and image formats with integrated previews.
 */
export default function UploadDocumentScreen({ navigation }: any) {
  // ── Form State: Narrative ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // ── Form State: Asset Tracking ──
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'pdf' | 'image' | null>(null);
  
  // ── Processing State ──
  const [loading, setLoading] = useState(false);

  /**
   * pickDocument:
   * Launches the native file explorer to select PDF or Image assets.
   */
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
        // Identify format for specialized pre-upload preview
        const ext = asset.name.split('.').pop()?.toLowerCase() || '';
        setFileType(['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image' : 'pdf');
      }
    } catch {
      Alert.alert('System Error', 'Could not open the document selector');
    }
  };

  /**
   * pickImage:
   * Direct shortcut to the device photo library for visual assets.
   */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8, // Optimization: Avoid uploading massive RAW files
    });
    if (!result.canceled && result.assets?.[0]) {
      setFileUri(result.assets[0].uri);
      setFileName('photo.jpg');
      setFileType('image');
    }
  };

  /**
   * handleUpload:
   * Commits the record and binary data to the cloud vault.
   */
  const handleUpload = async () => {
    // Validation: Enforce title and asset presence
    if (!title.trim()) {
      Alert.alert('Incomplete', 'Please provide a title for this record'); return;
    }
    if (!fileUri) {
      Alert.alert('Missing Asset', 'Please select a file to upload'); return;
    }

    setLoading(true);
    try {
      await documentsAPI.upload(title.trim(), fileUri, description.trim() || undefined);
      Alert.alert('Success', 'Document has been queued for administrative review.');
      navigation.goBack();
    } catch (e: any) {
      // Decompose backend validation errors for user clarity
      const detail = e.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : (detail || 'Cloud synchronization failed');
      Alert.alert('Server Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>
          Resource Contribution
        </Text>

        {/* Narrative Metadata */}
        <TextInput
          label="Document Title *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
          placeholder="e.g. Society Bye-laws 2024"
        />

        <TextInput
          label="Notes (Optional context)"
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

        {/* ── Asset Selection & Preview Module ── */}
        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Selected Resource *</Text>

        {fileUri ? (
          <View style={styles.filePreview}>
            {/* Conditional logic: Render image preview or generic file card */}
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
            {/* Deselect / Reset button */}
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
            {/* Multi-modal picking toolkit */}
            <Button
              mode="outlined"
              onPress={pickDocument}
              textColor="#00E5FF"
              style={styles.pickerBtn}
              icon="file-document"
            >
              Files
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

        {/* Primary Action Button */}
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
          Begin Upload
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
  // Styled container for staged assets
  filePreview: { position: 'relative', marginBottom: 20, alignSelf: 'flex-start' },
  previewImage: { width: 160, height: 160, borderRadius: 12, backgroundColor: '#252542' },
  // Generic card for non-visual media
  pdfPreview: {
    width: 160, height: 120, borderRadius: 12, backgroundColor: '#252542',
    justifyContent: 'center', alignItems: 'center',
  },
  pickerRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  pickerBtn: { flex: 1, borderColor: '#3D3D5C', borderRadius: 12 },
  button: { borderRadius: 12, marginTop: 8 },
});
