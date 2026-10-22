import type { CheckForUpdatesOptions, ConfigureOptions } from './types';
/**
 * Internal state for the SDK configuration.
 */
export interface AirBuildConfig {
    distributionKey: string;
    baseUrl: string;
}
/**
 * The main AirBuild SDK class.
 *
 * Usage:
 *   import { AirBuild } from '@airbuild/react-native';
 *
 *   AirBuild.configure({ distributionKey: 'dk_a1b2c3d4e5f6' });
 *   await AirBuild.checkForUpdates({ currentVersion: '1.0.0' });
 */
export declare class AirBuild {
    /** Current SDK configuration, set via configure(). */
    private static config;
    /**
     * Configures the AirBuild SDK with your distribution key and optional base URL.
     * Must be called once before using checkForUpdates().
     *
     * @param options - Configuration options.
     * @throws if distributionKey is missing or invalid.
     */
    static configure(options: ConfigureOptions): void;
    /**
     * Returns the active configuration, or `null` if `configure()` hasn't
     * been called yet. Used by sibling modules (e.g. `AirBuildCodePush`)
     * so a single `configure()` call covers the whole SDK.
     */
    static getConfiguration(): AirBuildConfig | null;
    /**
     * Returns the current SDK configuration, or throws if not configured.
     */
    private static getConfig;
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
    static checkForUpdates(options: CheckForUpdatesOptions): Promise<void>;
    /**
     * Calls the check-update endpoint and returns update info if available.
     *
     * @returns UpdateInfo if an update is available, or null if no update.
     */
    private static fetchUpdate;
    /**
     * Shows the default update dialog using Alert.alert.
     * Reports update_prompt_shown, and on user action reports
     * update_accepted or update_declined.
     */
    private static showUpdateDialog;
    /**
     * Builds the message body for the update dialog.
     */
    private static buildDialogMessage;
    /**
     * Formats a file size in bytes to a human-readable string.
     */
    private static formatFileSize;
    /**
     * Performs the update based on the current platform.
     * - Android: downloads APK via native module and triggers system installer
     * - iOS: opens installUrl in Safari via Linking.openURL
     */
    private static performUpdate;
    /**
     * Reports an analytics event to the AirBuild server.
     * Errors are silently swallowed so they never break the update flow.
     */
    private static reportEvent;
}
/**
 * Singleton instance exported as the default SDK interface.
 * All methods are static on the class, so this export is for convenience.
 */
export default AirBuild;
//# sourceMappingURL=AirBuild.d.ts.map