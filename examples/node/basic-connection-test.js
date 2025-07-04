/**
 * Basic Connection Test - 最もシンプルなテスト
 */

const { REPLAdapter } = require('../../packages/core/dist/adapters/REPLAdapter.js');

async function basicTest() {
  console.log('🔌 Basic Connection Test');
  
  const adapter = new REPLAdapter('/dev/tty.usbserial-55520ADC16');
  
  try {
    console.log('📡 Connecting...');
    await adapter.connect();
    console.log('✅ Connected!');
    
    console.log('🔧 Initializing...');
    await adapter.initialize();
    console.log('✅ Initialized!');
    
    console.log('🐍 Testing simple print...');
    const result = await adapter.executeCode('print("test")');
    console.log('📤 Result:', result);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    try {
      await adapter.disconnect();
      console.log('📡 Disconnected');
    } catch (e) {
      console.error('Disconnect error:', e.message);
    }
  }
}

basicTest().catch(console.error);