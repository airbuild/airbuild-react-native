import type { CodePushUpdateInfo, TelemetryOptions } from './types';
/**
 * The AirBuild CodePush module for React Native.
 */
export declare class AirBuildCodePush {
    private static telemetryStarted;
    private static telemetryConfig;
    /**
     * Configures CodePush independently of `AirBuild.configure()`. Only
     * needed when the app uses CodePush but not the binary-distribution
     * SDK — otherwise `AirBuild.configure()` is enough and
     * `enableTelemetry()` picks up the same distribution key + base URL.
     */
    static configure(options: TelemetryOptions): void;
    /**
     * Whether the OTA update runtime (expo-updates) is present and enabled
     * in this build. False for dev/Expo Go builds and apps without
     * expo-updates — every method degrades to a no-op then.
     */
    static get isAvailable(): boolean;
    /**
     * Snapshot of the currently running update, or `null` when running the
     * embedded bundle. `emergencyLaunch`/`emergencyLaunchReason` describe a
     * startup crash recovered by expo-updates.
     */
    static get currentUpdate(): CodePushUpdateInfo | null;
    /**
     * Starts outcome reporting. Reports:
     * - `launch_success` — a downloaded update is running (posted after a
     *   short settle window so a startup crash can't claim success)
     * - `emergency_launch` — expo-updates recovered from a startup crash;
     *   attributed to the downloaded update persisted via the state-change
     *   listener (the recovered bundle can't see the crashed update's id)
     *
     * Also persists a per-install device id as an expo-updates extra param —
     * it rides on every manifest check (`Expo-Extra-Params` header), letting
     * the server join launch outcomes to rollout checkins.
     *
     * Idempotent; safe to call on every startup.
     */
    static enableTelemetry(options?: TelemetryOptions): void;
    /**
     * Manually checks the update server. Thin passthrough to
     * `Updates.checkForUpdateAsync` — resolves to a small result object
     * (`null` when expo-updates is unavailable).
     */
    static checkForUpdate(): Promise<{
        isAvailable: boolean;
        isRollBackToEmbedded: boolean;
        reason?: string;
    } | null>;
    /**
     * Downloads an available update without launching it — it applies on the
     * next cold start (or call `reload()`). Passthrough to
     * `Updates.fetchUpdateAsync`.
     */
    static fetchUpdate(): Promise<unknown>;
    /**
     * Reloads the app — a downloaded/pending update takes over.
     * Passthrough to `Updates.reloadAsync`.
     */
    static reload(): Promise<void>;
    private static configFromAirBuild;
    private static post;
    /**
     * Persists the id of a just-downloaded update so an emergency launch on
     * the next boot can attribute the crash to it.
     */
    private static trackPendingDownload;
    private static report;
}
export default AirBuildCodePush;
//# sourceMappingURL=CodePush.d.ts.map