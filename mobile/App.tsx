import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme';
import { useAuthStore } from './src/store';
import { LoadingScreen } from './src/components/Common';

export default function App() {
  const { isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, []);

  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <LoadingScreen />
        <StatusBar style="light" />
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <AppNavigator />
      <StatusBar style="light" />
    </PaperProvider>
  );
}
