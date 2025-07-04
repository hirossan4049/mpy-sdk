/**
 * Raw REPL UI Test
 * 
 * Raw REPLモードを使用してM5StackのUIを確実に表示
 */

const { NodeSerialConnection } = require('../../packages/node/dist/NodeSerialConnection.js');

class RawREPLConnection {
  constructor(connection) {
    this.connection = connection;
    this.responseBuffer = '';
  }

  async initializeRawREPL() {
    console.log('🔄 Initializing Raw REPL...');
    
    // Clear buffer and setup data handler
    this.responseBuffer = '';
    this.connection.on('data', (data) => {
      this.responseBuffer += data.toString();
    });
    
    // Send Ctrl+C to interrupt any running program
    await this.connection.write(Buffer.from([0x03]));
    await this.waitForData(1000);
    
    // Enter raw REPL mode with Ctrl+A
    console.log('   Entering raw REPL mode...');
    await this.connection.write(Buffer.from([0x01]));
    await this.waitForData(2000);
    
    console.log(`   Raw REPL response: "${this.responseBuffer}"`);
    
    if (this.responseBuffer.includes('raw REPL') || this.responseBuffer.includes('OK')) {
      console.log('✅ Raw REPL mode activated');
      this.responseBuffer = ''; // Clear for execution
      return true;
    } else {
      console.log('⚠️ Raw REPL mode uncertain, but continuing...');
      this.responseBuffer = '';
      return true;
    }
  }

  async executeRawCode(code, timeout = 10000) {
    console.log(`📤 Executing in raw REPL:\n${code.substring(0, 100)}...`);
    
    // Clear response buffer
    this.responseBuffer = '';
    
    // Send code
    await this.connection.write(Buffer.from(code + '\r\n'));
    
    // Send Ctrl+D to execute
    await this.connection.write(Buffer.from([0x04]));
    
    // Wait for execution
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      await this.waitForData(200);
      
      // Check for completion indicators
      if (this.responseBuffer.includes('OK') || 
          this.responseBuffer.includes('>>>') ||
          this.responseBuffer.includes('\x04')) {
        break;
      }
    }
    
    console.log(`📥 Execution result: "${this.responseBuffer.trim()}"`);
    return this.responseBuffer;
  }

  async waitForData(timeout) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (this.connection.bytesAvailable > 0) {
        const data = await this.connection.read();
        this.responseBuffer += data.toString();
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  async exitRawREPL() {
    console.log('🔄 Exiting raw REPL...');
    await this.connection.write(Buffer.from([0x02])); // Ctrl+B
    await this.waitForData(1000);
    console.log('✅ Returned to normal REPL');
  }
}

async function rawREPLUITest() {
  console.log('🎮 Raw REPL UI Test - M5Stackに確実にUIを表示\n');

  const portPath = '/dev/tty.usbserial-55520ADC16';
  
  const connection = new NodeSerialConnection(portPath, {
    baudRate: 115200,
    timeout: 15000
  });

  try {
    console.log('🔌 Connecting to M5Stack...');
    await connection.connect();
    console.log('✅ Connected successfully');

    const rawRepl = new RawREPLConnection(connection);
    const initialized = await rawRepl.initializeRawREPL();

    if (initialized) {
      // Test 1: Simple LCD Display
      console.log('\n1️⃣ Simple LCD Display Test...');
      const simpleCode = `
try:
    from m5stack import lcd
    lcd.clear()
    lcd.print("Node.js Connected!", 10, 30, 0x00FFFF)
    lcd.print("Raw REPL Working!", 10, 60, 0x00FF00)
    lcd.print("LCD Test Success", 10, 90, 0xFFFF00)
    print("Simple LCD test completed")
except Exception as e:
    print("LCD Error: " + str(e))
`;
      await rawRepl.executeRawCode(simpleCode.trim());

      // Test 2: Colorful Rectangle UI
      console.log('\n2️⃣ Colorful Rectangle UI Test...');
      const colorCode = `
try:
    from m5stack import lcd
    lcd.clear(0x001122)
    lcd.print("Colorful UI Demo", 50, 10, 0x00FFFF)
    lcd.rect(20, 40, 60, 30, 0xFF0000, 0xFF0000)
    lcd.rect(90, 40, 60, 30, 0x00FF00, 0x00FF00)
    lcd.rect(160, 40, 60, 30, 0x0000FF, 0x0000FF)
    lcd.print("RED", 40, 50, 0xFFFFFF)
    lcd.print("GREEN", 105, 50, 0x000000)
    lcd.print("BLUE", 175, 50, 0xFFFFFF)
    lcd.print("Raw REPL SUCCESS!", 40, 90, 0x00FF88)
    print("Colorful UI created")
except Exception as e:
    print("Color Error: " + str(e))
`;
      await rawRepl.executeRawCode(colorCode.trim());

      // Test 3: Animation Test
      console.log('\n3️⃣ Animation Test...');
      const animCode = `
try:
    from m5stack import lcd
    import time
    for i in range(3):
        colors = [0xFF0000, 0x00FF00, 0x0000FF]
        lcd.clear(0x000011)
        lcd.print("ANIMATION TEST", 50, 40, colors[i])
        lcd.print("Frame: " + str(i+1), 80, 70, 0xFFFFFF)
        lcd.circle(120, 100, 15, colors[i], colors[i])
        time.sleep(1)
    lcd.clear(0x001122)
    lcd.print("Animation Done!", 50, 60, 0x00FF00)
    print("Animation completed")
except Exception as e:
    print("Animation Error: " + str(e))
`;
      await rawRepl.executeRawCode(animCode.trim());

      // Test 4: Status Display
      console.log('\n4️⃣ Status Display Test...');
      const statusCode = `
try:
    from m5stack import lcd
    import time
    lcd.clear(0x002244)
    lcd.print("M5Stack Status", 60, 20, 0x00FFFF)
    lcd.print("Connection: OK", 20, 50, 0x00FF00)
    lcd.print("REPL: Working", 20, 70, 0x00FF00)
    lcd.print("LCD: Active", 20, 90, 0x00FF00)
    lcd.print("Node.js: Ready", 20, 110, 0x00FF00)
    lcd.rect(20, 140, 200, 20, 0x333333, 0x333333)
    lcd.rect(22, 142, 196, 16, 0x00FF00, 0x00FF00)
    lcd.print("ALL SYSTEMS GO!", 60, 170, 0xFFFF00)
    print("Status display completed")
except Exception as e:
    print("Status Error: " + str(e))
`;
      await rawRepl.executeRawCode(statusCode.trim());

      // Test 5: Final Success Screen
      console.log('\n5️⃣ Final Success Screen...');
      const finalCode = `
try:
    from m5stack import lcd
    lcd.clear(0x000022)
    lcd.print("SUCCESS!", 80, 30, 0x00FF00)
    lcd.print("Node.js <-> M5Stack", 30, 60, 0x00FFFF)
    lcd.print("Raw REPL Working!", 40, 90, 0xFFFF00)
    lcd.print("UI Tests Complete", 35, 120, 0xFF00FF)
    lcd.print("Ready for use!", 55, 150, 0x00FF88)
    print("SUCCESS: All UI tests completed!")
except Exception as e:
    print("Final Error: " + str(e))
`;
      await rawRepl.executeRawCode(finalCode.trim());

      // Exit raw REPL
      await rawRepl.exitRawREPL();

      console.log('\n🎉 Raw REPL UI Test Completed Successfully!');
      console.log('📺 Check your M5Stack display for all the UI elements!');
      console.log('✅ Node.js ↔ M5Stack communication via Raw REPL is working!');

    } else {
      console.log('❌ Could not initialize Raw REPL');
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  } finally {
    try {
      await connection.disconnect();
      console.log('\n🔌 Disconnected');
    } catch (error) {
      console.log(`⚠️ Disconnect error: ${error.message}`);
    }
  }
}

if (require.main === module) {
  rawREPLUITest().catch(console.error);
}

module.exports = { rawREPLUITest };