// Import React and hooks for form state management
import React, { useState } from 'react';
// Import layout, interaction, and system-level utilities (Keyboard, OS-aware logic)
import { View, ScrollView, StyleSheet, Alert, Platform, Keyboard } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, TextInput, Button, Surface, IconButton, TouchableRipple } from 'react-native-paper';
// Import native date/time picker for setting poll deadlines
import DateTimePicker from '@react-native-community/datetimepicker';
// Import polls API for persisting the new decision event
import { pollsAPI } from '../../services/api';
// Import global store to refresh the feed after creation
import { usePollsStore } from '../../store';

/**
 * CreatePollScreen:
 * A specialized form for society admins to initiate community voting.
 * Features dynamic option management and sequential date/time selection.
 */
export default function CreatePollScreen({ navigation }: any) {
  // ── Form State: Narrative & Identity ──
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // ── Form State: Temporal (Deadline) ──
  const [deadline, setDeadline] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');

  /**
   * showMode:
   * Triggers the native picker in either 'date' or 'time' mode.
   */
  const showMode = (currentMode: 'date' | 'time') => {
    setShowPicker(true);
    setMode(currentMode);
  };

  /**
   * onDateChange:
   * Handles the selection from the native DateTimePicker.
   * On Android, it implements a sequential flow: Date -> Time.
   */
  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || deadline;
    // Android closes immediately on selection; iOS stays visible in modal flow
    setShowPicker(Platform.OS === 'ios');
    setDeadline(currentDate);

    if (mode === 'date') {
      // Logic for multi-step picking
      setShowPicker(false); // Force close the date dial before switching
      
      // On Android, we immediately chain the time picker for better UX
      if (Platform.OS !== 'ios') {
        showMode('time'); 
      }
    }
  };

  /**
   * formatDateTime:
   * Returns a humanized locale string for the selected deadline.
   */
  const formatDateTime = (date: Date) => {
    return date.toLocaleString([], { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  };

  // ── Form State: Dynamic Decision Tokens (Poll Options) ──
  // Initialize with the statutory minimum of 2 options
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const { fetchPolls } = usePollsStore();

  // Logic to extend the decision set
  const addOption = () => setOptions([...options, '']);
  
  // Logic to prune the decision set (enforcing N >= 2)
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));

  /**
   * updateOption:
   * Implements immutable state update for a specific option entry by index.
   */
  const updateOption = (i: number, text: string) => {
    const newOpts = [...options];
    newOpts[i] = text;
    setOptions(newOpts);
  };

  /**
   * handleCreate:
   * Validates the poll schema and initiates the backend broadcast.
   */
  const handleCreate = async () => {
    // Filter out cosmetic empty inputs before validation
    const validOptions = options.filter(o => o.trim());
    
    // Enforcement: Identity + Minimal Choice
    if (!title || validOptions.length < 2) {
      Alert.alert('Validation Error', 'A poll requires a title and at least 2 distinct options.');
      return;
    }
    
    setLoading(true);
    try {
      await pollsAPI.create({
        title, 
        description: description || undefined,
        deadline: deadline.toISOString(), // Standardized UTC ISO format for backend
        options: validOptions.map(text => ({ text })),
      });

      Alert.alert('Broadcasting', 'Your poll has been published to all residents.');
      await fetchPolls(); // Synchronize global feed
      navigation.goBack();
    } catch (e: any) { 
      Alert.alert('Error', e.response?.data?.detail || 'Failed to initialize poll'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>Initiate Poll</Text>

        {/* ── Identity Block ── */}
        <TextInput label="Poll Proposition / Question *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" placeholder="e.g. Upgrade Lobby security?" />
        
        <TextInput label="Context / Instructions" value={description} onChangeText={setDescription} mode="outlined" multiline
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" placeholder="Optional background details..." />

        {/* ── Expiry Block ── */}
        <TouchableRipple onPress={() => { Keyboard.dismiss(); showMode('date'); }} style={{ marginBottom: 14 }}>
          <View pointerEvents="none">
            <TextInput
              label="Voting Deadline *"
              value={formatDateTime(deadline)}
              mode="outlined"
              left={<TextInput.Icon icon="calendar-clock" />}
              style={styles.input}
              outlineColor="#3D3D5C"
              activeOutlineColor="#7C4DFF"
              textColor="#E8E8F0"
              editable={false}
            />
          </View>
        </TouchableRipple>

        {/* Native Date/Time Intersection */}
        {showPicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={deadline}
            mode={mode}
            is24Hour={true}
            display="default"
            onChange={onDateChange}
          />
        )}

        {/* ── Dynamic Option Matrix ── */}
        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Voter Choices</Text>
        {options.map((opt, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TextInput
              label={`Option ${i + 1}`} value={opt} onChangeText={(t) => updateOption(i, t)}
              mode="outlined" style={[styles.input, { flex: 1, marginBottom: 0 }]}
              outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0"
            />
            {/* Logic: Only allow removal if it wouldn't break the decision schema (min 2) */}
            {options.length > 2 && (
              <IconButton icon="close-circle" size={20} iconColor="#FF5252" onPress={() => removeOption(i)} />
            )}
          </View>
        ))}
        
        {/* Interaction Tool: Append Choice */}
        <Button mode="text" onPress={addOption} textColor="#00E5FF" icon="plus" style={{ alignSelf: 'flex-start' }}>
          Add Choice
        </Button>

        {/* Global Action Button */}
        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="send">
          Publish Poll
        </Button>
      </Surface>
    </ScrollView>
  );
}

// ── Shared UI Tokens ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  button: { borderRadius: 12, marginTop: 16 },
});
