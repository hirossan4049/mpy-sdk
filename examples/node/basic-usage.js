/**
 * Basic Usage Example for @h1mpy-sdk/node
 * 
 * This example demonstrates the most common operations:
 * - Connecting to M5Stack device
 * - Executing Python code
 * - Basic file operations
 * - Device information retrieval
 */

const { M5StackClient } = require('../../packages/node/dist/index.js');

/**
 * Demo mode when no M5Stack device is available
 */
async function runDemoMode(client) {
  console.log('\n📚 Demo Mode - SDK Features Overview:\n');
  
  console.log('🔧 Client Configuration:');
  console.log('  - Timeout: 10000ms');
  console.log('  - Baud Rate: 115200');
  console.log('  - Auto Reconnect: false');
  console.log('  - Log Level: info');
  
  console.log('\n⚡ Available SDK Features:');
  console.log('  📡 Connection Management:');
  console.log('    - client.listPorts()           # List available serial ports');
  console.log('    - client.connect(port)         # Connect to M5Stack device');
  console.log('    - client.disconnect(port)      # Disconnect from device');
  console.log('    - client.disconnectAll()       # Disconnect all devices');
  
  console.log('\n  🐍 Code Execution:');
  console.log('    - connection.executeCode(code) # Execute Python code');
  console.log('    - connection.executeFile(path) # Execute Python file');
  
  console.log('\n  📁 File Operations:');
  console.log('    - connection.listDirectory(path)      # List files and directories');
  console.log('    - connection.readFile(path)           # Read file content');
  console.log('    - connection.writeFile(path, content) # Write file to device');
  console.log('    - connection.deleteFile(path)         # Delete file from device');
  
  console.log('\n  📊 Device Information:');
  console.log('    - connection.getDeviceInfo()   # Get device info (platform, version, etc.)');
  console.log('    - connection.isOnline()        # Check if device is responsive');
  
  console.log('\n  🌐 Network Configuration:');
  console.log('    - connection.setWifiConfig(ssid, password) # Configure WiFi');
  
  console.log('\n  🎨 M5Stack Specific Features:');
  console.log('    - LCD display control via MicroPython');
  console.log('    - Button input handling');
  console.log('    - Speaker and sound functions');
  console.log('    - IMU sensor data reading');
  console.log('    - RGB LED control');
  
  console.log('\n  🔄 Event Handling:');
  console.log('    - client.on("connect", handler)    # Connection events');
  console.log('    - client.on("disconnect", handler) # Disconnection events');
  console.log('    - client.on("error", handler)      # Error events');
  
  console.log('\n💡 To test with real hardware:');
  console.log('   1. Connect M5Stack device via USB');
  console.log('   2. Ensure MicroPython firmware is installed');
  console.log('   3. Run this example again');
  
  console.log('\n📚 For more examples, check:');
  console.log('   - examples/node/working-test.js     # Hardware verified example');
  console.log('   - examples/node/simple-repl-test.js # Basic REPL test');
  console.log('   - examples/web/                     # Browser examples');
  
  console.log('\n🎉 Demo completed - SDK is ready to use with real hardware!');
}

async function basicUsageExample() {
  console.log('🚀 M5Stack Node.js Basic Usage Example\n');

  // Create client with configuration
  const client = new M5StackClient({
    timeout: 10000,
    logLevel: 'info',
    baudRate: 115200,
    autoReconnect: false
  });

  let connection = null;

  // Add error handler for unhandled client errors
  client.on('error', (port, error) => {
    console.log(`\n⚠️  Connection error on ${port}: ${error.message}`);
  });

  try {
    // 1. List available serial ports
    console.log('🔍 Scanning for serial ports...');
    const ports = await client.listPorts();
    
    if (ports.length === 0) {
      console.log('❌ No serial ports found. Please check your M5Stack connection.');
      return;
    }

    console.log('📡 Available ports:');
    ports.forEach((port, i) => {
      console.log(`  ${i + 1}. ${port.path}`);
    });

    // 2. Connect to M5Stack port (filter for actual M5Stack device)
    const m5stackPorts = ports.filter(port => port.path.includes('usbserial'));
    if (m5stackPorts.length === 0) {
      console.log('❌ No M5Stack device found. Available ports:');
      ports.forEach((port, i) => console.log(`  ${i + 1}. ${port.path}`));
      console.log('\n💡 This example requires a real M5Stack device connected via USB.');
      console.log('   Please connect your M5Stack device and try again.');
      console.log('\n🔧 Running in demo mode to show SDK capabilities...');
      await runDemoMode(client);
      return;
    }
    const targetPort = m5stackPorts[0].path;
    console.log(`\n🔌 Connecting to ${targetPort}...`);
    
    // Add timeout for connection attempt
    try {
      connection = await client.connect(targetPort);
      console.log('✅ Connected successfully!\n');
    } catch (connectError) {
      console.log(`❌ Failed to connect to ${targetPort}`);
      console.log(`   Error: ${connectError.message}`);
      console.log('\n💡 Troubleshooting tips:');
      console.log('   1. Ensure M5Stack device is powered on');
      console.log('   2. Check USB cable connection');
      console.log('   3. Verify MicroPython firmware is installed');
      console.log('   4. Try resetting the M5Stack device');
      console.log('   5. Check if another application is using the port');
      return;
    }

    // 3. Check device status
    console.log('🏥 Checking device status...');
    try {
      const isOnline = await connection.isOnline();
      console.log(`Device online: ${isOnline ? '✅' : '❌'}`);

      if (!isOnline) {
        console.log('⚠️  Device appears to be offline. Some features may not work.');
        console.log('   Continuing with basic communication test...');
      }
    } catch (statusError) {
      console.log(`⚠️  Could not check device status: ${statusError.message}`);
      console.log('   Continuing anyway...');
    }

    // 4. Get device information
    console.log('\n📋 Device Information:');
    try {
      const deviceInfo = await connection.getDeviceInfo();
      console.log(`  Platform: ${deviceInfo.platform}`);
      console.log(`  Version: ${deviceInfo.version}`);
      console.log(`  Chip ID: ${deviceInfo.chipId}`);
      console.log(`  Flash Size: ${deviceInfo.flashSize} bytes`);
      console.log(`  RAM Size: ${deviceInfo.ramSize} bytes`);
    } catch (error) {
      console.log(`  ⚠️  Could not retrieve device info: ${error.message}`);
    }

    // 5. Execute simple Python code
    console.log('\n🐍 Executing Python code...');
    try {
      const helloResult = await connection.executeCode('print("Hello from M5Stack via Node.js!")');
      console.log(`  Output: ${helloResult.output || '(no output)'}`);
      console.log(`  Execution time: ${helloResult.executionTime}ms`);
      console.log(`  Exit code: ${helloResult.exitCode}`);
    } catch (execError) {
      console.log(`  ⚠️  Could not execute Python code: ${execError.message}`);
      console.log('  This might indicate a communication issue with the device.');
    }

    // 6. List files on device
    console.log('\n📁 Files on device (/flash):');
    try {
      const files = await connection.listDirectory('/flash');
      if (files.length === 0) {
        console.log('  (no files found)');
      } else {
        files.forEach(file => {
          const icon = file.type === 'directory' ? '📁' : '📄';
          console.log(`  ${icon} ${file.name}`);
        });
      }
    } catch (error) {
      console.log(`  ⚠️  Could not list files: ${error.message}`);
    }

    // 7. Create and test a simple Python file
    console.log('\n📝 Creating test file...');
    const testCode = `# Test file created by Node.js example
import time
import gc

print("=== M5Stack Test File ===")
print(f"Current time: {time.time()}")
print(f"Free memory: {gc.mem_free()} bytes")

# Try to use M5Stack features
try:
    from m5stack import lcd
    lcd.clear()
    lcd.print("Hello from Node.js!", 10, 10)
    print("LCD updated successfully")
except ImportError:
    print("LCD module not available")
except Exception as e:
    print(f"LCD error: {e}")

print("Test completed!")
`;

    try {
      await connection.writeFile('/flash/test_nodejs.py', testCode);
      console.log('✅ Test file created: /flash/test_nodejs.py');

      // 8. Read the file back to verify
      console.log('\n📖 Reading file back...');
      const fileContent = await connection.readFile('/flash/test_nodejs.py');
      console.log(`  File size: ${fileContent.length} bytes`);
      console.log(`  First 50 chars: ${fileContent.toString().substring(0, 50)}...`);

      // 9. Execute the test file
      console.log('\n🚀 Executing test file...');
      const fileResult = await connection.executeFile('/flash/test_nodejs.py');
      console.log(`  Output:\n${fileResult.output || '(no output)'}`);
      console.log(`  Execution time: ${fileResult.executionTime}ms`);
      console.log(`  Exit code: ${fileResult.exitCode}`);

      // 10. Clean up - delete test file
      console.log('\n🧹 Cleaning up...');
      await connection.deleteFile('/flash/test_nodejs.py');
      console.log('✅ Test file deleted');

    } catch (fileError) {
      console.log(`  ⚠️  File operation failed: ${fileError.message}`);
      console.log('  Skipping file operations test...');
    }

    console.log('\n🎉 Basic usage example completed successfully!');

  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Always disconnect
    if (connection) {
      try {
        await client.disconnectAll();
        console.log('\n🔌 Disconnected from device');
      } catch (disconnectError) {
        console.error('Disconnect error:', disconnectError.message);
      }
    }
  }
}

// Run the example
if (require.main === module) {
  basicUsageExample().catch(console.error);
}

module.exports = { basicUsageExample, runDemoMode };