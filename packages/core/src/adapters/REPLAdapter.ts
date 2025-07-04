/**
 * MicroPython REPL Adapter
 *
 * Adapts the SDK to work with standard MicroPython REPL instead of custom protocol
 */

import { EventEmitter } from 'events';
import { SerialPort } from 'serialport';
import {
  CommunicationError,
  DeviceInfo,
  DirectoryEntry,
  ExecutionResult,
  FileNotFoundError,
  TimeoutError,
  WriteOptions,
} from '../types';

export class REPLAdapter extends EventEmitter {
  private serialPort?: SerialPort;
  private portPath: string;
  private baudRate: number;
  private responseBuffer: string = '';
  private currentCommand?: {
    resolve: (value: string) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  };
  private isConnected: boolean = false;

  constructor(portPath: string, baudRate: number = 115200) {
    super();
    this.portPath = portPath;
    this.baudRate = baudRate;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.serialPort = new SerialPort({
        path: this.portPath,
        baudRate: this.baudRate,
        autoOpen: false,
      });

      this.serialPort.on('open', () => {
        this.isConnected = true;
        this.emit('connect');
        resolve();
      });

      this.serialPort.on('error', (error) => {
        this.emit('error', error);
        reject(new CommunicationError(`Failed to connect: ${error.message}`));
      });

      this.serialPort.on('close', () => {
        this.isConnected = false;
        this.emit('disconnect');
      });

      this.serialPort.on('data', (data: Buffer) => {
        this.onDataReceived(data.toString());
      });

      this.serialPort.open();
    });
  }

  async disconnect(): Promise<void> {
    if (!this.serialPort || !this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.serialPort!.close((error) => {
        if (error) {
          reject(new CommunicationError(`Failed to disconnect: ${error.message}`));
        } else {
          this.serialPort = undefined;
          this.isConnected = false;
          resolve();
        }
      });
    });
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
    if (!this.serialPort || !this.isConnected) {
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

      this.serialPort!.write(command + '\r\n');
    });
  }

  async initialize(): Promise<void> {
    // Send Ctrl+C to interrupt any running program
    this.serialPort!.write(Buffer.from([0x03]));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Clear any pending input
    this.serialPort!.write('\r\n');
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
      const platformResult = await this.sendREPLCommand('sys.platform');
      
      // Extract platform from result
      const platformLines = platformResult.trim().split('\n');
      const platform = platformLines[platformLines.length - 1].replace(/'/g, '');

      // Parse the os.uname() output - extract the result line first
      const osLines = osInfo.trim().split('\n');
      const osResultLine = osLines[osLines.length - 1];
      const match = osResultLine.match(
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
        // Extract result after the command line
        const lines = flashSizeResult.trim().split('\n');
        const resultLine = lines[lines.length - 1];
        flashSize = parseInt(resultLine) || 0;
      } catch (error) {
        console.warn('Could not get flash size:', error);
      }

      try {
        // Get free RAM using gc module
        await this.sendREPLCommand('import gc');
        const ramResult = await this.sendREPLCommand('gc.mem_free()');
        // Extract result after the command line
        const lines = ramResult.trim().split('\n');
        const resultLine = lines[lines.length - 1];
        ramSize = parseInt(resultLine) || 0;
      } catch (error) {
        console.warn('Could not get RAM size:', error);
      }

      try {
        // Get MAC address using network module
        await this.sendREPLCommand('import network');
        await this.sendREPLCommand('wlan = network.WLAN(network.STA_IF)');
        await this.sendREPLCommand('mac = wlan.config("mac")');
        const macResult = await this.sendREPLCommand('":".join(["%02X" % b for b in mac])');
        // Extract result after the command line
        const lines = macResult.trim().split('\n');
        const resultLine = lines[lines.length - 1];
        macAddress = resultLine.replace(/'/g, '');
      } catch (error) {
        console.warn('Could not get MAC address:', error);
      }

      return {
        platform: platform || 'esp32',
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

  async readFile(path: string): Promise<Buffer> {
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
    content: Buffer | string,
    options: WriteOptions = {}
  ): Promise<void> {
    try {
      const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
      const hexData = data.toString('hex');

      // For large files, use chunked writing to avoid timeout
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
          await this.executeCode(chunkCommand);

          if (options.onProgress) {
            options.onProgress(Math.min(i + maxHexSize, hexData.length) / 2, data.length);
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

        await this.executeCode(command);

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
    return this.portPath;
  }

  getStatus(): object {
    return {
      port: this.portPath,
      connected: this.isConnected,
      busy: this.busy,
      baudRate: this.baudRate,
    };
  }
}
