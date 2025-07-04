import { DeviceManager } from './DeviceManager';
import { BaseSerialConnection } from '../core/SerialConnection';
import { DeviceInfo } from '../types';

// Test implementation with real device simulation
class TestSerialConnection extends BaseSerialConnection {
  private responseBuffer: Buffer[] = [];
  private connected = false;

  constructor() {
    super('/dev/test-device', { baudRate: 115200 });
  }

  async connect(): Promise<void> {
    this.connected = true;
    this.onConnected();
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.onDisconnected();
  }

  protected async writeRaw(data: Buffer): Promise<void> {
    // Simulate device responses
    if (data.toString().includes('print("device_info")')) {
      this.responseBuffer.push(Buffer.from('M5Stack:2.0.0:ESP32-TEST:4194304\n'));
    }
  }

  isOpen(): boolean {
    return this.connected;
  }

  get bytesAvailable(): number {
    return this.responseBuffer.length > 0 ? this.responseBuffer[0].length : 0;
  }

  async read(): Promise<Buffer> {
    return this.responseBuffer.shift() || Buffer.alloc(0);
  }
}

describe('DeviceManager', () => {
  let deviceManager: DeviceManager;
  let testConnection: TestSerialConnection;

  beforeEach(() => {
    testConnection = new TestSerialConnection();
    deviceManager = new DeviceManager(testConnection);
  });

  describe('basic functionality', () => {
    it('should be instantiated', () => {
      expect(deviceManager).toBeDefined();
    });

    it('should connect to device', async () => {
      await testConnection.connect();
      expect(testConnection.isOpen()).toBe(true);
    });
  });
});
