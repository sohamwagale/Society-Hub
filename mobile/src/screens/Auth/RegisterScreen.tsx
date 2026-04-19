// Import React and hooks for maintaining local form state
import React, { useState } from 'react';
// Import layout and feedback components for a smooth mobile experience
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
// Import themed MD3 components from React Native Paper
import { Text, TextInput, Button, Surface } from 'react-native-paper';
// Import API services for account creation
import { authAPI } from '../../services/api';
// Import the global auth store for immediate session hydration post-registration
import { useAuthStore } from '../../store';

/**
 * RegisterScreen:
 * A comprehensive signup form with validation and automatic post-registration login.
 */
export default function RegisterScreen({ navigation }: any) {
  // Extract the login trigger from the central store
  const { login } = useAuthStore();
  
  // ── Form Data State ──
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // ── UI Control State ──
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  /**
   * handleRegister:
   * Performs client-side sanitation and submits the new user profile to the backend.
   */
  const handleRegister = async () => {
    setError('');
    // ── Input Guard Rails ──
    if (!name.trim()) { setError('Name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      // Construct the registration payload
      const body = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
      };
      // 1. Create the account
      await authAPI.register(body);
      // 2. Automatically log the user in to provide a frictionless UX
      await login(body.email, body.password);
      // AppNavigator will now see (isAuthenticated === true && society_id === null)
      // and redirect to the Society Onboarding flow.
    } catch (e: any) {
      console.error('[Register] Error:', e.response?.data || e.message);
      // Extract specific error details (e.g., 'Email already exists') or use generic fallback
      const msg = e.response?.data?.detail || e.message || 'Registration failed';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally { 
      setLoading(false); 
    }
  };

  return (
    // Wrap in ScrollView to avoid layout breaks on small screens with open keyboards
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
      {/* Page Heading */}
      <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
      <Text variant="bodyMedium" style={{ color: '#888', marginBottom: 24, textAlign: 'center' }}>
        Join your society community
      </Text>

      {/* Main Form Content */}
      <Surface style={styles.card} elevation={1}>
        {/* Name Input */}
        <TextInput 
          label="Full Name *" value={name} onChangeText={setName} mode="outlined"
          left={<TextInput.Icon icon="account" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" 
        />

        {/* Identity Input */}
        <TextInput 
          label="Email *" value={email} onChangeText={setEmail} mode="outlined"
          keyboardType="email-address" autoCapitalize="none"
          left={<TextInput.Icon icon="email" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" 
        />

        {/* Optional Contact Input */}
        <TextInput 
          label="Phone" value={phone} onChangeText={setPhone} mode="outlined"
          keyboardType="phone-pad"
          left={<TextInput.Icon icon="phone" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" 
        />

        {/* Primary Password Input */}
        <TextInput 
          label="Password *" value={password} onChangeText={setPassword} mode="outlined"
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock" />}
          right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" 
        />

        {/* Confirmation Input - Security best practice */}
        <TextInput 
          label="Confirm Password *" value={confirmPassword} onChangeText={setConfirmPassword} mode="outlined"
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock-check" />}
          style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" 
        />

        {/* Dynamic Error Feedback */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Primary Action Button */}
        <Button 
          mode="contained" onPress={handleRegister} loading={loading} disabled={loading}
          style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="account-plus"
        >
          Create Account
        </Button>

        {/* Back-to-Login Navigation */}
        <Button mode="text" onPress={() => navigation.goBack()} textColor="#7C4DFF" style={{ marginTop: 8 }}>
          Already have an account? Login
        </Button>
      </Surface>
    </ScrollView>
  );
}

// ── Local Styles ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' },
  title: { color: '#E8E8F0', fontWeight: '700', textAlign: 'center' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 24 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  error: { color: '#FF5252', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 8 },
});
