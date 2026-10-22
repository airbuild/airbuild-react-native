/**
 * AirBuild Distribution SDK - TypeScript Types
 *
 * Type definitions for the AirBuild React Native Distribution SDK.
 * These types describe the configuration options, update information
 * returned by the server, and the callbacks used during the update flow.
 */
/**
 * Platform identifier for the current device.
 */
export type AirBuildPlatform = 'ios' | 'android';
/**
 * Analytics event types reported to the AirBuild server.
 * These are logged server-side as DownloadLog entries prefixed with "SDK_".
 */
export type AirBuildEventType = 'update_prompt_shown' | 'update_accepted' | 'update_declined' | 'download_started' | 'install_started';
/**
 * Configuration options passed to `AirBuild.configure()`.
 */
export interface ConfigureOptions {
    /**
     * The distribution key for your app (e.g. "dk_a1b2c3d4e5f6").
     * This is a public, per-app, non-secret identifier found in the AirBuild dashboard.
     */
    distributionKey: string;
    /**
     * Base URL of the AirBuild server.
     * Defaults to "https://airbuild.dev".
     * Override this for self-hosted AirBuild instances.
     */
    baseUrl?: string;
}
/**
 * Options passed to `AirBuild.checkForUpdates()`.
 */
export interface CheckForUpdatesOptions {
    /**
     * The current version of the app (e.g. "1.0.0").
     * The SDK compares this against the latest build version on the server.
     */
    currentVersion: string;
    /**
     * The build number of the currently installed build — Android
     * `versionCode` or iOS `CFBundleVersion` (e.g. "2"). Optional, but
     * recommended: it lets the server distinguish same-version builds
     * (e.g. "1.0.0+1" vs "1.0.0+2"). Without it, two builds sharing a version
     * string are treated as equal.
     */
    currentBuildNumber?: string;
    /**
     * Optional callback invoked when an update is available but before the
     * default dialog is shown. Return `false` to suppress the default dialog
     * and handle the update yourself (e.g. show a custom UI).
     */
    onUpdateAvailable?: (info: UpdateInfo) => boolean | void | Promise<boolean | void>;
    /**
     * Optional callback invoked when no update is available.
     */
    onNoUpdate?: () => void;
    /**
     * Optional callback invoked if the update check request fails.
     */
    onError?: (error: Error) => void;
}
/**
 * Update information returned by the AirBuild server when an update is available.
 * This mirrors the response from `GET /api/sdk/check-update`.
 */
export interface UpdateInfo {
    /** Whether a newer build is available. Always `true` when this object is returned. */
    hasUpdate: boolean;
    /** The latest version string available on the server (e.g. "1.2.0"). */
    latestVersion: string;
    /** The build number of the latest build, if available. */
    latestBuildNumber?: string | null;
    /** Unique identifier for the latest build on the server. */
    buildId: string;
    /** Release notes for the build, if provided. */
    releaseNotes?: string | null;
    /**
     * URL for downloading the build binary (APK/IPA).
     * On Android, the SDK downloads this via the native module and triggers the installer.
     */
    downloadUrl: string;
    /**
     * URL for the web install page.
     * On iOS, the SDK opens this in Safari via Linking.openURL (sideloading not possible).
     */
    installUrl: string;
    /** Size of the build file in bytes. */
    fileSizeBytes: number;
    /** URL of the app icon, if available. */
    iconUrl?: string | null;
    /** Minimum OS version required to install this build, if specified. */
    minOsVersion?: string | null;
    /** Whether the build is protected by a password. */
    isPasswordProtected: boolean;
    /** ISO timestamp of when the build was created. */
    createdAt: string;
}
/**
 * Response from the check-update endpoint.
 * Either an update is available (UpdateInfo) or it is not (hasUpdate: false).
 */
export type CheckUpdateResponse = UpdateInfo | {
    hasUpdate: false;
};
/**
 * Options for `AirBuildCodePush.configure()` / `enableTelemetry()`.
 * Only needed when the app uses CodePush without the binary-distribution
 * SDK — otherwise `AirBuild.configure()`'s values are reused.
 */
export interface TelemetryOptions {
    /** Distribution key (dk_xxx) — same public key as updates.url uses. */
    distributionKey: string;
    /** AirBuild server base URL. Defaults to "https://airbuild.dev". */
    baseUrl?: string;
}
/**
 * Snapshot of the update currently running, returned by
 * `AirBuildCodePush.currentUpdate`.
 */
export interface CodePushUpdateInfo {
    /**
     * Expo manifest id of the running OTA update, or `null` when the app is
     * running its embedded bundle.
     */
    updateId: string | null;
    /** Channel the running update was fetched from (e.g. "production"). */
    channel: string | null;
    /** Runtime version of the running update (e.g. "1.0.0"). */
    runtimeVersion: string | null;
    /** True when running the build's embedded bundle (no OTA update). */
    isEmbeddedLaunch: boolean;
    /**
     * True when expo-updates recovered from a startup crash of a newly
     * launched update and fell back to the previous/embedded bundle.
     */
    emergencyLaunch: boolean;
    /** Crash description when `emergencyLaunch` is true. */
    emergencyLaunchReason: string | null;
    /** Commit time of the running update. */
    createdAt: Date | null;
}
/**
 * Body payload sent to the report-event endpoint.
 */
export interface ReportEventPayload {
    /** Distribution key (dk_xxx). */
    key: string;
    /** Build ID the event pertains to. */
    buildId: string;
    /** The analytics event type. */
    event: AirBuildEventType;
    /** Platform identifier ("ios" or "android"). */
    platform?: AirBuildPlatform;
    /** Device UDID, if available (primarily for iOS ad-hoc distribution). */
    udid?: string;
}
//# sourceMappingURL=types.d.ts.map