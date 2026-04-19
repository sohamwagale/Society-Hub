// Import React and hooks for state and lifecycle management
import React, { useEffect, useState } from 'react';
// Import StatusBar from Expo to control the look of the top system bar
import { StatusBar } from 'expo-status-bar';
// Import PaperProvider to inject the React Native Paper design system theme
import { PaperProvider } from 'react-native-paper';
// Import the root navigation container and logic
import AppNavigator from './src/navigation/AppNavigator';
// Import the centralized design system theme configuration
import { theme } from './src/theme';
// Import the authentication store (Zustand) to determine login state and loading progress
import { useAuthStore } from './src/store';
// Import the generic loading placeholder component
import { LoadingScreen } from './src/components/Common';
// Import utility for handling authentication state persistence across app restarts
import { subscribeAuthPersistenceOnBackground } from './src/utils/authAppStatePersistence';

export default function App() {
  // Sync with the global authentication store's loading indicator
  const isLoading = useAuthStore((s) => s.isLoading);
  // Track if the persisted authentication data has been loaded from storage into memory
  const [authHydrated, setAuthHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  // ── Lifecycle: Store Hydration ──
  useEffect(() => {
    // Immediate check for hydration status on mount
    setAuthHydrated(useAuthStore.persist.hasHydrated());
    // Subscribe to the storage 'onFinishHydration' event to trigger re-render once data is ready
    const unsub = useAuthStore.persist.onFinishHydration(() => setAuthHydrated(true));
    // Cleanup subscription to prevent memory leaks
    return unsub;
  }, []);

  // ── Lifecycle: Background Persistence ──
  // Initialize the background observer for auth persistence
  useEffect(() => subscribeAuthPersistenceOnBackground(), []);

  // ── Conditional Rendering: Bootup Layer ──
  // Show the loading screen while waiting for storage hydration or network auth checks
  if (!authHydrated || isLoading) {
    return (
      <PaperProvider theme={theme}>
        <LoadingScreen />
        {/* Force status bar color to match the loading screen contrast */}
        <StatusBar style="light" />
      </PaperProvider>
    );
  }

  // ── Main Render: Navigation Layer ──
  return (
    <PaperProvider theme={theme}>
      {/* The main shell of the app containing all authenticated and unauthenticated routes */}
      <AppNavigator />
      {/* Light status bar icons to suit the dark/themed background */}
      <StatusBar style="light" />
    </PaperProvider>
  );
}
