// Import React hooks for managing notification state and lifecycle subscriptions
import { useState, useEffect, useRef } from 'react';
// Import Device information utility to check for physical hardware vs. simulator
import * as Device from 'expo-device';
// Import the core Expo Notifications library for token acquisition and event handling
import * as Notifications from 'expo-notifications';
// Import Global constants to access project registration details (EAS Project ID)
import Constants from 'expo-constants';
// Import Platform utility to handle OS-specific notification channel logic
import { Platform } from 'react-native';

/**
 * PushNotificationState:
 * Data structure representing the current reactive state of the notification system.
 */
export interface PushNotificationState {
  // The most recently received foreground notification object
  notification?: Notifications.Notification;
  // The unique token used by the server to target this specific device
  expoPushToken?: Notifications.ExpoPushToken;
  // The interaction response (e.g., when a user taps a notification)
  notificationResponse?: Notifications.NotificationResponse;
}

/**
 * usePushNotifications Hook:
 * A custom React hook that encapsulates the entire Expo Push Notification registration 
 * and listener lifecycle. Should be invoked at the root of the application.
 */
export const usePushNotifications = (): PushNotificationState => {
  // Configure the global notification handler for how foreground alerts should behave
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Disable alert sound for foreground notifications to prevent disruption
      shouldPlaySound: false,
      // Display the visual alert banner even if the app is currently in use
      shouldShowAlert: true,
      // Do not update the app icon badge count automatically
      shouldSetBadge: false,
      // Enable heads-up banner display
      shouldShowBanner: true,
      // Include the item in the notification tray list
      shouldShowList: true,
    }),
  });

  // State to store the persistent hardware push token
  const [expoPushToken, setExpoPushToken] = useState<
    Notifications.ExpoPushToken | undefined
  >();
  // State to track the latest incoming notification packet
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >();
  // State to track user interaction with notification banners
  const [notificationResponse, setNotificationResponse] = useState<
    Notifications.NotificationResponse | undefined
  >();

  // Hook to capture the very last interaction response (critical for cold-start navigation)
  const lastNotificationResponse = Notifications.useLastNotificationResponse();

  // Watch for changes in the interaction response
  useEffect(() => {
    // If a response exists (user tapped a notification)
    if (lastNotificationResponse) {
      // Synchronize it with the local state for component consumption
      setNotificationResponse(lastNotificationResponse);
    }
  }, [lastNotificationResponse]);

  // Reference to the foreground event listener subscription
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  // Reference to the background/interaction event listener subscription
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  /**
   * registerForPushNotificationsAsync:
   * Logical sequence to obtain hardware permissions and fetch the unique Expo Push Token.
   */
  async function registerForPushNotificationsAsync() {
    // Placeholder for the acquired token
    let token;

    // Check if the current environment is a physical device (Simulators do not support Push)
    if (Device.isDevice) {
      // Query the current OS permission status for notifications
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // If permissions haven't been granted yet
      if (existingStatus !== 'granted') {
        // Request visual and auditory permissions from the user
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      // If the user explicitly denied permissions
      if (finalStatus !== 'granted') {
        // Warn the user that they will miss critical alerts (like payment reminders)
        alert('Failed to get push token for push notification!');
        return;
      }
      // Retrieve the token from Expo's servers using the project's EAS ID
      token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      // Debug log the token for manual testing via Expo push tool
      console.log("TOKEN:", token?.data);
    } else {
      // Graceful degradation for development environments
      console.log('Must use physical device for Push Notifications');
    }

    // Android-specific configuration for OS-level notification channels
    if (Platform.OS === 'android') {
      // Create the 'default' high-priority channel
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        // Ensure max importance for heads-up display
        importance: Notifications.AndroidImportance.MAX,
        // Define the haptic feedback rhythm
        vibrationPattern: [0, 250, 250, 250],
        // Set the notification LED color
        lightColor: '#FF231F7C',
      });
    }
    // Return the successful token (if any)
    return token;
  }

  // Initialization effect to set up listeners and acquire the token
  useEffect(() => {
    // Start the asynchronous registration flow
    registerForPushNotificationsAsync().then((token) => {
      // Save the token to state once resolved
      setExpoPushToken(token);
    });

    // Subscribe to notifications arriving while the app is active
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        // Update the state with the received payload
        setNotification(notification);
      });

    // Subscribe to notifications that the user actively interacted with
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        // Update the state to trigger navigation logic elsewhere in the app
        setNotificationResponse(response);
      });

    // Cleanup phase: remove listeners to prevent memory leaks in the React tree
    return () => {
      // If the foreground listener exists, remove it
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      // If the interaction listener exists, remove it
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Expose the consolidated notification state to the rest of the application
  return {
    expoPushToken,
    notification,
    notificationResponse,
  };
};
