import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Surface, TouchableRipple, FAB, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { documentsAPI } from '../../services/api';
import { SocietyDocument } from '../../types';
import { LoadingScreen, EmptyState, SectionHeader, StatusBadge } from '../../components/Common';
import { useAuthStore } from '../../store';
import { useFocusEffect } from '@react-navigation/native';

export default function SocietyDocumentsListScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [documents, setDocuments] = useState<SocietyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await documentsAPI.list();
      setDocuments(data);
    } catch {
      Alert.alert('Error', 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadDocuments(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    try {
      await documentsAPI.approve(id);
      Alert.alert('Success', 'Document approved');
      await loadDocuments();
    } catch {
      Alert.alert('Error', 'Failed to approve document');
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Document', 'Are you sure you want to delete this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await documentsAPI.delete(id);
            Alert.alert('Success', 'Document deleted');
            await loadDocuments();
          } catch {
            Alert.alert('Error', 'Failed to delete document');
          }
        }
      },
    ]);
  };

  if (loading) return <LoadingScreen />;

  const approvedDocs = documents.filter(d => d.is_approved);
  const pendingDocs = documents.filter(d => !d.is_approved);

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
      >
        {documents.length === 0 ? (
          <EmptyState icon="file-document-outline" title="No Documents" subtitle="Upload society documents to share with residents" />
        ) : (
          <>
            {/* Pending Section (admin or uploader) */}
            {pendingDocs.length > 0 && (
              <>
                <SectionHeader title="Pending Approval" />
                {pendingDocs.map((doc) => (
                  <TouchableRipple key={doc.id} onPress={() => navigation.navigate('DocumentDetail', { documentId: doc.id })}>
                    <Surface style={styles.card} elevation={1}>
                      <View style={styles.cardRow}>
                        <View style={[styles.cardIcon, { backgroundColor: '#2E1A1A' }]}>
                          <MaterialCommunityIcons
                            name={doc.file_type === 'pdf' ? 'file-pdf-box' : 'file-image'}
                            size={24} color="#FFB74D"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{doc.title}</Text>
                          <Text variant="bodySmall" style={{ color: '#888' }}>
                            By {doc.uploader_name || 'Unknown'} • {new Date(doc.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <Chip mode="flat" textStyle={{ color: '#FFB74D', fontSize: 11 }}
                          style={{ backgroundColor: '#3D2E1A', borderRadius: 12, height: 26 }}>
                          Pending
                        </Chip>
                      </View>
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
                              <Text style={{ color: '#FF5252', fontSize: 13, fontWeight: '600' }}>Delete</Text>
                            </View>
                          </TouchableRipple>
                        </View>
                      )}
                    </Surface>
                  </TouchableRipple>
                ))}
              </>
            )}

            {/* Approved Documents */}
            {approvedDocs.length > 0 && (
              <>
                <SectionHeader title="Documents" />
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
                            By {doc.uploader_name || 'Unknown'} • {new Date(doc.created_at).toLocaleDateString()}
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

      <FAB
        icon="plus"
        style={styles.fab}
        color="#FFF"
        onPress={() => navigation.navigate('UploadDocument')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1A3E',
    justifyContent: 'center', alignItems: 'center',
  },
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
