/**
 * Flash Example - Write main.py to M5Stack Flash Memory
 * 
 * This example demonstrates how to write a comprehensive main.py file
 * to the M5Stack's flash memory (/flash/main.py)
 */

const { NodeSerialConnection } = require('../../packages/node/dist/NodeSerialConnection.js');

class FlashExample {
  constructor(portPath) {
    this.portPath = portPath;
    this.connection = null;
    this.responseBuffer = '';
  }

  async connect() {
    this.connection = new NodeSerialConnection(this.portPath, {
      baudRate: 115200,
      timeout: 15000 // Longer timeout for file operations
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
    await this.waitForData(5000);
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

  async writeFileToFlash(filename, content) {
    console.log(`📝 Writing ${filename} to flash...`);
    
    // Split content into chunks for reliable transfer
    const chunkSize = 200; // Smaller chunks for stability
    const chunks = [];
    
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize));
    }
    
    // Open file for writing
    await this.executeCode(`f = open('${filename}', 'w')`);
    
    // Write chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const escapedChunk = chunk.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
      await this.executeCode(`f.write('${escapedChunk}')`);
      
      if (i % 10 === 0) {
        console.log(`   Progress: ${Math.round((i / chunks.length) * 100)}%`);
      }
    }
    
    // Close file
    await this.executeCode('f.close()');
    console.log(`✅ ${filename} written successfully`);
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.disconnect();
    }
  }
}

// Simple main.py content for hello world
const MAIN_PY_CONTENT = `# Simple Hello World for M5Stack
from m5stack import lcd
import time

# Clear screen
lcd.clear()

# Display hello world
lcd.setTextSize(3)
lcd.print("Hello World", 50, 50, 0x00FF00)

print("Hello World displayed on M5Stack!")
`;

async function flashExample() {
  console.log('🔥 M5Stack Flash Example - Writing main.py to Flash Memory\n');

  const portPath = '/dev/tty.usbserial-55520ADC16';
  const flasher = new FlashExample(portPath);

  try {
    // Connect to device
    console.log('🔌 Connecting to M5Stack...');
    await flasher.connect();
    console.log('✅ Connected successfully\n');

    // Check current files
    console.log('📁 Checking current files in /flash:');
    let result = await flasher.executeCode('import os; print(os.listdir("/flash"))');
    console.log(`Current files: ${result.trim()}\n`);

    // Write the new main.py
    console.log('📝 Writing new main.py to flash...');
    await flasher.writeFileToFlash('/flash/main.py', MAIN_PY_CONTENT);

    // Verify the file was written
    console.log('\n🔍 Verifying written file...');
    result = await flasher.executeCode('import os; print("Size:", os.stat("/flash/main.py")[6], "bytes")');
    console.log(`Verification: ${result.trim()}\n`);

    // Test the application by running it
    console.log('🧪 Testing the application...');
    result = await flasher.executeCode('exec(open("/flash/main.py").read())');
    console.log(`Test result: ${result.trim()}\n`);

    console.log('🎉 Flash example completed successfully!');
    console.log('📋 Summary:');
    console.log('   ✅ main.py written to /flash/main.py');
    console.log('   ✅ Simple Hello World application');
    console.log('   ✅ Displays "Hello World" on LCD');
    console.log('\n📺 Check your M5Stack display - you should see "Hello World"!');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await flasher.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

if (require.main === module) {
  flashExample().catch(console.error);
}

module.exports = { flashExample, FlashExample };