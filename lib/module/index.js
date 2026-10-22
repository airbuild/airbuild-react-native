/**
 * AirBuild Distribution SDK for React Native
 *
 * Main entry point. Exports the AirBuild class and related types.
 *
 * Usage:
 *   import { AirBuild } from '@airbuild/react-native';
 *
 *   AirBuild.configure({ distributionKey: 'dk_a1b2c3d4e5f6' });
 *   await AirBuild.checkForUpdates({ currentVersion: '1.0.0' });
 */
export { AirBuild } from './AirBuild';
export { default } from './AirBuild';
export { AirBuildCodePush } from './CodePush';
export { getNativeAirBuild, getNativeAirBuildOrNull } from './NativeAirBuild';
//# sourceMappingURL=index.js.map