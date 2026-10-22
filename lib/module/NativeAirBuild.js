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

/**
 * The native AirBuild module, if available on the current platform.
 * Falls back to a no-op proxy on platforms where the native module is not linked
 * (e.g. during development without native code, or on web).
 */
const NativeAirBuildModule = NativeModules.AirBuild ?? null;

/**
 * Returns the native AirBuild module, or throws if it is not available.
 * Used internally by the SDK to access native functionality.
 */
export function getNativeAirBuild() {
  if (!NativeAirBuildModule) {
    throw new Error('AirBuild native module is not available. ' + 'Make sure you have linked the native module correctly. ' + `Current platform: ${Platform.OS}. ` + 'See the README for installation instructions.');
  }
  return NativeAirBuildModule;
}

/**
 * Returns the native AirBuild module or null if not available.
 * Use this for optional native calls where you want to handle absence gracefully.
 */
export function getNativeAirBuildOrNull() {
  return NativeAirBuildModule;
}
export default NativeAirBuildModule;
//# sourceMappingURL=NativeAirBuild.js.map