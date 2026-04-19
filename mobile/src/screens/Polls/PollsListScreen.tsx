// Import React and standard hooks for memoization and side effects
import React, { useState, useCallback } from 'react';
// Import layout and list rendering components
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, TouchableRipple, FAB, ProgressBar } from 'react-native-paper';
// Import community icons for visual engagement
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import global stores for domain data and user context
import { usePollsStore, useAuthStore } from '../../store';
// Import common UI components for state feedback
import { EmptyState, LoadingScreen } from '../../components/Common';
// Import shared TypeScript definitions
import { Poll } from '../../types';
// Import navigation hook to trigger data refreshes on focus
import { useFocusEffect } from '@react-navigation/native';

/**
 * PollsListScreen:
 * A digital ballot box where residents can participate in society-wide 
 * decision-making processes.
 */
export default function PollsListScreen({ navigation }: any) {
  // Extract data layer methods and current polls list
  const { polls, loading, fetchPolls } = usePollsStore();
  // Identify the current user to gate administrative creation tools
  const user = useAuthStore((s) => s.user);
  
  // ── UI Logic State ──
  const [refreshing, setRefreshing] = useState(false);

  // Sync with backend every time the user focuses on this screen
  useFocusEffect(useCallback(() => { fetchPolls(); }, []));
  
  /**
   * onRefresh:
   * Handler for the pull-to-refresh swipe gesture.
   */
  const onRefresh = async () => { setRefreshing(true); await fetchPolls(); setRefreshing(false); };

  /**
   * renderPoll:
   * Renders a summary card for a specific community proposal/poll.
   */
  const renderPoll = ({ item }: { item: Poll }) => {
    // Audit current participation
    const totalVotes = item.options.reduce((sum, o) => sum + o.vote_count, 0);
    // Check if the poll is still accepting participation
    const deadlinePassed = new Date(item.deadline) < new Date();

    return (
      <TouchableRipple onPress={() => navigation.navigate('PollDetail', { pollId: item.id })} borderless style={{ borderRadius: 16 }}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.row}>
            {/* Visual indicator of participation status */}
            <View style={[styles.iconBox, { backgroundColor: item.user_voted ? '#1B3A1B' : '#1A1A3E' }]}>
              <MaterialCommunityIcons
                name={item.user_voted ? 'check-circle' : 'vote'}
                size={24}
                color={item.user_voted ? '#81C784' : '#00E5FF'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ color: '#E8E8F0' }}>{item.title}</Text>
              <Text variant="bodySmall" style={{ color: '#888' }}>
                {totalVotes} vote{totalVotes !== 1 ? 's' : ''} • {deadlinePassed ? 'Ended' : `Ends ${new Date(item.deadline).toLocaleDateString()}`}
              </Text>
            </View>
            {/* Explicit textual confirmation of user participation */}
            {item.user_voted && (
              <View style={styles.votedBadge}>
                <Text style={{ color: '#81C784', fontSize: 11, fontWeight: '600' }}>Voted</Text>
              </View>
            )}
          </View>

          {/* Mini-Analytics: High-level progress of the leading option */}
          {item.options.length > 0 && totalVotes > 0 && (
            <View style={{ marginTop: 12 }}>
              <ProgressBar
                progress={item.options[0].vote_count / totalVotes}
                color="#7C4DFF"
                style={{ height: 4, borderRadius: 2, backgroundColor: '#252542' }}
              />
            </View>
          )}
        </Surface>
      </TouchableRipple>
    );
  };

  // Loading Gate
  if (loading && polls.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      {/* ── Scrollable List of Community Polls ── */}
      <FlatList
        data={polls}
        renderItem={renderPoll}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon="vote" title="No polls" subtitle="Polls will appear here when created" />}
      />
      {/* Administrative Access: Launch Poll Creation Wizard */}
      {user?.role === 'admin' && (
        <FAB icon="plus" style={styles.fab} color="#FFF" onPress={() => navigation.navigate('CreatePoll')} />
      )}
    </View>
  );
}

// ── Local Design Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  // Styled indicator for previous participation
  votedBadge: { backgroundColor: '#1B3A1B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
});
