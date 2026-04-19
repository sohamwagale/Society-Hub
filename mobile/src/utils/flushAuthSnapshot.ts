// Import the Expo FileSystem module for direct interaction with the device's sandbox storage
import * as FileSystem from 'expo-file-system';
// Import the authentication store and its associated storage identifier for data consistency
import { useAuthStore, AUTH_STORAGE_KEY } from '../store';

/**
 * flushAuthSnapshotToDisk:
 * Manually serializes and writes the current authentication state to the filesystem.
 * This function replicates the behavior of Zustand's persistence middleware but 
 * ensures the operation is fully awaited. It is used primarily during app lifecycle 
 * transitions (foreground -> background) to prevent data loss or session expiration 
 * during OS process suspension.
 */
export async function flushAuthSnapshotToDisk(): Promise<void> {
  // Extract the non-reactive current state (snapshot) from the auth store
  const { user, isAuthenticated } = useAuthStore.getState();
  // Construct the absolute path to the local JSON storage file
  const uri = `${FileSystem.documentDirectory}${AUTH_STORAGE_KEY}.json`;
  // Construct the persistence envelope required by Zustand for correct rehydration
  const envelope = JSON.stringify({
    // Store the core authentication fields
    state: { user, isAuthenticated },
    // Maintain the storage version schema (currently v0)
    version: 0,
  });
  // Execute the atomic write operation and await its resolution
  await FileSystem.writeAsStringAsync(uri, envelope);
}
