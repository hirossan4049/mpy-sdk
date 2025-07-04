/**
 * Standard MicroPython REPL communication
 */

const { SerialPort } = require('serialport');

class MicroPythonREPL {
  constructor(portPath, baudRate = 115200) {
    this.portPath = portPath;
    this.baudRate = baudRate;
    this.port = null;
    this.responseBuffer = '';
    this.commandPromise = null;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.port = new SerialPort({
        path: this.portPath,
        baudRate: this.baudRate,
        autoOpen: false
      });

      this.port.on('data', (data) => {
        this.responseBuffer += data.toString();
        this.processResponse();
      });

      this.port.on('error', reject);

      this.port.open((err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Connected to MicroPython REPL on ${this.portPath}`);
          resolve();
        }
      });
    });
  }

  async disconnect() {
    if (this.port) {
      return new Promise((resolve) => {
        this.port.close(() => {
          this.port = null;
          resolve();
        });
      });
    }
  }

  async sendCommand(command, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (!this.port) {
        reject(new Error('Not connected'));
        return;
      }

      this.responseBuffer = '';
      this.commandPromise = { resolve, reject };

      // Send the command
      this.port.write(command + '\r\n');

      // Set timeout
      setTimeout(() => {
        if (this.commandPromise) {
          this.commandPromise.reject(new Error('Command timeout'));
          this.commandPromise = null;
        }
      }, timeout);
    });
  }

  processResponse() {
    if (this.commandPromise && this.responseBuffer.includes('>>> ')) {
      // Extract the response (everything before the prompt)
      const lines = this.responseBuffer.split('\n');
      const responseLines = [];
      
      for (const line of lines) {
        if (line.includes('>>> ')) {
          break;
        }
        if (line.trim() && !line.includes(this.lastCommand)) {
          responseLines.push(line.trim());
        }
      }

      const response = responseLines.join('\n').trim();
      this.commandPromise.resolve(response);
      this.commandPromise = null;
    }
  }

  async initialize() {
    // Send Ctrl+C to interrupt any running program
    this.port.write(Buffer.from([0x03]));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear any pending input
    this.port.write('\r\n');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clear buffer
    this.responseBuffer = '';
  }
}

async function micropythonExample() {
  console.log('=== MicroPython REPL Example ===\n');

  const repl = new MicroPythonREPL('/dev/tty.usbserial-55520ADC16');

  try {
    await repl.connect();
    await repl.initialize();

    console.log('Testing basic Python commands...\n');

    // Test 1: Simple arithmetic
    console.log('>>> 2 + 2');
    const result1 = await repl.sendCommand('2 + 2');
    console.log(result1);

    // Test 2: Print statement
    console.log('\n>>> print("Hello M5Stack!")');
    const result2 = await repl.sendCommand('print("Hello M5Stack!")');
    console.log(result2);

    // Test 3: Import and use modules
    console.log('\n>>> import time');
    await repl.sendCommand('import time');
    
    console.log('>>> time.time()');
    const result3 = await repl.sendCommand('time.time()');
    console.log(result3);

    // Test 4: M5Stack specific (if available)
    console.log('\n>>> import sys');
    await repl.sendCommand('import sys');
    
    console.log('>>> sys.platform');
    const result4 = await repl.sendCommand('sys.platform');
    console.log(result4);

    // Test 5: Try M5Stack specific imports
    console.log('\nTesting M5Stack specific modules...');
    
    try {
      console.log('>>> import m5stack');
      const result5 = await repl.sendCommand('import m5stack');
      console.log('m5stack module:', result5 || 'imported successfully');
      
      console.log('>>> import machine');
      const result6 = await repl.sendCommand('import machine');
      console.log('machine module:', result6 || 'imported successfully');
      
    } catch (error) {
      console.log('M5Stack modules not available:', error.message);
    }

    // Test 6: List available modules
    console.log('\n>>> help("modules")');
    try {
      const modules = await repl.sendCommand('help("modules")', 10000);
      console.log('Available modules:');
      console.log(modules);
    } catch (error) {
      console.log('Could not list modules:', error.message);
    }

    // Test 7: Device information
    console.log('\nGetting device information...');
    
    try {
      console.log('>>> import os');
      await repl.sendCommand('import os');
      
      console.log('>>> os.uname()');
      const osInfo = await repl.sendCommand('os.uname()');
      console.log('OS Info:', osInfo);
      
    } catch (error) {
      console.log('Could not get OS info:', error.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await repl.disconnect();
    console.log('\nDisconnected from MicroPython REPL');
  }
}

// Run example
if (require.main === module) {
  micropythonExample().catch(console.error);
}

module.exports = { MicroPythonREPL, micropythonExample };