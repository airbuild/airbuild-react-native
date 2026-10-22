import { AirBuild } from '../AirBuild';
import { AirBuildCodePush } from '../CodePush';

// expo-updates isn't installed in the SDK workspace (optional peer), so
// the lazy require inside CodePush.ts resolves through this virtual mock.
const mockUpdates = {
  isEnabled: true,
  updateId: 'upd-1' as string | null,
  channel: 'production' as string | null,
  runtimeVersion: '1.0.0' as string | null,
  isEmbeddedLaunch: false,
  isEmergencyLaunch: false,
  emergencyLaunchReason: null as string | null,
  createdAt: new Date('2024-01-01T00:00:00Z') as Date | null,
  getExtraParamsAsync: jest.fn(async () => ({})),
  setExtraParamAsync: jest.fn(async () => {}),
  addUpdatesStateChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  checkForUpdateAsync: jest.fn(async () => ({
    isAvailable: true,
    isRollBackToEmbedded: false,
  })),
  fetchUpdateAsync: jest.fn(async () => ({ isNew: true })),
  reloadAsync: jest.fn(async () => {}),
};

jest.mock(
  'expo-updates',
  () => mockUpdates,
  { virtual: true }
);

function reset() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AirBuild as any).config = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AirBuildCodePush as any).telemetryStarted = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (AirBuildCodePush as any).telemetryConfig = null;
  // Restore mutable mock state mutated by individual tests.
  mockUpdates.isEnabled = true;
  mockUpdates.updateId = 'upd-1';
  mockUpdates.isEmbeddedLaunch = false;
  mockUpdates.isEmergencyLaunch = false;
  mockUpdates.emergencyLaunchReason = null;
  jest.restoreAllMocks();
}

const fetchMock = jest.fn(
  async (_url: string, _init?: { body?: string }) => ({ ok: true, status: 204 })
);

describe('AirBuildCodePush', () => {
  beforeEach(() => {
    reset();
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = fetchMock;
    fetchMock.mockClear();
  });

  it('isAvailable reflects expo-updates state', () => {
    expect(AirBuildCodePush.isAvailable).toBe(true);
  });

  it('currentUpdate reports running update', () => {
    const info = AirBuildCodePush.currentUpdate;
    expect(info).not.toBeNull();
    expect(info?.updateId).toBe('upd-1');
    expect(info?.channel).toBe('production');
    expect(info?.isEmbeddedLaunch).toBe(false);
  });

  it('enableTelemetry throws without any configuration', () => {
    expect(() => AirBuildCodePush.enableTelemetry()).toThrow(/configure/);
  });

  it('enableTelemetry derives events URL from AirBuild.configure', async () => {
    jest.useFakeTimers();
    AirBuild.configure({ distributionKey: 'dk_test123', baseUrl: 'https://airbuild.test' });
    AirBuildCodePush.enableTelemetry();
    // launch_success only fires after the settle window
    await jest.advanceTimersByTimeAsync(6000);
    jest.useRealTimers();
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    expect(String(url)).toContain('/api/codepush/react-native/events?key=dk_test123');
    expect(String(url)).toContain('https://airbuild.test');
    const body = JSON.parse(init.body);
    expect(body.event).toBe('launch_success');
    expect(body.updateId).toBe('upd-1');
    expect(typeof body.deviceId).toBe('string');
  });

  it('does not report launch_success inside the settle window', async () => {
    jest.useFakeTimers();
    AirBuildCodePush.enableTelemetry({
      distributionKey: 'dk_test123',
      baseUrl: 'https://airbuild.test',
    });
    await jest.advanceTimersByTimeAsync(1000);
    expect(fetchMock).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(6000);
    expect(fetchMock).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('reports emergency_launch with pending update id', async () => {
    mockUpdates.isEmergencyLaunch = true;
    mockUpdates.isEmbeddedLaunch = true;
    mockUpdates.updateId = null;
    mockUpdates.getExtraParamsAsync.mockResolvedValueOnce({
      'airbuild-device-id': 'dev-1',
      'airbuild-pending-update': 'crashed-upd',
    });
    AirBuildCodePush.enableTelemetry({
      distributionKey: 'dk_test123',
      baseUrl: 'https://airbuild.test',
    });
    await new Promise((r) => setImmediate(r));
    const body = JSON.parse(String((fetchMock.mock.calls[0][1] as unknown as { body: string }).body));
    expect(body.event).toBe('emergency_launch');
    expect(body.updateId).toBe('crashed-upd');
    expect(body.deviceId).toBe('dev-1');
    // pending marker cleared after reporting
    expect(mockUpdates.setExtraParamAsync).toHaveBeenCalledWith(
      'airbuild-pending-update',
      null
    );
  });

  it('reports emergency_launch when a pending update never launched', async () => {
    // Cold boot after the pending update crashed hard enough that error
    // recovery couldn't flag isEmergencyLaunch — the boot fell back to
    // embedded while the pending marker was still set.
    mockUpdates.isEmbeddedLaunch = true;
    mockUpdates.updateId = null;
    mockUpdates.checkForUpdateAsync.mockResolvedValueOnce({
      isAvailable: false,
      isRollBackToEmbedded: false,
    });
    mockUpdates.getExtraParamsAsync.mockResolvedValueOnce({
      'airbuild-device-id': 'dev-1',
      'airbuild-pending-update': 'crashed-before-launch',
    });
    AirBuildCodePush.enableTelemetry({
      distributionKey: 'dk_test123',
      baseUrl: 'https://airbuild.test',
    });
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(fetchMock).toHaveBeenCalled();
    const body = JSON.parse(
      String((fetchMock.mock.calls[0][1] as unknown as { body: string }).body)
    );
    expect(body.event).toBe('emergency_launch');
    expect(body.updateId).toBe('crashed-before-launch');
    expect(mockUpdates.setExtraParamAsync).toHaveBeenCalledWith(
      'airbuild-pending-update',
      null
    );
  });

  it('does not report when a skipped pending update was rolled back', async () => {
    mockUpdates.isEmbeddedLaunch = true;
    mockUpdates.updateId = null;
    mockUpdates.checkForUpdateAsync.mockResolvedValueOnce({
      isAvailable: false,
      isRollBackToEmbedded: true,
    });
    mockUpdates.getExtraParamsAsync.mockResolvedValueOnce({
      'airbuild-device-id': 'dev-1',
      'airbuild-pending-update': 'rolled-back-upd',
    });
    AirBuildCodePush.enableTelemetry({
      distributionKey: 'dk_test123',
      baseUrl: 'https://airbuild.test',
    });
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockUpdates.setExtraParamAsync).toHaveBeenCalledWith(
      'airbuild-pending-update',
      null
    );
  });

  it('does not report on plain embedded launch', async () => {
    mockUpdates.isEmbeddedLaunch = true;
    mockUpdates.updateId = null;
    AirBuildCodePush.enableTelemetry({
      distributionKey: 'dk_test123',
      baseUrl: 'https://airbuild.test',
    });
    await new Promise((r) => setImmediate(r));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checkForUpdate passthrough maps expo-updates result', async () => {
    const r = await AirBuildCodePush.checkForUpdate();
    expect(r?.isAvailable).toBe(true);
  });

  it('registers a state-change listener to track pending downloads', () => {
    AirBuild.configure({ distributionKey: 'dk_test123' });
    AirBuildCodePush.enableTelemetry();
    expect(mockUpdates.addUpdatesStateChangeListener).toHaveBeenCalled();
  });
});
