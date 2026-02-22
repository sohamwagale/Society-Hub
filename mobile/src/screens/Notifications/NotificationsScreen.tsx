import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Surface, TouchableRipple, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotificationsStore } from '../../store';
import { EmptyState, LoadingScreen } from '../../components/Common';
import { notificationsAPI } from '../../services/api';
import { Notification } from '../../types';
import { useFocusEffect } from '@react-navigation/native';

const TYPE_ICONS: Record<string, { icon: string; color: string; tab?: string; screen?: string; paramKey?: string }> = {
  bill: { icon: 'receipt', color: '#7C4DFF', tab: 'BillsTab', screen: 'BillDetail', paramKey: 'billId' },
  payment_reminder: { icon: 'clock-alert', color: '#FF6D00', tab: 'BillsTab', screen: 'BillDetail', paramKey: 'billId' },
  complaint: { icon: 'alert-circle', color: '#FF5252', tab: 'ComplaintsTab', screen: 'ComplaintDetail', paramKey: 'complaintId' },
  poll: { icon: 'vote', color: '#00E5FF', tab: 'PollsTab', screen: 'PollDetail', paramKey: 'pollId' },
  reimbursement: { icon: 'cash-refund', color: '#4CAF50', tab: 'MoreTab', screen: 'ReimbursementDetail', paramKey: 'requestId' },
  announcement: { icon: 'bullhorn', color: '#FFB74D', screen: 'Announcements' },
  general: { icon: 'bell', color: '#888' },
};

export default function NotificationsScreen({ navigation }: any) {
  const { notifications, loading, fetchNotifications } = useNotificationsStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchNotifications(); }, []));
  const onRefresh = async () => { setRefreshing(true); await fetchNotifications(); setRefreshing(false); };

  const handlePress = async (item: Notification) => {
    if (!item.is_read) {
      await notificationsAPI.markRead(item.id);
      fetchNotifications();
    }

    const config = TYPE_ICONS[item.notification_type];
    if (config?.screen) {
      if (config.tab && item.reference_id && config.paramKey) {
        // Cross-stack navigation: go to tab, then nested screen with params
        try {
          navigation.navigate(config.tab, {
            screen: config.screen,
            params: { [config.paramKey]: item.reference_id },
          });
        } catch (e) { console.log('Navigation error', e); }
      } else {
        // Same-stack navigation (e.g., Announcements)
        try {
          navigation.navigate(config.screen);
        } catch (e) { console.log('Navigation error', e); }
      }
    }
  };

  const handleMarkAllRead = async () => {
    await notificationsAPI.markAllRead();
    fetchNotifications();
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const typeConfig = TYPE_ICONS[item.notification_type] || TYPE_ICONS.general;
    return (
      <TouchableRipple onPress={() => handlePress(item)} borderless style={{ borderRadius: 16 }}>
        <Surface style={[styles.card, !item.is_read && styles.unread]} elevation={1}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: `${typeConfig.color}20` }]}>
              <MaterialCommunityIcons name={typeConfig.icon as any} size={22} color={typeConfig.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ color: item.is_read ? '#888' : '#E8E8F0' }}>{item.title}</Text>
              <Text variant="bodySmall" style={{ color: '#888', marginTop: 2 }}>{item.body}</Text>
              <Text variant="bodySmall" style={{ color: '#555', marginTop: 4, fontSize: 11 }}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
            {!item.is_read && <View style={styles.dot} />}
          </View>
        </Surface>
      </TouchableRipple>
    );
  };

  const handleClearAll = () => {
    Alert.alert('Clear Notifications', 'Delete all notifications? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive', onPress: async () => {
          await notificationsAPI.clearAll();
          fetchNotifications();
        }
      },
    ]);
  };

  if (loading && notifications.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {notifications.length > 0 && (
        <View style={styles.headerAction}>
          {notifications.some(n => !n.is_read) && (
            <Button mode="text" onPress={handleMarkAllRead} textColor="#7C4DFF" compact icon="email-open-outline">Mark all read</Button>
          )}
          <Button mode="text" onPress={handleClearAll} textColor="#FF5252" compact icon="notification-clear-all">Clear all</Button>
        </View>
      )}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon="bell-off" title="No notifications" subtitle="You're all caught up!" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  headerAction: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 14, marginBottom: 6 },
  unread: { backgroundColor: '#1E1E35', borderLeftWidth: 3, borderLeftColor: '#7C4DFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C4DFF' },
});
