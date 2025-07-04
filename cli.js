#!/usr/bin/env node
/**
 * M5Stack SDK CLI Tool
 * Simple command line interface for M5Stack operations
 */

const { REPLAdapter } = require('./dist/node/adapters/REPLAdapter');
const readline = require('readline');

const DEFAULT_PORT = '/dev/tty.usbserial-55520ADC16';

class M5StackCLI {
  constructor() {
    this.adapter = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'M5Stack> '
    });
  }

  async start() {
    console.log('🔧 M5Stack SDK CLI');
    console.log('Commands: connect, disconnect, exec <code>, files, info, save, backup, restore, help, exit');
    console.log();

    this.rl.prompt();

    this.rl.on('line', async (input) => {
      const [command, ...args] = input.trim().split(' ');
      
      try {
        switch (command) {
          case 'connect':
            await this.connect(args[0] || DEFAULT_PORT);
            break;
          case 'disconnect':
            await this.disconnect();
            break;
          case 'exec':
            await this.executeCode(args.join(' '));
            break;
          case 'files':
            await this.listFiles();
            break;
          case 'info':
            await this.getInfo();
            break;
          case 'save':
            await this.saveMain(args.join(' '));
            break;
          case 'backup':
            await this.backupFirmware();
            break;
          case 'restore':
            await this.restoreFirmware();
            break;
          case 'help':
            this.showHelp();
            break;
          case 'exit':
            await this.exit();
            return;
          default:
            if (command) {
              console.log(`Unknown command: ${command}. Type 'help' for commands.`);
            }
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
      
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      this.exit();
    });
  }

  async connect(port = DEFAULT_PORT) {
    if (this.adapter) {
      console.log('Already connected. Disconnect first.');
      return;
    }

    console.log(`📡 Connecting to ${port}...`);
    this.adapter = new REPLAdapter(port);
    
    try {
      await this.adapter.connect();
      await this.adapter.initialize();
      console.log('✅ Connected successfully!');
    } catch (error) {
      this.adapter = null;
      throw error;
    }
  }

  async disconnect() {
    if (!this.adapter) {
      console.log('Not connected.');
      return;
    }

    await this.adapter.disconnect();
    this.adapter = null;
    console.log('📡 Disconnected');
  }

  async executeCode(code) {
    if (!this.adapter) {
      console.log('Not connected. Use "connect" first.');
      return;
    }

    if (!code) {
      console.log('No code provided. Usage: exec <python_code>');
      return;
    }

    console.log(`🐍 Executing: ${code}`);
    const result = await this.adapter.executeCode(code);
    console.log('Output:', result.output.trim() || '(no output)');
  }

  async listFiles() {
    if (!this.adapter) {
      console.log('Not connected. Use "connect" first.');
      return;
    }

    console.log('📁 Files:');
    const files = await this.adapter.listDirectory('/');
    files.forEach(file => {
      const icon = file.type === 'directory' ? '📁' : '📄';
      console.log(`  ${icon} ${file.name}`);
    });
  }

  async getInfo() {
    if (!this.adapter) {
      console.log('Not connected. Use "connect" first.');
      return;
    }

    console.log('📊 Device Info:');
    const info = await this.adapter.getDeviceInfo();
    console.log(`  Platform: ${info.platform}`);
    console.log(`  Version: ${info.version}`);
    console.log(`  Memory: ${info.memory}`);
  }

  async saveMain(code) {
    if (!this.adapter) {
      console.log('Not connected. Use "connect" first.');
      return;
    }

    if (!code) {
      // Save default persistent app
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

    console.log('💾 Saving to main.py (auto-runs on boot)...');
    await this.adapter.writeFile('/main.py', code);
    console.log('✅ Saved! Will run automatically on next boot.');
  }

  async backupFirmware() {
    if (!this.adapter) {
      console.log('Not connected. Use "connect" first.');
      return;
    }

    console.log('💾 Creating firmware backup...');
    const files = await this.adapter.listDirectory('/');
    const backup = {};

    for (const file of files) {
      if (file.type === 'file' && (file.name.endsWith('.py') || file.name.endsWith('.json'))) {
        try {
          const content = await this.adapter.readFile(`/${file.name}`);
          backup[file.name] = content.toString();
          console.log(`✅ Backed up ${file.name}`);
        } catch (error) {
          console.log(`⚠️ Could not backup ${file.name}: ${error.message}`);
        }
      }
    }

    // Save backup to local file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `m5stack-backup-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    console.log(`💾 Backup saved to ${filename}`);
  }

  async restoreFirmware() {
    if (!this.adapter) {
      console.log('Not connected. Use "connect" first.');
      return;
    }

    const fs = require('fs');
    const backupFiles = fs.readdirSync('.').filter(f => f.startsWith('m5stack-backup-') && f.endsWith('.json'));
    
    if (backupFiles.length === 0) {
      console.log('No backup files found. Use "backup" command first.');
      return;
    }

    const latestBackup = backupFiles.sort().pop();
    console.log(`📥 Restoring from ${latestBackup}...`);

    const backup = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));

    for (const [filename, content] of Object.entries(backup)) {
      try {
        await this.adapter.writeFile(`/${filename}`, content);
        console.log(`✅ Restored ${filename}`);
      } catch (error) {
        console.log(`⚠️ Could not restore ${filename}: ${error.message}`);
      }
    }

    console.log('📥 Firmware restoration complete');
  }

  showHelp() {
    console.log(`
Commands:
  connect [port]    - Connect to M5Stack device (default: ${DEFAULT_PORT})
  disconnect        - Disconnect from device
  exec <code>       - Execute Python code
  files             - List files on device
  info              - Show device information
  save [code]       - Save code to main.py (auto-runs on boot)
  backup            - Backup all firmware files
  restore           - Restore from latest backup
  help              - Show this help
  exit              - Exit CLI

Examples:
  connect
  exec print("Hello M5Stack!")
  save print("This runs on boot!")
  backup
  files
`);
  }

  async exit() {
    if (this.adapter) {
      await this.disconnect();
    }
    console.log('👋 Goodbye!');
    process.exit(0);
  }
}

if (require.main === module) {
  const cli = new M5StackCLI();
  cli.start().catch(console.error);
}

module.exports = { M5StackCLI };