// Import React and hooks for managing state and memoized callbacks
import React, { useCallback, useState } from 'react';
// Import layout and UI feedback components from React Native
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, TouchableRipple, ProgressBar } from 'react-native-paper';
// Import icons for visual brand consistency
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import a series of global stores to aggregate data for the dashboard view
import { useAuthStore, useBillsStore, useComplaintsStore, usePollsStore, useNotificationsStore, useDashboardStore } from '../../store';
// Import reusable common UI components
import { StatCard, SectionHeader, StatusBadge, LoadingScreen } from '../../components/Common';
// Import hook to trigger data refreshes when the screen gains focus
import { useFocusEffect } from '@react-navigation/native';

/**
 * DashboardScreen:
 * The primary landing page for authenticated residents and admins.
 * Provides a high-level summary of finances, issues, democracy, and quick actions.
 */
export default function DashboardScreen({ navigation }: any) {
  // Extract user session to drive role-based UI logic
  const user = useAuthStore((s) => s.user);
  
  // ── Multi-Store Data Extraction ──
  const { bills, fetchBills } = useBillsStore();
  const { complaints, fetchComplaints } = useComplaintsStore();
  const { polls, fetchPolls } = usePollsStore();
  const { unreadCount, fetchUnreadCount } = useNotificationsStore();
  const { stats, fetchStats } = useDashboardStore();
  
  // ── UI Control State ──
  const [refreshing, setRefreshing] = useState(false);

  /**
   * loadData:
   * Orchestrates a parallel fetch of all relevant dashboard modules.
   */
  const loadData = useCallback(async () => {
    await Promise.all([fetchBills(), fetchComplaints(), fetchPolls(), fetchUnreadCount(), fetchStats()]);
  }, []);

  // Sync data whenever the user navigates back to the Dashboard
  useFocusEffect(useCallback(() => { loadData(); }, []));
  
  // Implement Standard Pull-to-Refresh
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  // ── Derived View Logic ──
  const isAdmin = user?.role === 'admin';
  const dueBills = bills.filter(b => b.payment_status === 'due' || b.payment_status === 'overdue');
  const openComplaints = complaints.filter(c => c.status !== 'resolved');
  const activePolls = polls.filter(p => p.is_active);

  return (
    <View style={styles.container}>
      <ScrollView
        // Primary refresh mechanism for mobile users
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
      >
        
        {/* ── Header: Personal Greeting & Notifications ── */}
        <View style={styles.greeting}>
          <View>
            <Text variant="bodyMedium" style={{ color: '#888' }}>Welcome back,</Text>
            <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700' }}>
              {user?.name?.split(' ')[0]} 👋
            </Text>
          </View>
          {/* Notification bell with unread badge count */}
          <TouchableRipple onPress={() => navigation.navigate('Notifications')} borderless style={styles.bellContainer}>
            <View>
              <MaterialCommunityIcons name="bell-outline" size={26} color="#E8E8F0" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </TouchableRipple>
        </View>

        {/* ── Quick Stats: High priority action items ── */}
        <View style={styles.statsRow}>
          <StatCard icon="receipt" label="Due Bills" value={dueBills.length} color="#FF6D00" onPress={() => navigation.navigate('BillsTab')} />
          <StatCard icon="alert-circle" label="Open Issues" value={openComplaints.length} color="#FF5252" onPress={() => navigation.navigate('ComplaintsTab')} />
          <StatCard icon="vote" label="Active Polls" value={activePolls.length} color="#00E5FF" onPress={() => navigation.navigate('PollsTab')} />
        </View>

        {/* ── Admin Analytics Section: Financial health of the society ── */}
        {stats && isAdmin && (
          <>
            <SectionHeader title="Collection Overview" />
            <Surface style={styles.analyticsCard} elevation={1}>
              <View style={styles.analyticsRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Collection Rate</Text>
                  <Text variant="headlineMedium" style={{ color: '#4CAF50', fontWeight: '700' }}>
                    {stats.billing.collection_rate}%
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Collected</Text>
                  <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600' }}>
                    ₹{stats.billing.total_collected.toLocaleString()}
                  </Text>
                </View>
              </View>
              {/* Visual representation of billing progress */}
              <ProgressBar progress={stats.billing.collection_rate / 100} color="#4CAF50"
                style={{ height: 6, borderRadius: 3, backgroundColor: '#252542', marginTop: 8 }} />
              <View style={[styles.analyticsRow, { marginTop: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Pending</Text>
                  <Text variant="titleSmall" style={{ color: '#FFB74D' }}>
                    ₹{(stats.billing.total_amount - stats.billing.total_collected).toLocaleString()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Overdue Bills</Text>
                  <Text variant="titleSmall" style={{ color: '#FF5252' }}>{stats.billing.overdue_bills}</Text>
                </View>
              </View>
            </Surface>

            {/* Admin Analytics: Issue Status Summary */}
            <Surface style={[styles.analyticsCard, { marginTop: 6 }]} elevation={1}>
              <View style={styles.analyticsRow}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="headlineSmall" style={{ color: '#4CAF50', fontWeight: '700' }}>{stats.complaints.resolved}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Resolved</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="headlineSmall" style={{ color: '#FFB74D', fontWeight: '700' }}>{stats.complaints.in_progress}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>In Progress</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text variant="headlineSmall" style={{ color: '#FF5252', fontWeight: '700' }}>{stats.complaints.open}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Open</Text>
                </View>
              </View>
              <Text variant="bodySmall" style={{ color: '#888', textAlign: 'center', marginTop: 8 }}>
                Issue Resolution: {stats.complaints.resolution_rate}%
              </Text>
            </Surface>
          </>
        )}

        {/* ── Resident Analytics Section: Personal financial summary ── */}
        {stats && !isAdmin && (
          <>
            <SectionHeader title="Your Summary" />
            <Surface style={styles.analyticsCard} elevation={1}>
              <View style={styles.analyticsRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Total Paid</Text>
                  <Text variant="titleMedium" style={{ color: '#4CAF50', fontWeight: '700' }}>
                    ₹{stats.billing.my_paid.toLocaleString()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Bills Paid</Text>
                  <Text variant="titleMedium" style={{ color: '#E8E8F0', fontWeight: '600' }}>
                    {stats.billing.my_paid_count} / {stats.billing.my_bills_count}
                  </Text>
                </View>
              </View>
            </Surface>
          </>
        )}

        {/* ── Grid: Quick Access Navigation ── */}
        <SectionHeader title="Quick Access" />
        <View style={styles.quickLinksRow}>
          {[
            { icon: 'bullhorn', label: 'Notices', route: 'Announcements', color: '#7C4DFF' },
            { icon: 'account-group', label: 'Directory', route: 'ResidentDirectory', color: '#00E5FF' },
            { icon: 'shield-home', label: 'Society', route: 'SocietyInfo', color: '#4CAF50' },
            { icon: 'history', label: 'Payments', route: 'PaymentHistory', color: '#FFB74D' },
            { icon: 'receipt-text-outline', label: 'Expenses', route: 'SocietyExpensesList', color: '#FF5252' },
            { icon: 'file-document-multiple', label: 'Documents', route: 'SocietyDocumentsList', color: '#26C6DA' },
            { icon: 'cash-refund', label: 'Claims', route: 'ReimbursementsList', color: '#E91E63' },
            // Only show Approvals path for users with authority
            ...((isAdmin || user?.resident_type === 'owner' || user?.resident_type === 'renter') ? [
              { icon: 'account-check', label: 'Approvals', route: 'ApprovalManagement', color: '#FF6D00' },
            ] : []),
          ].map((link, index) => (
            <View key={link.label} style={{ width: '33.33%', paddingHorizontal: 6, marginBottom: 12 }}>
              <TouchableRipple onPress={() => navigation.navigate(link.route)} borderless style={styles.quickLink}>
                <Surface style={styles.quickLinkCard} elevation={1}>
                  <MaterialCommunityIcons name={link.icon as any} size={28} color={link.color} />
                  <Text variant="bodySmall" style={{ color: '#C8C8D8', marginTop: 8, textAlign: 'center' }}>{link.label}</Text>
                </Surface>
              </TouchableRipple>
            </View>
          ))}
        </View>

        {/* ── Feed: Recent Bills ── */}
        <SectionHeader title="Recent Bills" action={{ label: 'View All', onPress: () => navigation.navigate('BillsTab') }} />
        {bills.slice(0, 3).map((bill) => (
          <TouchableRipple key={bill.id} onPress={() => navigation.navigate('BillsTab', { screen: 'BillDetail', params: { billId: bill.id } })}>
            <Surface style={styles.card} elevation={1}>
              <View style={styles.cardRow}>
                <View style={styles.cardIcon}>
                  <MaterialCommunityIcons
                    name={bill.bill_type === 'maintenance' ? 'home-city' : 'cash-plus'}
                    size={24} color="#7C4DFF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{bill.title}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>Due: {bill.due_date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text variant="titleSmall" style={{ color: '#E8E8F0', fontWeight: '700', paddingRight: 8 }}>₹{bill.amount}</Text>
                  <StatusBadge status={bill.payment_status || 'due'} />
                </View>
              </View>
            </Surface>
          </TouchableRipple>
        ))}

        {/* ── Feed: Recent Complaints ── */}
        <SectionHeader title="Recent Complaints" action={{ label: 'View All', onPress: () => navigation.navigate('ComplaintsTab') }} />
        {complaints.slice(0, 2).map((c) => (
          <TouchableRipple key={c.id} onPress={() => navigation.navigate('ComplaintsTab', { screen: 'ComplaintDetail', params: { complaintId: c.id } })}>
            <Surface style={styles.card} elevation={1}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: '#1A0D2E' }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#FF5252" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{c.title}</Text>
                  <Text variant="bodySmall" style={{ color: '#888' }}>{c.category}</Text>
                </View>
                <StatusBadge status={c.status} />
              </View>
            </Surface>
          </TouchableRipple>
        ))}

        {/* Bottom Spacing for Tab Bar overlap */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── Shared UI Architecture ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' }, // Deep theme background
  greeting: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  bellContainer: { padding: 8, borderRadius: 20 },
  // Styled indicator for unread notifications
  badge: {
    position: 'absolute', top: -4, right: -6, backgroundColor: '#FF5252',
    borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8 },
  // Cards for analytics summaries
  analyticsCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 4 },
  analyticsRow: { flexDirection: 'row', gap: 16 },
  // Grid layout for quick link icons
  quickLinksRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginBottom: 8 },
  quickLink: { flex: 1, borderRadius: 16 },
  quickLinkCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, alignItems: 'center', paddingVertical: 14 },
  // Generic list item card
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginHorizontal: 16, marginVertical: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#1A1A3E',
    justifyContent: 'center', alignItems: 'center',
  },
});
