import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true); setError('');
    try {
      await login(email, password);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Logo */}
        <View style={styles.logo}>
          <MaterialCommunityIcons name="home-city" size={56} color="#7C4DFF" />
          <Text variant="headlineMedium" style={styles.title}>Society Hub</Text>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Apartment Management</Text>
        </View>

        <Surface style={styles.card} elevation={2}>
          <TextInput label="Email" value={email} onChangeText={setEmail} mode="outlined"
            keyboardType="email-address" autoCapitalize="none"
            left={<TextInput.Icon icon="email" />}
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

          <TextInput label="Password" value={password} onChangeText={setPassword} mode="outlined"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button mode="contained" onPress={handleLogin} loading={loading} disabled={loading}
            style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="login">
            Login
          </Button>

          <Button mode="text" onPress={() => navigation.navigate('Register')} textColor="#7C4DFF" style={{ marginTop: 8 }}>
            Don't have an account? Register
          </Button>
        </Surface>

        {/* Demo credentials */}
        <Surface style={styles.demoCard} elevation={1}>
          <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Demo Credentials</Text>
          <View style={styles.demoRow}>
            <Button mode="outlined" compact onPress={() => { setEmail('admin@society.com'); setPassword('admin123'); }}
              textColor="#FFB74D" style={{ borderColor: '#3D3D5C', borderRadius: 10, flex: 1 }}>
              Admin
            </Button>
            <Button mode="outlined" compact onPress={() => { setEmail('priya@email.com'); setPassword('resident123'); }}
              textColor="#7C4DFF" style={{ borderColor: '#3D3D5C', borderRadius: 10, flex: 1 }}>
              Resident
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logo: { alignItems: 'center', marginBottom: 28 },
  title: { color: '#E8E8F0', fontWeight: '700', marginTop: 8 },
  card: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 24, marginBottom: 16 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  error: { color: '#FF5252', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 4 },
  demoCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, alignItems: 'center' },
  demoRow: { flexDirection: 'row', gap: 8, width: '100%' },
});
