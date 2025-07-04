# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the @hirossan4049/mpy-sdk package - a multi-platform SDK for M5Stack MicroPython development. It provides serial communication, file management, and REPL interaction for M5Stack devices across Node.js, Browser, and React Native environments.

## Common Development Commands

### Build and Development

```bash
# Install dependencies
npm install

# Build all targets (Node.js, Browser, Types)
npm run build

# Build for specific platform
npm run build:node     # CommonJS for Node.js
npm run build:browser  # UMD bundle for browsers
npm run build:types    # TypeScript definitions

# Development build (quick Node.js only)
npm run dev

# Linting
npm run lint
npm run lint:fix

# Clean build artifacts
npm run clean
```

### Testing and Examples

```bash
# Quick connection test
npm run quick-test

# Interactive CLI tool
npm run cli

# Run examples
npm run demo      # REPL adapter example
npm run example   # Basic usage example
npm run persist   # Firmware persistence example
```

## Architecture Overview

### Core Components

1. **Serial Communication Layer** (`src/core/`)
   - `BaseSerialConnection`: Abstract base class for platform-specific implementations
   - `NodeSerialConnection`: Node.js implementation using serialport library
   - `ProtocolHandler`: Implements M5Stack binary protocol with CRC16 validation

2. **High-Level Operations** (`src/manager/DeviceManager.ts`)
   - File system operations (list, read, write, delete)
   - Python code execution via REPL
   - Device information retrieval
   - WiFi configuration

3. **Adapters** (`src/adapters/REPLAdapter.ts`)
   - Provides interactive Python REPL interface
   - Handles multi-line input and output parsing
   - Auto-detection of code completion

4. **Utilities** (`src/utils/`)
   - `FileTransferManager`: Handles chunked file transfers with progress tracking
   - `PythonAnalyzer`: Analyzes Python code for imports and dependencies

### Component Relationships

```
M5StackClient (main entry point)
├── Connection (extends DeviceManager)
│   └── NodeSerialConnection (or platform-specific)
│       └── ProtocolHandler
├── REPLAdapter (optional, for REPL interface)
└── FileTransferManager (for file operations)
```

### Multi-Platform Architecture

The SDK is designed for multiple platforms with a common interface:

- **Node.js**: Uses `serialport` package (peer dependency)
- **Browser**: Uses Web Serial API (built with Webpack)
- **React Native**: Platform-specific adapter (planned)

Each platform implements `BaseSerialConnection` with platform-specific serial port handling.

## Key Design Decisions

### Protocol Implementation

The SDK implements a custom binary protocol for reliable M5Stack communication:

- **Frame Structure**: `[HEADER:3][COMMAND:1][PAYLOAD_LEN:2][PAYLOAD][CRC16:2][FOOTER:3]`
- **CRC16 Validation**: Uses polynomial 0x8005 for data integrity
- **Command Codes**: 9 operation types (0x00-0x08) for different device operations
- **Chunk Size**: 256 bytes for file transfers (hardcoded limit)

### Connection Management

- **Singleton Pattern**: One connection per port/device
- **Auto-retry Logic**: Built-in retry mechanism for failed operations
- **Timeout Handling**: Default 5-second timeout, configurable per operation
- **State Management**: Connection state tracked internally

### REPL Implementation

The REPL adapter provides a high-level interface for interactive Python:

- **Raw REPL Mode**: Uses Ctrl-A/Ctrl-B for entering/exiting raw mode
- **Multi-line Support**: Handles code blocks and indentation
- **Output Parsing**: Separates stdout from return values
- **Error Detection**: Parses Python exceptions and errors

## Configuration

Default configuration is defined in `src/types/index.ts`:

```typescript
{
  defaultTimeout: 5000,        // 5 seconds
  defaultBaudRate: 115200,     // Fixed for M5Stack
  maxChunkSize: 256,          // File transfer chunk size
  protocolVersion: '1.0',
  crcPolynomial: 0x8005,
  frameDelimiters: {
    header: [0xaa, 0xab, 0xaa],
    footer: [0xab, 0xcc, 0xab],
  },
}
```

## Build Outputs

The SDK builds to three targets:

1. **Node.js** (`dist/node/`): CommonJS modules
2. **Browser** (`dist/browser/`): UMD bundle as `m5stack-sdk.js`
3. **Types** (`dist/types/`): TypeScript definitions

## API Usage Patterns

### Basic Connection

```javascript
const client = new M5StackClient();
const connection = await client.connect('/dev/tty.usbserial-XXX');
```

### File Operations

```javascript
// List files
const files = await connection.listDirectory('/');

// Read file
const content = await connection.readFile('/main.py');

// Write file with progress
await connection.writeFile('/main.py', content, (progress) => {
  console.log(`Progress: ${progress.percentage}%`);
});
```

### REPL Usage

```javascript
const adapter = new REPLAdapter('/dev/tty.usbserial-XXX');
await adapter.connect();
const result = await adapter.executeCode('print("Hello M5Stack")');
```

## Dependencies

**Production**: Minimal dependencies for lightweight SDK
- `ts-loader`: TypeScript compilation for Webpack

**Peer Dependencies**:
- `serialport` ^13.0.0: Required for Node.js environment only

**Development**: Standard TypeScript toolchain
- TypeScript, ESLint, Webpack
- Type definitions for Node.js and serialport