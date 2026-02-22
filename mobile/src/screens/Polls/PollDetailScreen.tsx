import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Surface, Button, ProgressBar, TouchableRipple, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { pollsAPI } from '../../services/api';
import { Poll, PollOption } from '../../types';
import { LoadingScreen } from '../../components/Common';
import { usePollsStore, useAuthStore } from '../../store';
import { useFocusEffect } from '@react-navigation/native';

export default function PollDetailScreen({ route, navigation }: any) {
  const { pollId } = route.params;
  const { user } = useAuthStore();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const { fetchPolls } = usePollsStore();

  useFocusEffect(useCallback(() => { loadPoll(); }, []));

  const loadPoll = async () => {
    try {
      const data = await pollsAPI.get(pollId);
      setPoll(data);
    } catch { Alert.alert('Error', 'Failed to load poll'); }
    finally { setLoading(false); }
  };

  const handleVote = async () => {
    if (!selectedOption) { Alert.alert('Info', 'Please select an option'); return; }
    setVoting(true);
    try {
      await pollsAPI.vote(pollId, selectedOption);
      Alert.alert('Success', 'Vote recorded!');
      await fetchPolls();
      loadPoll();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to vote');
    } finally { setVoting(false); }
  };

  const handleClose = () => {
    Alert.alert('Close Poll', 'Are you sure? Residents will no longer be able to vote.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close', style: 'destructive', onPress: async () => {
          try {
            await pollsAPI.close(pollId);
            await fetchPolls();
            loadPoll();
          } catch { Alert.alert('Error', 'Failed to close poll'); }
        }
      }
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Poll', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await pollsAPI.delete(pollId);
            await fetchPolls();
            navigation.goBack();
          } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed to delete'); }
        }
      }
    ]);
  };

  if (loading) return <LoadingScreen />;
  if (!poll) return null;

  const totalVotes = poll.options.reduce((sum, o) => sum + o.vote_count, 0);
  const deadlinePassed = new Date(poll.deadline) < new Date();
  const isActive = poll.is_active;
  const canVote = !poll.user_voted && !deadlinePassed && isActive;
  const isAdmin = user?.role === 'admin';

  const OPTION_COLORS = ['#7C4DFF', '#00E5FF', '#FF6D00', '#E91E63', '#4CAF50', '#FFC107'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        {/* Admin Actions */}
        {isAdmin && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
            {isActive && (
              <Button mode="outlined" icon="stop-circle" compact onPress={handleClose} textColor="#FF9800" style={{ borderColor: '#3D3D5C' }}>
                Close
              </Button>
            )}
            <Button mode="outlined" icon="delete" compact onPress={handleDelete} textColor="#FF5252" style={{ borderColor: '#3D3D5C' }}>
              Delete
            </Button>
          </View>
        )}

        <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700' }}>{poll.title}</Text>
        {poll.description && <Text variant="bodyMedium" style={{ color: '#888', marginTop: 4 }}>{poll.description}</Text>}

        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#888" />
          <Text variant="bodySmall" style={{ color: (!isActive || deadlinePassed) ? '#FF5252' : '#888', marginLeft: 4 }}>
            {!isActive ? 'Closed' : deadlinePassed ? 'Voting ended' : `Ends ${new Date(poll.deadline).toLocaleString()}`}
          </Text>
          <Text variant="bodySmall" style={{ color: '#888', marginLeft: 16 }}>
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </Text>
        </View>

        <Divider style={{ marginVertical: 16, backgroundColor: '#252542' }} />

        {/* Options */}
        {poll.options.map((option, index) => {
          const percent = totalVotes > 0 ? option.vote_count / totalVotes : 0;
          const color = OPTION_COLORS[index % OPTION_COLORS.length];

          return (
            <TouchableRipple
              key={option.id}
              onPress={() => canVote && setSelectedOption(option.id)}
              disabled={!canVote}
              borderless
              style={{ borderRadius: 12 }}
            >
              <View style={[
                styles.optionCard,
                selectedOption === option.id && { borderColor: color, borderWidth: 2 },
              ]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text variant="bodyLarge" style={{ color: '#E8E8F0', flex: 1 }}>{option.text}</Text>
                  <Text variant="titleSmall" style={{ color, fontWeight: '700' }}>
                    {(percent * 100).toFixed(0)}%
                  </Text>
                </View>
                <ProgressBar
                  progress={percent}
                  color={color}
                  style={{ height: 6, borderRadius: 3, backgroundColor: '#252542' }}
                />
                <Text variant="bodySmall" style={{ color: '#888', marginTop: 4 }}>
                  {option.vote_count} vote{option.vote_count !== 1 ? 's' : ''}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}

        {canVote && (
          <Button
            mode="contained"
            onPress={handleVote}
            loading={voting}
            disabled={voting || !selectedOption}
            style={styles.voteButton}
            contentStyle={{ paddingVertical: 6 }}
            buttonColor="#7C4DFF"
            icon="vote"
          >
            Cast Vote
          </Button>
        )}

        {poll.user_voted && (
          <View style={styles.votedBanner}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#81C784" />
            <Text style={{ color: '#81C784', marginLeft: 8, fontWeight: '600' }}>You have voted</Text>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  optionCard: { backgroundColor: '#252542', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  voteButton: { borderRadius: 12, marginTop: 16 },
  votedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 12, backgroundColor: '#1B3A1B', borderRadius: 12 },
});
