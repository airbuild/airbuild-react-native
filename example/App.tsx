/**
 * AirBuild React Native SDK - Example App
 *
 * Demonstrates basic usage of the AirBuild Distribution SDK.
 * Configure the SDK with your distribution key, then call checkForUpdates()
 * to check for new builds and prompt the tester to install them.
 */
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { AirBuild } from '@airbuild/react-native';

const APP_VERSION = '1.0.0';

export default function App(): React.JSX.Element {
  const [status, setStatus] = useState<string>('Ready');
  const [checking, setChecking] = useState<boolean>(false);

  useEffect(() => {
    // Configure the AirBuild SDK once on app launch.
    // Replace with your actual distribution key from the AirBuild dashboard.
    AirBuild.configure({
      distributionKey: 'dk_a1b2c3d4e5f6',
      // baseUrl: 'https://airbuild.dev',  // optional, defaults to airbuild.dev
    });
  }, []);

  const handleCheckForUpdates = async (): Promise<void> => {
    setChecking(true);
    setStatus('Checking for updates...');

    try {
      await AirBuild.checkForUpdates({
        currentVersion: APP_VERSION,
        onNoUpdate: () => {
          setStatus('You are on the latest version.');
        },
        onError: (error: Error) => {
          setStatus(`Error: ${error.message}`);
        },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setStatus(`Error: ${msg}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>AirBuild SDK Example</Text>
        <Text style={styles.version}>App Version: {APP_VERSION}</Text>

        <Text style={styles.status}>{status}</Text>

        <TouchableOpacity
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={handleCheckForUpdates}
          disabled={checking}
        >
          <Text style={styles.buttonText}>
            {checking ? 'Checking...' : 'Check for Updates'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  version: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  status: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    minHeight: 40,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
