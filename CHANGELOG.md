# Changelog

## 0.2.0

### Added
- New `AirBuildCodePush` module for OTA JS-bundle updates via
  `expo-updates`:
  - `enableTelemetry()` — reports `launch_success` / `emergency_launch`
    outcomes to AirBuild, powering per-update install stats and
    crash-rate auto-pause. Persists a per-install device id via
    `Updates.setExtraParamAsync` and attributes startup crashes through a
    pending-update marker tracked via the updates state-change listener.
    Reuses `AirBuild.configure()`'s distribution key + base URL, or
    accepts its own `configure()`.
  - `isAvailable`, `currentUpdate`, `checkForUpdate()`, `fetchUpdate()`,
    `reload()` — a thin convenience surface over expo-updates state.
- `expo-updates` declared as an *optional* peer dependency — the lazy
  `require` inside a try/catch keeps the bundle working for apps that
  only use binary distribution.
- `AirBuild.getConfiguration()` — public read access to the configured
  distribution key + base URL, so sibling modules share one
  `configure()` call.

## 0.1.1 - 2026-10-02

### Fixed
- `package.json` `types` field pointed at `lib/typescript/src/index.d.ts`
  but `react-native-builder-bob` emits `lib/typescript/index.d.ts` — the
  published package's type declarations would not have resolved.
- Removed the deprecated `@types/react-native` dev dependency (a stub
  that no longer ships types and broke `bob build`); added `react-native`
  itself as a dev dependency so its bundled types are used.

### Added
- `CheckForUpdatesOptions.currentBuildNumber` — sent as `?build=` so the
  server can distinguish same-version builds (e.g. `1.0.0+1` vs
  `1.0.0+2`). Pass Android `versionCode` / iOS `CFBundleVersion`.
- Jest + ts-jest test setup with a `react-native` mock, covering
  configuration validation, base-URL normalization, missing-config and
  missing-version guards, update callbacks, error propagation, and the
  default update dialog (11 tests).
- GitHub Actions CI workflow (`npm run typecheck`, `npm test`,
  `npm run build`).

## 0.1.0 - 2026-09-02

### Added
- Initial release of the AirBuild React Native Distribution SDK.
- `AirBuild.configure({ distributionKey, baseUrl? })` for one-time setup.
- `AirBuild.checkForUpdates({ currentVersion })` to check for new builds.
- Default update dialog via Alert.alert with version and release notes.
- Android: Native module downloads APK and triggers system installer via FileProvider + Intent.
- iOS: Opens install URL via Linking.openURL.
- Analytics event reporting (prompt shown, accepted, declined, download started, install started).
- Example app in `example/`.
- TypeScript types exported for all SDK interfaces.
