# M5Stack Node.js Examples

This directory contains comprehensive examples for using the `@h1mpy-sdk/node` package to communicate with M5Stack devices from Node.js applications.

## Prerequisites

- Node.js 18+ (ES modules support)
- M5Stack device with MicroPython firmware
- USB cable connection
- Serial port access permissions

## Quick Start

1. **Install dependencies**:
   ```bash
   cd examples/node
   pnpm install
   ```

2. **Find your M5Stack port**:
   - **macOS**: `/dev/tty.usbserial-*`
   - **Windows**: `COM*` (e.g., COM3, COM4)
   - **Linux**: `/dev/ttyUSB*` or `/dev/ttyACM*`

3. **Run basic example**:
   ```bash
   pnpm basic
   ```

## Examples Overview

### 1. Basic Usage (`basic-usage.js`)
**Command**: `pnpm basic`

Demonstrates fundamental operations:
- Serial port discovery and connection
- Device status checking
- Python code execution
- File operations (create, read, delete)
- Device information retrieval

**Features**:
- ✅ Auto-port detection
- ✅ Error handling and cleanup
- ✅ Progress logging
- ✅ Basic file management

---

### 2. REPL Interactive (`repl-example.js`)
**Command**: `pnpm repl [port_path]`

Shows advanced REPL (Read-Eval-Print Loop) usage:
- Interactive MicroPython development
- Multi-line code execution
- Variable persistence between commands
- M5Stack hardware testing
- Real-time sensor monitoring

**Features**:
- 🐍 Interactive Python execution
- 📊 Live sensor data
- 🎵 Sound and melody playback
- 🖥️ LCD display control
- 🔘 Button interaction monitoring

**Usage**:
```bash
# macOS/Linux
pnpm repl /dev/tty.usbserial-YOUR_PORT

# Windows
pnpm repl COM3
```

---

### 3. File Operations (`file-operations.js`)
**Command**: `pnpm file-ops`

Comprehensive file management demonstration:
- Bulk file uploads with progress tracking
- Directory listing and navigation
- JSON configuration files
- Python application deployment
- File verification and integrity checks

**Features**:
- 📁 Complete file system management
- 📊 Upload progress tracking
- 🔧 System utility scripts
- ⚙️ Configuration management
- 🚀 Application deployment

---

### 4. Interactive Demo (`interactive-demo.js`)
**Command**: `pnpm interactive`

Real-time interactive features:
- Button monitoring and response
- Sensor data streaming
- Sound and display effects
- Simple reaction time game
- Command-line interface

**Interactive Commands**:
- `monitor` - Real-time device monitoring
- `buttons` - Button press detection
- `sensors` - Live sensor data streaming
- `sound` - Audio testing and melodies
- `display` - LCD animation demos
- `game` - Reaction time game
- `quit` - Exit demo

**Features**:
- 🎮 Interactive command interface
- 📊 Real-time data streaming
- 🎵 Audio feedback and melodies
- 🖥️ Dynamic display updates
- ⏱️ Performance measurement

---

### 5. Flash Firmware (`flash-firmware.js`)
**Command**: `pnpm flash-firmware`

Complete firmware deployment system:
- Boot script creation (`boot.py`)
- Main application deployment (`main.py`)
- Library file installation
- Configuration file setup
- Persistent application framework

**Firmware Components**:
- 🚀 **boot.py**: System initialization and hardware setup
- 📱 **main.py**: Full-featured application with UI
- 📚 **utils.py**: Utility library with common functions
- ⚙️ **Config files**: JSON-based configuration system

**Application Features**:
- Multi-theme UI system
- Boot counter tracking
- Memory monitoring
- Button interaction handling
- Settings persistence
- Event logging system

---

## Advanced Usage

### Custom Port Selection

Most examples auto-detect the first available port, but you can specify a port:

```bash
# Run REPL example with specific port
node repl-example.js /dev/tty.usbserial-A50285BI

# Run interactive demo with specific port  
node interactive-demo.js COM4
```

### Error Handling

All examples include comprehensive error handling:
- Connection timeouts
- Device communication errors
- File operation failures
- Graceful cleanup and disconnection

### Development Tips

1. **Serial Port Permissions** (Linux/macOS):
   ```bash
   sudo usermod -a -G dialout $USER
   # Logout and login again
   ```

2. **Port Discovery**:
   ```bash
   # List available ports
   ls /dev/tty.usb*           # macOS
   ls /dev/ttyUSB* /dev/ttyACM*  # Linux
   # Use Device Manager on Windows
   ```

3. **Debugging**:
   ```bash
   # Enable debug logging
   export DEBUG=1
   pnpm basic
   ```

## Troubleshooting

### Common Issues

1. **Port Permission Denied**:
   - Add user to dialout group (Linux)
   - Check cable connection
   - Ensure no other applications are using the port

2. **Device Not Responding**:
   - Verify MicroPython firmware is installed
   - Try pressing the reset button on M5Stack
   - Check baud rate (should be 115200)

3. **Import Errors**:
   - Ensure you're in the examples/node directory
   - Run `pnpm install` to install dependencies
   - Check Node.js version (18+ required)

4. **Timeout Errors**:
   - Increase timeout in client options
   - Check device is powered and not frozen
   - Verify USB cable quality

### Debug Mode

Enable detailed logging:

```javascript
const client = new M5StackClient({
  logLevel: 'debug',
  timeout: 15000
});
```

## Example Output

### Basic Usage Example
```
🚀 M5Stack Node.js Basic Usage Example

🔍 Scanning for serial ports...
📡 Available ports:
  1. /dev/tty.usbserial-A50285BI

🔌 Connecting to /dev/tty.usbserial-A50285BI...
✅ Connected successfully!

🏥 Checking device status...
Device online: ✅

📋 Device Information:
  Platform: esp32
  Version: 1.4.2
  Chip ID: M5Stack
  Flash Size: 16777216 bytes
  RAM Size: 524288 bytes

🐍 Executing Python code...
  Output: Hello from M5Stack via Node.js!
  Execution time: 234ms
  Exit code: 0

📁 Files on device (/flash):
  📄 boot.py
  📄 main.py

🎉 Basic usage example completed successfully!
```

## Contributing

To add new examples:

1. Create a new `.js` file following the naming pattern
2. Add a script entry in `package.json`
3. Follow the existing error handling patterns
4. Include comprehensive documentation
5. Test with actual M5Stack hardware

## Related Documentation

- [M5Stack Documentation](https://docs.m5stack.com/)
- [MicroPython Guide](https://micropython.org/)
- [@h1mpy-sdk/node API Reference](../../packages/node/README.md)
- [Serial Communication Protocol](../../packages/core/README.md)