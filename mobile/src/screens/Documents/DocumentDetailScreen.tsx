import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image, Linking } from 'react-native';
import { Text, Surface, Button, Divider, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { documentsAPI } from '../../services/api';
import { SocietyDocument } from '../../types';
import { LoadingScreen } from '../../components/Common';
import { useAuthStore } from '../../store';

export default function DocumentDetailScreen({ route, navigation }: any) {
  const { documentId } = route.params;
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [doc, setDoc] = useState<SocietyDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDocument(); }, [documentId]);

  const loadDocument = async () => {
    try {
      const data = await documentsAPI.get(documentId);
      setDoc(data);
    } catch {
      Alert.alert('Error', 'Failed to load document');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    if (!doc) return;
    try {
      const url = documentsAPI.getFileUrl(doc.file_url);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const handleApprove = async () => {
    if (!doc) return;
    try {
      await documentsAPI.approve(doc.id);
      Alert.alert('Success', 'Document approved');
      await loadDocument();
    } catch {
      Alert.alert('Error', 'Failed to approve');
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    Alert.alert('Delete Document', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await documentsAPI.delete(doc.id);
            Alert.alert('Success', 'Document deleted');
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete');
          }
        }
      },
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (!doc) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons
              name={doc.file_type === 'pdf' ? 'file-pdf-box' : 'file-image'}
              size={32} color="#7C4DFF"
            />
          </View>
          {!doc.is_approved && (
            <Chip mode="flat" textStyle={{ color: '#FFB74D', fontSize: 12 }}
              style={{ backgroundColor: '#3D2E1A', borderRadius: 12 }}>
              Pending Approval
            </Chip>
          )}
        </View>

        <Text variant="headlineSmall" style={styles.title}>{doc.title}</Text>
        {doc.description && (
          <Text variant="bodyMedium" style={styles.description}>{doc.description}</Text>
        )}

        <Divider style={styles.divider} />

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Uploaded By</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>{doc.uploader_name || 'Unknown'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>File Type</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>{doc.file_type === 'pdf' ? 'PDF Document' : 'Image'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Uploaded On</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>
            {new Date(doc.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Preview for images */}
        {doc.file_type === 'image' && (
          <View style={styles.previewContainer}>
            <Text variant="titleMedium" style={{ color: '#E8E8F0', marginBottom: 12 }}>Preview</Text>
            <Image
              source={{ uri: documentsAPI.getFileUrl(doc.file_url) }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Open button */}
        <Button
          mode="contained"
          icon="open-in-new"
          onPress={handleOpen}
          buttonColor="#3D3D5C"
          style={{ marginTop: 16, borderRadius: 12 }}
        >
          Open Document
        </Button>

        {/* Admin Actions */}
        {isAdmin && (
          <View style={styles.adminActions}>
            {!doc.is_approved && (
              <Button
                mode="contained"
                icon="check-circle"
                onPress={handleApprove}
                buttonColor="#1B5E20"
                style={{ flex: 1, borderRadius: 12 }}
              >
                Approve
              </Button>
            )}
            <Button
              mode="outlined"
              icon="delete"
              onPress={handleDelete}
              textColor="#FF5252"
              style={{ flex: 1, borderRadius: 12, borderColor: '#FF5252' }}
            >
              Delete
            </Button>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  iconBox: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#1A1A3E',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: '#E8E8F0', fontWeight: '700' },
  description: { color: '#888', marginTop: 8 },
  divider: { marginVertical: 16, backgroundColor: '#252542' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  previewContainer: { marginTop: 24, padding: 16, backgroundColor: '#252542', borderRadius: 12 },
  imagePreview: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#0F0F1A' },
  adminActions: { flexDirection: 'row', gap: 12, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#252542' },
});
