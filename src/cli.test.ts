import { M5StackCLI } from './cli';
import { REPLAdapter } from './adapters/REPLAdapter';
import { M5StackClient } from './index';

// Mock the dependencies
jest.mock('./adapters/REPLAdapter');
jest.mock('./index');

describe('M5StackCLI', () => {
  let cli: M5StackCLI;
  let mockAdapter: jest.Mocked<REPLAdapter>;
  let mockClient: jest.Mocked<M5StackClient>;

  beforeEach(() => {
    mockAdapter = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      initialize: jest.fn(),
      executeCode: jest.fn(),
      getDeviceInfo: jest.fn(),
      listDirectory: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      removeFile: jest.fn(),
    } as any;

    mockClient = {
      listPorts: jest.fn(),
    } as any;

    // Mock REPLAdapter constructor
    (REPLAdapter as jest.MockedClass<typeof REPLAdapter>).mockImplementation(() => mockAdapter);
    
    // Mock M5StackClient constructor
    (M5StackClient as jest.MockedClass<typeof M5StackClient>).mockImplementation(() => mockClient);

    cli = new M5StackCLI();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('connect', () => {
    it('should perform comprehensive connection test', async () => {
      // Mock successful responses
      mockAdapter.connect.mockResolvedValue(undefined);
      mockAdapter.initialize.mockResolvedValue(undefined);
      mockAdapter.disconnect.mockResolvedValue(undefined);

      mockAdapter.executeCode.mockResolvedValue({
        output: 'Connection test successful',
        exitCode: 0,
        executionTime: 100,
        timestamp: new Date(),
      });

      mockAdapter.getDeviceInfo.mockResolvedValue({
        platform: 'M5Stack',
        version: '2.0.0',
        chipId: 'ESP32-ABC123',
        flashSize: 4194304,
        ramSize: 327680,
        macAddress: 'AA:BB:CC:DD:EE:FF',
      });

      mockAdapter.listDirectory.mockResolvedValue([
        { name: 'main.py', type: 'file', path: '/main.py' },
        { name: 'lib', type: 'directory', path: '/lib' },
      ]);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await cli.connect('/dev/ttyUSB0');

      expect(mockAdapter.connect).toHaveBeenCalled();
      expect(mockAdapter.initialize).toHaveBeenCalled();
      expect(mockAdapter.executeCode).toHaveBeenCalledWith('print("Connection test successful")');
      expect(mockAdapter.getDeviceInfo).toHaveBeenCalled();
      expect(mockAdapter.listDirectory).toHaveBeenCalledWith('/');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Testing connection...');
      expect(consoleLogSpy).toHaveBeenCalledWith('Connection test result:', 'Connection test successful');
      expect(consoleLogSpy).toHaveBeenCalledWith('Device info retrieved:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Platform: M5Stack');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Version: 2.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Chip ID: ESP32-ABC123');
      expect(consoleLogSpy).toHaveBeenCalledWith('  MAC Address: AA:BB:CC:DD:EE:FF');
      expect(consoleLogSpy).toHaveBeenCalledWith('File system accessible (2 items in root)');
      expect(consoleLogSpy).toHaveBeenCalledWith('Connection established successfully!');

      expect(mockAdapter.disconnect).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should handle connection test failure', async () => {
      mockAdapter.connect.mockResolvedValue(undefined);
      mockAdapter.initialize.mockResolvedValue(undefined);
      mockAdapter.disconnect.mockResolvedValue(undefined);

      mockAdapter.executeCode.mockResolvedValue({
        output: '',
        error: 'Connection failed',
        exitCode: 1,
        executionTime: 100,
        timestamp: new Date(),
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(cli.connect('/dev/ttyUSB0')).rejects.toThrow('Connection test failed: Connection failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Connection test failed:', 'Connection failed');
      expect(mockAdapter.disconnect).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle device info retrieval failure gracefully', async () => {
      mockAdapter.connect.mockResolvedValue(undefined);
      mockAdapter.initialize.mockResolvedValue(undefined);
      mockAdapter.disconnect.mockResolvedValue(undefined);

      mockAdapter.executeCode.mockResolvedValue({
        output: 'Connection test successful',
        exitCode: 0,
        executionTime: 100,
        timestamp: new Date(),
      });

      mockAdapter.getDeviceInfo.mockRejectedValue(new Error('Device info failed'));

      mockAdapter.listDirectory.mockResolvedValue([]);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await cli.connect('/dev/ttyUSB0');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to retrieve device info:', expect.any(Error));
      expect(consoleLogSpy).toHaveBeenCalledWith('Connection established successfully!');

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should handle file system access failure gracefully', async () => {
      mockAdapter.connect.mockResolvedValue(undefined);
      mockAdapter.initialize.mockResolvedValue(undefined);
      mockAdapter.disconnect.mockResolvedValue(undefined);

      mockAdapter.executeCode.mockResolvedValue({
        output: 'Connection test successful',
        exitCode: 0,
        executionTime: 100,
        timestamp: new Date(),
      });

      mockAdapter.getDeviceInfo.mockResolvedValue({
        platform: 'M5Stack',
        version: '2.0.0',
        chipId: 'ESP32-ABC123',
        flashSize: 4194304,
        ramSize: 327680,
      });

      mockAdapter.listDirectory.mockRejectedValue(new Error('File system error'));

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await cli.connect('/dev/ttyUSB0');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to access file system:', expect.any(Error));
      expect(consoleLogSpy).toHaveBeenCalledWith('Connection established successfully!');

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should handle connection failure', async () => {
      mockAdapter.connect.mockRejectedValue(new Error('Connection failed'));
      mockAdapter.disconnect.mockResolvedValue(undefined);

      await expect(cli.connect('/dev/ttyUSB0')).rejects.toThrow('Connection failed');

      expect(mockAdapter.connect).toHaveBeenCalled();
      expect(mockAdapter.disconnect).toHaveBeenCalled();
    });

    it('should ensure disconnection on callback error', async () => {
      mockAdapter.connect.mockResolvedValue(undefined);
      mockAdapter.initialize.mockResolvedValue(undefined);
      mockAdapter.disconnect.mockResolvedValue(undefined);

      mockAdapter.executeCode.mockRejectedValue(new Error('Callback error'));

      await expect(cli.connect('/dev/ttyUSB0')).rejects.toThrow('Callback error');

      expect(mockAdapter.connect).toHaveBeenCalled();
      expect(mockAdapter.disconnect).toHaveBeenCalled();
    });

    it('should handle device without MAC address', async () => {
      mockAdapter.connect.mockResolvedValue(undefined);
      mockAdapter.initialize.mockResolvedValue(undefined);
      mockAdapter.disconnect.mockResolvedValue(undefined);

      mockAdapter.executeCode.mockResolvedValue({
        output: 'Connection test successful',
        exitCode: 0,
        executionTime: 100,
        timestamp: new Date(),
      });

      mockAdapter.getDeviceInfo.mockResolvedValue({
        platform: 'M5Stack',
        version: '2.0.0',
        chipId: 'ESP32-ABC123',
        flashSize: 4194304,
        ramSize: 327680,
        // No macAddress field
      });

      mockAdapter.listDirectory.mockResolvedValue([]);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await cli.connect('/dev/ttyUSB0');

      expect(consoleLogSpy).toHaveBeenCalledWith('  Platform: M5Stack');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Version: 2.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('  Chip ID: ESP32-ABC123');
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('MAC Address'));

      consoleLogSpy.mockRestore();
    });
  });

  describe('execWithConnection', () => {
    it('should execute code and display output', async () => {
      mockAdapter.connect.mockResolvedValue(undefined);
      mockAdapter.initialize.mockResolvedValue(undefined);
      mockAdapter.disconnect.mockResolvedValue(undefined);

      mockAdapter.executeCode.mockResolvedValue({
        output: 'Hello World',
        exitCode: 0,
        executionTime: 150,
        timestamp: new Date(),
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await cli.execWithConnection('/dev/ttyUSB0', 'print("Hello World")');

      expect(mockAdapter.executeCode).toHaveBeenCalledWith('print("Hello World")');
      expect(consoleLogSpy).toHaveBeenCalledWith('Hello World');

      consoleLogSpy.mockRestore();
    });

    it('should handle execution errors', async () => {
      mockAdapter.connect.mockResolvedValue(undefined);
      mockAdapter.initialize.mockResolvedValue(undefined);
      mockAdapter.disconnect.mockResolvedValue(undefined);

      mockAdapter.executeCode.mockResolvedValue({
        output: '',
        error: 'Syntax Error',
        exitCode: 1,
        executionTime: 50,
        timestamp: new Date(),
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await cli.execWithConnection('/dev/ttyUSB0', 'invalid syntax');

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Syntax Error');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('infoWithConnection', () => {
    it('should display device information', async () => {
      mockAdapter.connect.mockResolvedValue(undefined);
      mockAdapter.initialize.mockResolvedValue(undefined);
      mockAdapter.disconnect.mockResolvedValue(undefined);

      mockAdapter.getDeviceInfo.mockResolvedValue({
        platform: 'M5Stack',
        version: '2.0.0',
        chipId: 'ESP32-ABC123',
        flashSize: 4194304,
        ramSize: 327680,
        macAddress: 'AA:BB:CC:DD:EE:FF',
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await cli.infoWithConnection('/dev/ttyUSB0');

      expect(mockAdapter.getDeviceInfo).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('Platform: M5Stack');
      expect(consoleLogSpy).toHaveBeenCalledWith('Version: 2.0.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('Chip ID: ESP32-ABC123');

      consoleLogSpy.mockRestore();
    });
  });

  describe('listPorts', () => {
    it('should list available ports', async () => {
      mockClient.listPorts.mockResolvedValue([
        { path: '/dev/tty.usbserial-123', manufacturer: 'Silicon Labs' },
        { path: '/dev/tty.Bluetooth-Incoming-Port', manufacturer: 'Apple' },
      ]);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await cli.listPorts();

      expect(mockClient.listPorts).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith('/dev/tty.usbserial-123');

      consoleLogSpy.mockRestore();
    });

    it('should handle no M5Stack devices found', async () => {
      mockClient.listPorts.mockResolvedValue([
        { path: '/dev/tty.Bluetooth-Incoming-Port', manufacturer: 'Apple' },
      ]);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await cli.listPorts();

      expect(consoleLogSpy).toHaveBeenCalledWith('No M5Stack devices found');

      consoleLogSpy.mockRestore();
    });
  });
});