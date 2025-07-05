# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a monorepo containing the M5Stack MicroPython SDK with multiple packages under the `@h1mpy-sdk` scope. The project provides both Node.js and Web Serial implementations for M5Stack device communication, sharing common logic from the core package.

**Monorepo Structure:**
- `packages/core/` - Shared core logic (adapters, protocol handlers)
- `packages/node/` - Node.js specific serial implementation
- `packages/web/` - Web Serial API implementation for browsers
- `packages/cli/` - Command-line interface and TUI tools
- `examples/node/` - Node.js usage examples and tests
- `examples/web/` - Web application examples with Vite

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

# Run working examples
pnpm example:node      # Run Node.js Raw REPL UI test
pnpm example:node:flash # Run Node.js flash programming example
pnpm example:web       # Start web example server

# CLI and TUI tools
pnpm cli               # Start command-line interface
pnpm cli:tui           # Start terminal UI (interactive)

# Node.js examples (in examples/node/)
node basic-usage.js           # Complete M5Stack operations demo
node raw-repl-ui-test.js      # Raw REPL UI test (hardware verified)
node flash-example.js         # Flash memory programming example

# Web examples (in examples/web/)
# Start development server:
cd examples/web && pnpm dev
# Then open browser to http://localhost:5173
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
│ NodeSerialConnection | WebSerialConnection │ ← Platform implementations
├─────────────────────────────────────┤
│     ProtocolHandler | REPLAdapter   │ ← Communication protocols
└─────────────────────────────────────┘
```

### Cross-Platform Support

**Node.js Implementation** (`packages/node/`):
- Uses `serialport` library for native serial communication
- Full file system operations and device management
- CommonJS modules for Node.js compatibility
- Comprehensive error handling and connection management

**Web Implementation** (`packages/web/`):
- Uses Web Serial API (Chrome 89+, Edge 89+)
- Browser-compatible with custom Buffer polyfill
- Real-time REPL communication via WebSerialConnection
- Supports file operations through hex-encoded transfers

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

### Python Project Analysis System

The SDK includes intelligent Python project analysis capabilities:

**PythonAnalyzer** (`packages/core/src/utils/PythonAnalyzer.ts`):
- **Import Resolution**: Handles both relative and absolute imports
- **Dependency Graphing**: Builds complete project dependency trees
- **Circular Dependency Detection**: Identifies and reports circular imports
- **Built-in Module Recognition**: Filters out standard library modules
- **Execution Ordering**: Provides topological sort for dependency resolution

**DeviceManager Project Features**:
- **uploadProject()**: Automatically uploads all project dependencies in correct order
- **analyzeProject()**: Generates dependency graphs and execution plans
- **validateProject()**: Checks for import errors and circular dependencies
- **Bulk Operations**: Handles multiple file uploads with progress tracking

### Critical Implementation Notes

1. **Single Command Execution**: Only one command can execute at a time (busy flag prevents concurrent operations)

2. **REPL Mode Initialization**: Must send Ctrl+C (0x03) to interrupt any running program before starting REPL commands

3. **Platform-Specific Ports**: 
   - macOS: `/dev/tty.usbserial-*`
   - Windows: `COM*`
   - Linux: `/dev/ttyUSB*` or `/dev/ttyACM*`

4. **Response Buffer Management**: Protocol mode accumulates data until complete frame is received, validated by CRC

5. **File Path Handling**: REPL mode requires proper Python string escaping for file paths

6. **Python Project Analysis**: DeviceManager includes automatic dependency resolution and project upload capabilities

## Build Outputs

Each package builds to its own `dist/` directory:

1. **Core Package** (`packages/core/dist/`): CommonJS modules with TypeScript definitions
2. **Node.js Package** (`packages/node/dist/`): CommonJS modules with serialport dependency
3. **Web Package** (`packages/web/dist/`): CommonJS modules with Web Serial API support
4. **CLI Package** (`packages/cli/dist/`): ESM modules with executable binaries

## Dependencies

**Dependencies**:
- `serialport` ^13.0.0: Core serial communication library

**Development**: Standard TypeScript toolchain
- TypeScript ^5.3.3, ESLint, Prettier
- Type definitions for Node.js and serialport
- tsx for TypeScript execution
- ink for terminal UI components (CLI package)
- commander for CLI argument parsing
- React for TUI components

### CLI Package (`packages/cli/`)

**Command Line Interface** (`pnpm cli`):
- `m5stack-cli list-ports` - List available M5Stack devices
- `m5stack-cli exec <port> <code>` - Execute Python code on device
- `m5stack-cli upload <port> <file>` - Upload file to device
- `m5stack-cli download <port> <remote> [local]` - Download file from device
- `m5stack-cli ls <port> [path]` - List files on device
- `m5stack-cli info <port>` - Get device information
- `m5stack-cli repl <port>` - Start interactive REPL session

**Terminal User Interface** (`pnpm cli:tui`):
- Interactive menu-driven interface
- Device selection and connection management
- Real-time file operations with progress tracking
- Code execution and output display
- Device backup and restore functionality
- M5Stack LCD display control and animation

**Quick Test TUI**:
- Comprehensive implementation testing
- Device info parsing validation
- Relative import resolution testing
- File upload/download verification
- CLI connection testing
- Project dependency analysis

## Important Development Rules

### 1. Package Manager
- **ALWAYS use pnpm** - Never use npm or yarn
- All scripts in package.json use pnpm commands
- Uses pnpm workspace for monorepo management (pnpm-workspace.yaml)

### 2. TypeScript Configuration
- **NEVER modify tsconfig.json** - The configuration is carefully tuned for modern TypeScript best practices
- The tsconfig uses ES2022 target with strict mode and all safety checks enabled
- CommonJS modules for Node.js compatibility, ESM for CLI package
- If you encounter type errors, fix the code, not the config

### 3. Node.js Requirements
- **Minimum Node.js version**: 18.0.0 (specified in package.json engines)
- **pnpm version**: 8.15.0 (specified in packageManager field)

### 4. Serial Communication
- Always check `isConnected` before operations
- Handle timeout errors gracefully
- Use appropriate mode (Protocol vs REPL) for the task
- Clean up connections on error or exit

### 5. File Operations
- Always use forward slashes in file paths
- Check file existence before read operations
- Handle chunk transfer progress for large files
- Validate file content encoding in REPL mode

### 6. Testing
- Tests are located in `src/` directory as `*.test.ts` files
- Use Jest with ts-jest preset for TypeScript support
- Test environment is Node.js with 5-second timeout
- Run `pnpm test` to execute all tests
- Mock serial connections for testing without hardware

### 7. Examples and Real Hardware Testing
- **Node.js Examples**: Complete working examples in `examples/node/`
  - `raw-repl-ui-test.js` - ✅ Verified with real M5Stack hardware (comprehensive UI test)
  - `flash-example.js` - ✅ Complete flash memory programming with backup/restore
  - `basic-usage.js` - Complete M5Stack operations demo
  - **Note**: Examples are hardware-tested and include automatic device reset if needed
- **Web Examples**: Browser-based examples in `examples/web/`
  - Real Web Serial API implementation with improved REPL parsing
  - Interactive web interface with connection management
  - File operations and code execution via browser
  - Vite-based development server for modern web development

## Real Hardware Test Results

**Tested Device**: M5Stack connected to `/dev/tty.usbserial-55520ADC16`

**Confirmed Working Features**:
- ✅ REPL communication (36ms average response)
- ✅ LCD control and display updates
- ✅ System information retrieval
- ✅ File operations (read/write/delete)
- ✅ Button status reading
- ✅ Python code execution
- ✅ Directory listing
- ✅ Device connectivity checking

**Example Output**:
```
🎮 Raw REPL UI Test - M5Stackに確実にUIを表示

🔌 Connecting to M5Stack...
✅ Connected successfully
🔄 Initializing Raw REPL...
   Entering raw REPL mode...
   Raw REPL response: "raw REPL; CTRL-B to exit>"
✅ Raw REPL mode activated

1️⃣ Simple LCD Display Test...
📤 Executing in raw REPL: LCD code...
📥 Execution result: "Simple LCD test completed >OK"

2️⃣ Colorful Rectangle UI Test...
📥 Execution result: "Colorful UI created >OK"

3️⃣ Animation Test...
📥 Execution result: "Animation completed >OK"

🎉 Raw REPL UI Test Completed Successfully!
📺 Check your M5Stack display for all the UI elements!
✅ Node.js ↔ M5Stack communication via Raw REPL is working!
```