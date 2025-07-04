# M5Stack Web Serial Example

This example demonstrates how to use the @hirossan4049/mpy-sdk in a web browser using the Web Serial API.

## Features

- 🔌 **Web Serial Connection**: Connect to M5Stack devices directly from the browser
- 💻 **Code Editor**: Write and execute Python code in real-time
- 📁 **File Management**: Upload, download, and delete files on the device
- 🎨 **Sample Code**: Flash pre-built sample applications
- 📱 **Device Information**: View device details and system info
- 🖥️ **Console Output**: Real-time output from code execution

## Requirements

- Modern browser with Web Serial API support:
  - Chrome 89+
  - Edge 89+
  - Opera 76+
- M5Stack device with MicroPython firmware
- USB connection

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start the development server**:
   ```bash
   pnpm dev
   ```

3. **Open in browser**:
   - The example will automatically open at `http://localhost:3000`
   - Make sure your M5Stack device is connected via USB

4. **Connect to your device**:
   - Click "Connect to M5Stack"
   - Select your device from the browser's serial port dialog
   - The interface will update once connected

## Usage

### Basic Operations

1. **Connect**: Click "Connect to M5Stack" and select your device
2. **Device Info**: View device information and system details
3. **List Files**: See all files on the device's flash memory
4. **Execute Code**: Write Python code and run it on the device
5. **Save Files**: Save your code as `main.py` on the device
6. **Flash Sample**: Upload and run a pre-built sample application

### Code Editor

The built-in code editor supports:
- Syntax highlighting for Python
- Real-time code execution
- File saving to device
- Sample code templates

### File Management

- **Download**: Save device files to your computer
- **Delete**: Remove files from the device
- **Upload**: Save editor content as files on the device

## Example Code

The example includes a sample M5Stack program that demonstrates:
- LCD display control
- Random color generation
- Button input handling
- Animation loops
- Text rendering

## Web Serial API

This example uses the Web Serial API to communicate with M5Stack devices:

```javascript
// Connect to device
const port = await navigator.serial.requestPort();
const connection = await client.connect(port);

// Execute code
const result = await connection.executeCode('print("Hello M5Stack!")');

// File operations
await connection.writeFile('/flash/main.py', code);
const files = await connection.listDirectory('/flash');
```

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 89+     | ✅ Full |
| Edge    | 89+     | ✅ Full |
| Opera   | 76+     | ✅ Full |
| Firefox | -       | ❌ Not supported |
| Safari  | -       | ❌ Not supported |

## Security Notes

- Web Serial API requires HTTPS in production (localhost works for development)
- Users must explicitly grant permission to access serial ports
- Each session requires re-selecting the device

## Troubleshooting

### Connection Issues

1. **Device not detected**: Make sure the M5Stack is connected via USB and running MicroPython
2. **Permission denied**: Check that no other applications are using the serial port
3. **Timeout errors**: Increase timeout in the client configuration

### Browser Issues

1. **Web Serial not supported**: Use Chrome 89+ or Edge 89+
2. **HTTPS required**: Use HTTPS in production or localhost for development
3. **Port access denied**: Grant permission in the browser's serial port dialog

## Development

To modify this example:

1. **Edit the UI**: Modify `index.html` and CSS styles
2. **Update logic**: Edit `main.js` for connection and device interaction
3. **Add features**: Extend the example with additional SDK functionality
4. **Build**: Run `pnpm build` to create a production build

## Related Examples

- [Node.js Examples](../): Server-side M5Stack development
- [Basic Usage](../basic-usage.js): Simple SDK usage
- [REPL Adapter](../repl-adapter-example.js): Interactive development

## License

MIT License - see the main project LICENSE file for details.