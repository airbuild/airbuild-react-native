"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.AirBuild = void 0;
var _reactNative = require("react-native");
var _NativeAirBuild = require("./NativeAirBuild");
/**
 * AirBuild Distribution SDK - Main Module
 *
 * The AirBuild class provides the primary API for the Distribution SDK.
 * Developers configure the SDK once with their distribution key, then call
 * `checkForUpdates()` to check for new binary builds and prompt the tester
 * to install them.
 *
 * Flow:
 *   1. AirBuild.configure({ distributionKey, baseUrl? })
 *   2. await AirBuild.checkForUpdates({ currentVersion })
 *   3. SDK shows a default Alert.alert dialog if an update is available
 *   4. On "Update" tap:
 *      - Android: native module downloads APK and triggers system installer
 *      - iOS: opens installUrl in Safari via Linking.openURL
 *   5. Analytics events are reported to the server throughout the flow
 */

/**
 * Default base URL for the AirBuild server.
 */
const DEFAULT_BASE_URL = 'https://airbuild.dev';

/**
 * Internal state for the SDK configuration.
 */

/**
 * The main AirBuild SDK class.
 *
 * Usage:
 *   import { AirBuild } from '@airbuild/react-native';
 *
 *   AirBuild.configure({ distributionKey: 'dk_a1b2c3d4e5f6' });
 *   await AirBuild.checkForUpdates({ currentVersion: '1.0.0' });
 */
class AirBuild {
  /** Current SDK configuration, set via configure(). */
  static config = null;

  /**
   * Configures the AirBuild SDK with your distribution key and optional base URL.
   * Must be called once before using checkForUpdates().
   *
   * @param options - Configuration options.
   * @throws if distributionKey is missing or invalid.
   */
  static configure(options) {
    if (!options.distributionKey || !options.distributionKey.startsWith('dk_')) {
      throw new Error('AirBuild.configure: distributionKey is required and must start with "dk_"');
    }
    const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.config = {
      distributionKey: options.distributionKey,
      baseUrl
    };
  }

  /**
   * Returns the active configuration, or `null` if `configure()` hasn't
   * been called yet. Used by sibling modules (e.g. `AirBuildCodePush`)
   * so a single `configure()` call covers the whole SDK.
   */
  static getConfiguration() {
    return this.config;
  }

  /**
   * Returns the current SDK configuration, or throws if not configured.
   */
  static getConfig() {
    if (!this.config) {
      throw new Error('AirBuild is not configured. Call AirBuild.configure() before using other methods.');
    }
    return this.config;
  }

  /**
   * Checks for updates and shows a default dialog if an update is available.
   *
   * The SDK handles the full update flow:
   *   - Calls the check-update endpoint
   *   - Shows an Alert.alert dialog with version + release notes
   *   - On "Update": downloads and installs (Android) or opens install URL (iOS)
   *   - Reports analytics events to the server
   *
   * @param options - Check options including currentVersion.
   * @returns A promise that resolves when the check is complete.
   */
  static async checkForUpdates(options) {
    const {
      currentVersion,
      currentBuildNumber,
      onUpdateAvailable,
      onNoUpdate,
      onError
    } = options;
    if (!currentVersion) {
      throw new Error('AirBuild.checkForUpdates: currentVersion is required');
    }
    const config = this.getConfig();
    const platform = _reactNative.Platform.OS === 'ios' ? 'ios' : 'android';
    try {
      const updateInfo = await this.fetchUpdate(config, currentVersion, platform, currentBuildNumber);
      if (!updateInfo) {
        onNoUpdate?.();
        return;
      }

      // If the developer provides an onUpdateAvailable callback, call it.
      // If it returns false, suppress the default dialog.
      if (onUpdateAvailable) {
        const shouldShowDefault = await onUpdateAvailable(updateInfo);
        if (shouldShowDefault === false) {
          return;
        }
      }

      // Show the default update dialog
      await this.showUpdateDialog(updateInfo, platform);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(err);
      } else {
        // Re-throw if no error handler provided
        throw err;
      }
    }
  }

  /**
   * Calls the check-update endpoint and returns update info if available.
   *
   * @returns UpdateInfo if an update is available, or null if no update.
   */
  static async fetchUpdate(config, currentVersion, platform, currentBuildNumber) {
    const url = `${config.baseUrl}/api/sdk/check-update` + `?key=${encodeURIComponent(config.distributionKey)}` + `&version=${encodeURIComponent(currentVersion)}` + `&platform=${encodeURIComponent(platform)}` + (currentBuildNumber ? `&build=${encodeURIComponent(currentBuildNumber)}` : '');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`AirBuild: check-update request failed with status ${response.status}`);
    }
    const data = await response.json();
    if (!data.hasUpdate) {
      return null;
    }
    return data;
  }

  /**
   * Shows the default update dialog using Alert.alert.
   * Reports update_prompt_shown, and on user action reports
   * update_accepted or update_declined.
   */
  static async showUpdateDialog(info, platform) {
    const config = this.getConfig();

    // Report that the prompt was shown
    await this.reportEvent(config, info.buildId, 'update_prompt_shown', platform);
    const title = `Update Available - v${info.latestVersion}`;
    const message = this.buildDialogMessage(info);
    return new Promise(resolve => {
      _reactNative.Alert.alert(title, message, [{
        text: 'Later',
        style: 'cancel',
        onPress: async () => {
          await this.reportEvent(config, info.buildId, 'update_declined', platform);
          resolve();
        }
      }, {
        text: 'Update',
        style: 'default',
        onPress: async () => {
          await this.reportEvent(config, info.buildId, 'update_accepted', platform);
          await this.performUpdate(info, platform);
          resolve();
        }
      }], {
        cancelable: true,
        onDismiss: async () => {
          // User dismissed the dialog by tapping outside
          await this.reportEvent(config, info.buildId, 'update_declined', platform);
          resolve();
        }
      });
    });
  }

  /**
   * Builds the message body for the update dialog.
   */
  static buildDialogMessage(info) {
    const lines = [];
    if (info.releaseNotes) {
      lines.push(info.releaseNotes);
    }
    if (info.fileSizeBytes && info.fileSizeBytes > 0) {
      lines.push(`\nSize: ${this.formatFileSize(info.fileSizeBytes)}`);
    }
    if (info.isPasswordProtected) {
      lines.push('\nThis build is password protected.');
    }
    return lines.join('\n');
  }

  /**
   * Formats a file size in bytes to a human-readable string.
   */
  static formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Performs the update based on the current platform.
   * - Android: downloads APK via native module and triggers system installer
   * - iOS: opens installUrl in Safari via Linking.openURL
   */
  static async performUpdate(info, platform) {
    const config = this.getConfig();
    if (platform === 'android') {
      // Android: download APK and trigger system installer
      await this.reportEvent(config, info.buildId, 'download_started', platform);
      try {
        const nativeModule = (0, _NativeAirBuild.getNativeAirBuild)();
        await this.reportEvent(config, info.buildId, 'install_started', platform);
        await nativeModule.downloadAndInstallApk(info.downloadUrl);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        _reactNative.Alert.alert('Install Failed', `Could not download and install the update. ${msg}`);
      }
    } else {
      // iOS: open install URL in Safari (cannot sideload on iOS)
      await this.reportEvent(config, info.buildId, 'install_started', platform);
      try {
        await _reactNative.Linking.openURL(info.installUrl);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        _reactNative.Alert.alert('Install Failed', `Could not open the install page. ${msg}`);
      }
    }
  }

  /**
   * Reports an analytics event to the AirBuild server.
   * Errors are silently swallowed so they never break the update flow.
   */
  static async reportEvent(config, buildId, event, platform) {
    try {
      const url = `${config.baseUrl}/api/sdk/report-event`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: config.distributionKey,
          buildId,
          event,
          platform
        })
      });
    } catch {
      // Silently ignore event reporting errors
    }
  }
}

/**
 * Singleton instance exported as the default SDK interface.
 * All methods are static on the class, so this export is for convenience.
 */
exports.AirBuild = AirBuild;
var _default = exports.default = AirBuild;
//# sourceMappingURL=AirBuild.js.map