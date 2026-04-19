// Import React and hooks for focus-driven data orchestration
import React, { useState, useCallback } from 'react';
// Import layout and list rendering components
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, TouchableRipple, FAB, Chip } from 'react-native-paper';
// Import community icons for visual file categorization
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import documents API for statutory record management
import { documentsAPI } from '../../services/api';
// Import shared TypeScript definitions
import { SocietyDocument } from '../../types';
// Import common UI components for state feedback and sectional layout
import { LoadingScreen, EmptyState, SectionHeader, StatusBadge } from '../../components/Common';
// Import global auth store to derive administrative permissions
import { useAuthStore } from '../../store';
// Import navigation focus hook to ensure data freshness
import { useFocusEffect } from '@react-navigation/native';

/**
 * SocietyDocumentsListScreen:
 * A statutory repository of society records, including rules, audits, 
 * and insurance policies. Supports a multi-stage approval workflow.
 */
export default function SocietyDocumentsListScreen({ navigation }: any) {
  // Extract user session to gate administrative moderation tools
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  
  // ── Core Data State ──
  const [documents, setDocuments] = useState<SocietyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * loadDocuments:
   * Syncs the document library with the backend.
   */
  const loadDocuments = useCallback(async () => {
    try {
      const data = await documentsAPI.list();
      setDocuments(data);
    } catch {
      Alert.alert('Error', 'Failed to synchronize document library');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch data whenever the user returns to this screen
  useFocusEffect(useCallback(() => { loadDocuments(); }, []));

  /**
   * onRefresh:
   * Standard pull-to-refresh handler.
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  /**
   * handleApprove:
   * (Admin Only) Moves a document from draft/pending to public/approved state.
   */
  const handleApprove = async (id: string) => {
    try {
      await documentsAPI.approve(id);
      Alert.alert('Success', 'Document has been approved and is now visible to all residents.');
      await loadDocuments();
    } catch {
      Alert.alert('Error', 'Could not process document approval');
    }
  };

  /**
   * handleDelete:
   * (Admin Only) Permanent removal of a record from the society vault.
   */
  const handleDelete = async (id: string) => {
    Alert.alert('Delete Document', 'Are you sure? This action will permanently remove the record from all resident devices.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await documentsAPI.delete(id);
            Alert.alert('Success', 'Document deleted successfully.');
            await loadDocuments();
          } catch {
            Alert.alert('Error', 'Could not complete deletion');
          }
        }
      },
    ]);
  };

  // Initial loading gate
  if (loading) return <LoadingScreen />;

  // ── Perspective-based filtering ──
  const approvedDocs = documents.filter(d => d.is_approved);
  const pendingDocs = documents.filter(d => !d.is_approved);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
      >
        {documents.length === 0 ? (
          <EmptyState icon="file-document-outline" title="Library Empty" subtitle="Upload statutory records to share them with the community." />
        ) : (
          <>
            {/* ── Pending Section ── */}
            {/* Displayed if items are awaiting administrative KYC/Review */}
            {pendingDocs.length > 0 && (
              <>
                <SectionHeader title="Awaiting Validation" />
                {pendingDocs.map((doc) => (
                  <TouchableRipple key={doc.id} onPress={() => navigation.navigate('DocumentDetail', { documentId: doc.id })}>
                    <Surface style={styles.card} elevation={1}>
                      <View style={styles.cardRow}>
                        {/* Type-aware iconography */}
                        <View style={[styles.cardIcon, { backgroundColor: '#2E1A1A' }]}>
                          <MaterialCommunityIcons
                            name={doc.file_type === 'pdf' ? 'file-pdf-box' : 'file-image'}
                            size={24} color="#FFB74D"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{doc.title}</Text>
                          <Text variant="bodySmall" style={{ color: '#888' }}>
                            Contributor: {doc.uploader_name || 'System'} • {new Date(doc.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <Chip mode="flat" textStyle={{ color: '#FFB74D', fontSize: 11 }}
                          style={{ backgroundColor: '#3D2E1A', borderRadius: 12, height: 26 }}>
                          Pending
                        </Chip>
                      </View>
                      
                      {/* Administrative Quick Actions (Inline Moderation) */}
                      {isAdmin && (
                        <View style={styles.actionRow}>
                          <TouchableRipple onPress={() => handleApprove(doc.id)} style={styles.actionBtn}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" />
                              <Text style={{ color: '#4CAF50', fontSize: 13, fontWeight: '600' }}>Approve</Text>
                            </View>
                          </TouchableRipple>
                          <TouchableRipple onPress={() => handleDelete(doc.id)} style={styles.actionBtn}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <MaterialCommunityIcons name="delete" size={18} color="#FF5252" />
                              <Text style={{ color: '#FF5252', fontSize: 13, fontWeight: '600' }}>Discard</Text>
                            </View>
                          </TouchableRipple>
                        </View>
                      )}
                    </Surface>
                  </TouchableRipple>
                ))}
              </>
            )}

            {/* ── Approved/Public Section ── */}
            {approvedDocs.length > 0 && (
              <>
                <SectionHeader title="Official Records" />
                {approvedDocs.map((doc) => (
                  <TouchableRipple key={doc.id} onPress={() => navigation.navigate('DocumentDetail', { documentId: doc.id })}>
                    <Surface style={styles.card} elevation={1}>
                      <View style={styles.cardRow}>
                        <View style={styles.cardIcon}>
                          <MaterialCommunityIcons
                            name={doc.file_type === 'pdf' ? 'file-pdf-box' : 'file-image'}
                            size={24} color="#7C4DFF"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{doc.title}</Text>
                          <Text variant="bodySmall" style={{ color: '#888' }}>
                            {doc.uploader_name ? `Uploaded by ${doc.uploader_name}` : 'Official Record'} • {new Date(doc.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
                      </View>
                    </Surface>
                  </TouchableRipple>
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Global Action: Resource Contribution (Allow residents to submit files for review) */}
      <FAB
        icon="file-upload"
        style={styles.fab}
        color="#FFF"
        onPress={() => navigation.navigate('UploadDocument')}
      />
    </View>
  );
}

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1A3E',
    justifyContent: 'center', alignItems: 'center',
  },
  // Row for moderation buttons (Visible only to admins)
  actionRow: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252542',
  },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    backgroundColor: '#7C4DFF', borderRadius: 16,
  },
});
