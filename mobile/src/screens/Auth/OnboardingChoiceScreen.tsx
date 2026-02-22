import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function OnboardingChoiceScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <MaterialCommunityIcons name="home-city" size={56} color="#7C4DFF" />
        <Text variant="headlineMedium" style={styles.title}>Welcome!</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          How would you like to get started?
        </Text>
      </View>

      <Surface style={styles.card} elevation={2}>
        <MaterialCommunityIcons name="account-group" size={32} color="#7C4DFF" style={{ marginBottom: 8 }} />
        <Text variant="titleMedium" style={styles.cardTitle}>Join a Society</Text>
        <Text variant="bodySmall" style={styles.cardText}>
          Find your existing housing society and join using your flat number.
        </Text>
        <Button
          mode="contained"
          style={styles.button}
          buttonColor="#7C4DFF"
          onPress={() => navigation.navigate('JoinSociety')}
          icon="login"
        >
          Join Society
        </Button>
      </Surface>

      <Surface style={styles.card} elevation={2}>
        <MaterialCommunityIcons name="plus-circle" size={32} color="#FFB74D" style={{ marginBottom: 8 }} />
        <Text variant="titleMedium" style={styles.cardTitle}>Create a Society</Text>
        <Text variant="bodySmall" style={styles.cardText}>
          Set up a new society. You will become the sole administrator.
        </Text>
        <Button
          mode="outlined"
          style={styles.button}
          textColor="#FFB74D"
          onPress={() => navigation.navigate('CreateSociety')}
          icon="plus"
        >
          Create Society
        </Button>
      </Surface>

      <Button
        mode="text"
        onPress={() => {
          const { useAuthStore } = require('../../store');
          useAuthStore.getState().logout();
        }}
        textColor="#888"
        style={{ marginTop: 8 }}
        icon="logout"
      >
        Logout
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0F1A', padding: 20, justifyContent: 'center' },
  logo: { alignItems: 'center', marginBottom: 24 },
  title: { color: '#E8E8F0', fontWeight: '700', textAlign: 'center', marginTop: 8, marginBottom: 4 },
  subtitle: { color: '#888', textAlign: 'center' },
  card: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 20, marginBottom: 14 },
  cardTitle: { color: '#E8E8F0', marginBottom: 6, fontWeight: '600' },
  cardText: { color: '#AAA', marginBottom: 12 },
  button: { borderRadius: 12, marginTop: 4 },
});
