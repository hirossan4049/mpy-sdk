/**
 * Flash Firmware Example for @h1mpy-sdk/node
 * 
 * This example demonstrates how to flash complete firmware applications
 * to M5Stack devices, including:
 * - Boot scripts (boot.py)
 * - Main applications (main.py)
 * - Library files
 * - Configuration files
 * - Persistent applications that survive reboots
 */

import { M5StackClient } from '@h1mpy-sdk/node';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function flashFirmwareExample() {
  console.log('⚡ M5Stack Firmware Flash Example\n');

  const client = new M5StackClient({
    timeout: 20000, // Longer timeout for firmware operations
    logLevel: 'info'
  });

  let connection = null;

  try {
    // Connect to device
    const ports = await client.listPorts();
    if (ports.length === 0) {
      console.log('❌ No serial ports found');
      return;
    }

    console.log(`🔌 Connecting to ${ports[0].path}...`);
    connection = await client.connect(ports[0].path);
    console.log('✅ Connected!\n');

    // 1. Create boot.py - System initialization
    console.log('1️⃣  Creating boot.py (system initialization)\n');
    
    const bootScript = `# boot.py - M5Stack Boot Script
# This file runs automatically on device startup

import gc
import time
import machine
from machine import Pin

# System initialization
print("=== M5Stack Boot Sequence ===")
print(f"Boot time: {time.time()}")

# Enable garbage collection
gc.enable()
gc.collect()

# Set CPU frequency for optimal performance
try:
    machine.freq(240000000)  # 240MHz
    print(f"CPU frequency set to: {machine.freq():,} Hz")
except:
    print(f"CPU frequency: {machine.freq():,} Hz (unchanged)")

# Initialize hardware
print("Initializing hardware...")

try:
    # Import M5Stack modules
    from m5stack import *
    print("✅ M5Stack hardware initialized")
    
    # Quick hardware test
    lcd.clear()
    lcd.print("Booting...", 10, 10)
    
    # Test speaker
    try:
        speaker.tone(440, 100)
        print("✅ Speaker test passed")
    except:
        print("⚠️  Speaker test failed")
    
    # Test buttons
    try:
        btn_status = f"Buttons: A={btnA.isPressed()} B={btnB.isPressed()} C={btnC.isPressed()}"
        print(f"✅ {btn_status}")
    except:
        print("⚠️  Button test failed")
        
except ImportError:
    print("⚠️  M5Stack modules not available - running in standard MicroPython mode")
except Exception as e:
    print(f"❌ Hardware initialization error: {e}")

# Memory status
gc.collect()
free_mem = gc.mem_free()
alloc_mem = gc.mem_alloc()
print(f"Memory: {free_mem:,} bytes free, {alloc_mem:,} bytes allocated")

# Create boot completion flag
try:
    with open('/boot_complete.flag', 'w') as f:
        f.write(f"{time.time()}\\n{machine.unique_id().hex()}")
    print("✅ Boot flag created")
except Exception as e:
    print(f"⚠️  Boot flag creation failed: {e}")

# Boot sequence complete
print("🚀 Boot sequence completed successfully")
print("=" * 40)

# Optional: WiFi auto-connect
try:
    import network
    with open('/wifi_config.json', 'r') as f:
        import json
        wifi_config = json.load(f)
        
    if wifi_config.get('auto_connect', False):
        print("🌐 Auto-connecting to WiFi...")
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        wlan.connect(wifi_config['ssid'], wifi_config['password'])
        
        # Wait for connection (max 10 seconds)
        timeout = 10
        while not wlan.isconnected() and timeout > 0:
            time.sleep(1)
            timeout -= 1
            
        if wlan.isconnected():
            print(f"✅ WiFi connected: {wlan.ifconfig()[0]}")
        else:
            print("❌ WiFi connection failed")
except:
    print("ℹ️  WiFi auto-connect not configured")
`;

    console.log('📝 Uploading boot.py...');
    await connection.writeFile('/boot.py', bootScript);
    console.log('✅ boot.py uploaded successfully');

    // 2. Create main.py - Main application
    console.log('\n2️⃣  Creating main.py (main application)\n');
    
    const mainApplication = `# main.py - M5Stack Main Application
# This file runs automatically after boot.py

import time
import gc
import json
from m5stack import *
from m5ui import *
from uiflow import *

# Application metadata
APP_NAME = "M5Stack Firmware"
APP_VERSION = "1.2.0"
AUTHOR = "Node.js Flash Example"

class M5StackApp:
    def __init__(self):
        self.running = True
        self.boot_count = self.load_boot_count()
        self.settings = self.load_settings()
        self.setup_display()
        self.setup_ui()
        
    def load_boot_count(self):
        """Load and increment boot counter"""
        try:
            with open('/boot_count.txt', 'r') as f:
                count = int(f.read().strip())
        except:
            count = 0
        
        count += 1
        
        try:
            with open('/boot_count.txt', 'w') as f:
                f.write(str(count))
        except:
            pass
            
        return count
    
    def load_settings(self):
        """Load application settings"""
        default_settings = {
            'theme': 'blue',
            'sound_enabled': True,
            'brightness': 50,
            'auto_sleep': 300,
            'language': 'en'
        }
        
        try:
            with open('/settings.json', 'r') as f:
                settings = json.load(f)
                # Merge with defaults
                for key, value in default_settings.items():
                    if key not in settings:
                        settings[key] = value
                return settings
        except:
            # Create default settings file
            try:
                with open('/settings.json', 'w') as f:
                    json.dump(default_settings, f)
            except:
                pass
            return default_settings
    
    def setup_display(self):
        """Initialize display with theme"""
        themes = {
            'blue': {'bg': 0x001122, 'primary': 0x00AAFF, 'secondary': 0x0066CC},
            'green': {'bg': 0x001100, 'primary': 0x00FF00, 'secondary': 0x00AA00},
            'red': {'bg': 0x110000, 'primary': 0xFF0000, 'secondary': 0xAA0000},
            'purple': {'bg': 0x110011, 'primary': 0xFF00FF, 'secondary': 0xAA00AA}
        }
        
        theme = themes.get(self.settings['theme'], themes['blue'])
        setScreenColor(theme['bg'])
        
        self.theme_colors = theme
    
    def setup_ui(self):
        """Setup user interface elements"""
        # Header
        self.title = M5TextBox(10, 5, APP_NAME, lcd.FONT_DejaVu18, 
                              self.theme_colors['primary'], rotate=0)
        self.version = M5TextBox(10, 28, f"v{APP_VERSION}", lcd.FONT_Default, 
                                0x888888, rotate=0)
        
        # Separator line
        self.separator = M5Line(10, 45, 310, 45, 0x333333)
        
        # Status area
        self.status_label = M5TextBox(10, 55, "Status:", lcd.FONT_Default, 
                                     0xAAAAAA, rotate=0)
        self.status_text = M5TextBox(70, 55, "Running", lcd.FONT_Default, 
                                    0x00FF00, rotate=0)
        
        # Boot info
        self.boot_label = M5TextBox(10, 75, "Boot #:", lcd.FONT_Default, 
                                   0xAAAAAA, rotate=0)
        self.boot_text = M5TextBox(70, 75, str(self.boot_count), lcd.FONT_Default, 
                                  self.theme_colors['secondary'], rotate=0)
        
        # Memory info
        self.memory_label = M5TextBox(10, 95, "Memory:", lcd.FONT_Default, 
                                     0xAAAAAA, rotate=0)
        self.memory_text = M5TextBox(70, 95, "", lcd.FONT_Default, 
                                    0x00AAFF, rotate=0)
        
        # Uptime
        self.uptime_label = M5TextBox(10, 115, "Uptime:", lcd.FONT_Default, 
                                     0xAAAAAA, rotate=0)
        self.uptime_text = M5TextBox(70, 115, "0s", lcd.FONT_Default, 
                                    0xFFAA00, rotate=0)
        
        # Button hints
        self.button_hints = M5TextBox(10, 140, "A:Menu B:Settings C:Info", 
                                     lcd.FONT_Default, 0x666666, rotate=0)
        
        # Footer
        self.footer = M5TextBox(10, 160, f"by {AUTHOR}", lcd.FONT_Default, 
                               0x444444, rotate=0)
    
    def update_display(self):
        """Update dynamic display elements"""
        # Memory info
        gc.collect()
        free_mem = gc.mem_free()
        self.memory_text.setText(f"{free_mem//1024}KB")
        
        # Uptime
        uptime = int(time.time())
        if uptime < 60:
            uptime_str = f"{uptime}s"
        elif uptime < 3600:
            uptime_str = f"{uptime//60}m{uptime%60}s"
        else:
            hours = uptime // 3600
            minutes = (uptime % 3600) // 60
            uptime_str = f"{hours}h{minutes}m"
        
        self.uptime_text.setText(uptime_str)
    
    def handle_button_a(self):
        """Handle button A press - Menu"""
        print("Button A: Menu")
        self.status_text.setText("Menu")
        
        if self.settings['sound_enabled']:
            try:
                speaker.tone(440, 100)
            except:
                pass
        
        # Simple menu simulation
        menu_items = ["System Info", "File Manager", "Settings", "Exit"]
        for i, item in enumerate(menu_items):
            print(f"{i+1}. {item}")
            
        # Reset status after delay
        time.sleep(2)
        self.status_text.setText("Running")
    
    def handle_button_b(self):
        """Handle button B press - Settings"""
        print("Button B: Settings")
        self.status_text.setText("Settings")
        
        # Cycle through themes
        themes = ['blue', 'green', 'red', 'purple']
        current_index = themes.index(self.settings['theme'])
        new_index = (current_index + 1) % len(themes)
        self.settings['theme'] = themes[new_index]
        
        # Save settings
        try:
            with open('/settings.json', 'w') as f:
                json.dump(self.settings, f)
            print(f"Theme changed to: {self.settings['theme']}")
        except Exception as e:
            print(f"Settings save error: {e}")
        
        # Apply new theme
        self.setup_display()
        self.setup_ui()
        
        if self.settings['sound_enabled']:
            try:
                speaker.tone(554, 100)
            except:
                pass
    
    def handle_button_c(self):
        """Handle button C press - Info"""
        print("Button C: System Info")
        self.status_text.setText("Info")
        
        # Display system information
        print(f"=== {APP_NAME} v{APP_VERSION} ===")
        print(f"Boot count: {self.boot_count}")
        print(f"Free memory: {gc.mem_free():,} bytes")
        print(f"Settings: {self.settings}")
        
        try:
            import sys
            print(f"Platform: {sys.platform}")
            print(f"Python: {sys.version}")
        except:
            pass
        
        if self.settings['sound_enabled']:
            try:
                speaker.tone(659, 100)
            except:
                pass
        
        time.sleep(2)
        self.status_text.setText("Running")
    
    def run(self):
        """Main application loop"""
        print(f"=== {APP_NAME} v{APP_VERSION} Starting ===")
        print(f"Boot count: {self.boot_count}")
        print(f"Theme: {self.settings['theme']}")
        print("Application running... Press buttons to interact.")
        
        start_time = time.time()
        last_update = 0
        last_button_state = {'A': False, 'B': False, 'C': False}
        
        # Startup sound
        if self.settings['sound_enabled']:
            try:
                startup_melody = [440, 554, 659]
                for freq in startup_melody:
                    speaker.tone(freq, 100)
                    time.sleep_ms(120)
            except:
                pass
        
        while self.running:
            current_time = time.time()
            
            # Update display every second
            if current_time - last_update >= 1:
                self.update_display()
                last_update = current_time
            
            # Handle button presses
            buttons = {
                'A': btnA.isPressed(),
                'B': btnB.isPressed(),
                'C': btnC.isPressed()
            }
            
            for button, pressed in buttons.items():
                if pressed and not last_button_state[button]:
                    if button == 'A':
                        self.handle_button_a()
                    elif button == 'B':
                        self.handle_button_b()
                    elif button == 'C':
                        self.handle_button_c()
                
                last_button_state[button] = pressed
            
            # Small delay to prevent CPU hogging
            time.sleep_ms(50)
        
        print(f"{APP_NAME} stopped")

# Application entry point
def main():
    """Main entry point"""
    try:
        app = M5StackApp()
        app.run()
    except KeyboardInterrupt:
        print("Application interrupted")
    except Exception as e:
        print(f"Application error: {e}")
        # Display error on screen
        try:
            setScreenColor(0x330000)
            error_text = M5TextBox(10, 60, f"Error: {str(e)[:30]}", 
                                  lcd.FONT_Default, 0xFF0000, rotate=0)
        except:
            pass

# Auto-run when executed
if __name__ == "__main__":
    main()
`;

    console.log('📝 Uploading main.py...');
    await connection.writeFile('/main.py', mainApplication);
    console.log('✅ main.py uploaded successfully');

    // 3. Create library files
    console.log('\n3️⃣  Creating library files\n');
    
    const utilityLibrary = `# utils.py - Utility Library
"""
Utility functions for M5Stack applications
"""

import gc
import time
import json

def format_bytes(size):
    """Format bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.1f}{unit}"
        size /= 1024.0
    return f"{size:.1f}TB"

def get_memory_info():
    """Get detailed memory information"""
    gc.collect()
    free = gc.mem_free()
    alloc = gc.mem_alloc()
    total = free + alloc
    
    return {
        'free': free,
        'allocated': alloc,
        'total': total,
        'usage_percent': (alloc / total) * 100 if total > 0 else 0,
        'free_formatted': format_bytes(free),
        'allocated_formatted': format_bytes(alloc),
        'total_formatted': format_bytes(total)
    }

def save_json(filename, data):
    """Save data as JSON file"""
    try:
        with open(filename, 'w') as f:
            json.dump(data, f)
        return True
    except Exception as e:
        print(f"Save JSON error: {e}")
        return False

def load_json(filename, default=None):
    """Load JSON file with default fallback"""
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Load JSON error: {e}")
        return default if default is not None else {}

def system_info():
    """Get comprehensive system information"""
    import sys
    
    info = {
        'platform': sys.platform,
        'python_version': sys.version,
        'uptime': time.time(),
        'memory': get_memory_info()
    }
    
    try:
        import machine
        info['cpu_freq'] = machine.freq()
        info['unique_id'] = machine.unique_id().hex()
    except ImportError:
        info['cpu_freq'] = 'unknown'
        info['unique_id'] = 'unknown'
    
    return info

def log_event(event, data=None):
    """Log events to file"""
    timestamp = time.time()
    log_entry = {
        'timestamp': timestamp,
        'event': event,
        'data': data
    }
    
    try:
        # Append to log file
        logs = load_json('/event_log.json', [])
        logs.append(log_entry)
        
        # Keep only last 100 entries
        if len(logs) > 100:
            logs = logs[-100:]
        
        save_json('/event_log.json', logs)
        print(f"Event logged: {event}")
    except Exception as e:
        print(f"Log error: {e}")

def play_melody(notes, duration=100):
    """Play a sequence of musical notes"""
    try:
        from m5stack import speaker
        for note in notes:
            if note > 0:
                speaker.tone(note, duration)
            time.sleep_ms(duration + 20)
    except ImportError:
        print("Speaker not available")
    except Exception as e:
        print(f"Melody error: {e}")

# Pre-defined melodies
STARTUP_MELODY = [523, 659, 784, 1047]  # C5, E5, G5, C6
SHUTDOWN_MELODY = [1047, 784, 659, 523]  # C6, G5, E5, C5
SUCCESS_MELODY = [523, 659, 784]  # C5, E5, G5
ERROR_MELODY = [220, 0, 220]  # A3, rest, A3
NOTIFICATION_MELODY = [440, 554]  # A4, C#5
`;

    console.log('📝 Uploading utils.py...');
    await connection.writeFile('/lib/utils.py', utilityLibrary);
    console.log('✅ utils.py uploaded successfully');

    // 4. Create configuration files
    console.log('\n4️⃣  Creating configuration files\n');
    
    const wifiConfig = {
      ssid: "",
      password: "",
      auto_connect: false,
      timeout: 10,
      retry_count: 3
    };
    
    const deviceConfig = {
      device_name: "M5Stack-Firmware",
      firmware_version: "1.2.0",
      author: "Node.js Flash Example",
      created_at: new Date().toISOString(),
      features: {
        wifi: true,
        bluetooth: false,
        sensors: true,
        display: true,
        sound: true
      },
      hardware: {
        cpu_freq: 240000000,
        flash_size: 16777216,
        ram_size: 524288
      }
    };

    console.log('📝 Uploading configuration files...');
    await connection.writeFile('/wifi_config.json', JSON.stringify(wifiConfig, null, 2));
    await connection.writeFile('/device_config.json', JSON.stringify(deviceConfig, null, 2));
    console.log('✅ Configuration files uploaded successfully');

    // 5. Verify firmware installation
    console.log('\n5️⃣  Verifying firmware installation\n');
    
    const files = await connection.listDirectory('/');
    console.log('📁 Root directory files:');
    files.forEach(file => {
      const icon = file.type === 'directory' ? '📁' : '📄';
      console.log(`  ${icon} ${file.name}`);
    });

    // Check specific firmware files
    const firmwareFiles = [
      '/boot.py',
      '/main.py',
      '/lib/utils.py',
      '/wifi_config.json',
      '/device_config.json'
    ];

    console.log('\n🔍 Firmware file verification:');
    for (const filePath of firmwareFiles) {
      try {
        const content = await connection.readFile(filePath);
        console.log(`  ✅ ${filePath}: ${content.length} bytes`);
      } catch (error) {
        console.log(`  ❌ ${filePath}: ${error.message}`);
      }
    }

    // 6. Test firmware execution
    console.log('\n6️⃣  Testing firmware execution\n');
    
    console.log('🚀 Testing boot.py execution...');
    try {
      const bootResult = await connection.executeFile('/boot.py');
      console.log('Boot script output:');
      console.log(bootResult.output);
      console.log(`Execution time: ${bootResult.executionTime}ms`);
    } catch (error) {
      console.log(`⚠️  Boot script test failed: ${error.message}`);
    }

    console.log('\n🚀 Testing main.py execution (5 seconds)...');
    console.log('   (The application will run on your M5Stack screen)');
    try {
      // Start main application in background
      const mainResult = await connection.executeCode(`
# Start main application
import time
exec(open('/main.py').read())
`);
      console.log('Main application started successfully');
    } catch (error) {
      console.log(`⚠️  Main application test failed: ${error.message}`);
    }

    // 7. Firmware management instructions
    console.log('\n7️⃣  Firmware Management\n');
    
    console.log('🔧 Firmware has been successfully flashed to your M5Stack!');
    console.log('\n📋 What happens now:');
    console.log('   1. boot.py runs automatically on every device startup');
    console.log('   2. main.py runs automatically after boot.py completes');
    console.log('   3. Your firmware will persist across power cycles');
    console.log('   4. Settings and boot count are saved to flash memory');
    
    console.log('\n🎮 Device Controls:');
    console.log('   • Button A: Open menu');
    console.log('   • Button B: Change theme/settings');
    console.log('   • Button C: Show system information');
    
    console.log('\n⚙️  Configuration Files:');
    console.log('   • /wifi_config.json - WiFi settings');
    console.log('   • /device_config.json - Device configuration');
    console.log('   • /settings.json - Application settings (auto-created)');
    
    console.log('\n🔄 To test persistence:');
    console.log('   1. Disconnect and power cycle your M5Stack');
    console.log('   2. The firmware should start automatically');
    console.log('   3. Boot count should increment on each restart');

    console.log('\n🗑️  To remove firmware:');
    console.log('   • Delete /boot.py and /main.py files');
    console.log('   • Or upload new firmware to overwrite');

    console.log('\n🎉 Firmware flash completed successfully!');

  } catch (error) {
    console.error('\n❌ Firmware flash error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await client.disconnectAll();
      console.log('\n🔌 Disconnected from device');
    }
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  flashFirmwareExample().catch(console.error);
}

export { flashFirmwareExample };