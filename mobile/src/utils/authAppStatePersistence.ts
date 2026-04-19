// Import the AppState utility from React Native to track the application's lifecycle status (active/background/inactive)
import { AppState } from 'react-native';
// Import the specialized utility for committing authentication state to persistent storage
import { flushAuthSnapshotToDisk } from './flushAuthSnapshot';

/**
 * Android/iOS lifecycle safeguard:
 * onPause/onStop (and often onDestroy on Android) run after the app is no longer active.
 * Flushing state here maximizes the chance that auth JSON metadata and SecureStore tokens 
 * are durable before the OS kills the process.
 */
export function subscribeAuthPersistenceOnBackground(): () => void {
  // Listen for changes in the application's state (e.g. going from 'foreground' to 'background')
  const sub = AppState.addEventListener('change', (next) => {
    // If the next state is not 'active' (meaning the app is losing focus or being minimized)
    if (next !== 'active') {
      // Trigger a silent background save of all authentication credentials
      void flushAuthSnapshotToDisk().catch((e) => console.warn('flushAuthSnapshotToDisk:', e));
    }
  });
  // Return a cleanup function to unsubscribe and prevent memory leaks/zombie listeners
  return () => sub.remove();
}
