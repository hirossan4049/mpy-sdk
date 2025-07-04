/**
 * Web-compatible M5Stack Serial Protocol Handler
 *
 * Handles the low-level M5Stack communication protocol including
 * CRC calculation, frame construction, and response parsing.
 */

import { CommandCode, DEFAULT_CONFIG, ProtocolFrame } from '../../core/src/types';

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

  equals(other: BrowserBuffer): boolean {
    if (this.length !== other.length) return false;
    for (let i = 0; i < this.length; i++) {
      if (this.data[i] !== other.data[i]) return false;
    }
    return true;
  }

  [key: number]: number;

  [Symbol.iterator]() {
    return this.data[Symbol.iterator]();
  }
}

// Make buffer array accessible
Object.defineProperty(BrowserBuffer.prototype, Symbol.iterator, {
  value: function() {
    let index = 0;
    const data = this.data;
    return {
      next() {
        if (index < data.length) {
          return { value: data[index++], done: false };
        }
        return { done: true };
      }
    };
  }
});

// Add array access
for (let i = 0; i < 256; i++) {
  Object.defineProperty(BrowserBuffer.prototype, i, {
    get: function() { return this.data[i]; },
    set: function(value) { this.data[i] = value; }
  });
}

const Buffer = BrowserBuffer;

// CRC Table for M5Stack protocol
const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401,
  0x5000, 0x9c01, 0x8801, 0x4400,
];

export class ProtocolHandler {
  private readonly headerBytes: BrowserBuffer;
  private readonly footerBytes: BrowserBuffer;

  constructor() {
    this.headerBytes = Buffer.from(DEFAULT_CONFIG.frameDelimiters.header);
    this.footerBytes = Buffer.from(DEFAULT_CONFIG.frameDelimiters.footer);
  }

  /**
   * Calculate CRC16 checksum for data
   */
  calculateCrc(data: BrowserBuffer): number {
    let crc = 0xffff;

    for (let i = 0; i < data.length; i++) {
      const ch = data.data[i];
      crc = CRC_TABLE[(ch ^ crc) & 15] ^ (crc >> 4);
      crc = CRC_TABLE[((ch >> 4) ^ crc) & 15] ^ (crc >> 4);
    }

    return crc;
  }

  /**
   * Create command data buffer
   */
  createCommandBuffer(command: CommandCode, data: string | BrowserBuffer): BrowserBuffer {
    const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
    return Buffer.concat([Buffer.from([command]), dataBuffer]);
  }

  /**
   * Create complete protocol frame with CRC
   */
  createFrame(commandBuffer: BrowserBuffer): BrowserBuffer {
    const crc = this.calculateCrc(commandBuffer);
    const crcBytes = Buffer.from([crc >> 8, crc & 0x00ff]);

    return Buffer.concat([
      this.headerBytes, // [AA AB AA]
      Buffer.from([commandBuffer.length]), // Length
      commandBuffer, // Command + Data
      crcBytes, // CRC16
      this.footerBytes, // [AB CC AB]
    ]);
  }

  /**
   * Check if received frame is complete
   */
  isFrameComplete(buffer: BrowserBuffer): boolean {
    if (buffer.length < 8) {
      return false;
    } // Minimum frame size

    // Check header
    if (!this.headerBytes.equals(buffer.slice(0, 3))) {
      return false;
    }

    // Check footer
    const footerStart = buffer.length - 3;
    if (!this.footerBytes.equals(buffer.slice(footerStart))) {
      return false;
    }

    return true;
  }

  /**
   * Parse received protocol frame
   */
  parseFrame(buffer: BrowserBuffer): ProtocolFrame | null {
    if (!this.isFrameComplete(buffer)) {
      return null;
    }

    try {
      const header = buffer.slice(0, 3);
      const length = buffer.data[3];
      const dataStart = 4;
      const dataEnd = dataStart + length;
      const data = buffer.slice(dataStart, dataEnd);
      const crcReceived = (buffer.data[dataEnd] << 8) | buffer.data[dataEnd + 1];
      const footer = buffer.slice(-3);

      // Verify CRC
      const commandData = buffer.slice(4, dataEnd);
      const crcCalculated = this.calculateCrc(commandData);

      if (crcReceived !== crcCalculated) {
        throw new Error(
          `CRC mismatch: received ${crcReceived.toString(16)}, calculated ${crcCalculated.toString(16)}`
        );
      }

      return {
        header: header as any,
        length,
        command: data.data[0] as CommandCode,
        data: data.slice(1) as any,
        crc: crcReceived,
        footer: footer as any,
      };
    } catch (error) {
      console.error('Failed to parse frame:', error);
      return null;
    }
  }

  /**
   * Extract response data from frame
   */
  extractResponseData(buffer: BrowserBuffer): BrowserBuffer {
    if (!this.isFrameComplete(buffer)) {
      throw new Error('Incomplete frame');
    }

    // Check status byte (position 4)
    const status = buffer.data[4];
    if (status !== 0x00) {
      throw new Error(`Command failed with status: 0x${status.toString(16)}`);
    }

    // Extract data portion (skip header[3] + length[1] + status[1], remove crc[2] + footer[3])
    return buffer.slice(5, -5);
  }

  /**
   * Validate frame structure
   */
  validateFrame(buffer: BrowserBuffer): { valid: boolean; error?: string } {
    if (buffer.length < 8) {
      return { valid: false, error: 'Frame too short' };
    }

    if (!this.headerBytes.equals(buffer.slice(0, 3))) {
      return { valid: false, error: 'Invalid header' };
    }

    if (!this.footerBytes.equals(buffer.slice(-3))) {
      return { valid: false, error: 'Invalid footer' };
    }

    const length = buffer.data[3];
    const expectedLength = 3 + 1 + length + 2 + 3; // header + length + data + crc + footer
    if (buffer.length !== expectedLength) {
      return {
        valid: false,
        error: `Length mismatch: expected ${expectedLength}, got ${buffer.length}`,
      };
    }

    try {
      const commandData = buffer.slice(4, 4 + length);
      const crcReceived = (buffer.data[4 + length] << 8) | buffer.data[4 + length + 1];
      const crcCalculated = this.calculateCrc(commandData);

      if (crcReceived !== crcCalculated) {
        return {
          valid: false,
          error: `CRC mismatch: received ${crcReceived.toString(16)}, calculated ${crcCalculated.toString(16)}`,
        };
      }
    } catch (error) {
      return { valid: false, error: `CRC validation failed: ${error}` };
    }

    return { valid: true };
  }

  /**
   * Create diagnostic information for a frame
   */
  analyzeFrame(buffer: BrowserBuffer): object {
    return {
      totalLength: buffer.length,
      header: buffer.slice(0, 3).toString('hex'),
      length: buffer.length > 3 ? buffer.data[3] : null,
      data: buffer.length > 4 ? buffer.slice(4, -5).toString('hex') : null,
      crc: buffer.length > 7 ? buffer.slice(-5, -3).toString('hex') : null,
      footer: buffer.length >= 3 ? buffer.slice(-3).toString('hex') : null,
      isComplete: this.isFrameComplete(buffer),
      validation: this.validateFrame(buffer),
    };
  }
}