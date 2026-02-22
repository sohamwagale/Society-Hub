import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Platform, Keyboard } from 'react-native';
import { Text, TextInput, Button, Surface, IconButton, TouchableRipple } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pollsAPI } from '../../services/api';
import { usePollsStore } from '../../store';

export default function CreatePollScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [deadline, setDeadline] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState<'date' | 'time'>('date');

  const showMode = (currentMode: 'date' | 'time') => {
    setShowPicker(true);
    setMode(currentMode);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || deadline;
    setShowPicker(Platform.OS === 'ios');
    setDeadline(currentDate);

    if (mode === 'date') {
      // After picking date, pick time
      setShowPicker(false); // Hide first to reset/switch logic if needed, but for Android it closes.
      // For UX: Let user pick date, then tap again for time? Or auto-open time?
      // Simple UX: Two buttons or tap date to pick date, tap time to pick time? 
      // Or just one flow: Date -> Time.
      // Let's stick to simple: Tap input -> Date Picker. After ok -> Time Picker.
      if (Platform.OS !== 'ios') {
        showMode('time'); // Auto-trigger time picker on Android after date
      }
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString();
  };

  // ... (rest of state)
  const [options, setOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);
  const { fetchPolls } = usePollsStore();

  const addOption = () => setOptions([...options, '']);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));
  // ... (updateOption logic)

  const updateOption = (i: number, text: string) => {
    const newOpts = [...options];
    newOpts[i] = text;
    setOptions(newOpts);
  };

  const handleCreate = async () => {
    const validOptions = options.filter(o => o.trim());
    if (!title || validOptions.length < 2) {
      Alert.alert('Error', 'Title and at least 2 options are required');
      return;
    }
    setLoading(true);
    try {
      await pollsAPI.create({
        title, description: description || undefined,
        deadline: deadline.toISOString(),
        options: validOptions.map(text => ({ text })),
      });
      // ... (success)
      Alert.alert('Success', 'Poll created!');
      await fetchPolls();
      navigation.goBack();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>Create Poll</Text>

        <TextInput label="Poll Title *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input}
          outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />
        <TextInput label="Description" value={description} onChangeText={setDescription} mode="outlined" multiline
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        <TouchableRipple onPress={() => { Keyboard.dismiss(); showMode('date'); }} style={{ marginBottom: 14 }}>
          <View pointerEvents="none">
            <TextInput
              label="Deadline (Date & Time) *"
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

        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Options</Text>
        {options.map((opt, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TextInput
              label={`Option ${i + 1}`} value={opt} onChangeText={(t) => updateOption(i, t)}
              mode="outlined" style={[styles.input, { flex: 1, marginBottom: 0 }]}
              outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0"
            />
            {options.length > 2 && (
              <IconButton icon="close-circle" size={20} iconColor="#FF5252" onPress={() => removeOption(i)} />
            )}
          </View>
        ))}
        <Button mode="text" onPress={addOption} textColor="#00E5FF" icon="plus" style={{ alignSelf: 'flex-start' }}>
          Add Option
        </Button>

        <Button mode="contained" onPress={handleCreate} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="vote">
          Create Poll
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  button: { borderRadius: 12, marginTop: 16 },
});
