/**
 * REPL Adapter Example
 * Demonstrates the MicroPython REPL interface for M5Stack
 */

const { REPLAdapter } = require('../dist/node/adapters/REPLAdapter');

async function replAdapterExample() {
  console.log('=== M5Stack REPL Adapter Example ===\n');

  const adapter = new REPLAdapter('/dev/tty.usbserial-55520ADC16');

  try {
    // Connect to device
    console.log('📡 Connecting to M5Stack...');
    await adapter.connect();
    await adapter.initialize();
    console.log('✅ Connected!\n');

    // 1. Basic Python execution
    console.log('1. Basic Python execution:');
    const result1 = await adapter.executeCode('print("Hello from M5Stack!")');
    console.log('Output:', result1.output);

    // 2. Multi-line code execution
    console.log('\n2. Multi-line code execution:');
    const multilineCode = `
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(5)
print(f"5! = {result}")
`;
    const result2 = await adapter.executeCode(multilineCode);
    console.log('Output:', result2.output);

    // 3. M5Stack specific features
    console.log('\n3. M5Stack display test:');
    const displayCode = `
from m5stack import *
from m5ui import *
from uiflow import *

setScreenColor(0x222222)
title = M5TextBox(20, 20, "REPL Demo", lcd.FONT_DejaVu18, 0x00FF00, rotate=0)
status = M5TextBox(20, 60, "Connected!", lcd.FONT_Default, 0xFFFFFF, rotate=0)
print("Display initialized")
`;
    const result3 = await adapter.executeCode(displayCode);
    console.log('Output:', result3.output);

    // 4. System information
    console.log('\n4. System information:');
    const sysInfoCode = `
import gc
import sys
import machine

print(f"Platform: {sys.platform}")
print(f"Python: {sys.version}")
print(f"Free memory: {gc.mem_free()} bytes")
print(f"CPU freq: {machine.freq()} Hz")
`;
    const result4 = await adapter.executeCode(sysInfoCode);
    console.log(result4.output);

    // 5. File operations
    console.log('\n5. File operations:');
    
    // Write a test file
    await adapter.writeFile('/test_repl.txt', 'Hello from REPL adapter!');
    console.log('✅ Created test_repl.txt');

    // Read it back
    const content = await adapter.readFile('/test_repl.txt');
    console.log('📄 File content:', content.toString());

    // List files
    console.log('\n📁 Files on device:');
    const files = await adapter.listDirectory('/');
    files.forEach(file => {
      const icon = file.type === 'directory' ? '📁' : '📄';
      console.log(`  ${icon} ${file.name}`);
    });

    // 6. Interactive features
    console.log('\n6. Button interaction example:');
    const buttonCode = `
from m5stack import *
import time

print("Press button A to test...")

# Check button state for 5 seconds
start_time = time.time()
pressed = False

while time.time() - start_time < 5:
    if btnA.isPressed():
        if not pressed:
            print("Button A pressed!")
            speaker.tone(1000, 100)
            pressed = True
    else:
        pressed = False
    time.sleep_ms(100)

print("Button test complete")
`;
    const result5 = await adapter.executeCode(buttonCode);
    console.log(result5.output);

    // 7. Error handling
    console.log('\n7. Error handling:');
    try {
      await adapter.executeCode('1/0');
    } catch (error) {
      console.log('✅ Error caught:', error.message);
    }

    // 8. Device info
    console.log('\n8. Device information:');
    const deviceInfo = await adapter.getDeviceInfo();
    console.log('Device info:', deviceInfo);

    console.log('\n✅ All examples completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await adapter.disconnect();
    console.log('\n📡 Disconnected');
  }
}

// Run example
if (require.main === module) {
  replAdapterExample().catch(console.error);
}

module.exports = { replAdapterExample };