# AirBuild React Native SDK

[![npm version](https://img.shields.io/npm/v/@airbuild/react-native.svg)](https://www.npmjs.com/package/@airbuild/react-native)

AirBuild SDK for React Native. Two modules:

- **Distribution** (`AirBuild`) — checks for new binary builds (APK/IPA) uploaded to AirBuild and prompts the tester to install the latest version, showing a default dialog and handling the full install flow.
- **CodePush** (`AirBuildCodePush`) — OTA JS-bundle updates powered by `expo-updates`, plus launch-outcome telemetry so per-update install stats and crash-rate auto-pause work.

## Features

- Check for app updates from AirBuild distribution links
- Default in-app update dialog with version + release notes
- Download and install APK updates (Android) via system installer
- Open install URL in Safari (iOS) for ad-hoc distribution
- Analytics event reporting (prompt shown, accepted, declined, download, install)
- CodePush: launch-success / emergency-launch telemetry feeding crash-rate auto-pause, update state inspection, manual check/fetch/reload
- `expo-updates` is an optional peer — apps that only need binary distribution don't have to install it

## Installation

```sh
npm install @airbuild/react-native
```

or

```sh
yarn add @airbuild/react-native
```

### iOS Setup

If using autolinking (React Native 0.60+), run:

```sh
cd ios && pod install && cd ..
```

No additional configuration is needed on iOS. The native module is minimal -- the SDK uses `Linking.openURL` to open the install page in Safari, since iOS does not allow sideloading of IPA files.

### Android Setup

The SDK requires the following permissions, which are automatically merged from the library's AndroidManifest.xml:

- `INTERNET` -- to download APK updates
- `REQUEST_INSTALL_PACKAGES` -- to trigger the system package installer

If your app targets Android 7+ (API 24+), the SDK uses a `FileProvider` to share the downloaded APK with the system installer. The FileProvider is automatically configured by the library. No manual setup is required.

If you are **not** using autolinking, register the package in your `MainApplication.java` or `MainApplication.kt`:

```kotlin
import dev.airbuild.reactnative.AirBuildPackage

override fun getPackages(): List<ReactPackage> {
  return PackageList(this).packages.apply {
    add(AirBuildPackage())
  }
}
```

## Configuration

Configure the SDK once, typically at app launch:

```ts
import { AirBuild } from '@airbuild/react-native';

AirBuild.configure({
  distributionKey: 'dk_a1b2c3d4e5f6',  // public, per-app, non-secret
  // baseUrl: 'https://airbuild.dev',  // optional, defaults to airbuild.dev
});
```

| Option             | Type     | Required | Default                | Description                                            |
| ------------------ | -------- | -------- | ---------------------- | ------------------------------------------------------ |
| `distributionKey`  | string   | Yes      | -                      | Your app's distribution key (starts with `dk_`)        |
| `baseUrl`          | string   | No       | `https://airbuild.dev` | Base URL of the AirBuild server (for self-hosted)      |

## Usage

### Basic Usage

Call `checkForUpdates()` to check for new builds and show the default update dialog:

```ts
import { AirBuild } from '@airbuild/react-native';

// Configure once at app launch
AirBuild.configure({
  distributionKey: 'dk_a1b2c3d4e5f6',
});

// Check for updates (e.g. on app launch or button tap)
await AirBuild.checkForUpdates({
  currentVersion: '1.0.0',
});
```

The SDK will:
1. Call the AirBuild check-update endpoint
2. If an update is available, show an `Alert.alert` dialog with the version, release notes, and file size
3. On "Update" tap:
   - **Android**: download the APK via the native module and trigger the system installer
   - **iOS**: open the install URL in Safari via `Linking.openURL`
4. Report analytics events (prompt shown, accepted/declined, download, install)

### Advanced Usage

You can customize the behavior with callbacks:

```ts
await AirBuild.checkForUpdates({
  currentVersion: '1.0.0',

  // Called when an update is available, before the default dialog is shown.
  // Return false to suppress the default dialog and handle the update yourself.
  onUpdateAvailable: (info) => {
    console.log(`Update available: v${info.latestVersion}`);
    console.log(`Release notes: ${info.releaseNotes}`);
    console.log(`Download URL: ${info.downloadUrl}`);

    // Return false to suppress the default dialog
    // return false;
  },

  // Called when no update is available
  onNoUpdate: () => {
    console.log('You are on the latest version.');
  },

  // Called if the update check request fails
  onError: (error) => {
    console.error('AirBuild update check failed:', error);
  },
});
```

### Custom Update UI

If you want to build your own update UI instead of using the default `Alert.alert` dialog, return `false` from `onUpdateAvailable`:

```ts
await AirBuild.checkForUpdates({
  currentVersion: '1.0.0',
  onUpdateAvailable: (info) => {
    // Show your custom UI here
    setUpdateInfo(info);
    setShowCustomDialog(true);

    // Suppress the default dialog
    return false;
  },
});
```

## API Reference

### `AirBuild.configure(options)`

Configures the SDK. Must be called once before using other methods.

| Parameter | Type                | Description            |
| --------- | ------------------- | ---------------------- |
| `options` | `ConfigureOptions`  | Configuration options  |

**Throws:** `Error` if `distributionKey` is missing or invalid.

### `AirBuild.checkForUpdates(options)`

Checks for updates and shows the default dialog if available.

| Parameter | Type                    | Description           |
| --------- | ----------------------- | --------------------- |
| `options` | `CheckForUpdatesOptions`| Check options         |

**Returns:** `Promise<void>`

#### `CheckForUpdatesOptions`

| Option              | Type                                      | Required | Description                                              |
| ------------------- | ----------------------------------------- | -------- | -------------------------------------------------------- |
| `currentVersion`    | string                                    | Yes      | Current app version (e.g. `"1.0.0"`)                     |
| `onUpdateAvailable` | `(info: UpdateInfo) => boolean \| void`   | No       | Callback when update is available. Return `false` to suppress default dialog |
| `onNoUpdate`        | `() => void`                              | No       | Callback when no update is available                     |
| `onError`           | `(error: Error) => void`                  | No       | Callback on request failure                              |

#### `UpdateInfo`

| Field                | Type      | Description                                          |
| -------------------- | --------- | ---------------------------------------------------- |
| `hasUpdate`          | boolean   | Always `true` when this object is returned           |
| `latestVersion`      | string    | Latest version string (e.g. `"1.2.0"`)               |
| `latestBuildNumber`  | string?   | Build number of the latest build                     |
| `buildId`            | string    | Unique build identifier                              |
| `releaseNotes`       | string?   | Release notes for the build                          |
| `downloadUrl`        | string    | URL for downloading the binary (APK/IPA)             |
| `installUrl`         | string    | URL for the web install page                         |
| `fileSizeBytes`      | number    | Size of the build file in bytes                      |
| `iconUrl`            | string?   | URL of the app icon                                  |
| `minOsVersion`       | string?   | Minimum OS version required                          |
| `isPasswordProtected`| boolean   | Whether the build is password protected              |
| `createdAt`          | string    | ISO timestamp of when the build was created          |

## Analytics Events

The SDK reports the following analytics events to the AirBuild server:

| Event                | When it is reported                              |
| -------------------- | ------------------------------------------------ |
| `update_prompt_shown`| When the update dialog is shown to the tester    |
| `update_accepted`    | When the tester taps "Update"                    |
| `update_declined`    | When the tester taps "Later" or dismisses        |
| `download_started`   | When the APK download begins (Android)           |
| `install_started`    | When the install Intent is launched (Android) or install URL is opened (iOS) |

Events are logged server-side and visible in the AirBuild dashboard alongside web install analytics.

## Platform Behavior

### Android

- The SDK downloads the APK to the app's cache directory
- Triggers the system package installer via `Intent.ACTION_VIEW` with MIME type `application/vnd.android.package-archive`
- Uses `FileProvider` for Android 7+ (API 24+) to share the APK with the installer
- Requires `REQUEST_INSTALL_PACKAGES` permission (auto-merged from the library)

### iOS

- iOS does not allow sideloading of IPA files
- The SDK opens the install URL in Safari via `Linking.openURL`
- The tester installs the build through the standard ad-hoc/OTA distribution flow

## CodePush (OTA JS updates)

`AirBuildCodePush` adds CodePush support on top of `expo-updates` — the
update runtime your app gets from `airbuild codepush react-native
init`/`install`. Two things it adds on top of expo-updates itself:

1. **Outcome telemetry** — reports `launch_success` / `emergency_launch`
   to AirBuild, powering per-update install stats and crash-rate
   auto-pause on the dashboard.
2. **Convenience API** — update state inspection and manual
   check/fetch/reload without touching expo-updates directly.

```ts
import { AirBuild, AirBuildCodePush } from '@airbuild/react-native';

AirBuild.configure({ distributionKey: 'dk_a1b2c3d4e5f6' });

// Call once, as early as possible in app startup (top of App.tsx entry):
AirBuildCodePush.enableTelemetry();
```

If your app doesn't call `AirBuild.configure()` (CodePush only, no binary
distribution), configure it standalone instead:

```ts
AirBuildCodePush.configure({ distributionKey: 'dk_a1b2c3d4e5f6' });
AirBuildCodePush.enableTelemetry();
```

### How telemetry works

- A stable per-install device id is persisted via
  `Updates.setExtraParamAsync('airbuild-device-id', …)` — it rides on every
  manifest check, so launch outcomes join to rollout checkins server-side.
- `emergency_launch` means expo-updates recovered from a startup crash of
  a newly launched update. The crashed update is attributed via the
  update id persisted when its download completed.
- Everything is fire-and-forget: telemetry failures never affect the app.

### `AirBuildCodePush` API

| Member | Description |
| ------ | ----------- |
| `isAvailable` | `true` when expo-updates is installed and enabled in this build |
| `currentUpdate` | `{ updateId, channel, runtimeVersion, isEmbeddedLaunch, emergencyLaunch, emergencyLaunchReason, createdAt }` — `updateId` is `null` on embedded bundle |
| `enableTelemetry(options?)` | Starts outcome reporting (idempotent) |
| `checkForUpdate()` | Manual check — `{ isAvailable, isRollBackToEmbedded }` |
| `fetchUpdate()` | Download an available update (applies on next launch) |
| `reload()` | Restart now so a pending update takes over |

## Example

See [`example/App.tsx`](./example/App.tsx) for a complete example app.

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AirBuild } from '@airbuild/react-native';

export default function App() {
  useEffect(() => {
    AirBuild.configure({
      distributionKey: 'dk_a1b2c3d4e5f6',
    });
  }, []);

  const checkUpdates = async () => {
    await AirBuild.checkForUpdates({
      currentVersion: '1.0.0',
    });
  };

  return (
    <View>
      <TouchableOpacity onPress={checkUpdates}>
        <Text>Check for Updates</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Development

### Building

```sh
yarn install
yarn build
```

### Type Checking

```sh
yarn typecheck
```

## License

MIT
