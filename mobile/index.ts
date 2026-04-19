// Import the registration utility from Expo core to bootstrap the application
import { registerRootComponent } from 'expo';

// Import the root App component which contains the navigation and provider logic
import App from './App';

/**
 * registerRootComponent:
 * 1. Internally calls AppRegistry.registerComponent('main', () => App) from React Native.
 * 2. Bridges the gap between Expo Go and standalone native builds.
 * 3. Ensures the application's root component is correctly hooked into the native UI layer.
 */
registerRootComponent(App);
