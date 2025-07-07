/**
 * Browser Web Serial Connection Implementation
 *
 * Provides serial communication support using the Web Serial API.
 */

import {
  CommunicationError,
  ConnectionOptions,
  PortInfo,
} from '../../core/src/types';

// Browser Buffer polyfill
class BrowserBuffer {
  private data: Uint8Array;

  constructor(data: ArrayBuffer | Uint8Array | number[] | string) {
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      this.data = encoder.encode(data);
    } else if (data instanceof ArrayBuffer) {
      this.data = new Uint8Array(data);
    } else if (Array.isArray(data)) {
      this.data = new Uint8Array(data);
    } else {
      this.data = data;
    }
  }

  static from(data: ArrayBuffer | Uint8Array | number[] | string): BrowserBuffer {
    return new BrowserBuffer(data);
  }

  static alloc(size: number): BrowserBuffer {
    return new BrowserBuffer(new Uint8Array(size));
  }

  static concat(buffers: BrowserBuffer[]): BrowserBuffer {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer.data, offset);
      offset += buffer.length;
    }
    return new BrowserBuffer(result);
  }

  get length(): number {
    return this.data.length;
  }

  toString(encoding?: string): string {
    if (encoding === 'hex') {
      return Array.from(this.data)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
    }
    const decoder = new TextDecoder();
    return decoder.decode(this.data);
  }

  slice(start?: number, end?: number): BrowserBuffer {
    return new BrowserBuffer(this.data.slice(start, end));
  }

  subarray(start?: number, end?: number): Uint8Array {
    return this.data.subarray(start, end);
  }

  [Symbol.iterator]() {
    return this.data[Symbol.iterator]();
  }
}

// Use BrowserBuffer as Buffer in browser environment
const Buffer = BrowserBuffer;

// Browser-compatible EventEmitter base class
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

// Base connection class for web
abstract class BaseWebSerialConnection extends BrowserEventEmitter {
  protected port: string;
  protected options: Required<ConnectionOptions>;
  protected isConnected: boolean = false;
  protected isBusy: boolean = false;

  constructor(port: string, options: ConnectionOptions = {}) {
    super();
    this.port = port;
    this.options = {
      baudRate: options.baudRate || 115200,
      timeout: options.timeout || 5000,
      autoReconnect: options.autoReconnect || false,
    };
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isOpen(): boolean;
  protected abstract writeRaw(data: BrowserBuffer): Promise<void>;

  protected onConnected(): void {
    this.isConnected = true;
    console.log(`Connected to ${this.port}`);
    this.emit('connect');
  }

  protected onDisconnected(): void {
    this.isConnected = false;
    console.log(`Disconnected from ${this.port}`);
    this.emit('disconnect');
  }

  protected onError(error: Error): void {
    console.error(`Serial connection error on ${this.port}:`, error);
    this.emit('error', error);
  }

  protected onDataReceived(data: BrowserBuffer): void {
    this.emit('data', data);
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get busy(): boolean {
    return this.isBusy;
  }

  get portName(): string {
    return this.port;
  }
}

// Minimal interfaces for Web Serial types to avoid depending on lib.dom
export interface WebSerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

export class WebSerialConnection extends BaseWebSerialConnection {
  private serialPort: WebSerialPort | null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private responseBuffer: string = '';
  private currentCommand?: {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  };

  constructor(port: WebSerialPort, options: ConnectionOptions = {}) {
    super('webserial', options);
    this.serialPort = port;
  }

  static isSupported(): boolean {
    const nav = (globalThis as any)?.navigator;
    return typeof nav !== 'undefined' && 'serial' in nav;
  }

  static async requestPort(): Promise<WebSerialPort> {
    if (!WebSerialConnection.isSupported()) {
      throw new CommunicationError('Web Serial API not supported');
    }
    return (
      await (
        globalThis as unknown as {
          navigator: { serial: { requestPort: () => Promise<WebSerialPort> } };
        }
      ).navigator.serial.requestPort()
    ) as WebSerialPort;
  }

  static async listPorts(): Promise<PortInfo[]> {
    if (!WebSerialConnection.isSupported()) {
      return [];
    }
    const ports = (
      await (
        globalThis as unknown as {
          navigator: { serial: { getPorts: () => Promise<WebSerialPort[]> } };
        }
      ).navigator.serial.getPorts()
    ) as WebSerialPort[];
    return ports.map((port, i) => ({ path: `webserial-${i}` }));
  }

  async connect(): Promise<void> {
    if (!this.serialPort) {
      throw new CommunicationError('No serial port available');
    }

    await this.serialPort.open({ baudRate: this.options.baudRate });
    this.writer = this.serialPort.writable?.getWriter() || null;
    this.reader = this.serialPort.readable?.getReader() || null;
    this.onConnected();
    void this.readLoop();
  }

  async disconnect(): Promise<void> {
    try {
      await this.reader?.cancel();
      this.reader?.releaseLock();
      await this.writer?.close();
      this.writer?.releaseLock();
      await this.serialPort?.close();
    } finally {
      this.reader = null;
      this.writer = null;
      this.serialPort = null;
      this.onDisconnected();
    }
  }

  protected async writeRaw(data: BrowserBuffer): Promise<void> {
    if (!this.writer) {
      throw new CommunicationError('Not connected');
    }
    // Convert to Uint8Array and write in 64KiB chunks to mimic Node highWaterMark
    const buffer = data.subarray();
    const CHUNK_SIZE = 64 * 1024;
    try {
      for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
        const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
        await this.writer.write(chunk);
        // wait for backpressure to clear (drain-like)
        if (this.writer.ready) {
          await this.writer.ready;
        }
      }
    } catch (error) {
      this.onError(error as Error);
      throw new CommunicationError(`Write failed: ${error}`);
    }
  }

  isOpen(): boolean {
    return !!this.serialPort && !!this.writer && !!this.reader;
  }

  private async readLoop(): Promise<void> {
    if (!this.reader) {
      return;
    }

    try {
      while (this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          // Emit binary data first for protocol handling
          this.onDataReceived(new BrowserBuffer(value));
          // Then process text for REPL
          const text = new TextDecoder().decode(value);
          this.processREPLResponse(text);
        }
      }
    } catch (error) {
      this.onError(error as Error);
    }
  }

  private processREPLResponse(data: string): void {
    this.responseBuffer += data;

    if (this.currentCommand && this.responseBuffer.includes('>>> ')) {
      // Extract response before the prompt
      const lines = this.responseBuffer.split('\n');
      const responseLines: string[] = [];

      for (const line of lines) {
        if (line.includes('>>> ')) {
          break;
        }
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('>>>')) {
          responseLines.push(trimmed);
        }
      }

      const response = responseLines.join('\n').trim();

      clearTimeout(this.currentCommand.timeout);
      this.currentCommand.resolve(response);
      this.currentCommand = undefined;
      this.responseBuffer = '';
    }
  }

  async sendREPLCommand(command: string, timeout: number = 5000): Promise<string> {
    if (!this.writer || !this.connected) {
      throw new CommunicationError('Not connected');
    }

    return new Promise<string>((resolve, reject) => {
      this.responseBuffer = '';

      const timeoutHandle = setTimeout(() => {
        this.currentCommand = undefined;
        reject(new Error(`Command timeout after ${timeout}ms`));
      }, timeout);

      this.currentCommand = {
        resolve,
        reject,
        timeout: timeoutHandle,
      };

      const encoder = new TextEncoder();
      // Write command + CRLF as raw bytes for reliable encoding and flushing
      const cmdBytes = encoder.encode(command);
      const payload = new Uint8Array(cmdBytes.length + 2);
      payload.set(cmdBytes, 0);
      payload.set([0x0d, 0x0a], cmdBytes.length);
      void this.writeRaw(Buffer.from(payload));
    });
  }

  async initializeREPL(): Promise<void> {
    if (!this.writer) return;

    // Send Ctrl+C to interrupt any running program
    // Send Ctrl+C as raw byte via writeRaw
    await this.writeRaw(Buffer.from([0x03]));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Clear any pending input
    const encoder = new TextEncoder();
    // Send CRLF as raw bytes
    await this.writeRaw(Buffer.from([0x0d, 0x0a]));
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.responseBuffer = '';
    console.log('REPL initialized');
  }
}
