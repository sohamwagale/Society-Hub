// Import React and standard hooks for managing focus-driven data syncing
import React, { useState, useCallback } from 'react';
// Import layout and user interaction components
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, Surface, Button, ProgressBar, TouchableRipple, Divider } from 'react-native-paper';
// Import community icons for visual engagement
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import polls API for participating in democracy and managing proposals
import { pollsAPI } from '../../services/api';
// Import shared TypeScript definitions
import { Poll, PollOption } from '../../types';
// Import common UI components for state feedback
import { LoadingScreen } from '../../components/Common';
// Import global stores for domain data and user context
import { usePollsStore, useAuthStore } from '../../store';
// Import navigation hook to trigger data refreshes on focus
import { useFocusEffect } from '@react-navigation/native';

/**
 * PollDetailScreen:
 * A focal point for community participation, allowing residents to view 
 * proposals, cast votes, and see live results.
 */
export default function PollDetailScreen({ route, navigation }: any) {
  // Extract poll identifier from navigation route params
  const { pollId } = route.params;
  // Identify current user to determine voting eligibility and administrative rights
  const { user } = useAuthStore();
  
  // ── Core Data State ──
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ── Interaction State ──
  const [voting, setVoting] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Global store actions for syncing the list view
  const { fetchPolls } = usePollsStore();

  // Sync with backend every time the user visits this screen
  useFocusEffect(useCallback(() => { loadPoll(); }, []));

  /**
   * loadPoll:
   * Fetches the current state of a poll, including latest vote counts.
   */
  const loadPoll = async () => {
    try {
      const data = await pollsAPI.get(pollId);
      setPoll(data);
    } catch { 
      Alert.alert('Error', 'Failed to load poll details'); 
    } finally { 
      setLoading(false); 
    }
  };

  /**
   * handleVote:
   * Commits the user's selection to the database.
   */
  const handleVote = async () => {
    // Preliminary check to ensure an entry is selected
    if (!selectedOption) { Alert.alert('Info', 'Please select an option'); return; }
    setVoting(true);
    try {
      await pollsAPI.vote(pollId, selectedOption);
      Alert.alert('Success', 'Your vote has been recorded!');
      await fetchPolls(); // Refresh global list state
      loadPoll(); // Refresh local screen state
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to submit vote');
    } finally { 
      setVoting(false); 
    }
  };

  /**
   * handleClose:
   * (Admin Only) Prevents further voting and freezes the results.
   */
  const handleClose = () => {
    Alert.alert('Close Poll', 'Are you sure? Residents will no longer be able to participate.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close', style: 'destructive', onPress: async () => {
          try {
            await pollsAPI.close(pollId);
            await fetchPolls();
            loadPoll();
          } catch { 
            Alert.alert('Error', 'Failed to close poll'); 
          }
        }
      }
    ]);
  };

  /**
   * handleDelete:
   * (Admin Only) Destructive removal of the poll record.
   */
  const handleDelete = () => {
    Alert.alert('Delete Poll', 'Are you sure? This action is permanent.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await pollsAPI.delete(pollId);
            await fetchPolls();
            navigation.goBack(); // Return to list view
          } catch (e: any) { 
            Alert.alert('Error', e.response?.data?.detail || 'Failed to delete poll'); 
          }
        }
      }
    ]);
  };

  // Initial loading gate
  if (loading) return <LoadingScreen />;
  if (!poll) return null;

  // ── Derived Logic & Permissions ──
  const totalVotes = poll.options.reduce((sum, o) => sum + o.vote_count, 0);
  const deadlinePassed = new Date(poll.deadline) < new Date();
  const isActive = poll.is_active;
  // A user can vote if: not voted yet, deadline not passed, and not manually closed
  const canVote = !poll.user_voted && !deadlinePassed && isActive;
  const isAdmin = user?.role === 'admin';

  // Palette for progress bar differentiation
  const OPTION_COLORS = ['#7C4DFF', '#00E5FF', '#FF6D00', '#E91E63', '#4CAF50', '#FFC107'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        
        {/* ── Administrative Action Strip ── */}
        {isAdmin && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
            {isActive && (
              <Button mode="outlined" icon="stop-circle" compact onPress={handleClose} textColor="#FF9800" style={{ borderColor: '#3D3D5C' }}>
                Close Poll
              </Button>
            )}
            <Button mode="outlined" icon="delete" compact onPress={handleDelete} textColor="#FF5252" style={{ borderColor: '#3D3D5C' }}>
              Delete
            </Button>
          </View>
        )}

        {/* ── Poll Heading & Metadata ── */}
        <Text variant="headlineSmall" style={{ color: '#E8E8F0', fontWeight: '700' }}>{poll.title}</Text>
        {poll.description && <Text variant="bodyMedium" style={{ color: '#888', marginTop: 4 }}>{poll.description}</Text>}

        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#888" />
          <Text variant="bodySmall" style={{ color: (!isActive || deadlinePassed) ? '#FF5252' : '#888', marginLeft: 4 }}>
            {!isActive ? 'Closed' : deadlinePassed ? 'Voting ended' : `Ends ${new Date(poll.deadline).toLocaleString()}`}
          </Text>
          <Text variant="bodySmall" style={{ color: '#888', marginLeft: 16 }}>
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} total
          </Text>
        </View>

        <Divider style={{ marginVertical: 16, backgroundColor: '#252542' }} />

        {/* ── Options & Live Results Integrated Module ── */}
        {poll.options.map((option, index) => {
          // Calculate percentage share for the result visualization
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
                // Highlight selection with a color-coded halo
                selectedOption === option.id && { borderColor: color, borderWidth: 2 },
              ]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text variant="bodyLarge" style={{ color: '#E8E8F0', flex: 1 }}>{option.text}</Text>
                  <Text variant="titleSmall" style={{ color, fontWeight: '700' }}>
                    {(percent * 100).toFixed(0)}%
                  </Text>
                </View>
                {/* Result progress bar */}
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

        {/* ── Submit Ballot (State-gated) ── */}
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

        {/* ── Post-voting Participation Banner ── */}
        {poll.user_voted && (
          <View style={styles.votedBanner}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#81C784" />
            <Text style={{ color: '#81C784', marginLeft: 8, fontWeight: '600' }}>You have voted already</Text>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  // Individual option bubble layout
  optionCard: { backgroundColor: '#252542', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  voteButton: { borderRadius: 12, marginTop: 16 },
  // Styled banner for participation confirmation
  votedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, padding: 12, backgroundColor: '#1B3A1B', borderRadius: 12 },
});
