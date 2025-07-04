# Node.js Examples for M5Stack SDK

This directory contains working examples for the M5Stack MicroPython SDK using Node.js.

## Requirements

- M5Stack device with MicroPython firmware
- Node.js environment
- Serial connection to M5Stack device

## Available Examples

### 🚀 Quick Start

```bash
# Run the main UI demo
pnpm example:node
```

### 📚 Examples

#### 1. `basic-usage.js` - Basic Operations
Demonstrates fundamental M5Stack operations:
- Connecting to device via Raw REPL
- Executing Python code
- LCD display control
- File operations
- Device information retrieval

```bash
node basic-usage.js
```

#### 2. `raw-repl-ui-test.js` - Complete UI Demo ✅
Comprehensive UI demonstration including:
- Colorful LCD graphics
- Animated elements
- Button interaction
- Status displays
- Multiple UI screens

```bash
node raw-repl-ui-test.js
```

**Features**:
- ✅ **Hardware tested** with real M5Stack device
- ✅ Raw REPL mode for reliable communication
- ✅ Complete UI demonstration
- ✅ Animation and interaction support
- ✅ Real device compatibility verified

## Technical Notes

### Raw REPL Mode

All examples use MicroPython's Raw REPL mode for reliable communication:

1. **Ctrl+C** - Interrupt any running program
2. **Ctrl+A** - Enter Raw REPL mode
3. **Code + Ctrl+D** - Execute code
4. **Ctrl+B** - Exit Raw REPL mode

### Device Connection

Examples are configured for: `/dev/tty.usbserial-55520ADC16`

To use with your device, update the `portPath` variable in each example.

### Error Handling

All examples include comprehensive error handling and automatic cleanup of connections.

## Device Requirements

- **M5StickC-Plus** or compatible M5Stack device
- **MicroPython firmware** (tested with version 1.12.0)
- **USB serial connection** (typically FTDI-based)

## Troubleshooting

### No Response from Device
1. Verify MicroPython firmware is installed
2. Check serial port path
3. Ensure no other software is using the port
4. Try physical reset of the device

### Import Errors
1. Confirm M5Stack-specific MicroPython build
2. Check that `m5stack` module is available
3. Verify device model compatibility

## Development

These examples demonstrate the working Raw REPL approach after extensive testing and debugging. They provide a solid foundation for building more complex M5Stack applications.

## Example Output

### Raw REPL UI Test
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