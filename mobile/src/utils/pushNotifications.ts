/**
 * Push Notifications Utility
 * Registers for Expo push notifications, sends the token to the backend,
 * and configures foreground notification display.
 *
 * Works in both Expo Go (dev) and standalone/release APK builds.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authAPI } from '../services/api';

// Configure how notifications look when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications:
 * 1. Check if physical device (push doesn't work on emulators)
 * 2. Request permissions
 * 3. Get Expo push token
 * 4. Send token to backend
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    const token = tokenData.data;
    console.log('Expo push token:', token);

    // Send token to backend
    try {
      await authAPI.registerPushToken(token);
      console.log('Push token registered with backend');
    } catch (e) {
      console.warn('Failed to register push token with backend:', e);
    }

    return token;
  } catch (error) {
    console.warn('Failed to get push token:', error);
    return null;
  }
}

/**
 * Set up Android notification channel (required for Android 8+)
 */
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C4DFF',
      sound: 'default',
    });
  }
}
