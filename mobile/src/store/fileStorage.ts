// Import Expo FileSystem to interact with the device's persistent storage volume
import * as FileSystem from 'expo-file-system';
// Import StateStorage type from Zustand middleware for type-safe implementation
import { StateStorage } from 'zustand/middleware';

/**
 * FileStorage:
 * A custom implementation of Zustand's StateStorage using the flat filesystem.
 * This is used instead of AsyncStorage for better performance and reliability in complex states.
 */
export const FileStorage: StateStorage = {
  /**
   * Retrieves a state slice from a dedicated JSON file on disk.
   */
  getItem: async (name: string): Promise<string | null> => {
    try {
      // Define the absolute URI for the file based on the app's document directory
      const uri = `${FileSystem.documentDirectory}${name}.json`;
      // Check for file existence before attempting to read
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        // Read and return the raw stringified JSON content
        return await FileSystem.readAsStringAsync(uri);
      }
      return null;
    } catch {
      // Return null on any error (e.g., permission issues or disk corruption)
      return null;
    }
  },

  /**
   * Persists a state slice to a dedicated JSON file on disk.
   */
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      // Define the target URI
      const uri = `${FileSystem.documentDirectory}${name}.json`;
      // Overwrite or create the file with the new state payload
      await FileSystem.writeAsStringAsync(uri, value);
    } catch (e) {
      // Log critical persistence failures for debugging
      console.error('FileStorage setItem error:', e);
    }
  },

  /**
   * Removes the state file from disk, effectively resetting that store's persistence.
   */
  removeItem: async (name: string): Promise<void> => {
    try {
      const uri = `${FileSystem.documentDirectory}${name}.json`;
      // Verify existence before deletion to avoid unnecessary exceptions
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        // Permanently erase the file
        await FileSystem.deleteAsync(uri);
      }
    } catch {
      // Suppress deletion errors during cleanup
    }
  },
};
