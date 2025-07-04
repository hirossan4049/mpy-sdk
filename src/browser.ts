/**
 * @hirossan4049/mpy-sdk
 *
 * Browser M5Stack serial communication library
 */

// Core exports
export { WebSerialConnection } from './core/WebSerialConnection';
export { ProtocolHandler } from './core/ProtocolHandler';
export { BaseSerialConnection } from './core/SerialConnection';

// Adapter exports
export { REPLAdapter } from './adapters/REPLAdapter';

// Manager exports
export { DeviceManager } from './manager/DeviceManager';

// Utility exports
export { FileTransferManager } from './utils/FileTransfer';
export { PythonAnalyzer } from './utils/PythonAnalyzer';

// Type exports
export * from './types';

// Browser-compatible EventEmitter
class EventEmitter {
  private events: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }
}

// Main client class
import { WebSerialConnection, WebSerialPort } from './core/WebSerialConnection';
import { DeviceManager } from './manager/DeviceManager';
import {
  ClientOptions,
  CommunicationError,
  DEFAULT_CONFIG,
  ILogger,
  LogLevel,
  PortInfo,
} from './types';

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
 * Connection wrapper class
 */
export class Connection extends DeviceManager {
  readonly port: string;

  constructor(connection: WebSerialConnection) {
    super(connection);
    this.port = connection.portName;
  }

  get isConnected(): boolean {
    return this.connection.connected;
  }

  get isBusy(): boolean {
    return this.connection.busy;
  }
}

/**
 * Main M5Stack client class
 */
export class M5StackClient extends EventEmitter {
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

      connection.on('error', (error) => {
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
