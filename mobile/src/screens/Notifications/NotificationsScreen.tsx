// Import React hooks for lifecycle management (polling) and memoization
import React, { useState, useCallback } from 'react';
// Import layout components for list rendering and refreshing from React Native
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
// Import themed components from React Native Paper for a high-quality alert list
import { Text, Surface, TouchableRipple, Button, IconButton } from 'react-native-paper';
// Import standard community icons for visual categorization of alerts
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import the notifications store to access the reactive list of alerts
import { useNotificationsStore } from '../../store';
// Import generic UI components for loading and empty state messages
import { EmptyState, LoadingScreen } from '../../components/Common';
// Import the direct API service for mutation actions (marking read/clearing)
import { notificationsAPI } from '../../services/api';
// Import the shared TypeScript interface for notification objects
import { Notification } from '../../types';
// Import hook to trigger data fetches whenever the screen enters the foreground
import { useFocusEffect } from '@react-navigation/native';

/**
 * TYPE_ICONS:
 * Configuration matrix for different internal alert types.
 * Defines the icon, brand color, and navigation target (tab/screen/param) for each.
 */
const TYPE_ICONS: Record<string, { icon: string; color: string; tab?: string; screen?: string; paramKey?: string }> = {
  bill: { icon: 'receipt', color: '#7C4DFF', tab: 'BillsTab', screen: 'BillDetail', paramKey: 'billId' },
  payment_reminder: { icon: 'clock-alert', color: '#FF6D00', tab: 'BillsTab', screen: 'BillDetail', paramKey: 'billId' },
  complaint: { icon: 'alert-circle', color: '#FF5252', tab: 'ComplaintsTab', screen: 'ComplaintDetail', paramKey: 'complaintId' },
  poll: { icon: 'vote', color: '#00E5FF', tab: 'PollsTab', screen: 'PollDetail', paramKey: 'pollId' },
  reimbursement: { icon: 'cash-refund', color: '#4CAF50', tab: 'MoreTab', screen: 'ReimbursementDetail', paramKey: 'requestId' },
  announcement: { icon: 'bullhorn', color: '#FFB74D', screen: 'Announcements' },
  general: { icon: 'bell', color: '#888' },
};

/**
 * NotificationsScreen:
 * A specialized feed tracking all asynchronous alerts and system updates 
 * relevant to the current user, featuring deep-linking into specific modules.
 */
export default function NotificationsScreen({ navigation }: any) {
  // Pull data and state-synchronization methods from the global store
  const { notifications, loading, fetchNotifications } = useNotificationsStore();
  
  // ── Refresh Control State ──
  const [refreshing, setRefreshing] = useState(false);

  // Sync the latest notifications every time the resident views this screen
  useFocusEffect(useCallback(() => { fetchNotifications(); }, []));
  
  // Logic for the pull-to-refresh swipe gesture
  const onRefresh = async () => { setRefreshing(true); await fetchNotifications(); setRefreshing(false); };

  /**
   * handlePress:
   * Acts as a router for incoming notification clicks.
   * Marks them as read and navigates to the relevant detail deep-link.
   */
  const handlePress = async (item: Notification) => {
    // 1. Persist the 'read' state if not already recorded
    if (!item.is_read) {
      await notificationsAPI.markRead(item.id);
      fetchNotifications(); // Update UI to reflect the removal of the unread dot
    }

    // 2. Resolve the destination mapping from our configuration matrix
    const config = TYPE_ICONS[item.notification_type];
    if (config?.screen) {
      if (config.tab && item.reference_id && config.paramKey) {
        // Handle cross-stack navigation (e.g., from More tab to Bills tab)
        try {
          navigation.navigate(config.tab, {
            screen: config.screen,
            params: { [config.paramKey]: item.reference_id },
          });
        } catch (e) { console.log('Deep-link navigation error', e); }
      } else {
        // Handle local-stack navigation (e.g., to the Announcements list)
        try {
          navigation.navigate(config.screen);
        } catch (e) { console.log('Simple navigation error', e); }
      }
    }
  };

  /**
   * handleMarkAllRead:
   * Bulk action for rapid inbox cleanup.
   */
  const handleMarkAllRead = async () => {
    await notificationsAPI.markAllRead();
    fetchNotifications();
  };

  /**
   * renderItem:
   * Individual list item renderer featuring conditional styling for unread states.
   */
  const renderItem = ({ item }: { item: Notification }) => {
    // Fall back to a 'general' icon if the specific type is unknown
    const typeConfig = TYPE_ICONS[item.notification_type] || TYPE_ICONS.general;
    return (
      <TouchableRipple onPress={() => handlePress(item)} borderless style={styles.ripple}>
        <Surface style={[styles.card, !item.is_read && styles.unread]} elevation={1}>
          <View style={styles.row}>
            {/* Soft-colored background variant of the type icon */}
            <View style={[styles.iconBox, { backgroundColor: `${typeConfig.color}20` }]}>
              <MaterialCommunityIcons name={typeConfig.icon as any} size={22} color={typeConfig.color} />
            </View>
            <View style={styles.content}>
              {/* Higher contrast title for unread items */}
              <Text variant="titleSmall" style={{ color: item.is_read ? '#888' : '#E8E8F0' }}>{item.title}</Text>
              <Text variant="bodySmall" style={styles.bodyText}>{item.body}</Text>
              <Text variant="bodySmall" style={styles.timestamp}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            {/* High-visibility indicator for unread alerts */}
            {!item.is_read && <View style={styles.dot} />}
          </View>
        </Surface>
      </TouchableRipple>
    );
  };

  /**
   * handleClearAll:
   * Destructive bulk action with security confirmation gate.
   */
  const handleClearAll = () => {
    Alert.alert('Clear Notifications', 'Are you sure you want to delete all notifications? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive', onPress: async () => {
          await notificationsAPI.clearAll();
          fetchNotifications();
        }
      },
    ]);
  };

  // ── Loading Guard ── (Only show on first fetch where list is empty)
  if (loading && notifications.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* ── Action Header (Only visible if list isn't empty) ── */}
      {notifications.length > 0 && (
        <View style={styles.headerAction}>
          {/* Conditional: Only show 'Mark All' if there are currently unread items */}
          {notifications.some(n => !n.is_read) && (
            <Button mode="text" onPress={handleMarkAllRead} textColor="#7C4DFF" compact icon="email-open-outline">Mark all read</Button>
          )}
          <Button mode="text" onPress={handleClearAll} textColor="#FF5252" compact icon="notification-clear-all">Clear all</Button>
        </View>
      )}

      {/* ── Core Scrollable List ── */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C4DFF" />}
        // Displayed when the society server confirms no alerts for this user
        ListEmptyComponent={<EmptyState icon="bell-off" title="No notifications" subtitle="You're all caught up!" />}
      />
    </View>
  );
}

// ── Shared UI Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  headerAction: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8 },
  ripple: { borderRadius: 16 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 6 },
  // Styled indicator for unread items with a brand-matched left border
  unread: { backgroundColor: '#1E1E35', borderLeftWidth: 3, borderLeftColor: '#7C4DFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  bodyText: { color: '#888', marginTop: 2 },
  timestamp: { color: '#555', marginTop: 4, fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C4DFF' },
  listContainer: { padding: 16, paddingBottom: 40 },
});
