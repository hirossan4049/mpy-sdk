/**
 * Debug REPL Commands
 * 
 * This script helps debug individual REPL commands
 */

const { REPLAdapter } = require('../../packages/core/dist/adapters/REPLAdapter.js');

async function debugRepl() {
  console.log('🐛 Debug REPL Commands\n');

  const portPath = '/dev/tty.usbserial-55520ADC16';
  console.log(`📡 Connecting to ${portPath}...`);

  const adapter = new REPLAdapter(portPath);

  try {
    await adapter.connect();
    await adapter.initialize();
    console.log('✅ REPL connected!\n');

    // Test individual commands step by step
    console.log('1️⃣ Testing platform info:');
    const platformResult = await adapter.executeCode('sys.platform');
    console.log(`   Raw result: "${platformResult.output}"`);
    console.log(`   Cleaned: "${platformResult.output.replace(/'/g, '')}"`);
    
    console.log('\n2️⃣ Testing ESP flash size:');
    try {
      await adapter.executeCode('import esp');
      const flashResult = await adapter.executeCode('esp.flash_size()');
      console.log(`   Flash size result: "${flashResult.output}"`);
      console.log(`   Parsed: ${parseInt(flashResult.output.trim())}`);
    } catch (error) {
      console.log(`   ESP error: ${error.message}`);
    }
    
    console.log('\n3️⃣ Testing GC memory:');
    try {
      await adapter.executeCode('import gc');
      const memResult = await adapter.executeCode('gc.mem_free()');
      console.log(`   Memory result: "${memResult.output}"`);
      console.log(`   Parsed: ${parseInt(memResult.output.trim())}`);
    } catch (error) {
      console.log(`   GC error: ${error.message}`);
    }
    
    console.log('\n4️⃣ Testing network MAC:');
    try {
      await adapter.executeCode('import network');
      await adapter.executeCode('wlan = network.WLAN(network.STA_IF)');
      await adapter.executeCode('mac = wlan.config("mac")');
      const macResult = await adapter.executeCode('":".join(["%02X" % b for b in mac])');
      console.log(`   MAC result: "${macResult.output}"`);
      console.log(`   Cleaned: "${macResult.output.trim().replace(/'/g, '')}"`);
    } catch (error) {
      console.log(`   Network error: ${error.message}`);
    }
    
    console.log('\n5️⃣ Testing os.uname():');
    try {
      await adapter.executeCode('import os');
      const unameResult = await adapter.executeCode('os.uname()');
      console.log(`   Uname result: "${unameResult.output}"`);
    } catch (error) {
      console.log(`   Uname error: ${error.message}`);
    }

  } catch (error) {
    console.error(`❌ Debug failed: ${error.message}`);
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
  debugRepl().catch(console.error);
}

module.exports = { debugRepl };