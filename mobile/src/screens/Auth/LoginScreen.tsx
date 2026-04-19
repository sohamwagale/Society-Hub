// Import React and hooks for managing local UI state
import React, { useState } from 'react';
// Import essential React Native layout and platform-specific behavior components
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
// Import themed MD3 components from React Native Paper for a premium look
import { Text, TextInput, Button, Surface } from 'react-native-paper';
// Import community-standard icons for visual branding
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Import the global authentication store to trigger login actions
import { useAuthStore } from '../../store';

/**
 * LoginScreen:
 * The entry point for existing users, featuring a deep navy themed interface and demo toggles.
 */
export default function LoginScreen({ navigation }: any) {
  // Extract the login action from the global auth store
  const { login } = useAuthStore();
  
  // ── Local State ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Controls spinner on the primary button
  const [error, setError] = useState(''); // Stores validation or server-side error messages
  const [showPassword, setShowPassword] = useState(false); // Toggles secure text entry visibility

  /**
   * handleLogin:
   * Validates input and orchestrates the authentication flow.
   */
  const handleLogin = async () => {
    // Basic client-side validation
    if (!email || !password) { setError('Email and password are required'); return; }
    
    setLoading(true); 
    setError(''); // Clear previous errors
    
    try {
      // Direct call to the global store which handles token storage internally
      await login(email, password);
      // Navigation is handled automatically by AppNavigator reacting to isAuthenticated state
    } catch (e: any) {
      // Extract specific error details from Axios response or fallback to generic message
      setError(e.response?.data?.detail || (e.message || 'Invalid credentials'));
    } finally { 
      setLoading(false); 
    }
  };

  return (
    // Ensure the keyboard doesn't overlap the input fields on smaller screens
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Branding & Logo Section */}
        <View style={styles.logo}>
          <MaterialCommunityIcons name="home-city" size={56} color="#7C4DFF" />
          <Text variant="headlineMedium" style={styles.title}>Society Hub</Text>
          <Text variant="bodyMedium" style={{ color: '#888' }}>Apartment Management</Text>
        </View>

        {/* Credentials Form Card */}
        <Surface style={styles.card} elevation={2}>
          {/* Email Input with floating label and internal icon */}
          <TextInput 
            label="Email" value={email} onChangeText={setEmail} mode="outlined"
            keyboardType="email-address" autoCapitalize="none"
            left={<TextInput.Icon icon="email" />}
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" 
          />

          {/* Password Input with visibility toggle */}
          <TextInput 
            label="Password" value={password} onChangeText={setPassword} mode="outlined"
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(!showPassword)} />}
            style={styles.input} outlineColor="#3D3D5C" activeOutlineColor="#7C4DFF" textColor="#E8E8F0" 
          />

          {/* Error Message Display */}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Primary Login Action */}
          <Button 
            mode="contained" onPress={handleLogin} loading={loading} disabled={loading}
            style={styles.button} contentStyle={{ paddingVertical: 6 }} buttonColor="#7C4DFF" icon="login"
          >
            Login
          </Button>

          {/* Secondary Registration Action */}
          <Button mode="text" onPress={() => navigation.navigate('Register')} textColor="#7C4DFF" style={{ marginTop: 8 }}>
            Don't have an account? Register
          </Button>
        </Surface>

        {/* Demo Credentials Section - Helpful for developers and reviewers */}
        <Surface style={styles.demoCard} elevation={1}>
          <Text variant="titleSmall" style={{ color: '#888', marginBottom: 8 }}>Demo Credentials</Text>
          <View style={styles.demoRow}>
            {/* Quick-fill button for Admin role */}
            <Button 
              mode="outlined" compact onPress={() => { setEmail('admin@society.com'); setPassword('admin123'); }}
              textColor="#FFB74D" style={{ borderColor: '#3D3D5C', borderRadius: 10, flex: 1 }}>
              Admin
            </Button>
            {/* Quick-fill button for Resident role */}
            <Button 
              mode="outlined" compact onPress={() => { setEmail('priya@email.com'); setPassword('resident123'); }}
              textColor="#7C4DFF" style={{ borderColor: '#3D3D5C', borderRadius: 10, flex: 1 }}>
              Resident
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Shared Stylesheet ──
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A' }, // Primary theme background
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logo: { alignItems: 'center', marginBottom: 28 },
  title: { color: '#E8E8F0', fontWeight: '700', marginTop: 8 },
  // Card-like surface for form grouping
  card: { backgroundColor: '#1A1A2E', borderRadius: 24, padding: 24, marginBottom: 16 },
  input: { marginBottom: 14, backgroundColor: '#1A1A2E' },
  error: { color: '#FF5252', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  button: { borderRadius: 12, marginTop: 4 },
  // Styled card for the demo credential helper
  demoCard: { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, alignItems: 'center' },
  demoRow: { flexDirection: 'row', gap: 8, width: '100%' },
});
