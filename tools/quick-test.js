#!/usr/bin/env node
/**
 * Quick Test Script for M5Stack SDK
 * Simple command line interface for testing M5Stack connection
 */

const { REPLAdapter } = require('../dist/node/adapters/REPLAdapter');

async function quickTest() {
  console.log('🔧 M5Stack SDK Quick Test\n');

  // M5Stack device port
  const port = '/dev/tty.usbserial-55520ADC16';
  const adapter = new REPLAdapter(port);

  try {
    console.log(`📡 Connecting to ${port}...`);
    await adapter.connect();
    console.log('✅ Connected!');

    await adapter.initialize();
    console.log('✅ REPL initialized');

    // Test basic functionality
    console.log('\n🐍 Testing Python execution...');
    const result = await adapter.executeCode('print("Hello M5Stack!")');
    console.log('Output:', result.output.trim());

    // Test system info
    console.log('\n📊 Getting system info...');
    const sysInfo = await adapter.executeCode(`
import gc, sys
print("Platform:", sys.platform)
print("Free memory:", gc.mem_free(), "bytes")
`);
    console.log(sysInfo.output.trim());

    // Test GPIO
    console.log('\n⚡ Testing GPIO...');
    const gpioTest = await adapter.executeCode(`
from m5stack import *
from m5ui import *
from uiflow import *
from libs.label_plus import *


setScreenColor(0x110000)
label0 = M5TextBox(19, 62, "label0", lcd.FONT_Default, 0xFFFFFF, rotate=0)
`);
    console.log(gpioTest.output.trim());

    // Test firmware persistence
    console.log('\n💾 Testing firmware persistence...');
    
    // Save a persistent main.py that auto-runs on boot
    const persistentCode = `
from m5stack import *
from m5ui import *
from uiflow import *
import time

# Persistent app - runs automatically on boot
setScreenColor(0x001122)
title = M5TextBox(10, 10, "Persistent App", lcd.FONT_Default, 0x00FF00, rotate=0)
status = M5TextBox(10, 40, "Auto-started!", lcd.FONT_Default, 0xFFFFFF, rotate=0)
counter = M5TextBox(10, 70, "Count: 0", lcd.FONT_Default, 0x00FFFF, rotate=0)

count = 0
while True:
    counter.setText(f"Count: {count}")
    count += 1
    
    # Check button A
    if btnA.isPressed():
        status.setText("Button A pressed!")
        speaker.tone(440, 100)
        
    time.sleep_ms(500)
`;

    await adapter.writeFile('main.py', persistentCode);
    console.log('✅ main.py saved - will auto-run on next boot');

    // Create boot.py for initialization
    const bootCode = `
# Boot initialization
import gc
import machine

gc.collect()
print("M5Stack SDK Boot Complete")
print("Free memory:", gc.mem_free(), "bytes")

# Optional: Set CPU frequency for better performance
# machine.freq(240000000)
`;

    await adapter.writeFile('boot.py', bootCode);
    console.log('✅ boot.py saved - runs before main.py');

    // Create config file
    const configData = JSON.stringify({
      app_name: "Quick Test Persistent App",
      version: "1.0.0",
      created_by: "M5Stack SDK",
      auto_start: true,
      features: ["display", "buttons", "speaker"]
    }, null, 2);

    await adapter.writeFile('config.json', configData);
    console.log('✅ config.json saved');

    // List all files to confirm
    console.log('\n📁 Files on device:');
    const files = await adapter.listDirectory('.');
    files.forEach(file => {
      const icon = file.type === 'directory' ? '📁' : '📄';
      const size = file.size ? ` (${file.size} bytes)` : '';
      console.log(`  ${icon} ${file.name}${size}`);
    });

    // Test reading the config back
    console.log('\n📋 Testing config file read...');
    const configContent = await adapter.readFile('config.json');
    const config = JSON.parse(configContent.toString());
    console.log('Config loaded:', config.app_name, 'v' + config.version);

    // Test backup functionality
    console.log('\n💾 Testing backup functionality...');
    const backupData = {};
    const pythonFiles = files.filter(f => f.type === 'file' && 
      (f.name.endsWith('.py') || f.name.endsWith('.json')));

    for (const file of pythonFiles) {
      try {
        const content = await adapter.readFile(file.name);
        backupData[file.name] = content.toString();
        console.log(`✅ Backed up ${file.name}`);
      } catch (error) {
        console.log(`⚠️ Could not backup ${file.name}`);
      }
    }

    // Save backup to demonstrate functionality
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `quick-test-backup-${timestamp}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`💾 Backup saved to ${backupFile}`);

    // Test utility library creation
    console.log('\n📚 Creating utility library...');
    const utilsCode = `
# M5Stack utility functions
import time
from m5stack import *

def show_message(text, x=10, y=100, color=0xFFFF00, duration=2):
    """Display a temporary message"""
    msg = M5TextBox(x, y, text, lcd.FONT_Default, color, rotate=0)
    time.sleep(duration)
    msg.hide()

def blink_led(pin=10, times=3, delay=0.5):
    """Blink LED on specified pin"""
    import machine
    led = machine.Pin(pin, machine.Pin.OUT)
    for _ in range(times):
        led.on()
        time.sleep(delay)
        led.off()
        time.sleep(delay)

def get_system_info():
    """Get system information"""
    import gc, sys
    return {
        'platform': sys.platform,
        'free_memory': gc.mem_free(),
        'implementation': str(sys.implementation)
    }

def play_startup_sound():
    """Play a startup sound"""
    try:
        speaker.tone(440, 100)  # A4
        time.sleep_ms(150)
        speaker.tone(554, 100)  # C#5
        time.sleep_ms(150)
        speaker.tone(659, 200)  # E5
    except:
        pass  # No speaker available
`;

    await adapter.writeFile('utils.py', utilsCode);
    console.log('✅ utils.py library saved');

    // Create an app that uses the utility
    const appWithUtils = `
from m5stack import *
from m5ui import *
from uiflow import *
import utils
import time

# Initialize with utility functions
setScreenColor(0x000033)
utils.play_startup_sound()

title = M5TextBox(10, 10, "Utils Demo", lcd.FONT_Default, 0x00FF00, rotate=0)

# Show system info
info = utils.get_system_info()
memory_text = M5TextBox(10, 40, f"Memory: {info['free_memory']}", lcd.FONT_Default, 0xFFFFFF, rotate=0)
platform_text = M5TextBox(10, 70, f"Platform: {info['platform']}", lcd.FONT_Default, 0xFFFFFF, rotate=0)

# Interactive features
count = 0
while True:
    if btnA.isPressed():
        utils.blink_led(10, 2, 0.2)
        utils.show_message("Button A!", 10, 100, 0x00FFFF, 1)
    
    if btnB.isPressed():
        utils.show_message(f"Count: {count}", 10, 100, 0xFF00FF, 1)
        count += 1
    
    time.sleep_ms(100)
`;

    await adapter.writeFile('app_with_utils.py', appWithUtils);
    console.log('✅ app_with_utils.py saved');

    console.log('\n✅ All tests passed!');
    console.log('\n🔄 To test persistence:');
    console.log('   1. Disconnect and power cycle your M5Stack');
    console.log('   2. The persistent app should auto-start');
    console.log('   3. You should see "Persistent App" on the display');
    console.log('\n📱 To run the utility demo:');
    console.log('   Use CLI: exec exec(open("app_with_utils.py").read())');
    console.log('\n💾 Backup created:', backupFile);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (adapter) {
      await adapter.disconnect();
      console.log('\n📡 Disconnected');
    }
  }
}

if (require.main === module) {
  quickTest().catch(console.error);
}

module.exports = { quickTest };