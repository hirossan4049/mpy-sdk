/**
 * Web-compatible MicroPython REPL Adapter
 *
 * Adapts the SDK to work with standard MicroPython REPL using Web Serial API
 */

import {
  CommunicationError,
  DeviceInfo,
  DirectoryEntry,
  ExecutionResult,
  FileNotFoundError,
  TimeoutError,
  WriteOptions,
} from '../types';

// Browser Buffer polyfill (simplified for REPL use)
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

  static from(data: ArrayBuffer | Uint8Array | number[] | string, encoding?: string): BrowserBuffer {
    if (encoding === 'hex' && typeof data === 'string') {
      const bytes = [];
      for (let i = 0; i < data.length; i += 2) {
        bytes.push(parseInt(data.substr(i, 2), 16));
      }
      return new BrowserBuffer(bytes);
    }
    return new BrowserBuffer(data);
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

  get length(): number {
    return this.data.length;
  }
}

const Buffer = BrowserBuffer;

// Browser-compatible EventEmitter
class BrowserEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, listener: Function): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    if (!this.listeners[event]) return false;
    this.listeners[event].forEach(listener => listener(...args));
    return true;
  }
}

export class REPLAdapter extends BrowserEventEmitter {
  private serialPort?: any; // WebSerialPort
  public reader?: ReadableStreamDefaultReader<Uint8Array>;
  public writer?: WritableStreamDefaultWriter<Uint8Array>;
  private responseBuffer: string = '';
  private currentCommand?: {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  };
  public isConnected: boolean = false;
  private readingLoop: boolean = false;

  constructor(private port: any, private baudRate: number = 115200) {
    super();
    this.serialPort = port;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // The port should already be open from WebSerialConnection
      // Just get new readers/writers for REPL use
      if (this.serialPort.readable && this.serialPort.writable) {
        this.writer = this.serialPort.writable.getWriter();
        this.reader = this.serialPort.readable.getReader();
        this.isConnected = true;
        this.emit('connect');
        this.startReading();
        await this.initialize();
        console.log('REPL adapter connected successfully');
      } else {
        throw new Error('Serial port not open or readable/writable streams not available');
      }
    } catch (error) {
      console.error('REPL connect error:', error);
      throw new CommunicationError(`Failed to connect REPL: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      this.readingLoop = false;
      await this.reader?.cancel();
      this.reader?.releaseLock();
      await this.writer?.close();
      this.writer?.releaseLock();
      await this.serialPort?.close();
      this.isConnected = false;
      this.emit('disconnect');
    } catch (error) {
      throw new CommunicationError(`Failed to disconnect: ${error}`);
    }
  }

  public async startReading(): Promise<void> {
    if (!this.reader) return;
    
    this.readingLoop = true;
    try {
      while (this.readingLoop && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          const decoder = new TextDecoder();
          const text = decoder.decode(value);
          this.onDataReceived(text);
        }
      }
    } catch (error) {
      if (this.isConnected) {
        this.emit('error', error);
      }
    }
  }

  private onDataReceived(data: string): void {
    this.responseBuffer += data;
    this.processResponse();
  }

  private processResponse(): void {
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

  private async sendREPLCommand(command: string, timeout: number = 5000): Promise<string> {
    if (!this.writer || !this.isConnected) {
      throw new CommunicationError('Not connected');
    }

    return new Promise<string>((resolve, reject) => {
      this.responseBuffer = '';

      const timeoutHandle = setTimeout(() => {
        this.currentCommand = undefined;
        reject(new TimeoutError(`Command timeout after ${timeout}ms`));
      }, timeout);

      this.currentCommand = {
        resolve,
        reject,
        timeout: timeoutHandle,
      };

      const encoder = new TextEncoder();
      this.writer!.write(encoder.encode(command + '\r\n'));
    });
  }

  public async initialize(): Promise<void> {
    if (!this.writer) return;

    // Send Ctrl+C to interrupt any running program
    await this.writer.write(new Uint8Array([0x03]));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Clear any pending input
    const encoder = new TextEncoder();
    await this.writer.write(encoder.encode('\r\n'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.responseBuffer = '';
  }

  async isOnline(): Promise<boolean> {
    try {
      await this.sendREPLCommand('print("online")');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      await this.sendREPLCommand('import os');
      const osInfo = await this.sendREPLCommand('os.uname()');

      await this.sendREPLCommand('import sys');
      const platform = await this.sendREPLCommand('sys.platform');

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
        await this.sendREPLCommand('import esp');
        const flashSizeResult = await this.sendREPLCommand('esp.flash_size()');
        flashSize = parseInt(flashSizeResult.trim()) || 0;
      } catch (error) {
        console.warn('Could not get flash size:', error);
      }

      try {
        // Get free RAM using gc module
        await this.sendREPLCommand('import gc');
        const ramResult = await this.sendREPLCommand('gc.mem_free()');
        ramSize = parseInt(ramResult.trim()) || 0;
      } catch (error) {
        console.warn('Could not get RAM size:', error);
      }

      try {
        // Get MAC address using network module
        await this.sendREPLCommand('import network');
        await this.sendREPLCommand('wlan = network.WLAN(network.STA_IF)');
        await this.sendREPLCommand('mac = wlan.config("mac")');
        const macResult = await this.sendREPLCommand('":".join(["%02X" % b for b in mac])');
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
      throw new CommunicationError(`Failed to get device info: ${error}`);
    }
  }

  async executeCode(code: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // For multi-line code, we need to handle it differently
      const lines = code.trim().split('\n');
      let output = '';

      if (lines.length === 1) {
        // Single line command
        output = await this.sendREPLCommand(code, 10000);
      } else {
        // Multi-line code - use exec()
        const escapedCode = code.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const execCommand = `exec("${escapedCode}")`;
        output = await this.sendREPLCommand(execCommand, 10000);
      }

      const executionTime = Date.now() - startTime;

      return {
        output,
        exitCode: 0,
        executionTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        output: '',
        error: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        executionTime,
        timestamp: new Date(),
      };
    }
  }

  async listDirectory(path: string = '.'): Promise<DirectoryEntry[]> {
    try {
      await this.sendREPLCommand('import os');
      const result = await this.sendREPLCommand(`os.listdir('${path}')`);

      // Parse the list result
      const match = result.match(/\[(.*)\]/);
      if (!match) {
        return [];
      }

      const items = match[1].split(',').map((item) => item.trim().replace(/'/g, ''));
      const entries: DirectoryEntry[] = [];

      for (const item of items) {
        if (!item) {
          continue;
        }

        try {
          // Check if it's a file or directory
          const fullPath = path.endsWith('/') ? path + item : path + '/' + item;
          const statResult = await this.sendREPLCommand(`os.stat('${fullPath}')`);

          // Parse stat result to determine if it's a file or directory
          // In MicroPython, os.stat returns a tuple, and the first element indicates file type
          const isFile = !statResult.includes('directory') && item.includes('.');

          entries.push({
            name: item,
            type: isFile ? 'file' : 'directory',
            path: fullPath,
          });
        } catch (error) {
          // If stat fails, guess based on extension
          entries.push({
            name: item,
            type: item.includes('.') ? 'file' : 'directory',
            path: path.endsWith('/') ? path + item : path + '/' + item,
          });
        }
      }

      return entries;
    } catch (error) {
      throw new CommunicationError(`Failed to list directory: ${error}`);
    }
  }

  async readFile(path: string): Promise<BrowserBuffer> {
    try {
      // Read file content using MicroPython
      const command = `
with open('${path}', 'rb') as f:
    import binascii
    print(binascii.hexlify(f.read()).decode())
`;

      const result = await this.executeCode(command);
      // Extract the hex content from the output (last line usually)
      const lines = result.output.trim().split('\n');
      const hexContent = lines[lines.length - 1].trim();

      if (!hexContent || hexContent === 'None' || hexContent.startsWith('exec(')) {
        throw new Error('File not found or empty');
      }

      return Buffer.from(hexContent, 'hex');
    } catch (error) {
      throw new FileNotFoundError(path, error);
    }
  }

  async writeFile(
    path: string,
    content: BrowserBuffer | string,
    options: WriteOptions = {}
  ): Promise<void> {
    try {
      const data = typeof content === 'string' ? Buffer.from(content) : content;
      const hexData = data.toString('hex');

      // For large files, use chunked writing to avoid timeout
      const maxHexSize = 2000; // Limit hex string size to prevent timeout

      if (hexData.length > maxHexSize) {
        // Write file in chunks for large files
        for (let i = 0; i < hexData.length; i += maxHexSize) {
          const chunk = hexData.slice(i, i + maxHexSize);
          const mode = i === 0 ? 'wb' : 'ab'; // First chunk creates file, others append
          
          // Write using sequential commands for better reliability
          await this.sendREPLCommand('import binascii');
          await this.sendREPLCommand(`f = open('${path}', '${mode}')`);
          await this.sendREPLCommand(`f.write(binascii.unhexlify('${chunk}'))`);
          await this.sendREPLCommand('f.close()');

          if (options.onProgress) {
            options.onProgress(Math.min(i + maxHexSize, hexData.length) / 2, data.length);
          }
        }
      } else {
        // Write file using sequential commands for small files
        await this.sendREPLCommand('import binascii');
        await this.sendREPLCommand(`f = open('${path}', 'wb')`);
        await this.sendREPLCommand(`f.write(binascii.unhexlify('${hexData}'))`);
        await this.sendREPLCommand('f.close()');

        if (options.onProgress) {
          options.onProgress(data.length, data.length);
        }
      }
    } catch (error) {
      throw new CommunicationError(`Failed to write file: ${error}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await this.sendREPLCommand('import os');
      await this.sendREPLCommand(`os.remove('${path}')`);
    } catch (error) {
      throw new CommunicationError(`Failed to delete file: ${error}`);
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get busy(): boolean {
    return !!this.currentCommand;
  }

  get portName(): string {
    return 'webserial';
  }

  getStatus(): object {
    return {
      port: 'webserial',
      connected: this.isConnected,
      busy: this.busy,
      baudRate: this.baudRate,
    };
  }
}