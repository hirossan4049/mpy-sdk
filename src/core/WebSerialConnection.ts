/**
 * Browser Web Serial Connection Implementation
 *
 * Provides serial communication support using the Web Serial API.
 */

import { BaseSerialConnection } from './SerialConnection';
import { CommunicationError, ConnectionOptions, PortInfo } from '../types';

// Minimal interfaces for Web Serial types to avoid depending on lib.dom
export interface WebSerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
}

export class WebSerialConnection extends BaseSerialConnection {
  private serialPort: WebSerialPort | null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  constructor(port: WebSerialPort, options: ConnectionOptions = {}) {
    super('webserial', options);
    this.serialPort = port;
  }

  static isSupported(): boolean {
    const nav = (globalThis as { navigator?: Record<string, unknown> }).navigator;
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

  protected async writeRaw(data: Uint8Array): Promise<void> {
    if (!this.writer) {
      throw new CommunicationError('Not connected');
    }
    await this.writer.write(data);
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
          this.onDataReceived(Buffer.from(value));
        }
      }
    } catch (error) {
      this.onError(error as Error);
    }
  }
}
