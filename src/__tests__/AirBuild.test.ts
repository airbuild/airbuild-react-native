import { Alert, Linking } from 'react-native';
import type { AlertButton } from 'react-native';
import { AirBuild } from '../AirBuild';
import type { UpdateInfo } from '../types';

/**
 * Resets AirBuild's internal static config between tests. AirBuild has no
 * public reset API (by design — `configure()` is meant to be called once at
 * app startup), so tests reach into the private static field. This is a
 * test-only concession; application code should never do this.
 */
function resetConfig() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AirBuild as any).config = null;
}

const fullUpdateInfo: UpdateInfo = {
  hasUpdate: true,
  latestVersion: '1.2.0',
  buildId: 'b_123',
  releaseNotes: 'Bug fixes',
  downloadUrl: 'https://airbuild.dev/api/sdk/download/abc',
  installUrl: 'https://airbuild.dev/i/abc',
  fileSizeBytes: 10 * 1024 * 1024,
  isPasswordProtected: false,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('AirBuild.configure', () => {
  afterEach(() => {
    resetConfig();
    jest.restoreAllMocks();
  });

  it('throws if distributionKey is missing', () => {
    expect(() => AirBuild.configure({ distributionKey: '' })).toThrow(
      /distributionKey is required/
    );
  });

  it('throws if distributionKey does not start with dk_', () => {
    expect(() =>
      AirBuild.configure({ distributionKey: 'not-a-valid-key' })
    ).toThrow(/must start with "dk_"/);
  });

  it('strips trailing slashes from a custom baseUrl', async () => {
    AirBuild.configure({
      distributionKey: 'dk_test',
      baseUrl: 'https://staging.airbuild.dev/',
    });

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ hasUpdate: false }), { status: 200 })
      );

    await AirBuild.checkForUpdates({ currentVersion: '1.0.0' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/staging\.airbuild\.dev\/api\/sdk\/check-update\?/),
      expect.anything()
    );
  });
});

describe('AirBuild.checkForUpdates', () => {
  beforeEach(() => {
    AirBuild.configure({ distributionKey: 'dk_test' });
  });

  afterEach(() => {
    resetConfig();
    jest.restoreAllMocks();
  });

  it('throws if called before configure()', async () => {
    resetConfig();
    await expect(
      AirBuild.checkForUpdates({ currentVersion: '1.0.0' })
    ).rejects.toThrow(/not configured/);
  });

  it('throws if currentVersion is missing', async () => {
    await expect(
      AirBuild.checkForUpdates({ currentVersion: '' })
    ).rejects.toThrow(/currentVersion is required/);
  });

  it('calls onNoUpdate when the server reports no update', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ hasUpdate: false }), { status: 200 })
      );
    const onNoUpdate = jest.fn();
    const onUpdateAvailable = jest.fn();

    await AirBuild.checkForUpdates({
      currentVersion: '1.0.0',
      onNoUpdate,
      onUpdateAvailable,
    });

    expect(onNoUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdateAvailable).not.toHaveBeenCalled();
  });

  it('calls onError (not throw) when the request fails and onError is set', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('', { status: 500 })
    );
    const onError = jest.fn();

    await AirBuild.checkForUpdates({ currentVersion: '1.0.0', onError });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
  });

  it('re-throws when the request fails and no onError is set', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('', { status: 500 })
    );

    await expect(
      AirBuild.checkForUpdates({ currentVersion: '1.0.0' })
    ).rejects.toThrow(/status 500/);
  });

  it('suppresses the default dialog when onUpdateAvailable returns false', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(fullUpdateInfo), { status: 200 }));

    await AirBuild.checkForUpdates({
      currentVersion: '1.0.0',
      onUpdateAvailable: () => false,
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows the default dialog with version and release notes', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(fullUpdateInfo), { status: 200 }));
    // Simulate the user tapping "Later" so checkForUpdates' returned promise
    // resolves — we only care about the args Alert.alert was called with.
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title: string, _message?: string, buttons?: AlertButton[]) => {
        buttons?.find((b) => b.text === 'Later')?.onPress?.();
      });

    await AirBuild.checkForUpdates({ currentVersion: '1.0.0' });

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message] = alertSpy.mock.calls[0]!;
    expect(title).toContain('1.2.0');
    expect(message).toContain('Bug fixes');
    expect(message).toContain('MB');
  });

  it('opens the install URL via Linking on iOS when "Update" is tapped', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(fullUpdateInfo), { status: 200 }));
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    // Capture the buttons passed to Alert.alert and simulate an "Update" tap.
    jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title: string, _message?: string, buttons?: AlertButton[]) => {
        const updateButton = buttons?.find((b) => b.text === 'Update');
        updateButton?.onPress?.();
      });

    await AirBuild.checkForUpdates({ currentVersion: '1.0.0' });

    expect(openURLSpy).toHaveBeenCalledWith('https://airbuild.dev/i/abc');
  });
});
