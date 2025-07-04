# @h1mpy-sdk

Cross-platform MicroPython SDK for M5Stack devices with Node.js, Web Serial, and CLI support.

## Features

- 🔗 **Multi-Platform**: Node.js, Browser (Web Serial), and CLI support
- 🛡️ **Type Safe**: Full TypeScript support with comprehensive type definitions
- 📁 **File Management**: Upload, download, and manage files on M5Stack devices
- 🐍 **REPL & Protocol Modes**: Interactive REPL and binary protocol communication
- 🖥️ **CLI & TUI Tools**: Command-line interface and interactive terminal UI
- 📊 **Progress Tracking**: Real-time progress updates for file transfers
- 🔄 **Auto Retry**: Built-in retry logic for reliable communication
- 🌐 **Web Serial Ready**: Browser support via Chrome's Web Serial API
- 🧩 **Monorepo Architecture**: Shared core logic with platform-specific adapters
- 📱 **Cross-OS**: Works on Windows, macOS, and Linux
- ⚡ **Real Hardware Tested**: Verified with actual M5Stack devices

## Installation

```bash
npm i @h1mpy-sdk/node   # Node.js environments
npm i @h1mpy-sdk/web    # Browser apps via Web Serial
npm i @h1mpy-sdk/cli    # Command-line tools
```

The `serialport` dependency is included automatically when using the Node package.

### Packages

The project is organised as a monorepo with the following packages:

- `@h1mpy-sdk/core` – shared core logic and utilities
- `@h1mpy-sdk/node` – Node.js serial implementation
- `@h1mpy-sdk/web` – browser/Web Serial support  
- `@h1mpy-sdk/cli` – command-line interface and TUI tools

## Quick Start

### Quick Start Examples
Working examples with real M5Stack hardware:

```bash
# Install dependencies and build
pnpm install && pnpm build

# Node.js examples (in examples/node/)
node working-test.js              # ✅ Verified working example
node basic-connection-test.js     # Simple debugging test
node simple-repl-test.js          # Basic REPL functionality

# Web examples (in examples/web/)
cd examples/web && pnpm dev      # Start web development server
# Then open http://localhost:3000 in Chrome/Edge

# CLI and TUI tools
pnpm cli                         # Command-line interface
pnpm cli:tui                     # Interactive terminal UI
```

### Development Commands

```bash
# Build all packages
pnpm build              # Build all packages (Node.js, Web, CLI)
pnpm clean              # Clean build artifacts

# Development
pnpm dev                # Quick development build
pnpm lint               # Run ESLint
pnpm format             # Format with Prettier

# Testing
pnpm test               # Run all unit tests
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Run tests with coverage

# Tools
pnpm cli                # Start command-line interface
pnpm cli:tui            # Start terminal user interface
pnpm example:node       # Run Node.js examples
pnpm example:web        # Start web example server
```

### Basic Usage

#### Node.js
```typescript
import { M5StackClient } from '@h1mpy-sdk/node';

const client = new M5StackClient({
  timeout: 10000,
  logLevel: 'info'
});

// List available ports
const ports = await client.listPorts();
console.log('Available ports:', ports);

// Connect to device
const connection = await client.connect('/dev/ttyUSB0');

// Execute Python code
const result = await connection.executeCode('print("Hello, M5Stack!")');
console.log('Output:', result.output);

// List files
const files = await connection.listDirectory('/flash');
console.log('Files:', files);

// Upload a file
await connection.writeFile('/flash/main.py', 'print("Hello World")');

// Disconnect
await client.disconnect('/dev/ttyUSB0');
```

#### Browser (Web Serial)
```typescript
import { M5StackClient, WebSerialConnection } from '@h1mpy-sdk/web';

// Request port access (user interaction required)
const port = await WebSerialConnection.requestPort();

const client = new M5StackClient();
const connection = await client.connect(port);

// Same API as Node.js version
const result = await connection.executeCode('print("Hello from Browser!")');
console.log('Output:', result.output);
```

## Command Line Interface (CLI)

The `@h1mpy-sdk/cli` package provides powerful command-line tools for M5Stack development.

### Installation & Quick Start

```bash
# Install CLI package
npm i -g @h1mpy-sdk/cli

# Or use via pnpm in development
pnpm cli        # Start CLI
pnpm cli:tui    # Start Terminal UI
```

### CLI Commands

```bash
# Device discovery
m5stack-cli list-ports

# Code execution
m5stack-cli exec /dev/ttyUSB0 "print('Hello M5Stack!')"

# File operations
m5stack-cli upload /dev/ttyUSB0 ./script.py
m5stack-cli download /dev/ttyUSB0 /flash/main.py ./main.py
m5stack-cli ls /dev/ttyUSB0 /flash

# Device information
m5stack-cli info /dev/ttyUSB0

# Interactive REPL
m5stack-cli repl /dev/ttyUSB0
```

### Terminal User Interface (TUI)

Interactive menu-driven interface with full M5Stack control:

```bash
pnpm cli:tui
```

**TUI Features:**
- 📡 Device selection and connection management
- 🐍 Python code execution with real-time output
- 📁 File upload/download with progress tracking
- 📊 Device information and system status
- 💾 Firmware backup and restore
- 🎨 M5Stack LCD control and animation
- 🔧 Comprehensive testing suite

**TUI Navigation:**
- Use arrow keys to navigate menus
- Press Enter to select options
- Press 'q' to quit at any time
- All operations provide real-time feedback

### File Transfer with Progress

```typescript
const fileContent = Buffer.from('# My Python script\nprint("Hello!")');

await connection.writeFile('/flash/script.py', fileContent, {
  onProgress: (bytesWritten, totalBytes) => {
    const percentage = (bytesWritten / totalBytes) * 100;
    console.log(`Upload progress: ${percentage.toFixed(1)}%`);
  }
});
```

### Python Dependency Analysis

```typescript
import { PythonAnalyzer } from '@h1mpy-sdk/node';

const analyzer = new PythonAnalyzer();
const code = `
import config
from utils import helper

config.setup()
helper.log("Starting application")
`;

const imports = analyzer.parseImports(code);
console.log('Imports found:', imports);
```

### Event Handling

```typescript
connection.on('connect', () => {
  console.log('Device connected');
});

connection.on('disconnect', () => {
  console.log('Device disconnected');
});

connection.on('error', (error) => {
  console.error('Connection error:', error);
});

connection.on('busy', (busy) => {
  console.log('Device busy:', busy);
});
```

## API Reference

### M5StackClient

Main client class for managing connections.

```typescript
class M5StackClient {
  constructor(options?: ClientOptions);
  
  async listPorts(): Promise<PortInfo[]>;
  async connect(port: string): Promise<Connection>;
  async disconnect(port: string): Promise<void>;
  getConnection(port: string): Connection | null;
  setLogLevel(level: LogLevel): void;
  setTimeout(timeout: number): void;
}
```

### Connection

Device connection and management.

```typescript
class Connection {
  // File Operations
  async listDirectory(path: string): Promise<DirectoryEntry[]>;
  async readFile(path: string): Promise<Buffer>;
  async writeFile(path: string, content: Buffer | string, options?: WriteOptions): Promise<void>;
  async deleteFile(path: string): Promise<void>;
  
  // Code Execution
  async executeCode(code: string): Promise<ExecutionResult>;
  async executeFile(path: string): Promise<ExecutionResult>;
  
  // Device Info
  async getDeviceInfo(): Promise<DeviceInfo>;
  async isOnline(): Promise<boolean>;
  
  // WiFi Configuration
  async setWifiConfig(ssid: string, password: string): Promise<void>;
}
```

### Types

#### ClientOptions

```typescript
interface ClientOptions {
  timeout?: number;           // Default: 5000ms
  logLevel?: LogLevel;        // Default: 'info'
  autoReconnect?: boolean;    // Default: false
  maxRetries?: number;        // Default: 3
  baudRate?: number;          // Default: 115200
}
```

#### WriteOptions

```typescript
interface WriteOptions {
  overwrite?: boolean;        // Default: true
  createDirectories?: boolean; // Default: false
  encoding?: 'utf8' | 'binary'; // Default: 'utf8'
  onProgress?: (bytesWritten: number, totalBytes: number) => void;
}
```

#### ExecutionResult

```typescript
interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number;
  executionTime: number;
  timestamp: Date;
}
```

## Platform Support

### Node.js

```typescript
import { M5StackClient } from '@h1mpy-sdk/node';
// Uses 'serialport' package automatically
```

### Browser (Web Serial API)

```typescript
import { M5StackClient, WebSerialConnection } from '@h1mpy-sdk/web';

const port = await WebSerialConnection.requestPort();
const client = new M5StackClient();
const connection = await client.connect(port);
```

### Command Line Interface

```bash
# Global installation
npm i -g @h1mpy-sdk/cli

# Usage
m5stack-cli list-ports
m5stack-cli exec /dev/ttyUSB0 "print('Hello!')"

# Interactive TUI
m5stack-tui
```

### React Native

```typescript
import { M5StackClient } from '@h1mpy-sdk/react-native';
// Uses react-native-serial
```

## Advanced Usage

### Custom Protocol Handler

```typescript
import { ProtocolHandler } from '@h1mpy-sdk/node';

const protocol = new ProtocolHandler();
const frame = protocol.createFrame(commandBuffer);
```

### File Transfer Management

```typescript
import { FileTransferManager } from '@h1mpy-sdk/node';

const transferManager = new FileTransferManager(connection);
await transferManager.uploadFile(filename, content, true, {
  chunkSize: 256,
  onProgress: (progress) => console.log(progress),
  retryAttempts: 3
});
```

### Python Code Analysis

```typescript
import { PythonAnalyzer } from '@h1mpy-sdk/node';

const analyzer = new PythonAnalyzer();
const analysis = await analyzer.analyzeProject('main.py', codeContent);

console.log('Dependencies:', analysis.dependencies);
console.log('Missing files:', analysis.missingFiles);
console.log('Circular dependencies:', analysis.circularDependencies);
```

### Firmware Persistence

Make your code run automatically on M5Stack boot:

```typescript
// Save persistent code that runs on boot
await connection.writeFile('/main.py', `
from m5stack import *
from m5ui import *
import time

setScreenColor(0x111111)
title = M5TextBox(10, 10, "My App", lcd.FONT_Default, 0x00FF00)

while True:
    # Your persistent code here
    time.sleep(1)
`);

// Create boot configuration
await connection.writeFile('/boot.py', `
import gc
gc.collect()
print("Device ready")
`);
```

#### CLI Persistence Commands

```bash
# Command-line approach
m5stack-cli upload /dev/ttyUSB0 ./main.py -r /flash/main.py

# Interactive TUI approach
pnpm cli:tui
# Then select device, choose "Save to main.py" and "Backup Firmware"

# CLI with persistence
m5stack-cli exec /dev/ttyUSB0 "
from m5stack import *
setScreenColor(0x000000)
M5TextBox(10, 10, 'Persistent App', lcd.FONT_Default, 0x00FF00)
"
```

## Error Handling

The library provides specific error types for different scenarios:

```typescript
import { 
  CommunicationError, 
  TimeoutError, 
  DeviceBusyError, 
  FileNotFoundError 
} from '@h1mpy-sdk/node';

try {
  await connection.executeCode('print("hello")');
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('Operation timed out');
  } else if (error instanceof DeviceBusyError) {
    console.log('Device is busy, try again later');
  } else if (error instanceof CommunicationError) {
    console.log('Communication failed:', error.message);
  }
}
```

## Configuration

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  defaultTimeout: 5000,
  defaultBaudRate: 115200,
  maxChunkSize: 256,
  protocolVersion: '1.0',
  crcPolynomial: 0x8005,
  frameDelimiters: {
    header: [0xaa, 0xab, 0xaa],
    footer: [0xab, 0xcc, 0xab],
  },
};
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and validate with examples
4. Test functionality: `pnpm test && pnpm test:quick`
5. Submit a pull request

## License

MIT License. See [LICENSE](LICENSE) for details.

## Related Projects

- [vscode-m5stack-mpy](https://github.com/curdeveryday/vscode-m5stack-mpy) - VS Code extension using this library
- [M5Stack](https://m5stack.com/) - Official M5Stack hardware and software

## Development

### Build Commands

```bash
# Install dependencies (required: pnpm)
pnpm install

# Build all packages (core, node, web, cli)
pnpm build

# Development builds
pnpm dev            # Quick development build

# Code quality
pnpm lint           # Run ESLint on all packages
pnpm lint:fix       # Fix ESLint issues
pnpm format         # Format code with Prettier
pnpm format:check   # Check formatting

# Testing
pnpm test           # Run all unit tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage

# Tools and examples
pnpm cli            # Start CLI interface
pnpm cli:tui        # Start Terminal UI
pnpm example:node   # Run Node.js examples
pnpm example:web    # Start web example server

# Clean build artifacts
pnpm clean
```

### Requirements

- Node.js >= 16.0.0
- pnpm (required package manager)
- M5Stack device with MicroPython firmware

## Support

- 📖 [Documentation](https://github.com/hirossan4049/mpy-sdk/docs)
- 🐛 [Issue Tracker](https://github.com/hirossan4049/mpy-sdk/issues)
- 💬 [Discussions](https://github.com/hirossan4049/mpy-sdk/discussions)