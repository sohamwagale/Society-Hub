// Import React and hooks for data orchestration and focus-aware updates
import React, { useState, useCallback } from 'react';
// Import layout, interaction, and system-level capability modules (Refresh, Linking)
import { View, FlatList, StyleSheet, RefreshControl, Alert, Image, Linking } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, FAB, Button, TextInput, Portal, Modal, TouchableRipple } from 'react-native-paper';
// Import community icons for visual categorization of notices
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import picker modules for binary attachments (Notices with supplementary PDFs or images)
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
// Import global stores for announcement state and user permissions
import { useAnnouncementsStore, useAuthStore } from '../../store';
// Import backend service for announcement operations
import { announcementsAPI } from '../../services/api';
// Import common UI loading and empty state wrappers
import { EmptyState, LoadingScreen } from '../../components/Common';
// Import shared TypeScript definitions
import { Announcement, AnnouncementPriority } from '../../types';
// Import navigation focus hook to ensure the feed is always fresh
import { useFocusEffect } from '@react-navigation/native';

// ── Priority Theming: Color coding for community awareness ──
const PRIORITY_CONFIG: Record<AnnouncementPriority, { color: string; icon: string; bg: string }> = {
  normal: { color: '#7C4DFF', icon: 'bullhorn', bg: '#1A1A3E' },       // Standard updates
  important: { color: '#FFB74D', icon: 'alert', bg: '#2E2A0E' },      // Required reading
  urgent: { color: '#FF5252', icon: 'alert-octagon', bg: '#2E0E0E' }, // Immediate action required
};

/**
 * AnnouncementsScreen:
 * The "digital bulletin board" of the society. 
 * Allows admins to broadcast news, pin critical info, and attach documentation.
 */
export default function AnnouncementsScreen() {
  // ── Global State & Auth ──
  const { announcements, loading, fetchAnnouncements } = useAnnouncementsStore();
  const user = useAuthStore(s => s.user);
  const [refreshing, setRefreshing] = useState(false);

  // ── Form State (Modal logic) ──
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [saving, setSaving] = useState(false);
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  // Synchronize with the cloud on entry
  useFocusEffect(useCallback(() => { fetchAnnouncements(); }, []));
  
  /**
   * onRefresh:
   * Triggers the "pull-to-refresh" gesture for manual synchronization.
   */
  const onRefresh = async () => { 
    setRefreshing(true); 
    await fetchAnnouncements(); 
    setRefreshing(false); 
  };

  /**
   * openCreate:
   * Prepares the modal for a fresh announcement broadcast.
   */
  const openCreate = () => {
    setIsEditing(false); setEditId(null);
    setTitle(''); setBody(''); setPriority('normal');
    setAttachmentUri(null); setAttachmentName(null);
    setShowModal(true);
  };

  /**
   * openEdit:
   * Pre-fills the modal with existing announcement metadata for modification.
   */
  const openEdit = (item: Announcement) => {
    setIsEditing(true); setEditId(item.id);
    setTitle(item.title); setBody(item.body); setPriority(item.priority as AnnouncementPriority);
    setAttachmentUri(null); setAttachmentName(null);
    setShowModal(true);
  };

  /**
   * pickAttachment:
   * Multi-modal picker allowing admins to attach context (Image vs PDF).
   */
  const pickAttachment = () => {
    Alert.alert('Attach Context', 'Select attachment source', [
      {
        text: 'Photo Library', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            setAttachmentUri(result.assets[0].uri);
            setAttachmentName(result.assets[0].fileName || 'image.jpg');
          }
        }
      },
      {
        text: 'Standard Document (PDF)', onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'], copyToCacheDirectory: true });
          if (!result.canceled && result.assets[0]) {
            setAttachmentUri(result.assets[0].uri);
            setAttachmentName(result.assets[0].name || 'document.pdf');
          }
        }
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  /**
   * handleSave:
   * Orchestrates the creation or update of an announcement.
   * Handles binary payload delivery in creation mode.
   */
  const handleSave = async () => {
    if (!title || !body) { Alert.alert('Incomplete Form', 'Heading and Content are mandatory.'); return; }
    setSaving(true);
    try {
      if (isEditing && editId) {
        // Direct field update for existing notices
        await announcementsAPI.update(editId, { title, body, priority });
        Alert.alert('Updated', 'The announcement has been revised.');
      } else {
        // Multi-part submission for new notices with potential attachments
        await announcementsAPI.create({ title, body, priority }, attachmentUri || undefined);
        Alert.alert('Broadcasted', 'The announcement is now visible to all residents.');
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (e: any) { 
      Alert.alert('Error', e.response?.data?.detail || 'Failed to post notice'); 
    } finally { 
      setSaving(false); 
    }
  };

  /**
   * handleDelete:
   * Administrative tool to prune the bulletin board.
   */
  const handleDelete = (id: string) => {
    Alert.alert('Discard Notice', 'Are you sure? This will remove the notice for all residents.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: async () => { await announcementsAPI.delete(id); fetchAnnouncements(); } }
    ]);
  };

  /**
   * handleTogglePin:
   * Prioritizes high-value info at the top of the feed.
   */
  const handleTogglePin = async (id: string) => {
    await announcementsAPI.togglePin(id); 
    fetchAnnouncements();
  };

  /**
   * openAttachment:
   * Handover to system browser or native viewer for announcement assets.
   */
  const openAttachment = async (item: Announcement) => {
    if (!item.attachment_url) return;
    try {
      const url = announcementsAPI.getAttachmentUrl(item.attachment_url);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Viewer Error', 'Unable to open the attached document.');
    }
  };

  // Derivative: Check for moderator credentials
  const isAdmin = user?.role === 'admin';

  /**
   * renderItem:
   * Visual logic for a single announcement card.
   */
  const renderItem = ({ item }: { item: Announcement }) => {
    const pConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG['normal'];
    return (
      <Surface style={styles.card} elevation={1}>
        <View style={styles.row}>
          {/* Visual categorization token */}
          <View style={[styles.iconBox, { backgroundColor: pConfig.bg, }]}>
            <MaterialCommunityIcons name={pConfig.icon as any} size={22} color={pConfig.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Importance indicators */}
              {item.pinned && <MaterialCommunityIcons name="pin" size={14} color="#FFB74D" />}
              <Text variant="titleSmall" style={{ color: '#ffffff', flex: 1, fontSize: 16, paddingVertical: 6 }}>{item.title}</Text>
              {item.priority !== 'normal' && (
                <View style={[styles.priorityBadge, { backgroundColor: pConfig.bg }]}>
                  <Text style={{ color: pConfig.color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                    {item.priority}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="bodySmall" style={{ color: '#C4C4D4', marginTop: 4 }}>{item.body}</Text>
            {/* Meta feedback: Attribution & Recency */}
            <Text variant="bodySmall" style={{ color: '#555', marginTop: 6, fontSize: 11 }}>
              {item.creator_name} • {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* ── Optional Attachment Component ── */}
        {item.attachment_url && (
          <TouchableRipple onPress={() => openAttachment(item)} borderless style={styles.attachmentRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.attachmentIcon}>
                <MaterialCommunityIcons
                  name={item.attachment_type === 'image' ? 'file-image' : 'file-pdf-box'}
                  size={20} color="#7C4DFF"
                />
              </View>
              {/* Quick thumb preview if media is an image */}
              {item.attachment_type === 'image' && (
                <Image
                  source={{ uri: announcementsAPI.getAttachmentUrl(item.attachment_url) }}
                  style={styles.attachmentThumb}
                  resizeMode="cover"
                />
              )}
              <Text variant="bodySmall" style={{ color: '#7C4DFF', flex: 1 }}>
                {item.attachment_type === 'image' ? 'Inspect Image' : 'Download Document (PDF)'}
              </Text>
              <MaterialCommunityIcons name="open-in-new" size={16} color="#888" />
            </View>
          </TouchableRipple>
        )}

        {/* ── Administrative Controls ── */}
        {isAdmin && (
          <View style={styles.actions}>
            <TouchableRipple onPress={() => handleTogglePin(item.id)} borderless style={styles.actionBtn}>
              <MaterialCommunityIcons name={item.pinned ? 'pin-off' : 'pin'} size={18} color={item.pinned ? '#FFB74D' : '#888'} />
            </TouchableRipple>
            <TouchableRipple onPress={() => openEdit(item)} borderless style={styles.actionBtn}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#7C4DFF" />
            </TouchableRipple>
            <TouchableRipple onPress={() => handleDelete(item.id)} borderless style={styles.actionBtn}>
              <MaterialCommunityIcons name="delete-outline" size={18} color="#FF5252" />
            </TouchableRipple>
          </View>
        )}
      </Surface>
    );
  };

  // Loading state gate (only for initial fetch)
  if (loading && announcements.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={announcements}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        // Pulse logic for background sync
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon="bullhorn" title="Quiet Bulletin Board" subtitle="Check back later for community updates." />}
      />

      {/* Primary Action Button (Moderators Only) */}
      {isAdmin && <FAB icon="plus" style={styles.fab} color="#FFF" onPress={openCreate} label="Broadcast" />}

      {/* ── Announcement Composer (Modal) ── */}
      <Portal>
        <Modal visible={showModal} onDismiss={() => setShowModal(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>
            {isEditing ? 'Revise Notice' : 'New Broadcast'}
          </Text>
          <TextInput label="Heading / Catch-line *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Main Message Content *" value={body} onChangeText={setBody} mode="outlined" multiline numberOfLines={4}
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

          {/* Priority selector */}
          <Text variant="bodySmall" style={{ color: '#888', marginBottom: 6 }}>Broadcast Urgency</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['normal', 'important', 'urgent'] as AnnouncementPriority[]).map(p => (
              <Button key={p} mode={priority === p ? 'contained' : 'outlined'} compact
                onPress={() => setPriority(p)}
                buttonColor={priority === p ? PRIORITY_CONFIG[p].color : 'transparent'}
                textColor={priority === p ? '#FFF' : '#888'}
                style={{ borderRadius: 12, borderColor: '#3D3D5C' }}>
                {p}
              </Button>
            ))}
          </View>

          {/* Attachment handling (Restricted to creation to ensure server consistency) */}
          {!isEditing && (
            <View style={{ marginBottom: 16 }}>
              <Text variant="bodySmall" style={{ color: '#888', marginBottom: 6 }}>Supplementary File (Optional)</Text>
              {attachmentUri ? (
                <View style={styles.attachmentPreview}>
                  <MaterialCommunityIcons name="paperclip" size={18} color="#7C4DFF" />
                  <Text variant="bodySmall" style={{ color: '#E8E8F0', flex: 1 }} numberOfLines={1}>
                    {attachmentName}
                  </Text>
                  <TouchableRipple onPress={() => { setAttachmentUri(null); setAttachmentName(null); }} borderless>
                    <MaterialCommunityIcons name="close-circle" size={20} color="#FF5252" />
                  </TouchableRipple>
                </View>
              ) : (
                <Button mode="outlined" icon="paperclip" compact onPress={pickAttachment}
                  textColor="#888" style={{ borderColor: '#3D3D5C', borderRadius: 12 }}>
                  Link Photo or PDF
                </Button>
              )}
            </View>
          )}

          <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }} icon="send">
            {isEditing ? 'Update Broadcast' : 'Publish to Board'}
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
  attachmentRow: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#252542',
    paddingVertical: 8, borderRadius: 8,
  },
  attachmentIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#1A1A3E',
    justifyContent: 'center', alignItems: 'center',
  },
  attachmentThumb: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#0F0F1A' },
  attachmentPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#252542', padding: 10, borderRadius: 10,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 16 },
  actionBtn: { padding: 4 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
  modal: { backgroundColor: '#1A1A2E', margin: 20, padding: 24, borderRadius: 20 },
  input: { marginBottom: 12, backgroundColor: '#1A1A2E' },
});
