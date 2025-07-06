#!/usr/bin/env tsx
import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import fs from 'fs';
import { M5StackClient, NodeREPLAdapter } from '@h1mpy-sdk/node';

interface PortItem {
  label: string;
  value: string;
}

interface DeviceInfo {
  platform: string;
  version: string;
  flashSize: number;
  ramSize: number;
  macAddress: string;
}

interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  path: string;
}

const CLI = () => {
  const { exit } = useApp();
  const [screen, setScreen] = useState('menu');
  const [ports, setPorts] = useState<PortItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [adapter, setAdapter] = useState<NodeREPLAdapter | null>(null);
  const [message, setMessage] = useState('');
  const [commandResult, setCommandResult] = useState('');
  const [currentPath, setCurrentPath] = useState('/');
  const [currentFiles, setCurrentFiles] = useState<FileEntry[]>([]);

  useEffect(() => {
    loadPorts();
  }, []);

  const loadPorts = async () => {
    setLoading(true);
    try {
      const client = new M5StackClient();
      const availablePorts = await client.listPorts();
      const portItems = availablePorts
        .filter(port => port.path.includes('usbserial') || port.path.includes('COM'))
        .map(port => ({
          label: `${port.path} - ${port.manufacturer || 'Unknown'}`,
          value: port.path
        }));
      
      if (portItems.length === 0) {
        portItems.push({ label: 'No M5Stack devices found', value: '' });
      }
      
      setPorts(portItems);
    } catch (error) {
      setMessage(`Error loading ports: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  const loadDirectory = async (path: string) => {
    if (!adapter) return;
    
    setLoading(true);
    try {
      const files = await adapter.listDirectory(path);
      setCurrentFiles(files);
      setCurrentPath(path);
    } catch (error) {
      setMessage(`Error loading directory: ${error instanceof Error ? error.message : String(error)}`);
    }
    setLoading(false);
  };

  const handleFileSelect = async (file: FileEntry) => {
    if (file.type === 'directory') {
      await loadDirectory(file.path);
    } else {
      setCommandResult(`Selected file: ${file.name} at ${file.path}`);
    }
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDirectory(parentPath);
  };

  const handlePortSelect = async (item: PortItem) => {
    if (!item.value || item.value === '') {
      setMessage('No valid port selected');
      return;
    }

    setLoading(true);
    setSelectedPort(item.value);
    
    try {
      const newAdapter = new NodeREPLAdapter(item.value);
      await newAdapter.connect();
      await newAdapter.initialize();
      setAdapter(newAdapter);
      setMessage(`Connected to ${item.value}`);
      setScreen('connected');
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Resource busy') || errorMessage.includes('cannot open')) {
        errorMessage += '\nHint: The serial port may be in use by another application. Please ensure no other programs are using it, or try reconnecting the device.';
      }
      setMessage(`Connection failed: ${errorMessage}`);
      setSelectedPort(null);
    }
    setLoading(false);
  };

  const mainMenuItems = [
    { label: '📡 Connect to Device', value: 'connect' },
    { label: '🔄 Refresh Ports', value: 'refresh' },
    { label: '❌ Exit', value: 'exit' }
  ];

  const connectedMenuItems = [
    { label: '🐍 Execute Python Code', value: 'exec' },
    { label: '📁 Browse Files', value: 'browse' },
    { label: '📊 Device Info', value: 'info' },
    { label: '💾 Save to main.py', value: 'save' },
    { label: '📥 Backup Firmware', value: 'backup' },
    { label: '📤 Restore Firmware', value: 'restore' },
    { label: '🔌 Disconnect', value: 'disconnect' },
    { label: '❌ Exit', value: 'exit' }
  ];

  const handleMainMenu = async (item: {value: string}) => {
    switch (item.value) {
      case 'connect':
        setScreen('ports');
        break;
      case 'refresh':
        await loadPorts();
        break;
      case 'exit':
        if (adapter) await adapter.disconnect();
        exit();
        break;
    }
  };

  const handleConnectedMenu = async (item: {value: string}) => {
    setCommandResult('');
    setLoading(true);

    try {
      switch (item.value) {
        case 'exec':
          if (adapter) {
            const result = await adapter.executeCode('print("Hello from M5Stack!")');
            setCommandResult(result.output);
          }
          break;

        case 'browse':
          setScreen('browse');
          await loadDirectory('/');
          break;

        case 'info':
          if (adapter) {
            const info = await adapter.getDeviceInfo();
            setCommandResult(`Device Info:\nPlatform: ${info.platform}\nVersion: ${info.version}\nFlash: ${info.flashSize}\nRAM: ${info.ramSize}\nMAC: ${info.macAddress}`);
          }
          break;

        case 'save':
          const code = `
from m5stack import *
from m5ui import *
import time

setScreenColor(0x111111)
title = M5TextBox(10, 10, "M5Stack CLI", lcd.FONT_Default, 0x00FF00, rotate=0)
status = M5TextBox(10, 40, "Running...", lcd.FONT_Default, 0xFFFFFF, rotate=0)

while True:
    status.setText(f"Time: {time.time()}")
    time.sleep(1)
`;
          if (adapter) {
            await adapter.writeFile('/main.py', code);
            setCommandResult('Saved persistent app to main.py');
          }
          break;

        case 'backup':
          if (adapter) {
            const backupFiles = await adapter.listDirectory('/');
            const backup: Record<string, string> = {};
            let backedUp = 0;

            for (const file of backupFiles) {
              if (file.type === 'file' && (file.name.endsWith('.py') || file.name.endsWith('.json'))) {
                try {
                  const content = await adapter.readFile(`/${file.name}`);
                  backup[file.name] = content.toString();
                  backedUp++;
                } catch (error) {
                  // Skip files that can't be read
                }
              }
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `m5stack-backup-${timestamp}.json`;
            fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
            setCommandResult(`Backup complete: ${backedUp} files saved to ${filename}`);
          }
          break;


        case 'restore':
          if (adapter) {
            const backupFilesList = fs.readdirSync('.')
              .filter(f => f.startsWith('m5stack-backup-') && f.endsWith('.json'));
            
            if (backupFilesList.length === 0) {
              setCommandResult('No backup files found');
              break;
            }

            const latestBackup = backupFilesList.sort().pop();
            if (latestBackup) {
              const backupData = JSON.parse(fs.readFileSync(latestBackup, 'utf8'));
              let restored = 0;

              for (const [filename, content] of Object.entries(backupData)) {
                try {
                  await adapter.writeFile(`/${filename}`, content as string);
                  restored++;
                } catch (error) {
                  // Skip files that can't be written
                }
              }

              setCommandResult(`Restore complete: ${restored} files from ${latestBackup}`);
            }
          }
          break;

        case 'disconnect':
          if (adapter) {
            await adapter.disconnect();
            setAdapter(null);
            setSelectedPort(null);
            setScreen('menu');
            setMessage('Disconnected');
          }
          break;

        case 'exit':
          if (adapter) await adapter.disconnect();
          exit();
          break;
      }
    } catch (error) {
      setCommandResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }

    setLoading(false);
  };

  useInput((input) => {
    if (input === 'q') {
      if (adapter) adapter.disconnect();
      exit();
    }
  });

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">🔧 M5Stack SDK CLI</Text>
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}

      {loading && (
        <Box marginBottom={1}>
          <Text color="green">
            <Spinner type="dots" /> Loading...
          </Text>
        </Box>
      )}

      {screen === 'menu' && !loading && (
        <SelectInput items={mainMenuItems} onSelect={handleMainMenu} />
      )}

      {screen === 'ports' && !loading && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>Select a device:</Text>
          </Box>
          <SelectInput items={ports} onSelect={handlePortSelect} />
        </Box>
      )}

      {screen === 'connected' && !loading && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="green">✅ Connected to {selectedPort}</Text>
          </Box>
          <SelectInput items={connectedMenuItems} onSelect={handleConnectedMenu} />
        </Box>
      )}

      {screen === 'browse' && !loading && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="cyan">📁 Browse Files: {currentPath}</Text>
          </Box>
          {currentPath !== '/' && (
            <Box marginBottom={1}>
              <Text color="yellow">← Press Enter on ".." to go up</Text>
            </Box>
          )}
          <SelectInput
            items={[
              ...(currentPath !== '/' ? [{ label: '📁 ..', value: '..' }] : []),
              ...currentFiles.map(file => ({
                label: `${file.type === 'directory' ? '📁' : '📄'} ${file.name}`,
                value: file.name
              })),
              { label: '🔙 Back to Menu', value: 'back' }
            ]}
            onSelect={(item) => {
              if (item.value === '..') {
                navigateUp();
              } else if (item.value === 'back') {
                setScreen('connected');
              } else {
                const selectedFile = currentFiles.find(f => f.name === item.value);
                if (selectedFile) {
                  handleFileSelect(selectedFile);
                }
              }
            }}
          />
        </Box>
      )}

      {commandResult && (
        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text>{commandResult}</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Press 'q' to quit</Text>
      </Box>
    </Box>
  );
};

// Default export for programmatic use
export default CLI;

// Auto-render when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if stdin supports raw mode
  const isRawModeSupported = process.stdin.isTTY && typeof process.stdin.setRawMode === 'function';
  
  if (!isRawModeSupported) {
    console.log('🚨 Raw mode not supported. Running in compatibility mode...');
    console.log('📡 M5Stack CLI - Non-interactive mode');
    console.log('');
    console.log('Use the command line interface instead:');
    console.log('  📋 List available devices:');
    console.log('    pnpm cli list-ports');
    console.log('');
    console.log('  📊 Get device information:');
    console.log('    pnpm cli info /dev/tty.usbserial-55520ADC16');
    console.log('');
    console.log('  📁 Browse directories:');
    console.log('    pnpm cli ls /dev/tty.usbserial-55520ADC16');
    console.log('    pnpm cli ls /dev/tty.usbserial-55520ADC16 --path /flash');
    console.log('    pnpm cli ls /dev/tty.usbserial-55520ADC16 --path /flash/apps');
    console.log('');
    console.log('  🐍 Execute Python code:');
    console.log('    pnpm cli exec /dev/tty.usbserial-55520ADC16 "print(\'Hello M5Stack!\')"');
    console.log('');
    process.exit(0);
  }
  
  render(<CLI />);
}
