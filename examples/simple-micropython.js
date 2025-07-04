/**
 * Simple MicroPython communication
 */

const { SerialPort } = require('serialport');

async function simpleMicroPython() {
  console.log('=== Simple MicroPython Communication ===\n');
  
  const port = new SerialPort({
    path: '/dev/tty.usbserial-55520ADC16',
    baudRate: 115200,
    autoOpen: false
  });

  let allData = '';

  port.on('data', (data) => {
    const text = data.toString();
    allData += text;
    process.stdout.write(text); // Show real-time output
  });

  try {
    await new Promise((resolve, reject) => {
      port.open((err) => err ? reject(err) : resolve());
    });

    console.log('Connected to M5Stack STICK-C\n');

    // Function to send command and wait
    const sendCommand = (cmd, waitMs = 1000) => {
      return new Promise((resolve) => {
        console.log(`\n>>> ${cmd}`);
        port.write(cmd + '\r\n');
        setTimeout(resolve, waitMs);
      });
    };

    // Initialize - interrupt any running program
    port.write(Buffer.from([0x03])); // Ctrl+C
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send commands
    await sendCommand('print("Hello from M5Stack STICK-C!")');
    await sendCommand('2 + 2');
    await sendCommand('import sys');
    await sendCommand('print("Platform:", sys.platform)');
    await sendCommand('import os');
    await sendCommand('print("OS info:", os.uname())');
    
    // Try M5Stack specific
    await sendCommand('import machine');
    await sendCommand('print("Machine module imported successfully")');
    
    // Try to check available modules
    await sendCommand('help("modules")', 3000);

    // GPIO test (if available)
    await sendCommand('pin = machine.Pin(2, machine.Pin.OUT)');
    await sendCommand('pin.on()');
    await sendCommand('print("GPIO pin 2 turned on")');
    await sendCommand('pin.off()');
    await sendCommand('print("GPIO pin 2 turned off")');

    // Display test (if available)
    try {
      await sendCommand('import display');
      await sendCommand('display.clear()');
      await sendCommand('display.print("Hello SDK!")');
      await sendCommand('print("Display updated")');
    } catch (e) {
      console.log('Display module not available');
    }

    console.log('\n\n=== Session Complete ===');
    console.log(`Total output received: ${allData.length} characters`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await new Promise((resolve) => {
      port.close(resolve);
    });
    console.log('Disconnected');
  }
}

// Run example
if (require.main === module) {
  simpleMicroPython().catch(console.error);
}

module.exports = { simpleMicroPython };