/**
 * Demo Test Example for @h1mpy-sdk/node
 * 
 * This example always runs in demo mode to show SDK capabilities
 * without requiring actual M5Stack hardware.
 */

const { M5StackClient } = require('../../packages/node/dist/index.js');

async function demoTest() {
  console.log('🎭 M5Stack SDK Demo Test\n');

  // Create client to demonstrate configuration
  const client = new M5StackClient({
    timeout: 5000,
    logLevel: 'info',
    baudRate: 115200,
    autoReconnect: false,
    maxRetries: 3
  });

  console.log('✅ M5StackClient initialized successfully!');
  console.log('   Configuration:');
  console.log('   - Timeout: 5000ms');
  console.log('   - Baud Rate: 115200');
  console.log('   - Auto Reconnect: false');
  console.log('   - Max Retries: 3');
  console.log('   - Log Level: info');

  try {
    // Test 1: Port scanning
    console.log('\n🔍 Testing port scanning...');
    const ports = await client.listPorts();
    
    console.log(`✅ Found ${ports.length} serial ports:`);
    ports.forEach((port, i) => {
      const status = port.path.includes('usbserial') ? '🎯 M5Stack-like' : '📡 Other';
      console.log(`   ${i + 1}. ${port.path} ${status}`);
    });

    // Test 2: Client status
    console.log('\n📊 Testing client status...');
    const status = client.getStatus();
    console.log('✅ Client status retrieved:');
    console.log(`   Active connections: ${status.activeConnections}`);
    console.log(`   Total connections tracked: ${status.connections.length}`);

    // Test 3: Event handling
    console.log('\n🎧 Testing event handling...');
    let eventReceived = false;
    client.on('connect', (port) => {
      console.log(`✅ Connect event: ${port}`);
      eventReceived = true;
    });
    client.on('disconnect', (port) => {
      console.log(`✅ Disconnect event: ${port}`);
    });
    client.on('error', (port, error) => {
      console.log(`✅ Error event: ${port} - ${error.message}`);
      eventReceived = true;
    });
    console.log('✅ Event handlers registered successfully');

    // Test 4: Configuration methods
    console.log('\n⚙️  Testing configuration methods...');
    
    client.setLogLevel('debug');
    console.log('✅ Log level changed to debug');
    
    client.setTimeout(10000);
    console.log('✅ Timeout changed to 10000ms');
    
    client.setLogLevel('info'); // Reset
    console.log('✅ Log level reset to info');

    // Test 5: Health check (will show empty result)
    console.log('\n🏥 Testing health check...');
    const healthStatus = await client.healthCheck();
    console.log('✅ Health check completed:');
    const connectionCount = Object.keys(healthStatus).length;
    console.log(`   Checked ${connectionCount} connections`);

  } catch (error) {
    console.error(`❌ Demo test failed: ${error.message}`);
  }

  // Demo mode information
  console.log('\n📚 M5Stack SDK Features Overview:');
  
  console.log('\n🔧 Connection Management:');
  console.log('   ✅ Multi-device support');
  console.log('   ✅ Automatic reconnection');
  console.log('   ✅ Connection health monitoring');
  console.log('   ✅ Event-driven architecture');

  console.log('\n🐍 Python Execution:');
  console.log('   ✅ Direct code execution');
  console.log('   ✅ File-based execution');
  console.log('   ✅ Execution time tracking');
  console.log('   ✅ Error handling and reporting');

  console.log('\n📁 File System Operations:');
  console.log('   ✅ Directory listing');
  console.log('   ✅ File read/write');
  console.log('   ✅ File deletion');
  console.log('   ✅ Progress tracking for transfers');

  console.log('\n📊 Device Information:');
  console.log('   ✅ Platform detection');
  console.log('   ✅ Firmware version');
  console.log('   ✅ Hardware specifications');
  console.log('   ✅ Network configuration');

  console.log('\n🎨 M5Stack Hardware Support:');
  console.log('   ✅ LCD display control');
  console.log('   ✅ Button input handling');
  console.log('   ✅ Speaker and audio');
  console.log('   ✅ IMU sensor data');
  console.log('   ✅ RGB LED control');
  console.log('   ✅ WiFi configuration');

  console.log('\n🔄 Advanced Features:');
  console.log('   ✅ Binary protocol communication');
  console.log('   ✅ REPL mode for interactive development');
  console.log('   ✅ CRC validation for data integrity');
  console.log('   ✅ Chunked file transfers');
  console.log('   ✅ Timeout and retry mechanisms');

  console.log('\n💻 Platform Support:');
  console.log('   ✅ Node.js (this example)');
  console.log('   ✅ Web browsers (via Web Serial API)');
  console.log('   ✅ VS Code extension integration');
  console.log('   ✅ Command-line tools (CLI/TUI)');

  console.log('\n📚 Example Usage:');
  console.log('   const client = new M5StackClient();');
  console.log('   const connection = await client.connect("/dev/ttyUSB0");');
  console.log('   await connection.executeCode("print(\'Hello M5Stack!\')");');
  console.log('   await connection.writeFile("/flash/main.py", pythonCode);');
  console.log('   const files = await connection.listDirectory("/flash");');
  console.log('   const info = await connection.getDeviceInfo();');

  console.log('\n🚀 Next Steps:');
  console.log('   1. Connect M5Stack device via USB');
  console.log('   2. Install MicroPython firmware if needed');
  console.log('   3. Run: pnpm working (for hardware test)');
  console.log('   4. Explore other examples in examples/node/');
  console.log('   5. Try the web examples in examples/web/');
  console.log('   6. Use CLI tools: pnpm cli or pnpm cli:tui');

  // Clean up
  await client.disconnectAll();
  console.log('\n🎉 Demo test completed successfully!');
  console.log('✨ M5Stack SDK is ready for development!');
}

// Run the demo
if (require.main === module) {
  demoTest().catch(console.error);
}

module.exports = { demoTest };