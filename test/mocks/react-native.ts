/**
 * Lightweight manual mock of the `react-native` module for unit tests.
 *
 * This package only depends on `react-native` as a peerDependency (it's
 * never installed in this package's own node_modules), so Jest is
 * configured (see jest.config.js) to redirect `import ... from
 * 'react-native'` to this file instead of trying to resolve the real
 * package. Only the APIs AirBuild.ts actually uses are mocked.
 */

type AlertButton = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

type AlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void | Promise<void>;
};

export const Alert = {
  alert: jest.fn(
    (
      _title: string,
      _message?: string,
      _buttons?: AlertButton[],
      _options?: AlertOptions
    ) => {
      // Tests drive button presses explicitly by inspecting the mock's
      // call arguments (Alert.alert.mock.calls) and invoking onPress
      // themselves, so the default mock implementation is a no-op.
    }
  ),
};

export const Linking = {
  openURL: jest.fn(() => Promise.resolve(true)),
};

export const Platform = {
  OS: 'ios' as 'ios' | 'android',
};

export const NativeModules: Record<string, unknown> = {};
