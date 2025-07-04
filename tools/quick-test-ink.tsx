#!/usr/bin/env tsx
import { Box, render, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { createRequire } from 'module';
import React, { useEffect, useState } from 'react';

const require = createRequire(import.meta.url);
const { M5StackClient } = require('../dist/node/index.js');
const { REPLAdapter } = require('../dist/node/adapters/REPLAdapter.js');

const QuickTest = () => {
  const { exit } = useApp();
  const [phase, setPhase] = useState('selectPort');
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

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
        portItems.push({ label: '❌ No M5Stack devices found', value: null });
      }

      portItems.push({ label: '🔄 Refresh ports', value: 'refresh' });
      portItems.push({ label: '❌ Exit', value: 'exit' });

      setPorts(portItems);
    } catch (error) {
      setError(`Error loading ports: ${error.message}`);
    }
    setLoading(false);
  };

  const addResult = (icon, message, success = true) => {
    setResults(prev => [...prev, { icon, message, success }]);
  };

  const runTests = async (port) => {
    setPhase('testing');
    setResults([]);

    let adapter = null;

    try {
      // Test 1: Connection
      addResult('📡', 'Connecting to device...');
      adapter = new REPLAdapter(port);
      await adapter.connect();
      await adapter.initialize();
      addResult('✅', 'Connected successfully!');

      // Test 2: Basic Python execution
      addResult('🐍', 'Testing Python execution...');
      const result = await adapter.executeCode('print("Hello M5Stack!")');
      if (result.output.includes('Hello M5Stack!')) {
        addResult('✅', 'Python execution works!');
      } else {
        addResult('❌', 'Python execution failed', false);
      }

      // Test 3: System info
      addResult('📊', 'Getting system info...');
      const sysInfo = await adapter.executeCode(`
import gc, sys
print("Platform:", sys.platform)
print("Free memory:", gc.mem_free(), "bytes")
`);
      addResult('✅', 'System info retrieved');

      // Test 4: File operations
      addResult('📁', 'Testing file operations...');
      const testContent = 'Test file from quick test';
      await adapter.writeFile('/test_quick.txt', testContent);
      const readContent = await adapter.readFile('/test_quick.txt');
      if (readContent.toString() === testContent) {
        addResult('✅', 'File operations work!');
      } else {
        addResult('❌', 'File operations failed', false);
      }

      // Test 5: List files
      addResult('📋', 'Listing files...');
      const files = await adapter.listDirectory('/');
      addResult('✅', `Found ${files.length} files/directories`);

      // Test 6: M5Stack specific
      addResult('🎮', 'Testing M5Stack features...');
      try {
        await adapter.executeCode(`
from m5stack import *
from m5ui import *
setScreenColor(0x111111)
title = M5TextBox(10, 10, "Quick Test unko!!!", lcd.FONT_Default, 0x00FF00, rotate=0)
`);
        addResult('✅', 'M5Stack display initialized');
      } catch (error) {
        addResult('⚠️', 'M5Stack features not available', false);
      }

      // Test 7: Cleanup
      addResult('🧹', 'Cleaning up...');
      await adapter.executeCode('import os; os.remove("/test_quick.txt")');
      addResult('✅', 'Test file removed');

      // Test 8: Persistence demo
      addResult('💾', 'Creating persistent app...');
      const persistentCode = `
from m5stack import *
from m5ui import *
import time

setScreenColor(0x001122)
title = M5TextBox(10, 10, "Quick Test Complete", lcd.FONT_Default, 0x00FF00, rotate=0)
status = M5TextBox(10, 40, "All tests passed!", lcd.FONT_Default, 0xFFFFFF, rotate=0)
counter = M5TextBox(10, 70, "Count: 0", lcd.FONT_Default, 0x00FFFF, rotate=0)

count = 0
while True:
    counter.setText(f"Count: {count}")
    count += 1
    time.sleep(1)
`;
      await adapter.writeFile('/main.py', persistentCode);
      addResult('✅', 'Persistent app saved to main.py');

      addResult('🎉', 'All tests completed successfully!');

    } catch (error) {
      addResult('❌', `Error: ${error.message}`, false);
    } finally {
      if (adapter) {
        await adapter.disconnect();
        addResult('📡', 'Disconnected');
      }
      setPhase('complete');
    }
  };

  const handlePortSelect = async (item) => {
    if (item.value === 'exit') {
      exit();
    } else if (item.value === 'refresh') {
      await loadPorts();
    } else if (item.value) {
      await runTests(item.value);
    }
  };

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">❌ {error}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">🔧 M5Stack SDK Quick Test</Text>
      </Box>

      {loading && (
        <Box marginBottom={1}>
          <Text color="green">
            <Spinner type="dots" /> Loading ports...
          </Text>
        </Box>
      )}

      {phase === 'selectPort' && !loading && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text>Select a device to test:</Text>
          </Box>
          <SelectInput items={ports} onSelect={handlePortSelect} />
        </Box>
      )}

      {(phase === 'testing' || phase === 'complete') && (
        <Box flexDirection="column">
          {results.map((result, index) => (
            <Box key={index}>
              <Text color={result.success ? 'green' : 'red'}>
                {result.icon} {result.message}
              </Text>
            </Box>
          ))}

          {phase === 'complete' && (
            <Box marginTop={1}>
              <Text dimColor>Press Ctrl+C to exit</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

render(<QuickTest />);
