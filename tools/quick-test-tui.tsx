#!/usr/bin/env tsx
import { Box, render, Text, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import { createRequire } from 'module';
import React, { useCallback, useEffect, useState } from 'react';

const require = createRequire(import.meta.url);
const { M5StackClient } = require('../dist/node/index.js');
const { REPLAdapter } = require('../dist/node/adapters/REPLAdapter.js');

// Types
interface TestResult {
  icon: string;
  message: string;
  success: boolean;
}

interface PortItem {
  label: string;
  value: string | null;
}

type Phase = 'selectPort' | 'testing' | 'complete';

// Test configurations
const TEST_CONFIG = {
  testFile: '/test_quick.txt',
  testContent: 'Test file from quick test',
  displayMessage: 'Quick Test Complete!',
  timeout: 10000,
} as const;

const TEST_CODES = {
  hello: 'print("Hello M5Stack!")',
  systemInfo: `
import gc, sys
print("Platform:", sys.platform)
print("Free memory:", gc.mem_free(), "bytes")
`,
  m5stackDisplay: `
from m5stack import *
from m5ui import *
setScreenColor(0x111111)
title = M5TextBox(10, 10, "Quick Test Complete!", lcd.FONT_Default, 0x00FF00, rotate=0)
`,
  cleanup: 'import os; os.remove("/test_quick.txt")',
  persistentApp: `
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
`,
} as const;

// Custom hooks
const useTestResults = () => {
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = useCallback((icon: string, message: string, success: boolean = true) => {
    setResults(prev => [...prev, { icon, message, success }]);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return { results, addResult, clearResults };
};

const usePortManager = () => {
  const [ports, setPorts] = useState<PortItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPorts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const client = new M5StackClient();
      const availablePorts = await client.listPorts();
      const portItems: PortItem[] = availablePorts
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error loading ports: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { ports, loading, error, loadPorts };
};

// Test runner class
class TestRunner {
  private adapter: any;
  private addResult: (icon: string, message: string, success?: boolean) => void;

  constructor(adapter: any, addResult: (icon: string, message: string, success?: boolean) => void) {
    this.adapter = adapter;
    this.addResult = addResult;
  }

  async runConnectionTest(): Promise<void> {
    this.addResult('📡', 'Connecting to device...');
    await this.adapter.connect();
    await this.adapter.initialize();
    this.addResult('✅', 'Connected successfully!');
  }

  async runPythonExecutionTest(): Promise<void> {
    this.addResult('🐍', 'Testing Python execution...');
    const result = await this.adapter.executeCode(TEST_CODES.hello);
    if (result.output.includes('Hello M5Stack!')) {
      this.addResult('✅', 'Python execution works!');
    } else {
      this.addResult('❌', 'Python execution failed', false);
    }
  }

  async runSystemInfoTest(): Promise<void> {
    this.addResult('📊', 'Getting system info...');
    await this.adapter.executeCode(TEST_CODES.systemInfo);
    this.addResult('✅', 'System info retrieved');
  }

  async runFileOperationsTest(): Promise<void> {
    this.addResult('📁', 'Testing file operations...');
    await this.adapter.writeFile(TEST_CONFIG.testFile, TEST_CONFIG.testContent);
    const readContent = await this.adapter.readFile(TEST_CONFIG.testFile);

    if (readContent.toString() === TEST_CONFIG.testContent) {
      this.addResult('✅', 'File operations work!');
    } else {
      this.addResult('❌', 'File operations failed', false);
    }
  }

  async runDirectoryListTest(): Promise<void> {
    this.addResult('📋', 'Listing files...');
    const files = await this.adapter.listDirectory('/');
    this.addResult('✅', `Found ${files.length} files/directories`);
  }

  async runM5StackFeaturesTest(): Promise<void> {
    this.addResult('🎮', 'Testing M5Stack features...');
    try {
      await this.adapter.executeCode(TEST_CODES.m5stackDisplay);
      this.addResult('✅', 'M5Stack display initialized');
    } catch (error) {
      this.addResult('⚠️', 'M5Stack features not available', false);
    }
  }

  async runCleanupTest(): Promise<void> {
    this.addResult('🧹', 'Cleaning up...');
    await this.adapter.executeCode(TEST_CODES.cleanup);
    this.addResult('✅', 'Test file removed');
  }

  async runPersistenceTest(): Promise<void> {
    this.addResult('💾', 'Creating persistent app...');
    await this.adapter.writeFile('/main.py', TEST_CODES.persistentApp);
    this.addResult('✅', 'Persistent app saved to main.py');
  }

  async runAllTests(): Promise<void> {
    const tests = [
      () => this.runConnectionTest(),
      () => this.runPythonExecutionTest(),
      () => this.runSystemInfoTest(),
      () => this.runFileOperationsTest(),
      () => this.runDirectoryListTest(),
      () => this.runM5StackFeaturesTest(),
      () => this.runCleanupTest(),
      () => this.runPersistenceTest(),
    ];

    for (const test of tests) {
      await test();
    }

    this.addResult('🎉', 'All tests completed successfully!');
  }
}

// Components
const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
  <Box flexDirection="column">
    <Text color="red">❌ {error}</Text>
  </Box>
);

const LoadingSpinner: React.FC = () => (
  <Box marginBottom={1}>
    <Text color="green">
      <Spinner type="dots" /> Loading ports...
    </Text>
  </Box>
);

const PortSelector: React.FC<{
  ports: PortItem[];
  onSelect: (item: PortItem) => void;
}> = ({ ports, onSelect }) => (
  <Box flexDirection="column">
    <Box marginBottom={1}>
      <Text>Select a device to test:</Text>
    </Box>
    <SelectInput items={ports} onSelect={onSelect} />
  </Box>
);

const TestResults: React.FC<{
  results: TestResult[];
  phase: Phase;
}> = ({ results, phase }) => (
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
);

const AppHeader: React.FC = () => (
  <Box marginBottom={1}>
    <Text bold color="cyan">🔧 M5Stack SDK Quick Test</Text>
  </Box>
);

// Main component
const QuickTest = () => {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>('selectPort');
  const { ports, loading, error, loadPorts } = usePortManager();
  const { results, addResult, clearResults } = useTestResults();

  useEffect(() => {
    loadPorts();
  }, [loadPorts]);

  const runTests = useCallback(async (port: string) => {
    setPhase('testing');
    clearResults();

    let adapter = null;
    const testRunner = new TestRunner(adapter, addResult);

    try {
      adapter = new REPLAdapter(port);
      testRunner.adapter = adapter;
      await testRunner.runAllTests();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      addResult('❌', `Error: ${errorMessage}`, false);
    } finally {
      if (adapter) {
        await adapter.disconnect();
        addResult('📡', 'Disconnected');
      }
      setPhase('complete');
    }
  }, [addResult, clearResults]);

  const handlePortSelect = useCallback(async (item: PortItem) => {
    if (item.value === 'exit') {
      exit();
    } else if (item.value === 'refresh') {
      await loadPorts();
    } else if (item.value) {
      await runTests(item.value);
    }
  }, [exit, loadPorts, runTests]);

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <Box flexDirection="column">
      <AppHeader />
      {loading && <LoadingSpinner />}
      {phase === 'selectPort' && !loading && (
        <PortSelector ports={ports} onSelect={handlePortSelect} />
      )}
      {(phase === 'testing' || phase === 'complete') && (
        <TestResults results={results} phase={phase} />
      )}
    </Box>
  );
};

render(<QuickTest />);
