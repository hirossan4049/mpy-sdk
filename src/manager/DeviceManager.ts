/**
 * M5Stack Device Manager
 *
 * High-level device management and file operations
 */

import { EventEmitter } from 'events';
import { BaseSerialConnection } from '../core/SerialConnection';
import {
  BulkTransferOptions,
  Command,
  CommandCode,
  CommunicationError,
  DEFAULT_CONFIG,
  DeviceInfo,
  DirectoryEntry,
  ExecutionResult,
  FileNotFoundError,
  FileTransferProgress,
  WriteOptions,
} from '../types';
import { FileTransferManager } from '../utils/FileTransfer';
import { PythonAnalyzer } from '../utils/PythonAnalyzer';

export class DeviceManager extends EventEmitter {
  protected connection: BaseSerialConnection;
  private fileTransfer: FileTransferManager;
  private pythonAnalyzer: PythonAnalyzer;

  constructor(connection: BaseSerialConnection) {
    super();
    this.connection = connection;
    this.fileTransfer = new FileTransferManager(connection);
    this.pythonAnalyzer = new PythonAnalyzer();

    // Forward connection events
    this.connection.on('connect', () => this.emit('connect'));
    this.connection.on('disconnect', () => this.emit('disconnect'));
    this.connection.on('error', (error) => this.emit('error', error));
    this.connection.on('busy', (busy) => this.emit('busy', busy));
  }

  /**
   * Connect to device
   */
  async connect(): Promise<void> {
    await this.connection.connect();
  }

  /**
   * Disconnect from device
   */
  async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    try {
      const command: Command = {
        code: CommandCode.IS_ONLINE,
        data: Buffer.alloc(0),
      };
      const response = await this.connection.sendCommand(command);
      return response.data.toString() === 'done';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    const command: Command = {
      code: CommandCode.GET_INFO,
      data: Buffer.alloc(0),
    };

    const response = await this.connection.sendCommand(command);
    const infoText = response.data.toString();

    // Parse device info (implementation depends on M5Stack response format)
    return this.parseDeviceInfo(infoText);
  }

  /**
   * List directory contents
   */
  async listDirectory(path: string = '/flash'): Promise<DirectoryEntry[]> {
    const command: Command = {
      code: CommandCode.LIST_DIR,
      data: path,
    };

    const response = await this.connection.sendCommand(command);
    const dirList = response.data.toString();

    return this.parseDirectoryListing(path, dirList);
  }

  /**
   * Read file from device
   */
  async readFile(path: string): Promise<Buffer> {
    const command: Command = {
      code: CommandCode.GET_FILE,
      data: path,
    };

    try {
      const response = await this.connection.sendCommand(command);
      return response.data;
    } catch (error) {
      throw new FileNotFoundError(path, error);
    }
  }

  /**
   * Write file to device
   */
  async writeFile(
    path: string,
    content: Buffer | string,
    options: WriteOptions = {}
  ): Promise<void> {
    const data = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;

    const transferOptions: BulkTransferOptions = {
      chunkSize: DEFAULT_CONFIG.maxChunkSize,
      onProgress: options.onProgress
        ? (progress) => {
            options.onProgress!(progress.bytesTransferred, progress.totalBytes);
          }
        : undefined,
      retryAttempts: 3,
    };

    await this.fileTransfer.uploadFile(path, data, options.overwrite !== false, transferOptions);
  }

  /**
   * Delete file from device
   */
  async deleteFile(path: string): Promise<void> {
    const command: Command = {
      code: CommandCode.REMOVE_FILE,
      data: path,
    };

    const response = await this.connection.sendCommand(command);
    if (response.data.toString() !== 'done') {
      throw new CommunicationError(`Failed to delete file: ${path}`);
    }
  }

  /**
   * Execute Python code on device
   */
  async executeCode(code: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    const command: Command = {
      code: CommandCode.EXEC,
      data: code,
    };

    try {
      const response = await this.connection.sendCommand(command);
      const output = response.data.toString();
      const executionTime = Date.now() - startTime;

      return {
        output,
        exitCode: output.includes('done') ? 0 : 1,
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

  /**
   * Execute Python file on device
   */
  async executeFile(path: string): Promise<ExecutionResult> {
    // Read the file content and execute it
    try {
      const content = await this.readFile(path);
      return await this.executeCode(content.toString('utf8'));
    } catch (error) {
      throw new FileNotFoundError(path, error);
    }
  }

  /**
   * Execute Python project with dependency resolution
   */
  async executeProject(
    entryFile: string,
    options: { uploadMissing?: boolean; localProjectPath?: string } = {}
  ): Promise<ExecutionResult> {
    try {
      // Analyze dependencies
      const content = await this.readFile(entryFile);
      const analysis = await this.pythonAnalyzer.analyzeProject(entryFile, content.toString());

      if (options.uploadMissing && analysis.missingFiles.length > 0) {
        await this.uploadMissingDependencies(analysis.missingFiles, options.localProjectPath);
      }

      // Execute the main file
      return await this.executeCode(content.toString());
    } catch (error) {
      throw new FileNotFoundError(entryFile, error);
    }
  }

  /**
   * Upload missing dependencies to the device
   */
  private async uploadMissingDependencies(
    missingFiles: string[],
    localProjectPath?: string
  ): Promise<void> {
    if (!localProjectPath) {
      console.warn(`Missing dependencies: ${missingFiles.join(', ')}`);
      console.warn('No local project path provided. Cannot upload missing files.');
      return;
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    
    for (const missingFile of missingFiles) {
      try {
        // Construct local file path
        const localFilePath = path.resolve(localProjectPath, missingFile);
        
        // Check if file exists locally
        try {
          await fs.access(localFilePath);
        } catch {
          console.warn(`Local file not found: ${localFilePath}`);
          continue;
        }
        
        // Read local file
        const localContent = await fs.readFile(localFilePath);
        
        // Ensure device directory exists
        const deviceDir = path.dirname(missingFile);
        if (deviceDir !== '.' && deviceDir !== '') {
          try {
            await this.createDirectory(deviceDir);
          } catch (error) {
            // Directory might already exist, continue
            console.debug(`Directory creation failed for ${deviceDir}: ${error}`);
          }
        }
        
        // Upload file to device
        await this.writeFile(missingFile, localContent, {
          overwrite: true,
          onProgress: (written, total) => {
            const percentage = Math.round((written / total) * 100);
            console.log(`Uploading ${missingFile}: ${percentage}%`);
          }
        });
        
        console.log(`Successfully uploaded: ${missingFile}`);
      } catch (error) {
        console.error(`Failed to upload ${missingFile}: ${error}`);
        // Continue with other files even if one fails
      }
    }
  }

  /**
   * Create directory on device
   */
  private async createDirectory(dirPath: string): Promise<void> {
    const command = `
import os
try:
    os.makedirs('${dirPath}', exist_ok=True)
    print('Directory created: ${dirPath}')
except Exception as e:
    print(f'Error creating directory: {e}')
`;
    await this.executeCode(command);
  }

  /**
   * Set WiFi configuration
   */
  async setWifiConfig(ssid: string, password: string): Promise<void> {
    const wifiConfig = `${ssid}\n${password}`;

    const command: Command = {
      code: CommandCode.SET_WIFI,
      data: wifiConfig,
    };

    const response = await this.connection.sendCommand(command);
    if (response.data.toString() !== 'done') {
      throw new CommunicationError('Failed to set WiFi configuration');
    }
  }

  /**
   * Bulk file upload with progress
   */
  async uploadFiles(
    files: Array<{ path: string; content: Buffer }>,
    options: BulkTransferOptions = {}
  ): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (options.onProgress) {
        const progress: FileTransferProgress = {
          filename: file.path,
          bytesTransferred: 0,
          totalBytes: file.content.length,
          percentage: 0,
          chunkIndex: i,
          totalChunks: files.length,
        };
        options.onProgress(progress);
      }

      await this.writeFile(file.path, file.content, {
        onProgress: options.onProgress
          ? (bytes, total) => {
              const progress: FileTransferProgress = {
                filename: file.path,
                bytesTransferred: bytes,
                totalBytes: total,
                percentage: (bytes / total) * 100,
                chunkIndex: i,
                totalChunks: files.length,
              };
              options.onProgress!(progress);
            }
          : undefined,
      });
    }
  }

  /**
   * Get connection status
   */
  getStatus(): object {
    return {
      connected: this.connection.connected,
      busy: this.connection.busy,
      port: this.connection.portName,
      connection: this.connection.getStatus(),
    };
  }

  /**
   * Parse device info response
   */
  private parseDeviceInfo(infoText: string): DeviceInfo {
    console.debug(`Parsing device info: ${infoText}`);
    
    try {
      // Parse M5Stack device info response format
      // Expected format: "platform:version:chipId:flashSize:ramSize" or JSON-like format
      const lines = infoText.split('\n').map(line => line.trim()).filter(line => line);
      
      let platform = 'M5Stack';
      let version = '1.0.0';
      let chipId = 'unknown';
      let flashSize = 0;
      let ramSize = 0;
      let macAddress: string | undefined;
      
      // Try to parse different response formats
      for (const line of lines) {
        // Handle JSON-like format first (highest priority)
        if (line.startsWith('{') && line.endsWith('}')) {
          try {
            const parsed = JSON.parse(line);
            platform = parsed.platform || platform;
            version = parsed.version || version;
            chipId = parsed.chipId || parsed.chip_id || chipId;
            flashSize = parsed.flashSize || parsed.flash_size || flashSize;
            ramSize = parsed.ramSize || parsed.ram_size || ramSize;
            macAddress = parsed.macAddress || parsed.mac_address || macAddress;
            break; // JSON parsing successful, stop processing
          } catch (e) {
            // Ignore JSON parse errors and continue with other formats
          }
        }
        
        // Handle colon-separated format: "platform:version:chipId:flashSize:ramSize[:macAddress]"
        else if (line.includes(':') && line.split(':').length >= 5 && !line.includes('=')) {
          const parts = line.split(':');
          if (parts.length >= 5) {
            platform = parts[0] || platform;
            version = parts[1] || version;
            chipId = parts[2] || chipId;
            flashSize = parseInt(parts[3]) || flashSize;
            ramSize = parseInt(parts[4]) || ramSize;
            // Handle MAC address with colons - join remaining parts
            if (parts.length > 5) {
              macAddress = parts.slice(5).join(':');
            }
            break;
          }
        }
        
        // Handle key-value pairs
        else if (line.includes('=')) {
          const [key, value] = line.split('=', 2);
          const cleanKey = key.trim().toLowerCase();
          const cleanValue = value.trim();
          
          switch (cleanKey) {
            case 'platform':
            case 'sys.platform':
              platform = cleanValue;
              break;
            case 'version':
            case 'sys.version':
              version = cleanValue;
              break;
            case 'chipid':
            case 'chip_id':
            case 'machine.unique_id':
              chipId = cleanValue;
              break;
            case 'flashsize':
            case 'flash_size':
              flashSize = parseInt(cleanValue) || flashSize;
              break;
            case 'ramsize':
            case 'ram_size':
            case 'gc.mem_alloc':
              ramSize = parseInt(cleanValue) || ramSize;
              break;
            case 'mac':
            case 'macaddress':
            case 'mac_address':
              macAddress = cleanValue;
              break;
          }
        }
      }
      
      return {
        platform,
        version,
        chipId,
        flashSize,
        ramSize,
        macAddress,
      };
    } catch (error) {
      console.warn(`Failed to parse device info: ${error}`);
      // Return default values if parsing fails
      return {
        platform: 'M5Stack',
        version: '1.0.0',
        chipId: 'unknown',
        flashSize: 0,
        ramSize: 0,
      };
    }
  }

  /**
   * Parse directory listing
   */
  private parseDirectoryListing(basePath: string, dirList: string): DirectoryEntry[] {
    if (!dirList || dirList.trim() === '') {
      return [];
    }

    return dirList
      .split(',')
      .map((item) => {
        const name = item.trim();
        if (!name) {
          return null;
        }

        const isFile = name.includes('.');
        const fullPath = basePath.endsWith('/') ? basePath + name : basePath + '/' + name;

        return {
          name,
          type: isFile ? ('file' as const) : ('directory' as const),
          path: fullPath,
        };
      })
      .filter(Boolean) as DirectoryEntry[];
  }
}
