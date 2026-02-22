import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert, Image, Linking } from 'react-native';
import { Text, Surface, FAB, Button, TextInput, Portal, Modal, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useAnnouncementsStore, useAuthStore } from '../../store';
import { announcementsAPI } from '../../services/api';
import { EmptyState, LoadingScreen } from '../../components/Common';
import { Announcement, AnnouncementPriority } from '../../types';
import { useFocusEffect } from '@react-navigation/native';

const PRIORITY_CONFIG: Record<AnnouncementPriority, { color: string; icon: string; bg: string }> = {
  normal: { color: '#7C4DFF', icon: 'bullhorn', bg: '#1A1A3E' },
  important: { color: '#FFB74D', icon: 'alert', bg: '#2E2A0E' },
  urgent: { color: '#FF5252', icon: 'alert-octagon', bg: '#2E0E0E' },
};

export default function AnnouncementsScreen() {
  const { announcements, loading, fetchAnnouncements } = useAnnouncementsStore();
  const user = useAuthStore(s => s.user);
  const [refreshing, setRefreshing] = useState(false);

  // Create/Edit State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [saving, setSaving] = useState(false);
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { fetchAnnouncements(); }, []));
  const onRefresh = async () => { setRefreshing(true); await fetchAnnouncements(); setRefreshing(false); };

  const openCreate = () => {
    setIsEditing(false); setEditId(null);
    setTitle(''); setBody(''); setPriority('normal');
    setAttachmentUri(null); setAttachmentName(null);
    setShowModal(true);
  };

  const openEdit = (item: Announcement) => {
    setIsEditing(true); setEditId(item.id);
    setTitle(item.title); setBody(item.body); setPriority(item.priority as AnnouncementPriority);
    setAttachmentUri(null); setAttachmentName(null);
    setShowModal(true);
  };

  const pickAttachment = () => {
    Alert.alert('Attach File', 'Choose source', [
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
        text: 'Document (PDF)', onPress: async () => {
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

  const handleSave = async () => {
    if (!title || !body) { Alert.alert('Error', 'Title and body are required'); return; }
    setSaving(true);
    try {
      if (isEditing && editId) {
        await announcementsAPI.update(editId, { title, body, priority });
        Alert.alert('Success', 'Announcement updated');
      } else {
        await announcementsAPI.create({ title, body, priority }, attachmentUri || undefined);
        Alert.alert('Success', 'Announcement posted');
      }
      setShowModal(false);
      fetchAnnouncements();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this announcement?', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await announcementsAPI.delete(id); fetchAnnouncements();
        }
      }
    ]);
  };

  const handleTogglePin = async (id: string) => {
    await announcementsAPI.togglePin(id); fetchAnnouncements();
  };

  const openAttachment = async (item: Announcement) => {
    if (!item.attachment_url) return;
    try {
      const url = announcementsAPI.getAttachmentUrl(item.attachment_url);
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Failed to open attachment');
    }
  };

  const isAdmin = user?.role === 'admin';

  const renderItem = ({ item }: { item: Announcement }) => {
    const pConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG['normal'];
    return (
      <Surface style={styles.card} elevation={1}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: pConfig.bg, }]}>
            <MaterialCommunityIcons name={pConfig.icon as any} size={22} color={pConfig.color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.pinned && <MaterialCommunityIcons name="pin" size={14} color="#FFB74D" />}
              <Text variant="titleSmall" style={{ color: '#ffffffff', flex: 1, fontSize: 16, paddingVertical: 6 }}>{item.title}</Text>
              {item.priority !== 'normal' && (
                <View style={[styles.priorityBadge, { backgroundColor: pConfig.bg }]}>
                  <Text style={{ color: pConfig.color, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                    {item.priority}
                  </Text>
                </View>
              )}
            </View>
            <Text variant="bodySmall" style={{ color: '#C4C4D4', marginTop: 4 }}>{item.body}</Text>
            <Text variant="bodySmall" style={{ color: '#555', marginTop: 6, fontSize: 11 }}>
              {item.creator_name} • {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Attachment section */}
        {item.attachment_url && (
          <TouchableRipple onPress={() => openAttachment(item)} borderless style={styles.attachmentRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.attachmentIcon}>
                <MaterialCommunityIcons
                  name={item.attachment_type === 'image' ? 'file-image' : 'file-pdf-box'}
                  size={20} color="#7C4DFF"
                />
              </View>
              {item.attachment_type === 'image' && (
                <Image
                  source={{ uri: announcementsAPI.getAttachmentUrl(item.attachment_url) }}
                  style={styles.attachmentThumb}
                  resizeMode="cover"
                />
              )}
              <Text variant="bodySmall" style={{ color: '#7C4DFF', flex: 1 }}>
                {item.attachment_type === 'image' ? 'View Image' : 'Open PDF'}
              </Text>
              <MaterialCommunityIcons name="open-in-new" size={16} color="#888" />
            </View>
          </TouchableRipple>
        )}

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

  if (loading && announcements.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={announcements}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon="bullhorn" title="No announcements" subtitle="Nothing posted yet" />}
      />

      {isAdmin && <FAB icon="plus" style={styles.fab} color="#FFF" onPress={openCreate} />}

      <Portal>
        <Modal visible={showModal} onDismiss={() => setShowModal(false)} contentContainerStyle={styles.modal}>
          <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 16 }}>
            {isEditing ? 'Edit Announcement' : 'New Announcement'}
          </Text>
          <TextInput label="Title *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
            outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
          <TextInput label="Body *" value={body} onChangeText={setBody} mode="outlined" multiline numberOfLines={4}
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

          <Text variant="bodySmall" style={{ color: '#888', marginBottom: 6 }}>Priority</Text>
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

          {/* Attachment picker (create mode only) */}
          {!isEditing && (
            <View style={{ marginBottom: 16 }}>
              <Text variant="bodySmall" style={{ color: '#888', marginBottom: 6 }}>Attachment (optional)</Text>
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
                  Attach Image or PDF
                </Button>
              )}
            </View>
          )}

          <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}
            buttonColor="#7C4DFF" style={{ borderRadius: 12 }} icon="send">
            {isEditing ? 'Update' : 'Post'}
          </Button>
        </Modal>
      </Portal>
    </View>
  );
}

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
