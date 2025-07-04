<div align="center">

# 🚀 @h1mpy-sdk

**The most powerful, type-safe MicroPython SDK for M5Stack devices**

[![npm version](https://img.shields.io/npm/v/@h1mpy-sdk/node.svg)](https://www.npmjs.com/package/@h1mpy-sdk/node)
[![Downloads](https://img.shields.io/npm/dm/@h1mpy-sdk/node.svg)](https://www.npmjs.com/package/@h1mpy-sdk/node)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

*Cross-platform MicroPython SDK with Node.js, Web Serial, and CLI support*

[**🎯 Quick Start**](#-quick-start) • [**📖 Documentation**](#-api-reference) • [**🛠️ CLI Tools**](#-cli-tools) • [**🌐 Examples**](#-examples)

</div>

---

## ✨ Why @h1mpy-sdk?

<table>
<tr>
<td width="50%">

### 🔥 **Developer Experience First**
- **Zero Config** - Works out of the box
- **Full TypeScript** - Complete type safety
- **Hot Reload** - Instant development feedback
- **Rich CLI** - Interactive terminal interface

</td>
<td width="50%">

### ⚡ **Performance & Reliability**
- **Multi-Platform** - Node.js, Browser, CLI
- **Auto-Retry** - Built-in fault tolerance
- **Progress Tracking** - Real-time updates
- **Hardware Tested** - Verified on real devices

</td>
</tr>
</table>

## 🎯 Quick Start

### 📦 Installation

```bash
# Choose your flavor
npm i @h1mpy-sdk/node   # 🟢 Node.js
npm i @h1mpy-sdk/web    # 🌐 Browser
npm i @h1mpy-sdk/cli    # 💻 CLI tools
```

### 🚀 30 Second Demo

```typescript
import { M5StackClient } from '@h1mpy-sdk/node';

// 🎉 That's it! SDK handles everything
const client = new M5StackClient();
const connection = await client.connect('/dev/ttyUSB0');

// 🐍 Execute Python instantly
const result = await connection.executeCode(`
print("Hello from M5Stack! 🎉")
from m5stack import lcd
lcd.print("SDK Working!", 0, 0)
`);

console.log(result.output); // ✅ "Hello from M5Stack! 🎉"
```

> **🎬 Want to see it in action?** Run `pnpm example:node` for a live demo!

## 🌟 What's Special?

### 🎨 **Modern Developer Experience**

<details>
<summary>🔍 <strong>Interactive CLI & TUI</strong></summary>

```bash
# 🎮 Launch interactive terminal
pnpm cli:tui

# 📊 Rich interface with:
# • Device auto-discovery
# • Real-time file sync
# • Python REPL
# • Progress indicators
# • Error diagnostics
```

</details>

<details>
<summary>🌐 <strong>Web Serial Magic</strong></summary>

```javascript
// 🌟 Works directly in browser - no drivers needed!
import { M5StackClient, WebSerialConnection } from '@h1mpy-sdk/web';

const port = await WebSerialConnection.requestPort(); // 🎯 One click
const client = new M5StackClient();
const connection = await client.connect(port);

// 🚀 Same API as Node.js - zero learning curve!
```

</details>

<details>
<summary>⚡ <strong>Smart File Management</strong></summary>

```typescript
// 📁 Upload with progress tracking
await connection.writeFile('/flash/app.py', code, {
  onProgress: (bytes, total) => {
    console.log(`📈 ${(bytes/total*100).toFixed(1)}%`);
  }
});

// 🔄 Auto-retry on failure
// 🛡️ Atomic operations
// 📊 Real-time feedback
```

</details>

## 🛠️ CLI Tools

### 🎮 Interactive Terminal UI

```bash
pnpm cli:tui  # 🚀 Launch the magic
```

**Features:**
- 📡 **Auto-Discovery** - Finds your M5Stack instantly
- 🐍 **Live Python REPL** - Code and see results immediately  
- 📁 **File Manager** - Drag & drop file operations
- 📊 **Device Monitor** - Real-time system info
- 🎨 **LCD Control** - Visual feedback on device
- 💾 **Firmware Backup** - One-click device cloning

### ⚡ Command Line Interface

```bash
# 🔍 Discover devices
m5stack-cli list-ports

# 🎯 Execute code instantly
m5stack-cli exec /dev/ttyUSB0 "print('Hello World! 🌍')"

# 📤 Upload files
m5stack-cli upload /dev/ttyUSB0 ./my_app.py

# 📥 Download files  
m5stack-cli download /dev/ttyUSB0 /flash/main.py ./backup.py
```

## 🌐 Examples

### 🟢 Node.js Example

```typescript
import { M5StackClient } from '@h1mpy-sdk/node';

const client = new M5StackClient({
  timeout: 10000,
  logLevel: 'info'
});

// 🎯 Simple and powerful
const ports = await client.listPorts();
const connection = await client.connect(ports[0].path);

// 🚀 Execute Python
const result = await connection.executeCode(`
import time
for i in range(3):
    print(f"Count: {i+1} 🚀")
    time.sleep(1)
`);

// 📁 File operations
const files = await connection.listDirectory('/flash');
await connection.writeFile('/flash/demo.py', 'print("Demo! 🎉")');
```

### 🌐 Browser Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>M5Stack Web Control 🎮</title>
</head>
<body>
  <button id="connect">Connect to M5Stack 🔌</button>
  <button id="flash-led">Flash LED 💡</button>
  
  <script type="module">
    import { M5StackClient, WebSerialConnection } from '@h1mpy-sdk/web';
    
    const client = new M5StackClient();
    let connection;
    
    document.getElementById('connect').onclick = async () => {
      const port = await WebSerialConnection.requestPort();
      connection = await client.connect(port);
      console.log('Connected! 🎉');
    };
    
    document.getElementById('flash-led').onclick = async () => {
      await connection.executeCode(`
        from machine import Pin
        import time
        led = Pin(2, Pin.OUT)
        for i in range(5):
            led.on()
            time.sleep(0.1)
            led.off()
            time.sleep(0.1)
      `);
    };
  </script>
</body>
</html>
```

## 📚 API Reference

### 🎯 M5StackClient

The main entry point for all operations.

```typescript
class M5StackClient {
  constructor(options?: ClientOptions);
  
  // 🔍 Device discovery
  async listPorts(): Promise<PortInfo[]>;
  
  // 🔌 Connection management
  async connect(port: string): Promise<Connection>;
  async disconnect(port: string): Promise<void>;
  async disconnectAll(): Promise<void>;
  
  // 📊 Utilities
  getConnection(port: string): Connection | null;
  setLogLevel(level: LogLevel): void;
  setTimeout(timeout: number): void;
}
```

### 🚀 Connection

Your gateway to M5Stack device operations.

```typescript
class Connection extends EventEmitter {
  // 🐍 Code execution
  async executeCode(code: string): Promise<ExecutionResult>;
  async executeFile(path: string): Promise<ExecutionResult>;
  
  // 📁 File operations
  async listDirectory(path: string): Promise<DirectoryEntry[]>;
  async readFile(path: string): Promise<Buffer>;
  async writeFile(path: string, content: string | Buffer, options?: WriteOptions): Promise<void>;
  async deleteFile(path: string): Promise<void>;
  
  // 📊 Device info
  async getDeviceInfo(): Promise<DeviceInfo>;
  async isOnline(): Promise<boolean>;
  
  // 🌐 Network
  async setWifiConfig(ssid: string, password: string): Promise<void>;
}
```

### 🎛️ Configuration Options

```typescript
interface ClientOptions {
  timeout?: number;        // ⏱️ Default: 5000ms
  logLevel?: LogLevel;     // 📝 Default: 'info'
  autoReconnect?: boolean; // 🔄 Default: false
  maxRetries?: number;     // 🔁 Default: 3
  baudRate?: number;       // 📡 Default: 115200
}

interface WriteOptions {
  overwrite?: boolean;     // 📝 Default: true
  createDirectories?: boolean; // 📁 Default: false
  encoding?: 'utf8' | 'binary'; // 📄 Default: 'utf8'
  onProgress?: (bytesWritten: number, totalBytes: number) => void; // 📊
}
```

## 🔧 Advanced Usage

### 🎯 Error Handling

```typescript
import { 
  CommunicationError, 
  TimeoutError, 
  DeviceBusyError, 
  FileNotFoundError 
} from '@h1mpy-sdk/core';

try {
  await connection.executeCode('print("Hello!")');
} catch (error) {
  if (error instanceof TimeoutError) {
    console.log('⏱️ Operation timed out');
  } else if (error instanceof DeviceBusyError) {
    console.log('🔄 Device busy, retrying...');
  } else if (error instanceof CommunicationError) {
    console.log('📡 Communication failed:', error.message);
  }
}
```

### 🎮 Event Handling

```typescript
// 📡 Connection events
connection.on('connect', () => console.log('🔌 Connected!'));
connection.on('disconnect', () => console.log('🔌 Disconnected!'));
connection.on('error', (error) => console.log('❌ Error:', error));

// 📊 Progress events
connection.on('progress', (progress) => {
  console.log(`📈 Progress: ${progress.percentage.toFixed(1)}%`);
});
```

### 🚀 Boot Persistence

Make your code run automatically on M5Stack startup:

```typescript
// 💾 Save to main.py (runs on boot)
await connection.writeFile('/flash/main.py', `
# 🚀 My persistent app
from m5stack import *
import time

# 🎨 Initialize display
lcd.clear()
lcd.print("My App v1.0 🎉", 0, 0)

# 🔄 Main loop
while True:
    # Your code here
    time.sleep(1)
`);

console.log('✅ App will run on next boot!');
```

## 🏗️ Development

### 🛠️ Setup

```bash
# 📦 Install dependencies
pnpm install

# 🔨 Build everything
pnpm build

# 🎮 Try the CLI
pnpm cli:tui

# 🌐 Test web example
pnpm example:web
```

### 🧪 Testing

```bash
# 🏃‍♂️ Run tests
pnpm test

# 👀 Watch mode
pnpm test:watch

# 📊 Coverage report
pnpm test:coverage

# 🔍 Lint code
pnpm lint
```

### 📦 Package Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | 🔨 Build all packages |
| `pnpm dev` | 🚀 Development build |
| `pnpm cli` | 💻 Start CLI interface |
| `pnpm cli:tui` | 🎮 Interactive terminal |
| `pnpm example:node` | 🟢 Node.js examples |
| `pnpm example:web` | 🌐 Web examples |
| `pnpm clean` | 🧹 Clean build artifacts |

## 🤝 Contributing

We love contributions! Here's how to get started:

### 🎯 Quick Contribution Guide

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **💻 Code** your changes with tests
4. **✅ Test** everything: `pnpm test && pnpm example:node`
5. **📝 Commit** with a descriptive message
6. **🚀 Submit** a pull request

### 🐛 Found a Bug?

- 🔍 Check if it's already [reported](https://github.com/hirossan4049/mpy-sdk/issues)
- 📝 Create a detailed [issue](https://github.com/hirossan4049/mpy-sdk/issues/new)
- 🎯 Include steps to reproduce

### 💡 Have an Idea?

- 💬 Start a [discussion](https://github.com/hirossan4049/mpy-sdk/discussions)
- 📋 Create a [feature request](https://github.com/hirossan4049/mpy-sdk/issues/new)

### 🏆 Contributors

<a href="https://github.com/hirossan4049/mpy-sdk/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=hirossan4049/mpy-sdk" />
</a>

## 📋 Requirements

- **Node.js** >= 18.0.0
- **pnpm** (package manager)
- **M5Stack** device with MicroPython firmware

## 🏷️ License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- 📖 [Documentation](https://github.com/hirossan4049/mpy-sdk/docs)
- 🐛 [Issues](https://github.com/hirossan4049/mpy-sdk/issues)
- 💬 [Discussions](https://github.com/hirossan4049/mpy-sdk/discussions)
- 🌟 [VS Code Extension](https://github.com/curdeveryday/vscode-m5stack-mpy)
- 🏠 [M5Stack Official](https://m5stack.com/)

---

<div align="center">

**⭐ Star us on GitHub — it helps!**

[⭐ Give us a star](https://github.com/hirossan4049/mpy-sdk) | [🐛 Report bug](https://github.com/hirossan4049/mpy-sdk/issues) | [💬 Join discussion](https://github.com/hirossan4049/mpy-sdk/discussions)

Made with ❤️ by the M5Stack community

</div>