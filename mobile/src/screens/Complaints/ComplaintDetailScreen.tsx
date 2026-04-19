// Import React and hooks for managing focus-based data lifecycle
import React, { useState, useCallback } from 'react';
// Import layout, interaction, and platform-specific keyboard management
import { View, ScrollView, StyleSheet, Alert, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, Button, TextInput, Divider, Avatar } from 'react-native-paper';
// Import community icons for visual status and category cues
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import complaints API for lifecycle management and discussion threads
import { complaintsAPI } from '../../services/api';
// Import shared TypeScript definitions
import { Complaint, ComplaintComment } from '../../types';
// Import global auth store for session identification (who is me?)
import { useAuthStore } from '../../store';
// Import common UI components for consistent state feedback
import { StatusBadge, LoadingScreen } from '../../components/Common';
// Import navigation focus hook to ensure data freshness
import { useFocusEffect } from '@react-navigation/native';

/**
 * ComplaintDetailScreen:
 * A focal point for issue resolution, facilitating a formal dialogue
 * between residents and society governance.
 */
export default function ComplaintDetailScreen({ route }: any) {
  // Extract ticket identifier from navigation route
  const { complaintId } = route.params;
  // Identify the current user to drive role-based authority and bubble styling
  const user = useAuthStore(s => s.user);
  
  // ── Core Data State ──
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<ComplaintComment[]>([]);
  
  // ── UI Interaction State ──
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Administrative check to gate status transition buttons
  const isAdmin = user?.role === 'admin';

  /**
   * loadData:
   * Aggregates the primary complaint details and the full history of the discussion thread.
   */
  const loadData = useCallback(async () => {
    try {
      const [c, comms] = await Promise.all([
        complaintsAPI.get(complaintId),
        complaintsAPI.listComments(complaintId),
      ]);
      setComplaint(c);
      setComments(comms);
    } catch { 
      // Errors handled silently; UI will stay in previous state
    } finally { 
      setLoading(false); 
    }
  }, [complaintId]);

  // Sync data whenever the user visits this screen
  useFocusEffect(useCallback(() => { loadData(); }, []));

  /**
   * handleSendComment:
   * Commits a new message to the ticket's discussion thread.
   */
  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await complaintsAPI.addComment(complaintId, newComment.trim());
      setNewComment(''); // Clear input on success
      loadData(); // Trigger list refresh
    } catch (e: any) { 
      Alert.alert('Error', e.response?.data?.detail || 'Failed to post comment'); 
    } finally { 
      setSending(false); 
    }
  };

  /**
   * handleStatusUpdate:
   * (Admin Only) Transitions the ticket through its lifecycle (Open -> In Progress -> Resolved).
   */
  const handleStatusUpdate = async (status: string) => {
    Alert.alert('Update Status', `Mark as "${status.replace('_', ' ')}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update', onPress: async () => {
          try {
            await complaintsAPI.update(complaintId, { status });
            loadData();
          } catch (e: any) { 
            Alert.alert('Error', 'Failed to update status'); 
          }
        }
      },
    ]);
  };

  // Initial loading gate
  if (loading || !complaint) return <LoadingScreen />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 0 }}>
        
        {/* ── Header Card: Core Issue Metadata ── */}
        <Surface style={styles.headerCard} elevation={1}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Visual badge for current ticket phase */}
            <StatusBadge status={complaint.status} />
            <Text variant="bodySmall" style={{ color: '#555' }}>
              {new Date(complaint.created_at).toLocaleDateString()}
            </Text>
          </View>
          <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700', marginTop: 8 }}>
            {complaint.title}
          </Text>
          {/* Metadata chips */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <MaterialCommunityIcons name="tag" size={14} color="#7C4DFF" />
            <Text variant="bodySmall" style={{ color: '#7C4DFF', textTransform: 'capitalize' }}>{complaint.category}</Text>
          </View>
          <Divider style={{ backgroundColor: '#252542', marginVertical: 12 }} />
          {/* Detailed description provided by the resident */}
          <Text variant="bodyMedium" style={{ color: '#C4C4D4', lineHeight: 22 }}>{complaint.description}</Text>
        </Surface>

        {/* ── Administrative Life-cycle Controls ── */}
        {isAdmin && complaint.status !== 'resolved' && (
          <View style={styles.adminActions}>
            {/* Only allow 'In Progress' for fresh tickets */}
            {complaint.status === 'open' && (
              <Button mode="contained" onPress={() => handleStatusUpdate('in_progress')}
                buttonColor="#FFB74D" textColor="#000" style={{ borderRadius: 12, flex: 1 }} compact icon="progress-wrench">
                In Progress
              </Button>
            )}
            {/* Final resolution action */}
            <Button mode="contained" onPress={() => handleStatusUpdate('resolved')}
              buttonColor="#4CAF50" textColor="#FFF" style={{ borderRadius: 12, flex: 1 }} compact icon="check-circle">
              Resolve
            </Button>
          </View>
        )}

        {/* ── Discussion Module: Chat-style Thread ── */}
        <Text variant="titleMedium" style={{ color: '#888', fontWeight: '600', marginTop: 16, marginBottom: 8 }}>
          Discussion ({comments.length})
        </Text>
        {comments.map(c => {
          // Internal logic to determine if the message is from the local user
          const isMe = c.user_id === user?.id;
          return (
            <View key={c.id} style={[styles.commentBubble, isMe ? styles.myBubble : styles.theirBubble]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {/* Visual identification of the sender */}
                <Avatar.Text size={22} label={(c.user_name || '??')[0]} style={{ backgroundColor: c.user_role === 'admin' ? '#311B92' : '#252542' }} color="#E8E8F0" />
                <Text variant="bodySmall" style={{ color: '#888', fontWeight: '600' }}>
                  {c.user_name || 'Unknown'}
                  {c.user_role === 'admin' && ' (Admin)'}
                </Text>
                {/* Micro-timestamp for precise auditing */}
                <Text variant="bodySmall" style={{ color: '#555', fontSize: 10, marginLeft: 'auto' }}>
                  {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(c.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text variant="bodyMedium" style={{ color: '#E8E8F0', lineHeight: 20 }}>{c.message}</Text>
            </View>
          );
        })}
        {/* Empty state hint */}
        {comments.length === 0 && (
          <Text variant="bodySmall" style={{ color: '#555', textAlign: 'center', marginVertical: 16 }}>
            No comments yet. Start the conversation!
          </Text>
        )}
      </ScrollView>

      {/* ── Persistent Input Bar ── */}
      <View style={styles.inputContainer}>
        <TextInput value={newComment} onChangeText={setNewComment} placeholder="Type a message..."
          mode="outlined" style={{ flex: 1, backgroundColor: '#1A1A2E' }}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" placeholderTextColor="#555"
          dense multiline />
        <Button mode="contained" onPress={handleSendComment} disabled={!newComment.trim() || sending}
          loading={sending} buttonColor="#7C4DFF" style={{ borderRadius: 12, marginLeft: 8 }}
          contentStyle={{ paddingVertical: 4 }} icon="send">
          Send
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  headerCard: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, marginBottom: 8 },
  adminActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  // Chat-inspired bubble layout
  commentBubble: { borderRadius: 16, padding: 12, marginBottom: 6, maxWidth: '90%' },
  myBubble: { backgroundColor: '#1A1A3E', alignSelf: 'flex-end' },
  theirBubble: { backgroundColor: '#1A1A2E', alignSelf: 'flex-start' },
  // Styled input area with keyboard avoidance support
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderTopWidth: 1, borderTopColor: '#252542', backgroundColor: '#0F0F1A',
  },
});
