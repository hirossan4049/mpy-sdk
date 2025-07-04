/**
 * Test Device Information Retrieval
 * 
 * This test specifically checks the new hardware information features:
 * - Flash size detection
 * - RAM size detection  
 * - MAC address retrieval
 */

const { REPLAdapter } = require('../../packages/core/dist/adapters/REPLAdapter.js');

async function testDeviceInfo() {
  console.log('🔍 Testing Device Information Retrieval\n');

  const portPath = '/dev/tty.usbserial-55520ADC16';
  console.log(`📡 Connecting to ${portPath}...`);

  const adapter = new REPLAdapter(portPath);

  try {
    await adapter.connect();
    await adapter.initialize();
    console.log('✅ REPL connected!\n');

    // Test device info retrieval
    console.log('📋 Getting device information...');
    const deviceInfo = await adapter.getDeviceInfo();
    
    console.log('🔧 Device Information:');
    console.log(`   Platform: ${deviceInfo.platform}`);
    console.log(`   Version: ${deviceInfo.version}`);
    console.log(`   Chip ID: ${deviceInfo.chipId}`);
    console.log(`   Flash Size: ${deviceInfo.flashSize} bytes (${(deviceInfo.flashSize / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   RAM Size: ${deviceInfo.ramSize} bytes (${(deviceInfo.ramSize / 1024).toFixed(2)} KB)`);
    console.log(`   MAC Address: ${deviceInfo.macAddress}`);
    
    // Test individual commands to verify they work
    console.log('\n🧪 Testing individual hardware commands...');
    
    console.log('\n1️⃣ Flash size test:');
    const flashResult = await adapter.executeCode(`
try:
    import esp
    print(f"Flash size: {esp.flash_size()} bytes")
except Exception as e:
    print(f"Flash size error: {e}")
`);
    console.log(`   Output: ${flashResult.output.trim()}`);
    
    console.log('\n2️⃣ RAM test:');
    const ramResult = await adapter.executeCode(`
try:
    import gc
    print(f"Free memory: {gc.mem_free()} bytes")
    print(f"Total memory: {gc.mem_alloc() + gc.mem_free()} bytes")
except Exception as e:
    print(f"RAM error: {e}")
`);
    console.log(`   Output: ${ramResult.output.trim()}`);
    
    console.log('\n3️⃣ MAC address test:');
    const macResult = await adapter.executeCode(`
try:
    import network
    wlan = network.WLAN(network.STA_IF)
    mac = wlan.config('mac')
    print(f"MAC address: {':'.join(['%02X' % b for b in mac])}")
except Exception as e:
    print(f"MAC error: {e}")
`);
    console.log(`   Output: ${macResult.output.trim()}`);
    
    console.log('\n4️⃣ Additional system info:');
    const sysResult = await adapter.executeCode(`
try:
    import sys
    import os
    print(f"Platform: {sys.platform}")
    print(f"Python version: {sys.version}")
    print(f"Implementation: {sys.implementation.name}")
    print(f"Uname: {os.uname()}")
except Exception as e:
    print(f"System info error: {e}")
`);
    console.log(`   Output: ${sysResult.output.trim()}`);

    console.log('\n🎉 Device information test completed successfully!');
    console.log('\n💡 Summary:');
    console.log(`   ✅ Flash size: ${deviceInfo.flashSize > 0 ? 'Retrieved' : 'Not available'}`);
    console.log(`   ✅ RAM size: ${deviceInfo.ramSize > 0 ? 'Retrieved' : 'Not available'}`);
    console.log(`   ✅ MAC address: ${deviceInfo.macAddress !== 'unknown' ? 'Retrieved' : 'Not available'}`);

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error('Details:', error);
  } finally {
    try {
      await adapter.disconnect();
      console.log('\n📡 Disconnected');
    } catch (e) {
      console.error('Disconnect error:', e.message);
    }
  }
}

if (require.main === module) {
  testDeviceInfo().catch(console.error);
}

module.exports = { testDeviceInfo };