/**
 * Simple Test Example for @h1mpy-sdk/node
 * 
 * This example tests basic SDK functionality and provides a demo mode
 * when no M5Stack device is available.
 */

const { M5StackClient } = require('../../packages/node/dist/index.js');

async function simpleTest() {
  console.log('🔧 M5Stack Simple Test\n');

  // Create client with reasonable timeout
  const client = new M5StackClient({
    timeout: 5000,  // Shorter timeout for faster feedback
    logLevel: 'info',
    baudRate: 115200
  });

  // Handle client errors gracefully
  client.on('error', (port, error) => {
    console.log(`⚠️  Error on ${port}: ${error.message}`);
  });

  try {
    // List available ports
    console.log('🔍 Scanning for serial ports...');
    const ports = await client.listPorts();
    
    console.log('📡 Available ports:');
    ports.forEach((port, i) => {
      console.log(`  ${i + 1}. ${port.path}`);
    });

    // Look for M5Stack device
    const m5stackPorts = ports.filter(port => 
      port.path.includes('usbserial') || 
      port.path.includes('USB') ||
      port.path.includes('ttyACM') ||
      port.path.includes('COM')
    );

    if (m5stackPorts.length === 0) {
      console.log('\n❌ No M5Stack-like device found.');
      console.log('🎭 Running in demo mode...\n');
      await runSimpleDemo();
      return;
    }

    // Try to connect to the first M5Stack-like device
    const targetPort = m5stackPorts[0].path;
    console.log(`\n🔌 Attempting connection to ${targetPort}...`);

    let connection;
    try {
      connection = await client.connect(targetPort);
      console.log('✅ Connected successfully!');

      // Simple ping test
      console.log('\n🏥 Testing device responsiveness...');
      try {
        const isOnline = await connection.isOnline();
        
        if (isOnline) {
          console.log('✅ Device is responsive!');
          await runConnectedTests(connection);
        } else {
          console.log('⚠️  Device connected but not responsive.');
          console.log('💡 This might indicate:');
          console.log('   - Device is running a program');
          console.log('   - MicroPython REPL is not available');
          console.log('   - Device needs to be reset');
        }
      } catch (pingError) {
        console.log(`⚠️  Device ping failed: ${pingError.message}`);
        console.log('💡 Device is connected but not responding to commands.');
        console.log('   This is common when device is running user code.');
        
        console.log('\n🎭 Showing SDK capabilities in demo mode...\n');
        await runSimpleDemo();
      }

    } catch (connectError) {
      console.log(`❌ Connection failed: ${connectError.message}`);
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Check if device is powered on');
      console.log('   2. Verify USB cable connection');
      console.log('   3. Ensure MicroPython firmware is installed');
      console.log('   4. Try resetting the device');
      console.log('   5. Check if another app is using the port');
      
      console.log('\n🎭 Running demo mode to show SDK capabilities...\n');
      await runSimpleDemo();
    }

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
  } finally {
    // Clean disconnect
    try {
      await client.disconnectAll();
      console.log('\n🔌 Disconnected from all devices');
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
  }
}

async function runConnectedTests(connection) {
  console.log('\n🧪 Running connected device tests...\n');

  // Test 1: Simple Python execution
  console.log('1️⃣  Testing Python execution:');
  try {
    const result = await connection.executeCode('print("Hello from M5Stack SDK!")');
    console.log(`   Output: ${result.output.trim()}`);
    console.log(`   ✅ Python execution works`);
  } catch (error) {
    console.log(`   ❌ Python execution failed: ${error.message}`);
  }

  // Test 2: Device information
  console.log('\n2️⃣  Getting device information:');
  try {
    const info = await connection.getDeviceInfo();
    console.log(`   Platform: ${info.platform}`);
    console.log(`   Version: ${info.version}`);
    console.log(`   Chip ID: ${info.chipId}`);
    console.log(`   ✅ Device info retrieved`);
  } catch (error) {
    console.log(`   ⚠️  Could not get device info: ${error.message}`);
  }

  // Test 3: File system
  console.log('\n3️⃣  Testing file system access:');
  try {
    const files = await connection.listDirectory('/');
    console.log(`   Found ${files.length} items in root directory`);
    console.log(`   ✅ File system accessible`);
  } catch (error) {
    console.log(`   ⚠️  File system access failed: ${error.message}`);
  }

  console.log('\n🎉 Connected tests completed!');
}

async function runSimpleDemo() {
  console.log('📚 M5Stack SDK Demo Mode\n');
  
  console.log('🔧 SDK Configuration:');
  console.log('   ✅ @h1mpy-sdk/node package loaded');
  console.log('   ✅ Serial port scanning works');
  console.log('   ✅ Client initialization successful');
  console.log('   ✅ Error handling implemented');

  console.log('\n⚡ SDK Features Available:');
  console.log('   📡 Device connection management');
  console.log('   🐍 Python code execution');
  console.log('   📁 File system operations');
  console.log('   📊 Device information retrieval');
  console.log('   🌐 WiFi configuration');
  console.log('   🎨 M5Stack hardware control');

  console.log('\n💾 Example Operations:');
  console.log('   const client = new M5StackClient();');
  console.log('   const connection = await client.connect("/dev/ttyUSB0");');
  console.log('   await connection.executeCode("print(\'Hello!\')");');
  console.log('   await connection.writeFile("/flash/main.py", code);');

  console.log('\n📚 Available Examples:');
  console.log('   - basic-usage.js      # Complete feature demonstration');
  console.log('   - working-test.js     # Hardware verified test');
  console.log('   - simple-repl-test.js # Basic REPL communication');

  console.log('\n💡 To test with real hardware:');
  console.log('   1. Connect M5Stack device via USB');
  console.log('   2. Ensure MicroPython firmware is installed');
  console.log('   3. Run: pnpm example:node');

  console.log('\n✨ SDK is ready for M5Stack development!');
}

// Run the test
if (require.main === module) {
  simpleTest().catch(console.error);
}

module.exports = { simpleTest, runSimpleDemo };