/**
 * AirBuild Distribution SDK - Native Module Spec
 *
 * TurboModule-compatible spec for the native AirBuild module.
 * On Android, the native module handles APK download and install via Intent.
 * On iOS, the native module is minimal (most work is done via Linking in JS),
 * but we provide a stub for interface parity.
 */
import { NativeModules, Platform } from 'react-native';

/**
 * Contract for the native AirBuild module.
 * Implemented natively on Android (Kotlin) and iOS (Objective-C).
 */
export interface NativeAirBuildModuleInterface {
  /**
   * Downloads an APK from the given URL to the app's cache directory,
   * then triggers the system package installer via an Intent.
   *
   * Android only.
   *
   * @param downloadUrl - The URL of the APK to download.
   * @returns A promise that resolves when the install Intent is launched,
   *          or rejects if the download or install fails.
   */
  downloadAndInstallApk(downloadUrl: string): Promise<void>;

  /**
   * Opens a URL in the system browser (Safari on iOS).
   * On iOS this is a convenience wrapper; the JS layer typically uses
   * Linking.openURL directly, but this is provided for parity.
   *
   * @param url - The URL to open.
   * @returns A promise that resolves when the URL is opened.
   */
  openUrl(url: string): Promise<void>;
}

/**
 * The native AirBuild module, if available on the current platform.
 * Falls back to a no-op proxy on platforms where the native module is not linked
 * (e.g. during development without native code, or on web).
 */
const NativeAirBuildModule: NativeAirBuildModuleInterface | null =
  NativeModules.AirBuild ?? null;

/**
 * Returns the native AirBuild module, or throws if it is not available.
 * Used internally by the SDK to access native functionality.
 */
export function getNativeAirBuild(): NativeAirBuildModuleInterface {
  if (!NativeAirBuildModule) {
    throw new Error(
      'AirBuild native module is not available. ' +
        'Make sure you have linked the native module correctly. ' +
        `Current platform: ${Platform.OS}. ` +
        'See the README for installation instructions.'
    );
  }
  return NativeAirBuildModule;
}

/**
 * Returns the native AirBuild module or null if not available.
 * Use this for optional native calls where you want to handle absence gracefully.
 */
export function getNativeAirBuildOrNull(): NativeAirBuildModuleInterface | null {
  return NativeAirBuildModule;
}

export default NativeAirBuildModule;
