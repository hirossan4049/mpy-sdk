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
      return;
    }
    const targetPort = m5stackPorts[0].path;
    console.log(`\n🔌 Connecting to ${targetPort}...`);
    
    connection = await client.connect(targetPort);
    console.log('✅ Connected successfully!\n');

    // 3. Check device status
    console.log('🏥 Checking device status...');
    const isOnline = await connection.isOnline();
    console.log(`Device online: ${isOnline ? '✅' : '❌'}`);

    if (!isOnline) {
      console.log('⚠️  Device appears to be offline. Continuing anyway...');
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
    const helloResult = await connection.executeCode('print("Hello from M5Stack via Node.js!")');
    console.log(`  Output: ${helloResult.output || '(no output)'}`);
    console.log(`  Execution time: ${helloResult.executionTime}ms`);
    console.log(`  Exit code: ${helloResult.exitCode}`);

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

module.exports = { basicUsageExample };