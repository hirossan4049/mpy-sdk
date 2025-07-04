#!/usr/bin/env tsx
/**
 * M5Stack SDK CLI Tool
 * Command line interface for M5Stack operations with argument-based commands
 */

import fs from 'fs';
import { REPLAdapter } from './adapters/REPLAdapter';
import { M5StackClient } from './index';

const DEFAULT_PORT = '/dev/tty.usbserial-55520ADC16';

class M5StackCLI {
  private adapter: REPLAdapter | null = null;

  async run(args: string[]): Promise<void> {
    const [command, ...commandArgs] = args;

    if (!command || command === 'help') {
      this.showHelp();
      return;
    }

    try {
      switch (command) {
        case 'list':
        case 'ports':
          await this.listPorts();
          break;
        case 'connect':
          await this.connect(commandArgs[0] || DEFAULT_PORT);
          break;
        case 'exec':
          if (commandArgs.length < 2) {
            console.error('Usage: cli exec <port> <code>');
            process.exit(1);
          }
          await this.execWithConnection(commandArgs[0], commandArgs.slice(1).join(' '));
          break;
        case 'files':
          await this.filesWithConnection(commandArgs[0] || DEFAULT_PORT);
          break;
        case 'info':
          await this.infoWithConnection(commandArgs[0] || DEFAULT_PORT);
          break;
        case 'save':
          if (commandArgs.length < 1) {
            console.error('Usage: cli save <port> [code]');
            process.exit(1);
          }
          await this.saveWithConnection(commandArgs[0], commandArgs.slice(1).join(' '));
          break;
        case 'backup':
          await this.backupWithConnection(commandArgs[0] || DEFAULT_PORT);
          break;
        case 'restore':
          await this.restoreWithConnection(commandArgs[0] || DEFAULT_PORT);
          break;
        case 'write':
          if (commandArgs.length < 3) {
            console.error('Usage: cli write <port> <filename> <content>');
            process.exit(1);
          }
          await this.writeFileWithConnection(commandArgs[0], commandArgs[1], commandArgs.slice(2).join(' '));
          break;
        case 'read':
          if (commandArgs.length < 2) {
            console.error('Usage: cli read <port> <filename>');
            process.exit(1);
          }
          await this.readFileWithConnection(commandArgs[0], commandArgs[1]);
          break;
        case 'upload':
          if (commandArgs.length < 3) {
            console.error('Usage: cli upload <port> <local_file> <device_path>');
            process.exit(1);
          }
          await this.uploadFileWithConnection(commandArgs[0], commandArgs[1], commandArgs[2]);
          break;
        case 'download':
          if (commandArgs.length < 3) {
            console.error('Usage: cli download <port> <device_file> <local_path>');
            process.exit(1);
          }
          await this.downloadFileWithConnection(commandArgs[0], commandArgs[1], commandArgs[2]);
          break;
        default:
          console.error(`Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    } finally {
      if (this.adapter) {
        await this.adapter.disconnect();
      }
    }
  }

  async listPorts(): Promise<void> {
    const client = new M5StackClient();
    const ports = await client.listPorts();
    const m5Ports = ports.filter(port => 
      port.path.includes('usbserial') || port.path.includes('COM')
    );
    
    if (m5Ports.length === 0) {
      console.log('No M5Stack devices found');
      return;
    }
    
    m5Ports.forEach(port => {
      console.log(port.path);
    });
  }

  private async withConnection<T>(port: string, operation: (adapter: REPLAdapter) => Promise<T>): Promise<T> {
    this.adapter = new REPLAdapter(port);
    
    try {
      await this.adapter.connect();
      await this.adapter.initialize();
      
      const result = await operation(this.adapter);
      
      await this.adapter.disconnect();
      this.adapter = null;
      
      return result;
    } catch (error) {
      if (this.adapter) {
        await this.adapter.disconnect();
        this.adapter = null;
      }
      throw error;
    }
  }

  async connect(port: string = DEFAULT_PORT): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      // Perform connection test
      console.log('Testing connection...');
      
      // Test basic communication
      const testCode = 'print("Connection test successful")';
      const result = await adapter.executeCode(testCode);
      
      if (result.error) {
        console.error('Connection test failed:', result.error);
        throw new Error(`Connection test failed: ${result.error}`);
      }
      
      console.log('Connection test result:', result.output.trim());
      
      // Test device info retrieval
      try {
        const deviceInfo = await adapter.getDeviceInfo();
        console.log('Device info retrieved:');
        console.log(`  Platform: ${deviceInfo.platform}`);
        console.log(`  Version: ${deviceInfo.version}`);
        console.log(`  Chip ID: ${deviceInfo.chipId}`);
        if (deviceInfo.macAddress) {
          console.log(`  MAC Address: ${deviceInfo.macAddress}`);
        }
      } catch (error) {
        console.warn('Failed to retrieve device info:', error);
      }
      
      // Test file system access
      try {
        const rootDir = await adapter.listDirectory('/');
        console.log(`File system accessible (${rootDir.length} items in root)`);
      } catch (error) {
        console.warn('Failed to access file system:', error);
      }
      
      console.log('Connection established successfully!');
    });
  }

  async execWithConnection(port: string, code: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      const result = await adapter.executeCode(code);
      if (result.error) {
        console.error('Error:', result.error);
      } else {
        console.log(result.output.trim());
      }
    });
  }

  async filesWithConnection(port: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      const files = await adapter.listDirectory('/');
      files.forEach(file => {
        console.log(file.name);
      });
    });
  }

  async infoWithConnection(port: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      const info = await adapter.getDeviceInfo();
      console.log(`Platform: ${info.platform}`);
      console.log(`Version: ${info.version}`);
      console.log(`Chip ID: ${info.chipId}`);
    });
  }

  async saveWithConnection(port: string, code?: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      if (!code) {
        code = `
from m5stack import *
from m5ui import *
from uiflow import *
import time

setScreenColor(0x111111)
title = M5TextBox(10, 10, "Persistent App", lcd.FONT_Default, 0x00FF00, rotate=0)
status = M5TextBox(10, 40, "Running...", lcd.FONT_Default, 0xFFFFFF, rotate=0)

while True:
    status.setText(f"Time: {time.time()}")
    time.sleep(1)
`;
      }

      await adapter.writeFile('/main.py', code);
    });
  }

  async writeFileWithConnection(port: string, filename: string, content: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      await adapter.writeFile(filename, content);
    });
  }

  async readFileWithConnection(port: string, filename: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      const content = await adapter.readFile(filename);
      console.log(content.toString());
    });
  }

  async uploadFileWithConnection(port: string, localFile: string, devicePath: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      if (!fs.existsSync(localFile)) {
        console.error(`Local file not found: ${localFile}`);
        process.exit(1);
      }
      
      const content = fs.readFileSync(localFile, 'utf8');
      await adapter.writeFile(devicePath, content);
    });
  }

  async downloadFileWithConnection(port: string, deviceFile: string, localPath: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      const content = await adapter.readFile(deviceFile);
      fs.writeFileSync(localPath, content.toString());
    });
  }

  async backupWithConnection(port: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      const files = await adapter.listDirectory('/');
      const backup: Record<string, string> = {};

      for (const file of files) {
        if (file.type === 'file' && (file.name.endsWith('.py') || file.name.endsWith('.json'))) {
          try {
            const content = await adapter.readFile(`/${file.name}`);
            backup[file.name] = content.toString();
          } catch (error) {
            // Skip files that can't be read
          }
        }
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `m5stack-backup-${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
      console.log(filename);
    });
  }

  async restoreWithConnection(port: string): Promise<void> {
    return this.withConnection(port, async (adapter) => {
      const backupFiles = fs.readdirSync('.').filter(f => f.startsWith('m5stack-backup-') && f.endsWith('.json'));
      
      if (backupFiles.length === 0) {
        console.error('No backup files found');
        process.exit(1);
      }

      const latestBackup = backupFiles.sort().pop()!;
      const backup = JSON.parse(fs.readFileSync(latestBackup, 'utf8')) as Record<string, string>;

      for (const [filename, content] of Object.entries(backup)) {
        try {
          await adapter.writeFile(`/${filename}`, content);
        } catch (error) {
          // Skip files that can't be written
        }
      }
    });
  }

  showHelp(): void {
    console.log(`Usage: pnpm cli <command> [args...]

Commands:
  list                        - List available M5Stack devices
  connect <port>              - Test connection to M5Stack device
  exec <port> <code>          - Execute Python code on device
  files <port>                - List files on device
  info <port>                 - Show device information
  save <port> [code]          - Save code to main.py (auto-runs on boot)
  backup <port>               - Backup all firmware files to local JSON
  restore <port>              - Restore from latest backup file
  write <port> <file> <content> - Write content to specific file
  read <port> <file>          - Read content from specific file
  upload <port> <local> <device> - Upload local file to device
  download <port> <device> <local> - Download device file to local path
  help                        - Show this help

Examples:
  pnpm cli list
  pnpm cli connect /dev/tty.usbserial-xxx
  pnpm cli exec /dev/tty.usbserial-xxx "print('Hello M5Stack!')"
  pnpm cli files /dev/tty.usbserial-xxx
  pnpm cli save /dev/tty.usbserial-xxx "print('Boot message!')"
  pnpm cli backup /dev/tty.usbserial-xxx
  pnpm cli write /dev/tty.usbserial-xxx /test.py "print('test')"
  pnpm cli read /dev/tty.usbserial-xxx /main.py
  pnpm cli upload /dev/tty.usbserial-xxx ./local.py /remote.py
  pnpm cli download /dev/tty.usbserial-xxx /main.py ./downloaded.py`);
  }
}

// Check if this is the main module
// Skip this check during Jest testing
if (process.env.NODE_ENV !== 'test' && typeof process !== 'undefined' && process.argv) {
  // In a real module environment, use require.main for ES compatibility
  const isMainModule = require.main === module || 
    (typeof __filename !== 'undefined' && process.argv[1] === __filename);
  
  if (isMainModule) {
    const cli = new M5StackCLI();
    // Remove first two args (node and script path)
    const args = process.argv.slice(2);
    cli.run(args).catch((error) => {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
  }
}

export { M5StackCLI };