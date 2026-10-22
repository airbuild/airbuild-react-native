/**
 * AirBuild CodePush for React Native — OTA updates via expo-updates.
 *
 * Two responsibilities:
 *
 * 1. Telemetry — `enableTelemetry()` reports launch outcomes
 *    (launch_success / emergency_launch) to AirBuild so per-update install
 *    stats and crash-rate auto-pause work. The Expo Updates protocol is
 *    pull-only and has no report-back channel, so this module is the
 *    reporting path. Call it once, as early as possible in app startup.
 *
 * 2. Convenience wrappers around expo-updates state — the running update's
 *    id/channel/runtime, manual check/fetch, and reload. These mirror the
 *    Flutter SDK's `AirBuildCodePush` surface.
 *
 * Usage:
 *   import { AirBuild, AirBuildCodePush } from '@airbuild/react-native';
 *
 *   AirBuild.configure({ distributionKey: 'dk_...' });
 *   AirBuildCodePush.enableTelemetry(); // reuses AirBuild's config
 *
 * `expo-updates` is an optional peer — apps that only use binary
 * distribution (`AirBuild.checkForUpdates`) don't need it. Every method
 * here degrades to a no-op when expo-updates isn't installed or isn't
 * enabled in the current build.
 */
import { Platform } from 'react-native';
import { AirBuild } from './AirBuild';
const DEVICE_PARAM = 'airbuild-device-id';
const PENDING_PARAM = 'airbuild-pending-update';
// A crash during startup must not claim install success — launch_success
// is only reported after the bundle survives a short settle window. If
// the app dies inside it, the pending marker stays set and the next
// boot's emergency_launch still attributes the crash correctly.
const SETTLE_DELAY_MS = 5000;

/**
 * The subset of expo-updates this module uses. Typed structurally so the
 * SDK compiles without expo-updates installed (it is an optional peer).
 */

let updatesModule;

/**
 * Lazy, bundler-safe access to expo-updates. The `require` sits inside
 * try/catch so modern Metro treats it as an optional dependency — apps
 * without expo-updates can still bundle the SDK.
 */
function getUpdates() {
  if (updatesModule === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      updatesModule = require('expo-updates');
    } catch {
      updatesModule = null;
    }
  }
  return updatesModule;
}
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : r & 0x3 | 0x8).toString(16);
  });
}

/**
 * The AirBuild CodePush module for React Native.
 */
export class AirBuildCodePush {
  static telemetryStarted = false;
  static telemetryConfig = null;

  /**
   * Configures CodePush independently of `AirBuild.configure()`. Only
   * needed when the app uses CodePush but not the binary-distribution
   * SDK — otherwise `AirBuild.configure()` is enough and
   * `enableTelemetry()` picks up the same distribution key + base URL.
   */
  static configure(options) {
    if (!options.distributionKey || !options.distributionKey.startsWith('dk_')) {
      throw new Error('AirBuildCodePush.configure: distributionKey is required and must start with "dk_"');
    }
    const baseUrl = (options.baseUrl ?? 'https://airbuild.dev').replace(/\/+$/, '');
    this.telemetryConfig = {
      eventsUrl: `${baseUrl}/api/codepush/react-native/events?key=${encodeURIComponent(options.distributionKey)}`
    };
  }

  /**
   * Whether the OTA update runtime (expo-updates) is present and enabled
   * in this build. False for dev/Expo Go builds and apps without
   * expo-updates — every method degrades to a no-op then.
   */
  static get isAvailable() {
    const u = getUpdates();
    return Boolean(u && u.isEnabled);
  }

  /**
   * Snapshot of the currently running update, or `null` when running the
   * embedded bundle. `emergencyLaunch`/`emergencyLaunchReason` describe a
   * startup crash recovered by expo-updates.
   */
  static get currentUpdate() {
    const u = getUpdates();
    if (!u || !u.isEnabled) return null;
    return {
      updateId: u.isEmbeddedLaunch ? null : u.updateId,
      channel: u.channel,
      runtimeVersion: u.runtimeVersion,
      isEmbeddedLaunch: u.isEmbeddedLaunch,
      emergencyLaunch: u.isEmergencyLaunch,
      emergencyLaunchReason: u.emergencyLaunchReason,
      createdAt: u.createdAt
    };
  }

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
  static enableTelemetry(options) {
    const Updates = getUpdates();
    if (!Updates || !Updates.isEnabled || this.telemetryStarted) return;
    this.telemetryStarted = true;
    if (options) this.configure(options);
    const config = this.telemetryConfig ?? this.configFromAirBuild();
    if (!config) {
      throw new Error('AirBuildCodePush.enableTelemetry: call AirBuild.configure() or AirBuildCodePush.configure() first');
    }
    this.telemetryConfig = config;
    this.report(config.eventsUrl).catch(() => {});
    this.trackPendingDownload();
  }

  /**
   * Manually checks the update server. Thin passthrough to
   * `Updates.checkForUpdateAsync` — resolves to a small result object
   * (`null` when expo-updates is unavailable).
   */
  static async checkForUpdate() {
    const u = getUpdates();
    if (!u || !u.isEnabled) return null;
    const r = await u.checkForUpdateAsync();
    return {
      isAvailable: r.isAvailable,
      isRollBackToEmbedded: r.isRollBackToEmbedded,
      reason: r.reason
    };
  }

  /**
   * Downloads an available update without launching it — it applies on the
   * next cold start (or call `reload()`). Passthrough to
   * `Updates.fetchUpdateAsync`.
   */
  static async fetchUpdate() {
    const u = getUpdates();
    if (!u || !u.isEnabled) return null;
    return u.fetchUpdateAsync();
  }

  /**
   * Reloads the app — a downloaded/pending update takes over.
   * Passthrough to `Updates.reloadAsync`.
   */
  static async reload() {
    const u = getUpdates();
    if (!u || !u.isEnabled) return;
    return u.reloadAsync();
  }
  static configFromAirBuild() {
    const c = AirBuild.getConfiguration();
    if (!c) return null;
    return {
      eventsUrl: `${c.baseUrl}/api/codepush/react-native/events?key=${encodeURIComponent(c.distributionKey)}`
    };
  }
  static async post(eventsUrl, payload) {
    try {
      await fetch(eventsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch {
      // Telemetry must never affect app behavior.
    }
  }

  /**
   * Persists the id of a just-downloaded update so an emergency launch on
   * the next boot can attribute the crash to it.
   */
  static trackPendingDownload() {
    const Updates = getUpdates();
    if (!Updates) return;
    try {
      Updates.addUpdatesStateChangeListener(event => {
        try {
          const manifest = event?.context?.downloadedManifest;
          if (manifest?.id) {
            Updates.setExtraParamAsync(PENDING_PARAM, manifest.id).catch(() => {});
          }
        } catch {}
      });
    } catch {}
  }
  static async report(eventsUrl) {
    const Updates = getUpdates();
    if (!Updates || !Updates.isEnabled) return;
    try {
      let params = {};
      try {
        params = (await Updates.getExtraParamsAsync()) || {};
      } catch {}
      let deviceId = params[DEVICE_PARAM];
      if (!deviceId) {
        deviceId = uuid();
        Updates.setExtraParamAsync(DEVICE_PARAM, deviceId).catch(() => {});
      }
      const pending = params[PENDING_PARAM] || null;
      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : undefined;
      if (Updates.isEmergencyLaunch) {
        await this.post(eventsUrl, {
          event: 'emergency_launch',
          deviceId,
          updateId: pending || undefined,
          reason: Updates.emergencyLaunchReason || undefined,
          platform
        });
        if (pending) Updates.setExtraParamAsync(PENDING_PARAM, null).catch(() => {});
        return;
      }
      if (pending && pending !== Updates.updateId) {
        // A downloaded update was skipped entirely — we booted into a
        // different bundle. Either it crashed so early the process died
        // before error recovery could flag isEmergencyLaunch (the common
        // cold-boot-after-crash path, especially on iOS), or the channel
        // rolled back. A fresh check tells them apart.
        try {
          const check = await Updates.checkForUpdateAsync();
          if (check?.isRollBackToEmbedded) {
            Updates.setExtraParamAsync(PENDING_PARAM, null).catch(() => {});
          } else {
            await this.post(eventsUrl, {
              event: 'emergency_launch',
              deviceId,
              updateId: pending,
              reason: Updates.emergencyLaunchReason || 'pending_update_never_launched',
              platform
            });
            Updates.setExtraParamAsync(PENDING_PARAM, null).catch(() => {});
          }
        } catch {
          // Check failed (e.g. offline) — keep pending for next boot.
        }
      }
      if (!Updates.isEmbeddedLaunch && Updates.updateId) {
        const runningUpdateId = Updates.updateId;
        setTimeout(() => {
          this.post(eventsUrl, {
            event: 'launch_success',
            deviceId,
            updateId: runningUpdateId,
            platform
          });
          if (pending === runningUpdateId) {
            Updates.setExtraParamAsync(PENDING_PARAM, null).catch(() => {});
          }
        }, SETTLE_DELAY_MS);
        return;
      }
    } catch {}
  }
}
export default AirBuildCodePush;
//# sourceMappingURL=CodePush.js.map