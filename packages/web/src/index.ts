/**
 * @h1mpy-sdk/web
 *
 * Browser M5Stack serial communication library
 */

// Core exports
export { WebSerialConnection } from './WebSerialConnection';

// Export only browser-compatible types from core
export type {
  ClientOptions,
  LogLevel,
  PortInfo,
  DirectoryEntry,
  WriteOptions,
  ExecutionResult,
  DeviceInfo,
  ConnectionOptions,
  BulkTransferOptions,
  FileTransferProgress,
} from '../../core/src/types';

export {
  CommunicationError,
  TimeoutError,
  DeviceBusyError,
  FileNotFoundError,
  DEFAULT_CONFIG,
} from '../../core/src/types';

// Main client class
import { WebSerialConnection, WebSerialPort } from './WebSerialConnection';
import {
  ClientOptions,
  CommunicationError,
  DEFAULT_CONFIG,
  LogLevel,
  PortInfo,
} from '../../core/src/types';

// Browser-compatible EventEmitter polyfill
class BrowserEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    if (!this.listeners[event]) return this;
    const index = this.listeners[event].indexOf(listener);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.listeners[event]) return false;
    this.listeners[event].forEach(listener => listener(...args));
    return true;
  }
}

// Interface for logger
interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Simple console logger implementation
 */
class ConsoleLogger implements ILogger {
  constructor(private level: LogLevel) {}

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}

/**
 * Web-based device manager with M5Stack communication demo
 */
class WebDeviceManager extends BrowserEventEmitter {
  protected connection: WebSerialConnection;

  constructor(connection: WebSerialConnection) {
    super();
    this.connection = connection;
    
    // Forward events
    this.connection.on('connect', () => {
      console.log('Web Serial connection established');
      void this.initializeREPL();
      this.emit('connect');
    });
    this.connection.on('disconnect', () => this.emit('disconnect'));
    this.connection.on('error', (error: Error) => this.emit('error', error));
    this.connection.on('busy', (busy: boolean) => this.emit('busy', busy));
  }

  async connect(): Promise<void> {
    return this.connection.connect();
  }

  async disconnect(): Promise<void> {
    return this.connection.disconnect();
  }

  get isConnected(): boolean {
    return this.connection.connected;
  }

  get isBusy(): boolean {
    return this.connection.busy;
  }

  private async initializeREPL(): Promise<void> {
    // This method will be called after connection is established
    if (this.connection.connected) {
      try {
        await this.connection.initializeREPL();
        console.log('REPL initialized for WebDeviceManager');
      } catch (error) {
        console.warn('Failed to initialize REPL:', error);
      }
    }
  }

  async executeCode(code: string): Promise<{ output: string; error?: string; exitCode: number; executionTime: number; timestamp: Date }> {
    const startTime = Date.now();
    
    try {
      if (!this.connection.connected) {
        throw new Error('Not connected to device');
      }

      const lines = code.trim().split('\n');
      let output = '';

      if (lines.length === 1) {
        // Single line command
        output = await this.connection.sendREPLCommand(code, 10000);
      } else {
        // Multi-line code - use exec()
        const escapedCode = code.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const execCommand = `exec("${escapedCode}")`;
        output = await this.connection.sendREPLCommand(execCommand, 10000);
      }

      return {
        output,
        exitCode: 0,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        output: '',
        error: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }

  async listDirectory(path: string = '.'): Promise<any[]> {
    try {
      if (!this.connection.connected) {
        throw new Error('Not connected to device');
      }

      await this.connection.sendREPLCommand('import os');
      const result = await this.connection.sendREPLCommand(`os.listdir('${path}')`);

      // Parse the list result
      const match = result.match(/\[(.*)\]/);
      if (!match) {
        return [];
      }

      const items = match[1].split(',').map((item) => item.trim().replace(/'/g, ''));
      const entries: any[] = [];

      for (const item of items) {
        if (!item) {
          continue;
        }

        try {
          // Check if it's a file or directory
          const fullPath = path.endsWith('/') ? path + item : path + '/' + item;
          const statResult = await this.connection.sendREPLCommand(`os.stat('${fullPath}')`);

          // Parse stat result to determine if it's a file or directory
          const isFile = !statResult.includes('directory') && item.includes('.');

          entries.push({
            name: item,
            size: 0, // Would need additional command to get size
            isDirectory: !isFile,
            path: fullPath,
          });
        } catch (error) {
          // If stat fails, guess based on extension
          entries.push({
            name: item,
            size: 0,
            isDirectory: !item.includes('.'),
            path: path.endsWith('/') ? path + item : path + '/' + item,
          });
        }
      }

      return entries;
    } catch (error) {
      console.error('Failed to list directory:', error);
      return [];
    }
  }

  async readFile(path: string): Promise<any> {
    try {
      if (!this.connection.connected) {
        throw new Error('Not connected to device');
      }

      // Read file content using MicroPython
      const command = `
with open('${path}', 'rb') as f:
    import binascii
    print(binascii.hexlify(f.read()).decode())
`;

      const result = await this.connection.sendREPLCommand(command.trim());
      // Extract the hex content from the output (last line usually)
      const lines = result.trim().split('\n');
      const hexContent = lines[lines.length - 1].trim();

      if (!hexContent || hexContent === 'None' || hexContent.startsWith('exec(')) {
        throw new Error('File not found or empty');
      }

      // Convert hex string back to bytes
      const bytes = [];
      for (let i = 0; i < hexContent.length; i += 2) {
        bytes.push(parseInt(hexContent.substr(i, 2), 16));
      }
      return new Uint8Array(bytes);
    } catch (error) {
      console.error('Failed to read file:', error);
      const encoder = new TextEncoder();
      return encoder.encode(`# Error reading ${path}: ${error}`);
    }
  }

  async writeFile(path: string, content: any, options?: any): Promise<void> {
    try {
      if (!this.connection.connected) {
        throw new Error('Not connected to device');
      }

      // Convert content to bytes if it's a string
      let data: Uint8Array;
      if (typeof content === 'string') {
        const encoder = new TextEncoder();
        data = encoder.encode(content);
      } else if (content instanceof Uint8Array) {
        data = content;
      } else {
        data = new Uint8Array(content);
      }

      // Convert to hex string for MicroPython
      const hexData = Array.from(data)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');

      const totalBytes = data.length;
      const maxHexSize = 2000; // Limit hex string size to prevent timeout

      if (hexData.length > maxHexSize) {
        // Write file in chunks for large files
        for (let i = 0; i < hexData.length; i += maxHexSize) {
          const chunk = hexData.slice(i, i + maxHexSize);
          const mode = i === 0 ? 'wb' : 'ab'; // First chunk creates file, others append
          const chunkCommand = `
import binascii
with open('${path}', '${mode}') as f:
    f.write(binascii.unhexlify('${chunk}'))
print('Chunk written')
`;
          await this.connection.sendREPLCommand(chunkCommand.trim());

          if (options?.onProgress) {
            options.onProgress(Math.min(i + maxHexSize, hexData.length) / 2, totalBytes);
          }
        }
      } else {
        // Write file using MicroPython for small files
        const command = `
import binascii
with open('${path}', 'wb') as f:
    f.write(binascii.unhexlify('${hexData}'))
print('File written successfully')
`;

        await this.connection.sendREPLCommand(command.trim());

        if (options?.onProgress) {
          options.onProgress(totalBytes, totalBytes);
        }
      }

      console.log(`File written: ${path} (${totalBytes} bytes)`);
    } catch (error) {
      console.error('Failed to write file:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      if (!this.connection.connected) {
        throw new Error('Not connected to device');
      }

      await this.connection.sendREPLCommand('import os');
      await this.connection.sendREPLCommand(`os.remove('${path}')`);
      console.log('File deleted:', path);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  async getDeviceInfo(): Promise<any> {
    try {
      if (!this.connection.connected) {
        throw new Error('Not connected to device');
      }

      await this.connection.sendREPLCommand('import os');
      const osInfo = await this.connection.sendREPLCommand('os.uname()');

      await this.connection.sendREPLCommand('import sys');
      const platform = await this.connection.sendREPLCommand('sys.platform');

      // Parse the os.uname() output
      const match = osInfo.match(
        /\(sysname='([^']+)', nodename='([^']+)', release='([^']+)', version='([^']+)', machine='([^']+)'\)/
      );

      // Get hardware information
      let flashSize = 0;
      let ramSize = 0;
      let macAddress = 'unknown';

      try {
        // Get flash size using esp module
        await this.connection.sendREPLCommand('import esp');
        const flashSizeResult = await this.connection.sendREPLCommand('esp.flash_size()');
        flashSize = parseInt(flashSizeResult.trim()) || 0;
      } catch (error) {
        console.warn('Could not get flash size:', error);
      }

      try {
        // Get free RAM using gc module
        await this.connection.sendREPLCommand('import gc');
        const ramResult = await this.connection.sendREPLCommand('gc.mem_free()');
        ramSize = parseInt(ramResult.trim()) || 0;
      } catch (error) {
        console.warn('Could not get RAM size:', error);
      }

      try {
        // Get MAC address using network module
        await this.connection.sendREPLCommand('import network');
        await this.connection.sendREPLCommand('wlan = network.WLAN(network.STA_IF)');
        await this.connection.sendREPLCommand('mac = wlan.config("mac")');
        const macResult = await this.connection.sendREPLCommand('":".join(["%02X" % b for b in mac])');
        macAddress = macResult.trim().replace(/'/g, '');
      } catch (error) {
        console.warn('Could not get MAC address:', error);
      }

      return {
        platform: platform.replace(/'/g, '') || 'esp32',
        version: match ? match[3] : 'unknown',
        chipId: match ? match[2] : 'unknown',
        flashSize: flashSize,
        ramSize: ramSize,
        macAddress: macAddress,
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
      // Return fallback info
      return {
        platform: 'M5Stack',
        version: 'unknown',
        chipId: 'ESP32-WROOM',
        flashSize: 16777216,
        ramSize: 524288,
        macAddress: 'unknown'
      };
    }
  }

  async isOnline(): Promise<boolean> {
    try {
      if (!this.connection.connected) {
        return false;
      }
      await this.connection.sendREPLCommand('print("online")');
      return true;
    } catch (error) {
      return false;
    }
  }

  async setWifiConfig(ssid: string, password: string): Promise<void> {
    try {
      if (!this.connection.connected) {
        throw new Error('Not connected to device');
      }

      const wifiCommand = `
import network
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect('${ssid}', '${password}')
print('WiFi configuration set')
`;
      await this.connection.sendREPLCommand(wifiCommand.trim());
      console.log(`WiFi config set - SSID: ${ssid}`);
    } catch (error) {
      console.error('Failed to set WiFi config:', error);
      throw error;
    }
  }

  async executeFile(filePath: string): Promise<{ output: string; error?: string; exitCode: number; executionTime: number; timestamp: Date }> {
    const startTime = Date.now();
    
    try {
      if (!this.connection.connected) {
        throw new Error('Not connected to device');
      }

      const execCommand = `exec(open('${filePath}').read())`;
      const output = await this.connection.sendREPLCommand(execCommand, 15000); // Longer timeout for file execution
      
      return {
        output: output || '[File executed successfully]',
        exitCode: 0,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        output: '',
        error: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        executionTime: Date.now() - startTime,
        timestamp: new Date()
      };
    }
  }
}

/**
 * Connection wrapper class
 */
export class Connection extends WebDeviceManager {
  readonly port: string;

  constructor(connection: WebSerialConnection) {
    super(connection);
    this.port = connection.portName;
  }
}

/**
 * Main M5Stack client class
 */
export class M5StackClient extends BrowserEventEmitter {
  private options: Required<ClientOptions>;
  private logger: ILogger;
  private connections: Map<WebSerialPort, Connection> = new Map();

  constructor(options: ClientOptions = {}) {
    super();

    this.options = {
      timeout: options.timeout || DEFAULT_CONFIG.defaultTimeout,
      logLevel: options.logLevel || 'info',
      autoReconnect: options.autoReconnect || false,
      maxRetries: options.maxRetries || 3,
      baudRate: options.baudRate || DEFAULT_CONFIG.defaultBaudRate,
    };

    this.logger = new ConsoleLogger(this.options.logLevel);
    this.logger.info('M5Stack client initialized', this.options);
  }

  /**
   * List available serial ports
   */
  async listPorts(): Promise<PortInfo[]> {
    try {
      this.logger.debug('Listing available ports');
      return (await WebSerialConnection.listPorts()) as PortInfo[];
    } catch (error) {
      this.logger.error('Failed to list ports:', error);
      throw new CommunicationError(`Failed to list ports: ${error}`);
    }
  }

  /**
   * Connect to a device
   */
  async connect(port: WebSerialPort): Promise<Connection> {
    if (this.connections.has(port)) {
      const existing = this.connections.get(port)!;
      if (existing.isConnected) {
        this.logger.warn('Already connected to port');
        return existing;
      }
      // Remove disconnected connection
      this.connections.delete(port);
    }

    this.logger.info('Connecting to port');

    try {
      const serialConnection = new WebSerialConnection(port, {
        baudRate: this.options.baudRate,
        timeout: this.options.timeout,
        autoReconnect: this.options.autoReconnect,
      });

      const connection = new Connection(serialConnection);

      // Forward events
      connection.on('connect', () => {
        this.logger.info('Connected to port');
        this.emit('connect', port);
      });

      connection.on('disconnect', () => {
        this.logger.info('Disconnected from port');
        this.connections.delete(port);
        this.emit('disconnect', port);
      });

      connection.on('error', (error: Error) => {
        this.logger.error('Connection error:', error);
        this.emit('error', port, error);
      });

      await connection.connect();
      this.connections.set(port, connection);

      return connection;
    } catch (error) {
      this.logger.error('Failed to connect to port:', error);
      throw new CommunicationError(`Failed to connect: ${error}`);
    }
  }

  /**
   * Disconnect from a device
   */
  async disconnect(port: WebSerialPort): Promise<void> {
    const connection = this.connections.get(port);
    if (!connection) {
      this.logger.warn('No connection found for port');
      return;
    }

    this.logger.info('Disconnecting from port');

    try {
      await connection.disconnect();
      this.connections.delete(port);
    } catch (error) {
      this.logger.error('Failed to disconnect from port:', error);
      throw new CommunicationError(`Failed to disconnect: ${error}`);
    }
  }

  /**
   * Disconnect from all devices
   */
  async disconnectAll(): Promise<void> {
    const ports = Array.from(this.connections.keys());

    await Promise.allSettled(ports.map((port) => this.disconnect(port)));
  }

  /**
   * Get connection for a port
   */
  getConnection(port: WebSerialPort): Connection | null {
    return this.connections.get(port) || null;
  }

  /**
   * Get all active connections
   */
  getConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.options.logLevel = level;
    this.logger = new ConsoleLogger(level);
    this.logger.info(`Log level set to ${level}`);
  }

  /**
   * Set default timeout
   */
  setTimeout(timeout: number): void {
    this.options.timeout = timeout;
    this.logger.info(`Default timeout set to ${timeout}ms`);
  }

  /**
   * Get client status
   */
  getStatus(): object {
    return {
      options: this.options,
      activeConnections: this.connections.size,
      connections: Array.from(this.connections.entries()).map(([port, conn]) => ({
        port,
        connected: conn.isConnected,
        busy: conn.isBusy,
      })),
    };
  }

  /**
   * Health check - ping all connected devices
   */
  async healthCheck(): Promise<Map<WebSerialPort, boolean>> {
    const results = new Map<WebSerialPort, boolean>();

    for (const [port, connection] of this.connections) {
      try {
        results.set(port, await connection.isOnline());
      } catch (error) {
        this.logger.warn('Health check failed:', error);
        results.set(port, false);
      }
    }

    return results;
  }
}

// Default export
export default M5StackClient;