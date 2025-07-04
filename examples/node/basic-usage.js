/**
 * Basic Usage Example for M5Stack SDK
 * 
 * Demonstrates basic M5Stack operations using Raw REPL
 */

const { NodeSerialConnection } = require('../../packages/node/dist/NodeSerialConnection.js');

class BasicM5StackREPL {
  constructor(portPath) {
    this.portPath = portPath;
    this.connection = null;
    this.responseBuffer = '';
  }

  async connect() {
    this.connection = new NodeSerialConnection(this.portPath, {
      baudRate: 115200,
      timeout: 10000
    });

    this.connection.on('data', (data) => {
      this.responseBuffer += data.toString();
    });

    await this.connection.connect();
    
    // Initialize Raw REPL
    await this.connection.write(Buffer.from([0x03])); // Ctrl+C
    await this.waitForData(1000);
    await this.connection.write(Buffer.from([0x01])); // Ctrl+A
    await this.waitForData(2000);
    
    this.responseBuffer = '';
  }

  async executeCode(code) {
    this.responseBuffer = '';
    await this.connection.write(Buffer.from(code + '\r\n'));
    await this.connection.write(Buffer.from([0x04])); // Ctrl+D
    await this.waitForData(3000);
    return this.responseBuffer;
  }

  async waitForData(timeout) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (this.connection.bytesAvailable > 0) {
        const data = await this.connection.read();
        this.responseBuffer += data.toString();
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.disconnect();
    }
  }
}

async function basicUsageExample() {
  console.log('📚 M5Stack SDK - Basic Usage Example\n');

  const portPath = '/dev/tty.usbserial-55520ADC16';
  const m5stack = new BasicM5StackREPL(portPath);

  try {
    // Connect to device
    console.log('🔌 Connecting to M5Stack...');
    await m5stack.connect();
    console.log('✅ Connected successfully\n');

    // Basic Python execution
    console.log('1️⃣ Basic Python execution:');
    let result = await m5stack.executeCode('print("Hello M5Stack SDK!")');
    console.log(`   Output: ${result.trim()}\n`);

    // Math operations
    console.log('2️⃣ Math operations:');
    result = await m5stack.executeCode('print(2 + 3 * 4)');
    console.log(`   2 + 3 * 4 = ${result.trim()}\n`);

    // LCD Display
    console.log('3️⃣ LCD Display:');
    await m5stack.executeCode(`
from m5stack import lcd
lcd.clear()
lcd.print("Basic Usage Demo", 10, 30, 0x00FFFF)
lcd.print("SDK Working!", 10, 60, 0x00FF00)
print("LCD updated successfully")
`);
    console.log('   ✅ LCD display updated\n');

    // Device Information
    console.log('4️⃣ Device Information:');
    result = await m5stack.executeCode(`
import os
uname = os.uname()
print(f"Platform: {uname.sysname}")
print(f"Machine: {uname.machine}")
print(f"Version: {uname.release}")
`);
    console.log(`   Device info:\n${result.trim()}\n`);

    // File Operations
    console.log('5️⃣ File Operations:');
    await m5stack.executeCode(`
# Write a test file
with open('/flash/test.txt', 'w') as f:
    f.write('Hello from M5Stack SDK!')
print("File written successfully")
`);

    result = await m5stack.executeCode(`
# Read the test file
with open('/flash/test.txt', 'r') as f:
    content = f.read()
print(f"File content: {content}")
`);
    console.log(`   File operations:\n${result.trim()}\n`);

    // Cleanup
    await m5stack.executeCode(`
import os
os.remove('/flash/test.txt')
print("Test file cleaned up")
`);

    console.log('🎉 Basic usage example completed successfully!');
    console.log('📺 Check your M5Stack display for the demo message.');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await m5stack.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

if (require.main === module) {
  basicUsageExample().catch(console.error);
}

module.exports = { basicUsageExample, BasicM5StackREPL };