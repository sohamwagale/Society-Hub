import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store';

export default function RegisterScreen({ navigation }: any) {
  const { login } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (!name.trim()) { setError('Name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const body = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      };
      await authAPI.register(body);
      // Auto-login after registration
      await login(body.email, body.password);
      // Navigation will auto-detect no society_id → OnboardingChoice
    } catch (e: any) {
      console.error('[Register] Error:', e.response?.data || e.message);
      const msg = e.response?.data?.detail || e.message || 'Registration failed';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
      <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
      <Text variant="bodyMedium" style={{ color: '#888', marginBottom: 24, textAlign: 'center' }}>
        Join your society community
      </Text>

      <Surface style={styles.card} elevation={1}>
        <TextInput label="Full Name *" value={name} onChangeText={setName} mode="outlined"
          left={<TextInput.Icon icon="account" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        <TextInput label="Email *" value={email} onChangeText={setEmail} mode="outlined"
          keyboardType="email-address" autoCapitalize="none"
          left={<TextInput.Icon icon="email" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        <TextInput label="Phone" value={phone} onChangeText={setPhone} mode="outlined"
          keyboardType="phone-pad"
          left={<TextInput.Icon icon="phone" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        <TextInput label="Password *" value={password} onChangeText={setPassword} mode="outlined"
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock" />}
          right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        <TextInput label="Confirm Password *" value={confirmPassword} onChangeText={setConfirmPassword} mode="outlined"
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock-check" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="account-plus">
          Create Account
        </Button>

        <Button mode="text" onPress={() => navigation.goBack()} textColor="#7C4DFF" style={{ marginTop: 8 }}>
          Already have an account? Login
        </Button>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  title: { color: '#E8E8F0', fontWeight: '700', textAlign: 'center' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 24 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  error: { color: '#FF5252', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 8 },
});
