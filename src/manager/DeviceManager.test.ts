import { DeviceManager } from './DeviceManager';
import { BaseSerialConnection } from '../core/SerialConnection';
import { DeviceInfo } from '../types';

// Mock the base connection
class MockSerialConnection extends BaseSerialConnection {
  constructor() {
    super('/dev/mock', { baudRate: 115200 });
  }

  connect = jest.fn().mockResolvedValue(undefined);
  disconnect = jest.fn().mockResolvedValue(undefined);
  write = jest.fn().mockResolvedValue(undefined);
  writeRaw = jest.fn().mockResolvedValue(undefined);
  read = jest.fn().mockResolvedValue(Buffer.alloc(0));
  isOpen = jest.fn().mockReturnValue(true);
  sendCommand = jest.fn();
}

describe('DeviceManager', () => {
  let deviceManager: DeviceManager;
  let mockConnection: MockSerialConnection;

  beforeEach(() => {
    mockConnection = new MockSerialConnection();
    deviceManager = new DeviceManager(mockConnection);
  });

  describe('basic functionality', () => {
    it('should be instantiated', () => {
      expect(deviceManager).toBeDefined();
    });
  });
});