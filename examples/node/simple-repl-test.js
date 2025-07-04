/**
 * Simple REPL Test for @h1mpy-sdk/node
 * 
 * This is a basic test to verify REPL communication with M5Stack
 */

const { REPLAdapter } = require('../../packages/core/dist/adapters/REPLAdapter.js');

async function simpleReplTest() {
  console.log('🧪 Simple REPL Test\n');

  // Use the M5Stack port directly
  const portPath = '/dev/tty.usbserial-55520ADC16';
  console.log(`📡 Connecting to ${portPath}...`);

  const adapter = new REPLAdapter(portPath);

  try {
    // Connect and initialize
    await adapter.connect();
    await adapter.initialize();
    console.log('✅ REPL connected and initialized!\n');

    // Test 1: Basic Python execution
    console.log('1️⃣  Testing basic Python execution...');
    const result1 = await adapter.executeCode('print("Hello from M5Stack!")');
    console.log(`   Output: ${result1.output}`);
    console.log(`   Execution time: ${result1.executionTime}ms\n`);

    // Test 2: Math calculation
    console.log('2️⃣  Testing math calculation...');
    const result2 = await adapter.executeCode('print(f"2 + 3 = {2 + 3}")');
    console.log(`   Output: ${result2.output}\n`);

    // Test 3: System information
    console.log('3️⃣  Getting system information...');
    const result3 = await adapter.executeCode(`
import sys
import gc
print(f"Platform: {sys.platform}")
print(f"Free memory: {gc.mem_free()} bytes")
`);
    console.log(`   Output:\n${result3.output}\n`);

    // Test 4: Try M5Stack specific features
    console.log('4️⃣  Testing M5Stack features...');
    const result4 = await adapter.executeCode(`
try:
    from m5stack import lcd
    lcd.clear()
    lcd.print("Hello from Node.js!", 10, 10)
    print("LCD updated successfully")
except ImportError:
    print("M5Stack LCD module not available")
except Exception as e:
    print(f"LCD error: {e}")
`);
    console.log(`   Output:\n${result4.output}\n`);

    // Test 5: Device info
    console.log('5️⃣  Getting device information...');
    try {
      const deviceInfo = await adapter.getDeviceInfo();
      console.log('   Device info:');
      console.log(`     Platform: ${deviceInfo.platform}`);
      console.log(`     Version: ${deviceInfo.version}`);
      console.log(`     Chip ID: ${deviceInfo.chipId}\n`);
    } catch (error) {
      console.log(`   Device info error: ${error.message}\n`);
    }

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error('Stack trace:', error.stack);
  } finally {
    try {
      await adapter.disconnect();
      console.log('\n📡 Disconnected from device');
    } catch (disconnectError) {
      console.error('Disconnect error:', disconnectError.message);
    }
  }
}

// Run the test
if (require.main === module) {
  simpleReplTest().catch(console.error);
}

module.exports = { simpleReplTest };