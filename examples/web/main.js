/**
 * M5Stack Web Serial Example
 * 
 * This example demonstrates how to use the @h1mpy-sdk/web package
 * to communicate with M5Stack devices via Web Serial API.
 */

import { M5StackClient, WebSerialConnection } from '@h1mpy-sdk/web';

class M5StackWebExample {
  constructor() {
    this.client = new M5StackClient({
      timeout: 10000,
      logLevel: 'info'
    });
    
    this.connection = null;
    this.isConnected = false;
    
    this.initializeEventListeners();
    this.checkWebSerialSupport();
  }

  checkWebSerialSupport() {
    if (!WebSerialConnection.isSupported()) {
      this.log('❌ Web Serial API not supported in this browser', 'error');
      this.log('ℹ️  Please use Chrome/Edge 89+ or enable chrome://flags/#enable-experimental-web-platform-features', 'info');
      return false;
    }
    
    this.log('✅ Web Serial API supported', 'info');
    return true;
  }

  initializeEventListeners() {
    // Connection controls
    document.getElementById('connect-btn').addEventListener('click', () => this.connect());
    document.getElementById('disconnect-btn').addEventListener('click', () => this.disconnect());
    
    // Device operations
    document.getElementById('get-info-btn').addEventListener('click', () => this.getDeviceInfo());
    document.getElementById('list-files-btn').addEventListener('click', () => this.listFiles());
    document.getElementById('execute-btn').addEventListener('click', () => this.executeCode());
    
    // File operations
    document.getElementById('upload-btn').addEventListener('click', () => this.uploadFile());
    document.getElementById('file-input').addEventListener('change', (e) => this.handleFileSelection(e));
    
    // Sample programs
    document.getElementById('flash-hello-btn').addEventListener('click', () => this.flashHelloWorld());
    document.getElementById('flash-lcd-btn').addEventListener('click', () => this.flashLcdDemo());
    document.getElementById('flash-sensor-btn').addEventListener('click', () => this.flashSensorDemo());
    
    // Utility
    document.getElementById('clear-log-btn').addEventListener('click', () => this.clearLog());
  }

  async connect() {
    try {
      this.log('🔌 Requesting serial port...', 'info');
      this.updateStatus('Requesting port...', 'busy');
      
      const port = await WebSerialConnection.requestPort();
      this.log('📡 Connecting to M5Stack device...', 'info');
      this.updateStatus('Connecting...', 'busy');
      
      this.connection = await this.client.connect(port);
      this.isConnected = true;
      this.lastPort = port; // Store port for reconnection
      
      this.setupConnectionEvents();
      this.updateStatus('Connected', 'connected');
      this.updateButtonStates();
      
      this.log('✅ Connected successfully!', 'info');
      
      // Auto-get device info
      setTimeout(() => this.getDeviceInfo(), 1000);
      
    } catch (error) {
      this.log(`❌ Connection failed: ${error.message}`, 'error');
      this.updateStatus('Connection failed', 'disconnected');
      this.updateButtonStates();
      
      // Auto-reconnect on timeout errors during initial connection
      if (error.message.includes('timeout') || error.message.includes('Command timeout')) {
        this.log('🔄 Initial connection timeout, attempting to reconnect...', 'info');
        this.handleTimeoutReconnect();
      }
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await this.client.disconnect(this.connection.port);
        this.connection = null;
        this.isConnected = false;
        
        this.updateStatus('Disconnected', 'disconnected');
        this.updateButtonStates();
        this.log('🔌 Disconnected', 'info');
      }
    } catch (error) {
      this.log(`❌ Disconnect failed: ${error.message}`, 'error');
    }
  }

  setupConnectionEvents() {
    if (!this.connection) return;
    
    this.connection.on('disconnect', () => {
      this.log('🔌 Device disconnected', 'info');
      this.isConnected = false;
      this.updateStatus('Disconnected', 'disconnected');
      this.updateButtonStates();
    });
    
    this.connection.on('error', (error) => {
      this.log(`❌ Connection error: ${error.message}`, 'error');
      
      // Auto-reconnect on timeout errors
      if (error.message.includes('timeout') || error.message.includes('Command timeout')) {
        this.log('🔄 Timeout detected, attempting to reconnect...', 'info');
        this.handleTimeoutReconnect();
      }
    });
    
    this.connection.on('busy', (busy) => {
      if (busy) {
        this.updateStatus('Device busy...', 'busy');
      } else {
        this.updateStatus('Connected', 'connected');
      }
    });
  }

  async getDeviceInfo() {
    if (!this.connection) return;
    
    try {
      this.log('ℹ️  Getting device information...', 'info');
      const info = await this.connection.getDeviceInfo();
      
      const infoEl = document.getElementById('device-info');
      infoEl.textContent = JSON.stringify(info, null, 2);
      
      this.log('✅ Device info retrieved', 'info');
      
    } catch (error) {
      this.log(`❌ Failed to get device info: ${error.message}`, 'error');
    }
  }

  async listFiles() {
    if (!this.connection) return;
    
    try {
      this.log('📁 Listing files...', 'info');
      const files = await this.connection.listDirectory('/flash');
      
      const fileListEl = document.getElementById('file-list');
      fileListEl.innerHTML = '';
      
      if (files.length === 0) {
        fileListEl.innerHTML = '<div class="file-item">No files found</div>';
      } else {
        files.forEach(file => {
          const fileItem = document.createElement('div');
          fileItem.className = 'file-item';
          fileItem.innerHTML = `
            <strong>${file.name}</strong> 
            <span style="color: #666;">(${file.size} bytes)</span>
            ${file.isDirectory ? '<em>📁 Directory</em>' : '📄 File'}
          `;
          fileListEl.appendChild(fileItem);
        });
      }
      
      this.log(`✅ Found ${files.length} files`, 'info');
      
    } catch (error) {
      this.log(`❌ Failed to list files: ${error.message}`, 'error');
    }
  }

  async executeCode() {
    if (!this.connection) return;
    
    const code = document.getElementById('code-input').value;
    if (!code.trim()) {
      this.log('❌ No code to execute', 'error');
      return;
    }
    
    try {
      this.log('🐍 Executing Python code...', 'info');
      const result = await this.connection.executeCode(code);
      
      const outputEl = document.getElementById('execution-output');
      outputEl.textContent = `Output:\n${result.output || '(no output)'}`;
      
      if (result.error) {
        outputEl.textContent += `\n\nError:\n${result.error}`;
      }
      
      this.log(`✅ Code executed (${result.executionTime}ms)`, 'info');
      
    } catch (error) {
      this.log(`❌ Code execution failed: ${error.message}`, 'error');
      document.getElementById('execution-output').textContent = `Error: ${error.message}`;
    }
  }

  handleFileSelection(event) {
    const file = event.target.files[0];
    if (file) {
      this.log(`📄 File selected: ${file.name} (${file.size} bytes)`, 'info');
      document.getElementById('upload-btn').disabled = false;
    }
  }

  async uploadFile() {
    if (!this.connection) return;
    
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    
    if (!file) {
      this.log('❌ No file selected', 'error');
      return;
    }
    
    try {
      this.log(`📤 Uploading ${file.name}...`, 'info');
      
      const content = await file.text();
      const targetPath = `/flash/${file.name}`;
      
      // Show progress bar
      const progressBar = document.getElementById('upload-progress');
      const progressFill = document.getElementById('upload-fill');
      progressBar.style.display = 'block';
      
      await this.connection.writeFile(targetPath, content, {
        onProgress: (bytesWritten, totalBytes) => {
          const percentage = (bytesWritten / totalBytes) * 100;
          progressFill.style.width = `${percentage}%`;
          document.getElementById('upload-status').textContent = 
            `Uploading: ${percentage.toFixed(1)}%`;
        }
      });
      
      // Hide progress bar
      progressBar.style.display = 'none';
      document.getElementById('upload-status').textContent = '';
      
      this.log(`✅ File uploaded successfully: ${targetPath}`, 'info');
      
      // Auto-refresh file list
      setTimeout(() => this.listFiles(), 500);
      
    } catch (error) {
      this.log(`❌ Upload failed: ${error.message}`, 'error');
      document.getElementById('upload-progress').style.display = 'none';
      document.getElementById('upload-status').textContent = `Error: ${error.message}`;
    }
  }

  async flashHelloWorld() {
    if (!this.connection) return;
    
    const code = `
# Hello World for M5Stack
print("Hello World from M5Stack!")
print("Web Serial API is working!")

# Try to import M5Stack modules
try:
    from m5stack import lcd
    lcd.clear()
    lcd.print("Hello Web Serial!", 0, 0)
    lcd.print("Time: " + str(time.time()), 0, 20)
    print("LCD updated successfully")
except ImportError:
    print("M5Stack LCD module not available")
except Exception as e:
    print("LCD error:", str(e))
`;
    
    await this.flashCode('/flash/hello.py', code, 'Hello World');
  }

  async flashLcdDemo() {
    if (!this.connection) return;
    
    const code = `
# LCD Demo for M5Stack
import time

try:
    from m5stack import lcd, buttonA, buttonB, buttonC
    
    # Clear screen
    lcd.clear()
    
    # Display title
    lcd.print("LCD Demo", 10, 10)
    lcd.print("Press buttons:", 10, 30)
    lcd.print("A=Red B=Green C=Blue", 10, 50)
    
    # Color cycle
    colors = [0xFF0000, 0x00FF00, 0x0000FF]  # Red, Green, Blue
    color_names = ["Red", "Green", "Blue"]
    
    while True:
        for i, color in enumerate(colors):
            lcd.fillScreen(color)
            lcd.print(f"Color: {color_names[i]}", 10, 100, 0xFFFFFF)
            time.sleep(1)
            
        # Reset to default
        lcd.clear()
        lcd.print("LCD Demo Complete", 10, 10)
        break
        
except ImportError:
    print("M5Stack modules not available")
except Exception as e:
    print("LCD demo error:", str(e))
`;
    
    await this.flashCode('/flash/lcd_demo.py', code, 'LCD Demo');
  }

  async flashSensorDemo() {
    if (!this.connection) return;
    
    const code = `
# Sensor Demo for M5Stack
import time

try:
    from m5stack import lcd, imu
    
    lcd.clear()
    lcd.print("Sensor Demo", 10, 10)
    
    # Read sensor data
    for i in range(10):
        try:
            # Get accelerometer data
            accel = imu.acceleration
            gyro = imu.gyro
            
            # Display on LCD
            lcd.clear()
            lcd.print("Sensor Data:", 10, 10)
            lcd.print(f"Accel X: {accel[0]:.2f}", 10, 30)
            lcd.print(f"Accel Y: {accel[1]:.2f}", 10, 50)
            lcd.print(f"Accel Z: {accel[2]:.2f}", 10, 70)
            lcd.print(f"Gyro X: {gyro[0]:.2f}", 10, 90)
            lcd.print(f"Gyro Y: {gyro[1]:.2f}", 10, 110)
            lcd.print(f"Gyro Z: {gyro[2]:.2f}", 10, 130)
            
            time.sleep(1)
            
        except Exception as e:
            lcd.clear()
            lcd.print("Sensor Error:", 10, 10)
            lcd.print(str(e), 10, 30)
            break
            
    lcd.clear()
    lcd.print("Sensor Demo Complete", 10, 10)
    
except ImportError:
    print("M5Stack sensor modules not available")
except Exception as e:
    print("Sensor demo error:", str(e))
`;
    
    await this.flashCode('/flash/sensor_demo.py', code, 'Sensor Demo');
  }

  async flashCode(filename, code, description) {
    try {
      this.log(`📝 Flashing ${description}...`, 'info');
      
      await this.connection.writeFile(filename, code);
      this.log(`✅ ${description} flashed to ${filename}`, 'info');
      
      // Auto-execute the code
      setTimeout(async () => {
        try {
          await this.connection.executeFile(filename);
          this.log(`🚀 ${description} executed`, 'info');
        } catch (error) {
          this.log(`❌ Execution failed: ${error.message}`, 'error');
        }
      }, 500);
      
    } catch (error) {
      this.log(`❌ Flash failed: ${error.message}`, 'error');
    }
  }

  updateStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
  }

  updateButtonStates() {
    const connectBtn = document.getElementById('connect-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const deviceBtns = [
      'get-info-btn', 'list-files-btn', 'execute-btn', 'upload-btn',
      'flash-hello-btn', 'flash-lcd-btn', 'flash-sensor-btn'
    ];
    
    connectBtn.disabled = this.isConnected;
    disconnectBtn.disabled = !this.isConnected;
    
    deviceBtns.forEach(btnId => {
      document.getElementById(btnId).disabled = !this.isConnected;
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEl = document.getElementById('log');
    
    const logEntry = document.createElement('div');
    logEntry.style.marginBottom = '5px';
    logEntry.style.color = type === 'error' ? '#dc3545' : type === 'info' ? '#007bff' : '#333';
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    logEl.appendChild(logEntry);
    logEl.scrollTop = logEl.scrollHeight;
    
    // Also log to console
    console.log(`[M5Stack] ${message}`);
  }

  clearLog() {
    document.getElementById('log').innerHTML = '';
  }

  async handleTimeoutReconnect() {
    if (this.reconnectAttempts > 2) {
      this.log('❌ Maximum reconnection attempts reached, please reload the page', 'error');
      this.updateStatus('Reconnection failed - reload page', 'disconnected');
      
      // Show reload button
      const reloadBtn = document.createElement('button');
      reloadBtn.textContent = '🔄 Reload Page';
      reloadBtn.onclick = () => window.location.reload();
      reloadBtn.style.marginTop = '10px';
      reloadBtn.style.padding = '10px 20px';
      reloadBtn.style.backgroundColor = '#007bff';
      reloadBtn.style.color = 'white';
      reloadBtn.style.border = 'none';
      reloadBtn.style.borderRadius = '4px';
      reloadBtn.style.cursor = 'pointer';
      
      document.getElementById('log').appendChild(reloadBtn);
      return;
    }

    this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
    this.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/3...`, 'info');
    
    try {
      // Clear connection state
      this.isConnected = false;
      this.connection = null;
      this.updateStatus('Reconnecting...', 'busy');
      
      // Wait a bit before reconnecting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to reconnect using the same port
      if (this.lastPort) {
        this.log('🔌 Attempting to reconnect to last port...', 'info');
        this.connection = await this.client.connect(this.lastPort);
        this.isConnected = true;
        
        this.setupConnectionEvents();
        this.updateStatus('Reconnected', 'connected');
        this.updateButtonStates();
        
        this.log('✅ Reconnected successfully!', 'info');
        this.reconnectAttempts = 0; // Reset counter on success
        
        // Auto-get device info
        setTimeout(() => this.getDeviceInfo(), 1000);
      } else {
        throw new Error('No previous port available');
      }
      
    } catch (error) {
      this.log(`❌ Reconnection failed: ${error.message}`, 'error');
      this.updateStatus('Reconnection failed', 'disconnected');
      this.updateButtonStates();
      
      // Try again after a longer delay
      setTimeout(() => this.handleTimeoutReconnect(), 5000);
    }
  }
}

// Initialize the example when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new M5StackWebExample();
});