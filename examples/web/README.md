# M5Stack Web Serial Example

This example demonstrates how to use the `@h1mpy-sdk/web` package to communicate with M5Stack devices using the Web Serial API in a browser environment.

## Features

- 🔌 **Web Serial Connection**: Connect to M5Stack devices directly from the browser
- 📄 **File Management**: Upload, list, and manage files on the device
- 🐍 **Code Execution**: Execute Python code remotely on the M5Stack
- 📊 **Progress Tracking**: Real-time progress updates for file transfers
- 🎨 **Interactive UI**: Clean, responsive interface for device interaction
- 📱 **Sample Programs**: Pre-built examples for LCD, sensors, and basic functionality

## Browser Requirements

- Chrome 89+ or Edge 89+
- Web Serial API must be enabled (usually enabled by default)
- HTTPS required for production deployment

## Quick Start

1. **Install dependencies**:
   ```bash
   cd examples/web
   pnpm install
   ```

2. **Start the development server**:
   ```bash
   pnpm dev
   ```

3. **Open your browser**:
   - Navigate to `http://localhost:3000`
   - Click "Connect to M5Stack"
   - Select your M5Stack device from the serial port dialog

## Usage

### 1. Connect to Device
- Click the "Connect to M5Stack" button
- Select your M5Stack device from the browser's serial port picker
- Wait for the connection to establish

### 2. Device Information
- Once connected, device information is automatically retrieved
- Click "Get Device Info" to refresh device details

### 3. File Operations
- **List Files**: View all files on the device's flash memory
- **Upload Files**: Select local files (.py, .txt, .json) to upload
- **Progress Tracking**: Monitor upload progress in real-time

### 4. Code Execution
- Write Python code in the text area
- Click "Execute Code" to run it on the M5Stack
- View output and error messages in the result area

### 5. Sample Programs
- **Hello World**: Basic greeting and LCD test
- **LCD Demo**: Color cycling and display functions
- **Sensor Demo**: Read and display accelerometer/gyro data

## API Usage

The example uses the `@h1mpy-sdk/web` package:

```javascript
import { M5StackClient, WebSerialConnection } from '@h1mpy-sdk/web';

// Create client
const client = new M5StackClient({
  timeout: 10000,
  logLevel: 'info'
});

// Request and connect to port
const port = await WebSerialConnection.requestPort();
const connection = await client.connect(port);

// Execute code
const result = await connection.executeCode('print("Hello!")');

// Upload file
await connection.writeFile('/flash/main.py', 'print("Hello World!")', {
  onProgress: (bytesWritten, totalBytes) => {
    console.log(`Upload: ${(bytesWritten / totalBytes * 100).toFixed(1)}%`);
  }
});
```

## Deployment

For production deployment:

1. **Build the application**:
   ```bash
   pnpm build
   ```

2. **Deploy the `dist` directory** to your web server

3. **Ensure HTTPS**: Web Serial API requires HTTPS in production

## Troubleshooting

### Web Serial API Not Supported
- Ensure you're using Chrome 89+ or Edge 89+
- Check that Web Serial API is enabled in browser flags
- For development, enable: `chrome://flags/#enable-experimental-web-platform-features`

### Connection Issues
- Verify the M5Stack device is powered on and running MicroPython
- Check that no other applications are using the serial port
- Try reconnecting the USB cable

### File Upload Failures
- Ensure the target directory exists on the device
- Check file permissions and available space
- Verify the file content is valid for the target format

## Development

The example is built with:
- **Vite**: Fast development server and build tool
- **Vanilla JavaScript**: No framework dependencies
- **ES Modules**: Modern JavaScript module system

### Project Structure

```
examples/web/
├── index.html          # Main HTML interface
├── main.js             # Application logic
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
└── README.md          # This file
```

### Extending the Example

To add new features:

1. **Add UI elements** to `index.html`
2. **Implement functionality** in `main.js`
3. **Use the SDK API** from `@h1mpy-sdk/web`

Example of adding a new feature:

```javascript
// Add to main.js
async resetDevice() {
  if (!this.connection) return;
  
  try {
    await this.connection.executeCode('import machine; machine.reset()');
    this.log('🔄 Device reset initiated', 'info');
  } catch (error) {
    this.log(`❌ Reset failed: ${error.message}`, 'error');
  }
}
```

## License

This example is part of the @h1mpy-sdk project and is licensed under the MIT License.