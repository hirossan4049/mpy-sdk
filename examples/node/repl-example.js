/**
 * REPL Example for @h1mpy-sdk/node
 * 
 * This example demonstrates REPL adapter usage for interactive
 * MicroPython development with M5Stack devices.
 */

const { REPLAdapter } = require('../../packages/node/dist/index.js');

async function replExample() {
  console.log('🐍 M5Stack REPL Adapter Example\n');

  // Note: Adjust the port path for your system
  // macOS: /dev/tty.usbserial-*
  // Windows: COM*
  // Linux: /dev/ttyUSB* or /dev/ttyACM*
  const portPath = process.argv[2] || '/dev/tty.usbserial-*';
  
  if (portPath.includes('*')) {
    console.log('⚠️  Please specify the exact port path:');
    console.log('   node repl-example.js /dev/tty.usbserial-YOUR_PORT');
    console.log('   node repl-example.js COM3');
    return;
  }

  const adapter = new REPLAdapter(portPath);

  try {
    // 1. Connect and initialize
    console.log(`📡 Connecting to ${portPath}...`);
    await adapter.connect();
    await adapter.initialize();
    console.log('✅ REPL connected and initialized!\n');

    // 2. Basic Python execution
    console.log('1️⃣  Basic Python execution:');
    const result1 = await adapter.executeCode('print("Hello from REPL!")');
    console.log(`   Output: ${result1.output}`);
    console.log(`   Time: ${result1.executionTime}ms\n`);

    // 3. Variable operations
    console.log('2️⃣  Variable operations:');
    await adapter.executeCode('my_variable = 42');
    const result2 = await adapter.executeCode('print(f"Variable value: {my_variable}")');
    console.log(`   Output: ${result2.output}\n`);

    // 4. Multi-line code
    console.log('3️⃣  Multi-line function definition:');
    const functionCode = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Calculate and print fibonacci numbers
for i in range(8):
    fib = fibonacci(i)
    print(f"fib({i}) = {fib}")
`;
    const result3 = await adapter.executeCode(functionCode);
    console.log(`   Output:\n${result3.output}\n`);

    // 5. M5Stack LCD operations
    console.log('4️⃣  M5Stack LCD operations:');
    const lcdCode = `
try:
    from m5stack import lcd, buttonA, buttonB, buttonC
    from m5ui import M5TextBox
    from uiflow import setScreenColor
    
    # Clear and setup display
    setScreenColor(0x001122)
    
    # Create UI elements
    title = M5TextBox(20, 20, "REPL Demo", lcd.FONT_DejaVu18, 0x00FF00, rotate=0)
    status = M5TextBox(20, 60, "Status: Ready", lcd.FONT_Default, 0xFFFFFF, rotate=0)
    counter_display = M5TextBox(20, 90, "Counter: 0", lcd.FONT_Default, 0x00AAFF, rotate=0)
    
    print("LCD initialized successfully")
    
except ImportError as e:
    print(f"M5Stack modules not available: {e}")
except Exception as e:
    print(f"LCD setup error: {e}")
`;
    const result4 = await adapter.executeCode(lcdCode);
    console.log(`   Output: ${result4.output}\n`);

    // 6. System information
    console.log('5️⃣  System information:');
    const sysCode = `
import gc
import sys
import time

print("=== System Information ===")
print(f"Platform: {sys.platform}")
print(f"Python: {sys.version}")
print(f"Free memory: {gc.mem_free():,} bytes")
print(f"Allocated: {gc.mem_alloc():,} bytes")
print(f"Uptime: {time.time():.1f} seconds")

try:
    import machine
    print(f"CPU frequency: {machine.freq():,} Hz")
    print(f"Unique ID: {machine.unique_id().hex()}")
except ImportError:
    print("Machine module not available")
`;
    const result5 = await adapter.executeCode(sysCode);
    console.log(result5.output);

    // 7. Interactive button test
    console.log('\n6️⃣  Interactive button test (5 seconds):');
    console.log('   Press buttons A, B, or C on your M5Stack...');
    
    const buttonCode = `
import time

print("Button test starting...")
start_time = time.time()
button_counts = {'A': 0, 'B': 0, 'C': 0}
last_state = {'A': False, 'B': False, 'C': False}

try:
    from m5stack import buttonA, buttonB, buttonC
    
    while time.time() - start_time < 5:
        # Check each button
        buttons = {'A': buttonA, 'B': buttonB, 'C': buttonC}
        
        for name, btn in buttons.items():
            current_state = btn.isPressed()
            
            # Detect button press (rising edge)
            if current_state and not last_state[name]:
                button_counts[name] += 1
                print(f"Button {name} pressed! (total: {button_counts[name]})")
                
                # Play sound if available
                try:
                    from m5stack import speaker
                    tone = 500 + (ord(name) - ord('A')) * 200  # Different tone per button
                    speaker.tone(tone, 100)
                except:
                    pass
            
            last_state[name] = current_state
        
        time.sleep_ms(50)  # Small delay
    
    print(f"Button test complete. Presses: {button_counts}")
    
except ImportError:
    print("Button modules not available")
except Exception as e:
    print(f"Button test error: {e}")
`;
    
    const result6 = await adapter.executeCode(buttonCode);
    console.log(result6.output);

    // 8. File operations via REPL
    console.log('\n7️⃣  File operations:');
    
    // Create a file
    const fileContent = `# REPL test file
print("This file was created via REPL!")
import time
print(f"Created at: {time.time()}")
`;
    
    await adapter.writeFile('/flash/repl_test.py', fileContent);
    console.log('   ✅ Created file: /flash/repl_test.py');
    
    // List files
    const files = await adapter.listDirectory('/flash');
    console.log('   📁 Files in /flash:');
    files.forEach(file => {
      const icon = file.type === 'directory' ? '📁' : '📄';
      console.log(`      ${icon} ${file.name}`);
    });
    
    // Read and execute the file
    const readContent = await adapter.readFile('/flash/repl_test.py');
    console.log(`   📖 File size: ${readContent.length} bytes`);
    
    console.log('   🚀 Executing created file:');
    const execResult = await adapter.executeCode(`exec(open('/flash/repl_test.py').read())`);
    console.log(`      ${execResult.output}`);

    // 9. Error handling demonstration
    console.log('\n8️⃣  Error handling:');
    try {
      await adapter.executeCode('undefined_variable');
    } catch (error) {
      console.log(`   ✅ Caught expected error: ${error.message}`);
    }

    // 10. Device information
    console.log('\n9️⃣  Device information via REPL:');
    const deviceInfo = await adapter.getDeviceInfo();
    console.log(`   Platform: ${deviceInfo.platform}`);
    console.log(`   Version: ${deviceInfo.version}`);
    console.log(`   Chip ID: ${deviceInfo.chipId}`);

    console.log('\n🎉 REPL example completed successfully!');
    console.log('\n💡 Tips:');
    console.log('   - Use REPL for interactive development');
    console.log('   - Great for testing code snippets');
    console.log('   - Perfect for debugging M5Stack applications');
    console.log('   - Variables persist between executeCode() calls');

  } catch (error) {
    console.error('\n❌ REPL error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    try {
      await adapter.disconnect();
      console.log('\n📡 REPL disconnected');
    } catch (disconnectError) {
      console.error('Disconnect error:', disconnectError.message);
    }
  }
}

// Run the example
if (require.main === module) {
  replExample().catch(console.error);
}

module.exports = { replExample };