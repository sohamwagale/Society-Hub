// Import React and hooks for managing component lifecycle and state
import React, { useEffect, useState } from 'react';
// Import layout, interaction, media, and system linking utilities
import { View, ScrollView, StyleSheet, Alert, Image, Linking } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, Button, Divider, Chip } from 'react-native-paper';
// Import community icons for visual categorization
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import documents API for fetching and moderating records
import { documentsAPI } from '../../services/api';
// Import shared TypeScript definitions
import { SocietyDocument } from '../../types';
// Import common UI components for state feedback
import { LoadingScreen } from '../../components/Common';
// Import global auth store to derive administrative permissions
import { useAuthStore } from '../../store';

/**
 * DocumentDetailScreen:
 * A granular view of a society record, providing metadata, 
 * visual previews, and administrative moderation controls.
 */
export default function DocumentDetailScreen({ route, navigation }: any) {
  // Extract document identifier from navigation parameters
  const { documentId } = route.params;
  
  // Extract user session to determine interactive rights
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  
  // ── Core Data State ──
  const [doc, setDoc] = useState<SocietyDocument | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the detailed record on mount or when the ID changes
  useEffect(() => { loadDocument(); }, [documentId]);

  /**
   * loadDocument:
   * Fetches the full document record from the backend.
   */
  const loadDocument = async () => {
    try {
      const data = await documentsAPI.get(documentId);
      setDoc(data);
    } catch {
      // Graceful fallback for missing or private records
      Alert.alert('Error', 'Failed to retrieve document details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  /**
   * handleOpen:
   * Directs the user to the native file viewer or system browser via an authenticated URL.
   */
  const handleOpen = async () => {
    if (!doc) return;
    try {
      const url = documentsAPI.getFileUrl(doc.file_url);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Failed to launch document viewer');
    }
  };

  /**
   * handleApprove:
   * (Admin Only) Validates a contributed document for public viewing.
   */
  const handleApprove = async () => {
    if (!doc) return;
    try {
      await documentsAPI.approve(doc.id);
      Alert.alert('Success', 'Document has been approved for the society vault.');
      await loadDocument(); // Refresh internal state
    } catch {
      Alert.alert('Error', 'Approval process failed');
    }
  };

  /**
   * handleDelete:
   * (Admin Only) Permanent removal of the record.
   */
  const handleDelete = async () => {
    if (!doc) return;
    Alert.alert('Delete Record', 'Are you sure? This will remove the file permanently for all residents.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await documentsAPI.delete(doc.id);
            Alert.alert('Success', 'Document purged successfully.');
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Deletion failed');
          }
        }
      },
    ]);
  };

  // Initial loading gate
  if (loading) return <LoadingScreen />;
  if (!doc) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {/* ── Core Information Card ── */}
      <Surface style={styles.card} elevation={1}>
        <View style={styles.headerRow}>
          {/* Visual categorization by file type */}
          <View style={styles.iconBox}>
            <MaterialCommunityIcons
              name={doc.file_type === 'pdf' ? 'file-pdf-box' : 'file-image'}
              size={32} color="#7C4DFF"
            />
          </View>
          {/* Status flag for non-public records */}
          {!doc.is_approved && (
            <Chip mode="flat" textStyle={{ color: '#FFB74D', fontSize: 12 }}
              style={{ backgroundColor: '#3D2E1A', borderRadius: 12 }}>
              Awaiting Approval
            </Chip>
          )}
        </View>

        {/* Primary Metadata */}
        <Text variant="headlineSmall" style={styles.title}>{doc.title}</Text>
        {doc.description && (
          <Text variant="bodyMedium" style={styles.description}>{doc.description}</Text>
        )}

        <Divider style={styles.divider} />

        {/* Contribution & Temporal Metadata */}
        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Contributor</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>{doc.uploader_name || 'Organization'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Format</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>{doc.file_type === 'pdf' ? 'PDF Document' : 'Raster Image'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Upload Date</Text>
          <Text variant="bodyLarge" style={{ color: '#E8E8F0' }}>
            {new Date(doc.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* ── Visual Preview Module ── */}
        {/* Rendered only for image assets to provide immediate context */}
        {doc.file_type === 'image' && (
          <View style={styles.previewContainer}>
            <Text variant="titleMedium" style={{ color: '#E8E8F0', marginBottom: 12 }}>Snapshot</Text>
            <Image
              source={{ uri: documentsAPI.getFileUrl(doc.file_url) }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Primary Action: Launch specialized system viewer */}
        <Button
          mode="contained"
          icon="open-in-new"
          onPress={handleOpen}
          buttonColor="#3D3D5C"
          style={{ marginTop: 16, borderRadius: 12 }}
        >
          Open Document
        </Button>

        {/* ── Administrative Moderation Block ── */}
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
              Discard
            </Button>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

// ── Shared UI Tokens ──
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
  // Styled preview box for media files
  previewContainer: { marginTop: 24, padding: 16, backgroundColor: '#252542', borderRadius: 12 },
  imagePreview: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#0F0F1A' },
  // Action grouping for management tools
  adminActions: { flexDirection: 'row', gap: 12, marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#252542' },
});
