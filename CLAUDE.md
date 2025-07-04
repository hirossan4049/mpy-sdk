# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the @hirossan4049/mpy-sdk package - a Node.js SDK for M5Stack MicroPython development. It provides serial communication, file management, and REPL interaction for M5Stack devices in Node.js environments.

## Common Development Commands

### Build and Development

**Package Manager: pnpm (REQUIRED)**

```bash
# Install dependencies
pnpm install

# IMPORTANT: Always use pnpm, never npm or yarn

# Build all targets
pnpm build

# Build specific components
pnpm build:node     # CommonJS for Node.js
pnpm build:types    # TypeScript definitions

# Development build (quick Node.js only)
pnpm dev

# Linting
pnpm lint
pnpm lint:fix

# Code formatting
pnpm format         # Format all TypeScript files
pnpm format:check   # Check formatting without changes

# Clean build artifacts
pnpm clean
```

### Testing and Examples

```bash
# Unit tests
pnpm test              # Run all tests
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Run tests with coverage

# Quick connection test
pnpm quick-test

# Interactive CLI tools
pnpm cli               # Interactive CLI with TypeScript
pnpm cli:tui           # Terminal UI version

# Run examples
pnpm demo              # REPL adapter example
pnpm example           # Basic usage example
pnpm persist           # Firmware persistence example
pnpm flash-sample      # Flash sample programs
pnpm flash-simple      # Flash simple program
pnpm flash-advanced    # Flash advanced program
```

## Architecture Overview

### Layered Architecture

```
┌─────────────────────────────────────┐
│         M5StackClient               │ ← Public API entry point
├─────────────────────────────────────┤
│         Connection                  │ ← Device connection wrapper
├─────────────────────────────────────┤
│       DeviceManager                 │ ← High-level device operations
├─────────────────────────────────────┤
│    BaseSerialConnection            │ ← Abstract serial interface
├─────────────────────────────────────┤
│   NodeSerialConnection             │ ← Node.js serial implementation
├─────────────────────────────────────┤
│     ProtocolHandler                │ ← Binary protocol codec
└─────────────────────────────────────┘
```

### Dual Communication Modes

The SDK supports two distinct communication approaches:

1. **Protocol Mode** (via DeviceManager)
   - Custom binary protocol with CRC16 validation
   - Chunked file transfers with progress tracking
   - Reliable, faster for file operations
   - Frame structure: `[HEADER:3][LENGTH:1][COMMAND:1][DATA:N][CRC16:2][FOOTER:3]`

2. **REPL Mode** (via REPLAdapter)
   - Direct MicroPython REPL interaction
   - Standard Python command execution
   - Better for interactive development
   - Uses hexadecimal encoding for file transfers

### Key Design Patterns

- **Factory Pattern**: M5StackClient manages multiple device connections
- **Adapter Pattern**: REPLAdapter provides alternative communication interface
- **Command Pattern**: Each operation has a specific command code (0x00-0x08)
- **Observer Pattern**: Event-driven using EventEmitter for async operations

### Protocol Implementation Details

**Command Codes**:
```typescript
IS_ONLINE = 0x00      // Ping device
GET_INFO = 0x01       // Get device information
EXEC = 0x02           // Execute Python code
LIST_DIR = 0x03       // List directory
DOWNLOAD = 0x04       // Read file from device
GET_FILE = 0x05       // Get file contents
DOWNLOAD_FILE = 0x06  // Write file to device
REMOVE_FILE = 0x07    // Delete file
SET_WIFI = 0x08       // Configure WiFi
```

**Protocol Constants**:
- Header: `[0xAA, 0xAB, 0xAA]`
- Footer: `[0xAB, 0xCC, 0xAB]`
- CRC Polynomial: `0x8005`
- Max chunk size: 256 bytes
- Default timeout: 5000ms

### File Transfer Strategy

**Protocol Mode**:
- Files split into 256-byte chunks
- Each chunk validated with CRC16
- Progress callbacks for UI updates
- Automatic retry on failure

**REPL Mode**:
- Files encoded as hexadecimal strings
- Transferred via `exec()` commands
- Large files chunked to prevent timeout
- Uses Python's `binascii` module

### Error Handling Hierarchy

```
M5StackError (base class)
├── CommunicationError    // Serial port or protocol errors
├── TimeoutError          // Command execution timeout
├── DeviceBusyError       // Concurrent operation attempted
└── FileNotFoundError     // File operation failures
```

### Critical Implementation Notes

1. **Single Command Execution**: Only one command can execute at a time (busy flag prevents concurrent operations)

2. **REPL Mode Initialization**: Must send Ctrl+C (0x03) to interrupt any running program before starting REPL commands

3. **Platform-Specific Ports**: 
   - macOS: `/dev/tty.usbserial-*`
   - Windows: `COM*`
   - Linux: `/dev/ttyUSB*` or `/dev/ttyACM*`

4. **Response Buffer Management**: Protocol mode accumulates data until complete frame is received, validated by CRC

5. **File Path Handling**: REPL mode requires proper Python string escaping for file paths

## Build Outputs

The SDK builds to two targets:

1. **Node.js** (`dist/node/`): CommonJS modules
2. **Types** (`dist/types/`): TypeScript definitions

## Dependencies

**Dependencies**:
- `serialport` ^13.0.0: Core serial communication library

**Development**: Standard TypeScript toolchain
- TypeScript, ESLint, Prettier
- Type definitions for Node.js and serialport
- Jest for testing with ts-jest preset
- tsx for TypeScript execution
- ink for terminal UI components

## Important Development Rules

### 1. Package Manager
- **ALWAYS use pnpm** - Never use npm or yarn
- All scripts in package.json use pnpm commands

### 2. TypeScript Configuration
- **NEVER modify tsconfig.json** - The configuration is carefully tuned for modern TypeScript best practices
- The tsconfig uses ES2022 target with strict mode and all safety checks enabled
- If you encounter type errors, fix the code, not the config

### 3. Serial Communication
- Always check `isConnected` before operations
- Handle timeout errors gracefully
- Use appropriate mode (Protocol vs REPL) for the task
- Clean up connections on error or exit

### 4. File Operations
- Always use forward slashes in file paths
- Check file existence before read operations
- Handle chunk transfer progress for large files
- Validate file content encoding in REPL mode

### 5. Testing
- Tests are located in `src/` directory as `*.test.ts` files
- Use Jest with ts-jest preset for TypeScript support
- Test environment is Node.js with 5-second timeout
- Run `pnpm test` to execute all tests
- Mock serial connections for testing without hardware