import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Image, Platform, Keyboard } from 'react-native';
import { Text, TextInput, Button, Surface, TouchableRipple, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { expensesAPI } from '../../services/api';
import { useAuthStore } from '../../store';

export default function CreateSocietyExpenseScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fallback for unauthorized access
  if (user?.role !== 'admin') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#E8E8F0' }}>Access Denied</Text>
      </View>
    );
  }

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || expenseDate;
    setShowPicker(Platform.OS === 'ios');
    setExpenseDate(currentDate);
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setDocumentUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled) {
      setDocumentUri(result.assets[0].uri);
    }
  };

  const removeDocument = () => setDocumentUri(null);

  const handleCreate = async () => {
    if (!title || !amount) {
      Alert.alert('Error', 'Please enter a title and amount');
      return;
    }

    setLoading(true);
    try {
      await expensesAPI.create(
        {
          title,
          description: description || undefined,
          amount: parseFloat(amount),
          expense_date: formatDate(expenseDate),
        },
        documentUri || undefined
      );

      Alert.alert('Success', 'Society expense added successfully!');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Surface style={styles.card} elevation={1}>
        <Text variant="titleLarge" style={{ color: '#E8E8F0', fontWeight: '700', marginBottom: 20 }}>
          Add Society Expense
        </Text>

        <TextInput
          label="Expense Title *"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
        />

        <TextInput
          label="Description"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
        />

        <TextInput
          label="Amount (₹) *"
          value={amount}
          onChangeText={setAmount}
          mode="outlined"
          keyboardType="numeric"
          left={<TextInput.Icon icon="currency-inr" />}
          style={styles.input}
          outlineColor="#3D3D5C"
          activeOutlineColor="#7C4DFF"
          textColor="#E8E8F0"
        />

        <TouchableRipple onPress={() => { Keyboard.dismiss(); setShowPicker(true); }} style={{ marginBottom: 14 }}>
          <View pointerEvents="none">
            <TextInput
              label="Expense Date *"
              value={formatDate(expenseDate)}
              mode="outlined"
              left={<TextInput.Icon icon="calendar" />}
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
            value={expenseDate}
            mode="date"
            is24Hour={true}
            display="default"
            onChange={onDateChange}
          />
        )}

        <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8, marginTop: 4 }}>
          Attach Receipt/Document
        </Text>

        {documentUri ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: documentUri }} style={styles.thumbnail} />
            <IconButton
              icon="close-circle"
              size={24}
              iconColor="#FF5252"
              style={styles.removeBtn}
              onPress={removeDocument}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Button
              mode="outlined"
              onPress={pickImage}
              textColor="#00E5FF"
              style={{ borderRadius: 12, flex: 1, borderColor: '#3D3D5C' }}
              icon="image-plus"
              compact
            >
              Gallery
            </Button>
            <Button
              mode="outlined"
              onPress={takePhoto}
              textColor="#00E5FF"
              style={{ borderRadius: 12, flex: 1, borderColor: '#3D3D5C' }}
              icon="camera"
              compact
            >
              Camera
            </Button>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={{ paddingVertical: 6 }}
          buttonColor="#7C4DFF"
          icon="check"
        >
          Create Expense
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  button: { borderRadius: 12, marginTop: 8 },
  imageWrapper: { position: 'relative', marginBottom: 16, alignSelf: 'flex-start' },
  thumbnail: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#252542' },
  removeBtn: { position: 'absolute', top: -12, right: -12, margin: 0 },
});
