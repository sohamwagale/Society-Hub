import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Text, Surface, TouchableRipple, FAB, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePollsStore, useAuthStore } from '../../store';
import { EmptyState, LoadingScreen } from '../../components/Common';
import { Poll } from '../../types';
import { useFocusEffect } from '@react-navigation/native';

export default function PollsListScreen({ navigation }: any) {
  const { polls, loading, fetchPolls } = usePollsStore();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchPolls(); }, []));
  const onRefresh = async () => { setRefreshing(true); await fetchPolls(); setRefreshing(false); };

  const renderPoll = ({ item }: { item: Poll }) => {
    const totalVotes = item.options.reduce((sum, o) => sum + o.vote_count, 0);
    const deadlinePassed = new Date(item.deadline) < new Date();

    return (
      <TouchableRipple onPress={() => navigation.navigate('PollDetail', { pollId: item.id })} borderless style={{ borderRadius: 16 }}>
        <Surface style={styles.card} elevation={1}>
          <View style={styles.row}>
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
            {item.user_voted && (
              <View style={styles.votedBadge}>
                <Text style={{ color: '#81C784', fontSize: 11, fontWeight: '600' }}>Voted</Text>
              </View>
            )}
          </View>

          {/* Mini bar for top option */}
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

  if (loading && polls.length === 0) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <FlatList
        data={polls}
        renderItem={renderPoll}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C4DFF']} tintColor="#7C4DFF" />}
        ListEmptyComponent={<EmptyState icon="vote" title="No polls" subtitle="Polls will appear here when created" />}
      />
      {user?.role === 'admin' && (
        <FAB icon="plus" style={styles.fab} color="#FFF" onPress={() => navigation.navigate('CreatePoll')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  votedBadge: { backgroundColor: '#1B3A1B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#7C4DFF', borderRadius: 16 },
});
