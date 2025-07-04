/**
 * Firmware Persistence Example
 * Shows how to create persistent applications that run on boot
 */

const { REPLAdapter } = require('../dist/node/adapters/REPLAdapter');
const fs = require('fs');
const path = require('path');

async function firmwarePersistenceExample() {
  console.log('=== Firmware Persistence Example ===\n');
  console.log('This example shows how to create persistent applications\n');

  const adapter = new REPLAdapter('/dev/tty.usbserial-55520ADC16');

  try {
    // Connect to device
    console.log('📡 Connecting to M5Stack...');
    await adapter.connect();
    await adapter.initialize();
    console.log('✅ Connected!\n');

    // 1. Create boot.py for system initialization
    console.log('1. Creating boot.py (runs first on startup)...');
    const bootCode = `
# boot.py - System initialization
import gc
import machine
import time

# Enable garbage collection
gc.enable()
gc.collect()

# Optional: Set CPU frequency for better performance
# machine.freq(240000000)  # 240MHz

print("=== M5Stack Boot Sequence ===")
print(f"Free memory: {gc.mem_free()} bytes")
print(f"CPU frequency: {machine.freq()} Hz")

# Initialize hardware
try:
    from m5stack import *
    print("M5Stack hardware initialized")
except ImportError:
    print("Running in standard MicroPython environment")

# Create a boot flag file
try:
    with open('/boot_complete.flag', 'w') as f:
        f.write(str(time.time()))
    print("Boot flag created")
except:
    pass

print("Boot sequence complete")
print("=" * 30)
`;
    await adapter.writeFile('/boot.py', bootCode);
    console.log('✅ boot.py created\n');

    // 2. Create main.py - the main application
    console.log('2. Creating main.py (auto-runs after boot.py)...');
    const mainCode = `
# main.py - Persistent Application
from m5stack import *
from m5ui import *
from uiflow import *
import time
import gc

# Application configuration
APP_NAME = "Persistent Demo"
APP_VERSION = "1.0.0"
BOOT_COUNT_FILE = "/boot_count.txt"

# Initialize display
setScreenColor(0x111111)

# Create UI elements
title = M5TextBox(10, 10, APP_NAME, lcd.FONT_DejaVu18, 0x00FF00, rotate=0)
version = M5TextBox(10, 35, f"v{APP_VERSION}", lcd.FONT_Default, 0x888888, rotate=0)
status = M5TextBox(10, 60, "Initializing...", lcd.FONT_Default, 0xFFFFFF, rotate=0)
memory = M5TextBox(10, 85, "", lcd.FONT_Default, 0x00AAFF, rotate=0)
boot_info = M5TextBox(10, 110, "", lcd.FONT_Default, 0xFFAA00, rotate=0)
time_display = M5TextBox(10, 135, "", lcd.FONT_Default, 0xFF00FF, rotate=0)

# Load or initialize boot count
boot_count = 0
try:
    with open(BOOT_COUNT_FILE, 'r') as f:
        boot_count = int(f.read())
except:
    pass

boot_count += 1

# Save updated boot count
try:
    with open(BOOT_COUNT_FILE, 'w') as f:
        f.write(str(boot_count))
except:
    pass

boot_info.setText(f"Boot count: {boot_count}")
status.setText("Running...")

# Button press counters
btn_a_count = 0
btn_b_count = 0
btn_c_count = 0

# Main application loop
start_time = time.time()
last_gc = time.time()

while True:
    # Update time display
    elapsed = int(time.time() - start_time)
    time_display.setText(f"Uptime: {elapsed}s")
    
    # Update memory info every 5 seconds
    if time.time() - last_gc > 5:
        gc.collect()
        free_mem = gc.mem_free()
        memory.setText(f"Free RAM: {free_mem} bytes")
        last_gc = time.time()
    
    # Handle button A - Sound test
    if btnA.wasPressed():
        btn_a_count += 1
        status.setText(f"Button A: {btn_a_count}x")
        speaker.tone(440, 100)  # A4 note
        
    # Handle button B - Color change
    if btnB.wasPressed():
        btn_b_count += 1
        status.setText(f"Button B: {btn_b_count}x")
        # Cycle through colors
        colors = [0x111111, 0x110000, 0x001100, 0x000011, 0x111100, 0x110011, 0x001111]
        color = colors[btn_b_count % len(colors)]
        setScreenColor(color)
        
    # Handle button C - System info
    if btnC.wasPressed():
        btn_c_count += 1
        status.setText(f"Button C: {btn_c_count}x")
        # Show system details
        import sys
        print(f"Platform: {sys.platform}")
        print(f"Version: {sys.version}")
        print(f"Boot count: {boot_count}")
        
    # Small delay to prevent CPU hogging
    time.sleep_ms(50)
`;
    await adapter.writeFile('/main.py', mainCode);
    console.log('✅ main.py created\n');

    // 3. Create a utility module
    console.log('3. Creating utils.py (reusable functions)...');
    const utilsCode = `
# utils.py - Utility functions for M5Stack applications

import time
import gc
from m5stack import *

def format_bytes(size):
    """Format bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.1f}{unit}"
        size /= 1024.0
    return f"{size:.1f}TB"

def play_melody(notes, duration=100):
    """Play a sequence of notes
    notes: list of frequencies (Hz), 0 for rest
    duration: note duration in ms
    """
    for note in notes:
        if note > 0:
            speaker.tone(note, duration)
        time.sleep_ms(duration + 50)

def save_config(filename, config_dict):
    """Save configuration as JSON"""
    import json
    try:
        with open(filename, 'w') as f:
            json.dump(config_dict, f)
        return True
    except:
        return False

def load_config(filename, default=None):
    """Load configuration from JSON"""
    import json
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except:
        return default if default is not None else {}

def create_progress_bar(x, y, width, height, value, max_value, color=0x00FF00):
    """Create a simple progress bar"""
    from m5ui import M5Rect
    
    # Background
    bg = M5Rect(x, y, width, height, 0x333333, 0x333333)
    
    # Progress
    progress_width = int((value / max_value) * width)
    if progress_width > 0:
        progress = M5Rect(x, y, progress_width, height, color, color)
    
    return bg

def system_health_check():
    """Perform system health check"""
    import sys
    
    health = {
        'memory_free': gc.mem_free(),
        'memory_allocated': gc.mem_alloc(),
        'platform': sys.platform,
        'implementation': str(sys.implementation),
    }
    
    # Check if critical modules are available
    modules_to_check = ['m5stack', 'm5ui', 'machine', 'network']
    health['modules'] = {}
    
    for module in modules_to_check:
        try:
            __import__(module)
            health['modules'][module] = True
        except ImportError:
            health['modules'][module] = False
    
    return health

# Startup sound
STARTUP_MELODY = [523, 659, 784, 1047]  # C5, E5, G5, C6
SHUTDOWN_MELODY = [1047, 784, 659, 523]  # C6, G5, E5, C5
SUCCESS_MELODY = [523, 659, 784]  # C5, E5, G5
ERROR_MELODY = [440, 0, 440]  # A4, rest, A4
`;
    await adapter.writeFile('/utils.py', utilsCode);
    console.log('✅ utils.py created\n');

    // 4. Create an advanced persistent app
    console.log('4. Creating advanced_app.py (advanced features demo)...');
    const advancedAppCode = `
# advanced_app.py - Advanced persistent application example
from m5stack import *
from m5ui import *
from uiflow import *
import time
import gc
import utils

# Application setup
setScreenColor(0x000033)

# UI Layout
title = M5TextBox(10, 5, "Advanced Demo", lcd.FONT_DejaVu18, 0x00FFFF, rotate=0)
divider = M5Line(10, 30, 310, 30, 0x666666)

# Status area
status_label = M5TextBox(10, 40, "Status:", lcd.FONT_Default, 0xAAAAAA, rotate=0)
status_text = M5TextBox(80, 40, "Ready", lcd.FONT_Default, 0x00FF00, rotate=0)

# Memory monitor
mem_label = M5TextBox(10, 65, "Memory:", lcd.FONT_Default, 0xAAAAAA, rotate=0)
mem_text = M5TextBox(80, 65, "", lcd.FONT_Default, 0x00AAFF, rotate=0)

# Configuration
config_file = "/app_config.json"
config = utils.load_config(config_file, {
    'sound_enabled': True,
    'brightness': 50,
    'theme': 'dark',
    'run_count': 0
})

# Update run count
config['run_count'] += 1
utils.save_config(config_file, config)

# Display run count
run_info = M5TextBox(10, 90, f"Run #{config['run_count']}", lcd.FONT_Default, 0xFFAA00, rotate=0)

# Instructions
M5TextBox(10, 120, "A: Sound  B: Theme  C: Info", lcd.FONT_Default, 0x888888, rotate=0)

# Play startup sound if enabled
if config['sound_enabled']:
    utils.play_melody(utils.STARTUP_MELODY, 80)
    
# Main application state
app_state = {
    'running': True,
    'last_update': time.time(),
    'button_presses': {'A': 0, 'B': 0, 'C': 0}
}

# Theme definitions
themes = {
    'dark': {'bg': 0x000033, 'fg': 0x00FFFF},
    'light': {'bg': 0xFFFFFF, 'fg': 0x000033},
    'matrix': {'bg': 0x001100, 'fg': 0x00FF00},
    'sunset': {'bg': 0x331100, 'fg': 0xFFAA00}
}

theme_names = list(themes.keys())
current_theme_index = theme_names.index(config.get('theme', 'dark'))

def apply_theme(theme_name):
    """Apply color theme"""
    theme = themes[theme_name]
    setScreenColor(theme['bg'])
    title.setColor(theme['fg'])
    status_text.setText(f"Theme: {theme_name}")

# Apply saved theme
apply_theme(config['theme'])

# Performance counter
frame_count = 0
fps_text = M5TextBox(10, 145, "FPS: 0", lcd.FONT_Default, 0xFF00FF, rotate=0)
last_fps_update = time.time()

# Main loop
while app_state['running']:
    frame_count += 1
    current_time = time.time()
    
    # Update FPS every second
    if current_time - last_fps_update >= 1.0:
        fps = frame_count / (current_time - last_fps_update)
        fps_text.setText(f"FPS: {fps:.1f}")
        frame_count = 0
        last_fps_update = current_time
    
    # Update memory display every 2 seconds
    if current_time - app_state['last_update'] > 2:
        gc.collect()
        free_mem = gc.mem_free()
        mem_text.setText(utils.format_bytes(free_mem))
        app_state['last_update'] = current_time
    
    # Handle button A - Toggle sound
    if btnA.wasPressed():
        app_state['button_presses']['A'] += 1
        config['sound_enabled'] = not config['sound_enabled']
        utils.save_config(config_file, config)
        
        if config['sound_enabled']:
            utils.play_melody(utils.SUCCESS_MELODY, 50)
            status_text.setText("Sound: ON")
        else:
            status_text.setText("Sound: OFF")
    
    # Handle button B - Cycle themes
    if btnB.wasPressed():
        app_state['button_presses']['B'] += 1
        current_theme_index = (current_theme_index + 1) % len(theme_names)
        theme_name = theme_names[current_theme_index]
        config['theme'] = theme_name
        utils.save_config(config_file, config)
        apply_theme(theme_name)
        
        if config['sound_enabled']:
            speaker.tone(800, 50)
    
    # Handle button C - System info
    if btnC.wasPressed():
        app_state['button_presses']['C'] += 1
        health = utils.system_health_check()
        
        print("=== System Health Check ===")
        print(f"Free Memory: {utils.format_bytes(health['memory_free'])}")
        print(f"Allocated: {utils.format_bytes(health['memory_allocated'])}")
        print(f"Platform: {health['platform']}")
        print("Modules:", health['modules'])
        print(f"Button presses: {app_state['button_presses']}")
        
        status_text.setText("Check console")
        
        if config['sound_enabled']:
            utils.play_melody([659, 784], 50)
    
    # Small delay for CPU efficiency
    time.sleep_ms(20)

# Cleanup (never reached in this example)
if config['sound_enabled']:
    utils.play_melody(utils.SHUTDOWN_MELODY, 80)
`;
    await adapter.writeFile('/advanced_app.py', advancedAppCode);
    console.log('✅ advanced_app.py created\n');

    // 5. Create backup of all Python files
    console.log('5. Creating firmware backup...');
    const files = await adapter.listDirectory('/');
    const backup = {
      timestamp: new Date().toISOString(),
      device: 'M5Stack',
      files: {}
    };

    for (const file of files) {
      if (file.type === 'file' && file.name.endsWith('.py')) {
        try {
          const content = await adapter.readFile(`/${file.name}`);
          backup.files[file.name] = content.toString();
          console.log(`  ✅ Backed up ${file.name}`);
        } catch (error) {
          console.log(`  ⚠️ Could not backup ${file.name}`);
        }
      }
    }

    // Save backup
    const backupFile = `firmware-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n💾 Backup saved to: ${backupFile}`);

    // 6. Show how to restore
    console.log('\n6. Firmware Management Commands:');
    console.log('   - To run advanced app: exec(open("/advanced_app.py").read())');
    console.log('   - To reset device: import machine; machine.reset()');
    console.log('   - To clear all files: [os.remove(f) for f in os.listdir() if f.endswith(".py")]');
    
    console.log('\n✅ Firmware persistence setup complete!');
    console.log('\n📱 What happens now:');
    console.log('   1. boot.py runs first on every startup');
    console.log('   2. main.py runs automatically after boot.py');
    console.log('   3. Your app will persist across power cycles');
    console.log('   4. Boot count increases with each restart');
    console.log('\n🔄 To test: Disconnect and power cycle your M5Stack');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await adapter.disconnect();
    console.log('\n📡 Disconnected');
  }
}

// Run example
if (require.main === module) {
  firmwarePersistenceExample().catch(console.error);
}

module.exports = { firmwarePersistenceExample };