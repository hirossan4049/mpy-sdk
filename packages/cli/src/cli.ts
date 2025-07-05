#!/usr/bin/env node
/**
 * @h1mpy-sdk/cli
 * 
 * Command-line interface for M5Stack MicroPython SDK
 */

import { M5StackClient, NodeREPLAdapter } from '@h1mpy-sdk/node';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';

// CLI version
const CLI_VERSION = '1.0.0';

// Utility functions
async function listPorts() {
  try {
    const client = new M5StackClient();
    const ports = await client.listPorts();

    console.log('📡 Available M5Stack devices:');
    if (ports.length === 0) {
      console.log('   No devices found');
      return;
    }

    ports.forEach((port, index) => {
      const manufacturer = port.manufacturer || 'Unknown';
      console.log(`   ${index + 1}. ${port.path} - ${manufacturer}`);
    });
  } catch (error) {
    console.error('❌ Error listing ports:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function connectToDevice(portPath: string) {
  try {
    console.log(`📡 Connecting to ${portPath}...`);
    const adapter = new NodeREPLAdapter(portPath);
    await adapter.connect();
    await adapter.initialize();
    console.log('✅ Connected successfully!');
    return adapter;
  } catch (error) {
    console.error('❌ Connection failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function executeCode(portPath: string, code: string) {
  const adapter = await connectToDevice(portPath);

  try {
    console.log('🐍 Executing Python code...');
    const result = await adapter.executeCode(code);
    console.log('✅ Execution result:');
    console.log(result.output);
  } catch (error) {
    console.error('❌ Execution failed:', error instanceof Error ? error.message : String(error));
  } finally {
    await adapter.disconnect();
  }
}

async function uploadFile(portPath: string, localFile: string, remotePath?: string) {
  const adapter = await connectToDevice(portPath);

  try {
    const content = fs.readFileSync(localFile, 'utf8');
    const targetPath = remotePath || `/flash/${path.basename(localFile)}`;

    console.log(`📤 Uploading ${localFile} to ${targetPath}...`);
    await adapter.writeFile(targetPath, content);
    console.log('✅ File uploaded successfully!');
  } catch (error) {
    console.error('❌ Upload failed:', error instanceof Error ? error.message : String(error));
  } finally {
    await adapter.disconnect();
  }
}

async function downloadFile(portPath: string, remotePath: string, localFile?: string) {
  const adapter = await connectToDevice(portPath);

  try {
    console.log(`📥 Downloading ${remotePath}...`);
    const content = await adapter.readFile(remotePath);
    const targetFile = localFile || path.basename(remotePath);

    fs.writeFileSync(targetFile, content);
    console.log(`✅ File downloaded to ${targetFile}`);
  } catch (error) {
    console.error('❌ Download failed:', error instanceof Error ? error.message : String(error));
  } finally {
    await adapter.disconnect();
  }
}

async function listFiles(portPath: string, remotePath: string = '/') {
  const adapter = await connectToDevice(portPath);

  try {
    console.log(`📁 Listing files in ${remotePath}:`);
    const files = await adapter.listDirectory(remotePath);

    files.forEach(file => {
      const icon = file.type === 'directory' ? '📁' : '📄';
      console.log(`   ${icon} ${file.name}`);
    });
  } catch (error) {
    console.error('❌ List failed:', error instanceof Error ? error.message : String(error));
  } finally {
    await adapter.disconnect();
  }
}

async function getDeviceInfo(portPath: string) {
  const adapter = await connectToDevice(portPath);

  try {
    console.log('📊 Getting device information...');
    const info = await adapter.getDeviceInfo();

    console.log('✅ Device Information:');
    console.log(`   Platform: ${info.platform}`);
    console.log(`   Version: ${info.version}`);
    console.log(`   Chip ID: ${info.chipId}`);
    if (info.macAddress) {
      console.log(`   MAC Address: ${info.macAddress}`);
    }
  } catch (error) {
    console.error('❌ Failed to get device info:', error instanceof Error ? error.message : String(error));
  } finally {
    await adapter.disconnect();
  }
}

// CLI setup
program
  .name('m5stack-cli')
  .description('Command-line interface for M5Stack MicroPython SDK')
  .version(CLI_VERSION);

program
  .command('list-ports')
  .alias('ls-ports')
  .description('List available serial ports')
  .action(listPorts);

program
  .command('exec <port> <code>')
  .description('Execute Python code on device')
  .action(executeCode);

program
  .command('upload <port> <file>')
  .description('Upload file to device')
  .option('-r, --remote <path>', 'Remote path on device')
  .action((port, file, options) => {
    uploadFile(port, file, options.remote);
  });

program
  .command('download <port> <remote-path>')
  .description('Download file from device')
  .option('-l, --local <file>', 'Local file name')
  .action((port, remotePath, options) => {
    downloadFile(port, remotePath, options.local);
  });

program
  .command('ls <port>')
  .description('List files on device')
  .option('-p, --path <path>', 'Remote path to list', '/')
  .action((port, options) => {
    listFiles(port, options.path);
  });

program
  .command('info <port>')
  .description('Get device information')
  .action(getDeviceInfo);

program
  .command('repl <port>')
  .description('Start interactive REPL session')
  .action(async (portPath) => {
    const adapter = await connectToDevice(portPath);

    console.log('🐍 Starting REPL session...');
    console.log('Type "exit()" or press Ctrl+C to quit');

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '>>> '
    });

    rl.prompt();

    rl.on('line', async (input: string) => {
      const code = input.trim();
      if (code === 'exit()' || code === 'quit()') {
        await adapter.disconnect();
        rl.close();
        return;
      }

      try {
        const result = await adapter.executeCode(code);
        console.log(result.output);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
      }

      rl.prompt();
    });

    rl.on('close', async () => {
      console.log('\n👋 Goodbye!');
      await adapter.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n📡 Disconnecting...');
      await adapter.disconnect();
      process.exit(0);
    });
  });

// Parse command line arguments
program.parse();