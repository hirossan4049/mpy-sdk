/**
 * Interactive Demo for @h1mpy-sdk/node
 * 
 * This example demonstrates interactive features:
 * - Real-time button monitoring
 * - Sensor data streaming
 * - Interactive LCD updates
 * - Sound and vibration feedback
 * - User input handling
 */

import { M5StackClient } from '@h1mpy-sdk/node';
import { createInterface } from 'readline';

class InteractiveDemo {
  constructor() {
    this.client = new M5StackClient({ timeout: 10000 });
    this.connection = null;
    this.isRunning = false;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize() {
    console.log('🎮 M5Stack Interactive Demo\n');

    try {
      // Connect to device
      const ports = await this.client.listPorts();
      if (ports.length === 0) {
        throw new Error('No serial ports found');
      }

      console.log(`🔌 Connecting to ${ports[0].path}...`);
      this.connection = await this.client.connect(ports[0].path);
      console.log('✅ Connected!\n');

      // Initialize M5Stack display and components
      await this.setupM5Stack();
      
      return true;
    } catch (error) {
      console.error(`❌ Initialization failed: ${error.message}`);
      return false;
    }
  }

  async setupM5Stack() {
    console.log('🔧 Setting up M5Stack components...');
    
    const setupCode = `
# Interactive Demo Setup
import time
import gc
from m5stack import *
from m5ui import *
from uiflow import *

# Initialize display
setScreenColor(0x001122)

# Create UI elements
title = M5TextBox(10, 5, "Interactive Demo", lcd.FONT_DejaVu18, 0x00FFFF, rotate=0)
separator = M5Line(10, 30, 310, 30, 0x666666)

# Status indicators
status_label = M5TextBox(10, 40, "Status:", lcd.FONT_Default, 0xAAAAAA, rotate=0)
status_text = M5TextBox(80, 40, "Ready", lcd.FONT_Default, 0x00FF00, rotate=0)

# Sensor data displays
accel_label = M5TextBox(10, 65, "Accel:", lcd.FONT_Default, 0xAAAAAA, rotate=0)
accel_text = M5TextBox(80, 65, "X:0 Y:0 Z:0", lcd.FONT_Default, 0x00AAFF, rotate=0)

# Button counters
btn_label = M5TextBox(10, 90, "Buttons:", lcd.FONT_Default, 0xAAAAAA, rotate=0)
btn_text = M5TextBox(80, 90, "A:0 B:0 C:0", lcd.FONT_Default, 0xFFAA00, rotate=0)

# Temperature display
temp_label = M5TextBox(10, 115, "Temp:", lcd.FONT_Default, 0xAAAAAA, rotate=0)
temp_text = M5TextBox(80, 115, "-- °C", lcd.FONT_Default, 0xFF6600, rotate=0)

# Instructions
instructions = M5TextBox(10, 145, "Press buttons or shake device", lcd.FONT_Default, 0x888888, rotate=0)

# Initialize global variables
button_counts = {'A': 0, 'B': 0, 'C': 0}
last_button_state = {'A': False, 'B': False, 'C': False}

print("M5Stack setup completed")
`;

    await this.connection.executeCode(setupCode);
    console.log('✅ M5Stack setup completed');
  }

  async startInteractiveMode() {
    console.log('\n🎮 Starting Interactive Mode');
    console.log('Commands:');
    console.log('  monitor    - Start real-time monitoring');
    console.log('  buttons    - Monitor button presses');
    console.log('  sensors    - Monitor sensor data');
    console.log('  sound      - Test sound features');
    console.log('  display    - Interactive display demos');
    console.log('  game       - Simple reaction game');
    console.log('  quit       - Exit demo');
    console.log('');

    this.isRunning = true;
    await this.commandLoop();
  }

  async commandLoop() {
    while (this.isRunning) {
      const command = await this.prompt('demo> ');
      await this.handleCommand(command.trim().toLowerCase());
    }
  }

  async handleCommand(command) {
    try {
      switch (command) {
        case 'monitor':
          await this.realTimeMonitor();
          break;
        case 'buttons':
          await this.buttonMonitor();
          break;
        case 'sensors':
          await this.sensorMonitor();
          break;
        case 'sound':
          await this.soundDemo();
          break;
        case 'display':
          await this.displayDemo();
          break;
        case 'game':
          await this.reactionGame();
          break;
        case 'quit':
        case 'exit':
          this.isRunning = false;
          break;
        case 'help':
          console.log('Available commands: monitor, buttons, sensors, sound, display, game, quit');
          break;
        default:
          if (command) {
            console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
          }
      }
    } catch (error) {
      console.error(`Command error: ${error.message}`);
    }
  }

  async realTimeMonitor() {
    console.log('\n📊 Real-time Monitor (Press Ctrl+C to stop)');
    
    const monitorCode = `
import time
import json

# Monitor state
monitor_start = time.time()
last_update = 0

try:
    from m5stack import imu, buttonA, buttonB, buttonC
    imu_available = True
except ImportError:
    imu_available = False
    print("IMU not available")

print("Starting real-time monitor...")

for i in range(50):  # Run for ~5 seconds
    current_time = time.time()
    
    # Collect data
    data = {
        'timestamp': current_time,
        'uptime': current_time - monitor_start,
        'buttons': {
            'A': btnA.isPressed() if 'btnA' in globals() else False,
            'B': btnB.isPressed() if 'btnB' in globals() else False,
            'C': btnC.isPressed() if 'btnC' in globals() else False
        }
    }
    
    # Add sensor data if available
    if imu_available:
        try:
            accel = imu.acceleration
            gyro = imu.gyro
            data['sensors'] = {
                'accel': {'x': accel[0], 'y': accel[1], 'z': accel[2]},
                'gyro': {'x': gyro[0], 'y': gyro[1], 'z': gyro[2]}
            }
        except:
            data['sensors'] = None
    
    # Output as JSON for easy parsing
    print(json.dumps(data))
    
    time.sleep_ms(100)

print("Monitor completed")
`;

    const result = await this.connection.executeCode(monitorCode);
    
    // Parse and display the monitor data
    const lines = result.output.split('\n');
    lines.forEach(line => {
      if (line.startsWith('{')) {
        try {
          const data = JSON.parse(line);
          const uptime = data.uptime.toFixed(1);
          const buttons = Object.entries(data.buttons)
            .filter(([_, pressed]) => pressed)
            .map(([btn]) => btn)
            .join(',') || 'none';
          
          let sensorInfo = '';
          if (data.sensors) {
            const accel = data.sensors.accel;
            sensorInfo = `accel(${accel.x.toFixed(1)},${accel.y.toFixed(1)},${accel.z.toFixed(1)})`;
          }
          
          console.log(`⏱️  ${uptime}s | 🔘 ${buttons} | 📊 ${sensorInfo}`);
        } catch (e) {
          // Not JSON, probably a status message
          console.log(line);
        }
      } else if (line.trim()) {
        console.log(line);
      }
    });
  }

  async buttonMonitor() {
    console.log('\n🔘 Button Monitor');
    console.log('Press buttons A, B, or C on your M5Stack...');
    
    const buttonCode = `
import time

print("Button monitor starting...")
start_time = time.time()
button_counts = {'A': 0, 'B': 0, 'C': 0}
last_state = {'A': False, 'B': False, 'C': False}

try:
    from m5stack import buttonA, buttonB, buttonC, speaker
    speaker_available = True
except ImportError:
    speaker_available = False
    print("Speaker not available")

# Update display
try:
    status_text.setText("Button Monitor")
    btn_text.setText("A:0 B:0 C:0")
except:
    pass

while time.time() - start_time < 10:  # 10 second monitor
    buttons = {
        'A': btnA.isPressed() if 'btnA' in globals() else False,
        'B': btnB.isPressed() if 'btnB' in globals() else False,
        'C': btnC.isPressed() if 'btnC' in globals() else False
    }
    
    for name, pressed in buttons.items():
        if pressed and not last_state[name]:
            button_counts[name] += 1
            print(f"Button {name} pressed! Total: {button_counts[name]}")
            
            # Update display
            try:
                btn_text.setText(f"A:{button_counts['A']} B:{button_counts['B']} C:{button_counts['C']}")
            except:
                pass
            
            # Play sound
            if speaker_available:
                try:
                    tones = {'A': 440, 'B': 554, 'C': 659}  # A4, C#5, E5
                    speaker.tone(tones[name], 100)
                except:
                    pass
        
        last_state[name] = pressed
    
    time.sleep_ms(50)

print(f"Button monitor completed. Final counts: {button_counts}")

# Reset display
try:
    status_text.setText("Ready")
except:
    pass
`;

    const result = await this.connection.executeCode(buttonCode);
    console.log(result.output);
  }

  async sensorMonitor() {
    console.log('\n📊 Sensor Monitor');
    console.log('Shake or move your M5Stack to see sensor data...');
    
    const sensorCode = `
import time
import math

print("Sensor monitor starting...")
start_time = time.time()

try:
    from m5stack import imu
    imu_available = True
    print("IMU sensor detected")
except ImportError:
    imu_available = False
    print("IMU sensor not available")

if imu_available:
    # Update display
    try:
        status_text.setText("Sensor Monitor")
    except:
        pass
    
    max_accel = 0
    sample_count = 0
    
    while time.time() - start_time < 8:  # 8 second monitor
        try:
            accel = imu.acceleration
            gyro = imu.gyro
            
            # Calculate magnitude
            accel_mag = math.sqrt(accel[0]**2 + accel[1]**2 + accel[2]**2)
            gyro_mag = math.sqrt(gyro[0]**2 + gyro[1]**2 + gyro[2]**2)
            
            if accel_mag > max_accel:
                max_accel = accel_mag
            
            sample_count += 1
            
            # Update display every 10 samples
            if sample_count % 10 == 0:
                try:
                    accel_text.setText(f"X:{accel[0]:.1f} Y:{accel[1]:.1f} Z:{accel[2]:.1f}")
                except:
                    pass
                
                print(f"Accel: ({accel[0]:.2f}, {accel[1]:.2f}, {accel[2]:.2f}) |{accel_mag:.2f}|")
                print(f"Gyro:  ({gyro[0]:.2f}, {gyro[1]:.2f}, {gyro[2]:.2f}) |{gyro_mag:.2f}|")
                print("---")
            
            time.sleep_ms(100)
            
        except Exception as e:
            print(f"Sensor read error: {e}")
            break
    
    print(f"Sensor monitor completed. Max acceleration: {max_accel:.2f}")
    print(f"Total samples: {sample_count}")
    
    # Reset display
    try:
        status_text.setText("Ready")
        accel_text.setText("X:0 Y:0 Z:0")
    except:
        pass
else:
    print("Cannot run sensor monitor without IMU")
`;

    const result = await this.connection.executeCode(sensorCode);
    console.log(result.output);
  }

  async soundDemo() {
    console.log('\n🔊 Sound Demo');
    
    const soundCode = `
import time

print("Sound demo starting...")

try:
    from m5stack import speaker
    speaker_available = True
    print("Speaker detected")
except ImportError:
    speaker_available = False
    print("Speaker not available")

if speaker_available:
    # Update display
    try:
        status_text.setText("Sound Demo")
    except:
        pass
    
    # Play scales
    print("Playing C major scale...")
    notes = [262, 294, 330, 349, 392, 440, 494, 523]  # C4 to C5
    note_names = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C']
    
    for i, freq in enumerate(notes):
        print(f"Playing {note_names[i]} ({freq} Hz)")
        speaker.tone(freq, 300)
        time.sleep_ms(350)
    
    time.sleep_ms(500)
    
    # Play melody
    print("Playing simple melody...")
    melody = [
        (523, 200), (587, 200), (659, 200), (523, 200),  # C D E C
        (523, 200), (587, 200), (659, 200), (523, 200),  # C D E C
        (659, 200), (698, 200), (784, 400),              # E F G
        (659, 200), (698, 200), (784, 400)               # E F G
    ]
    
    for freq, duration in melody:
        speaker.tone(freq, duration)
        time.sleep_ms(duration + 50)
    
    print("Sound demo completed")
    
    # Reset display
    try:
        status_text.setText("Ready")
    except:
        pass
else:
    print("Cannot run sound demo without speaker")
`;

    const result = await this.connection.executeCode(soundCode);
    console.log(result.output);
  }

  async displayDemo() {
    console.log('\n🖥️  Display Demo');
    
    const displayCode = `
import time
import random

print("Display demo starting...")

# Update status
try:
    status_text.setText("Display Demo")
except:
    pass

# Color animation
print("Color animation...")
colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF]
color_names = ['Red', 'Green', 'Blue', 'Yellow', 'Magenta', 'Cyan']

for i, color in enumerate(colors):
    setScreenColor(color)
    time.sleep_ms(500)
    print(f"Color: {color_names[i]}")

# Reset to original theme
setScreenColor(0x001122)

# Text animations
print("Text animations...")
for i in range(10):
    try:
        title.setText(f"Demo {i+1}/10")
        status_text.setText(f"Step {i+1}")
        
        # Random color for status text
        colors = [0x00FF00, 0x00AAFF, 0xFFAA00, 0xFF6600]
        status_text.setColor(random.choice(colors))
        
    except Exception as e:
        print(f"Text animation error: {e}")
    
    time.sleep_ms(300)

# Reset display
try:
    title.setText("Interactive Demo")
    status_text.setText("Ready")
    status_text.setColor(0x00FF00)
except:
    pass

print("Display demo completed")
`;

    const result = await this.connection.executeCode(displayCode);
    console.log(result.output);
  }

  async reactionGame() {
    console.log('\n🎮 Reaction Game');
    console.log('A simple reaction time game will start on your M5Stack...');
    
    const gameCode = `
import time
import random

print("=== Reaction Game ===")
print("Watch the screen and press the button when prompted!")

try:
    from m5stack import speaker
    speaker_available = True
except ImportError:
    speaker_available = False

# Game setup
try:
    setScreenColor(0x000000)
    game_title = M5TextBox(50, 50, "Reaction Game", lcd.FONT_DejaVu18, 0xFFFFFF, rotate=0)
    instruction = M5TextBox(30, 100, "Get Ready...", lcd.FONT_Default, 0x00FF00, rotate=0)
    score_display = M5TextBox(30, 130, "", lcd.FONT_Default, 0xFFAA00, rotate=0)
except:
    print("Display setup failed")

# Game variables
scores = []
round_num = 0
max_rounds = 3

print(f"Starting {max_rounds} rounds...")

for round_num in range(1, max_rounds + 1):
    print(f"\\nRound {round_num}/{max_rounds}")
    
    # Update display
    try:
        instruction.setText(f"Round {round_num} - Get Ready...")
        score_display.setText("")
    except:
        pass
    
    # Random delay (2-5 seconds)
    delay = random.uniform(2.0, 5.0)
    print(f"Waiting {delay:.1f} seconds...")
    time.sleep(delay)
    
    # Show prompt
    try:
        setScreenColor(0x00FF00)
        instruction.setText("PRESS BUTTON A NOW!")
    except:
        pass
    
    if speaker_available:
        try:
            speaker.tone(1000, 100)
        except:
            pass
    
    print("GO! Press button A!")
    start_time = time.time()
    
    # Wait for button press (max 3 seconds)
    pressed = False
    reaction_time = 0
    
    while time.time() - start_time < 3.0:
        if btnA.isPressed():
            reaction_time = (time.time() - start_time) * 1000  # Convert to ms
            pressed = True
            break
        time.sleep_ms(10)
    
    # Reset screen
    try:
        setScreenColor(0x000000)
    except:
        pass
    
    if pressed:
        print(f"Reaction time: {reaction_time:.0f}ms")
        scores.append(reaction_time)
        
        # Feedback
        if reaction_time < 300:
            feedback = "Excellent!"
            color = 0x00FF00
        elif reaction_time < 500:
            feedback = "Good!"
            color = 0xFFFF00
        elif reaction_time < 800:
            feedback = "Fair"
            color = 0xFF8800
        else:
            feedback = "Slow"
            color = 0xFF0000
        
        try:
            instruction.setText(f"{feedback} - {reaction_time:.0f}ms")
            instruction.setColor(color)
        except:
            pass
        
        if speaker_available:
            try:
                if reaction_time < 400:
                    speaker.tone(880, 200)  # High tone for good reaction
                else:
                    speaker.tone(440, 200)  # Lower tone for slower reaction
            except:
                pass
        
    else:
        print("Too slow! No response detected.")
        try:
            instruction.setText("Too slow!")
            instruction.setColor(0xFF0000)
        except:
            pass
        
        if speaker_available:
            try:
                speaker.tone(200, 500)  # Low tone for timeout
            except:
                pass
    
    time.sleep(2)  # Show result

# Game over - show final results
print("\\n=== Game Over ===")
if scores:
    avg_time = sum(scores) / len(scores)
    best_time = min(scores)
    print(f"Rounds completed: {len(scores)}/{max_rounds}")
    print(f"Best time: {best_time:.0f}ms")
    print(f"Average time: {avg_time:.0f}ms")
    print(f"All times: {[int(s) for s in scores]}")
    
    try:
        instruction.setText(f"Best: {best_time:.0f}ms")
        score_display.setText(f"Avg: {avg_time:.0f}ms")
    except:
        pass
else:
    print("No successful reactions recorded!")
    try:
        instruction.setText("Try again!")
    except:
        pass

# Reset display
time.sleep(3)
try:
    setScreenColor(0x001122)
    title.setText("Interactive Demo")
    instruction.setText("Ready")
    instruction.setColor(0x00FF00)
    score_display.setText("")
except:
    pass

print("Reaction game completed!")
`;

    const result = await this.connection.executeCode(gameCode);
    console.log(result.output);
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');
    
    // Reset M5Stack display
    try {
      await this.connection.executeCode(`
setScreenColor(0x000000)
title = M5TextBox(80, 100, "Demo Complete", lcd.FONT_DejaVu18, 0x00FF00, rotate=0)
subtitle = M5TextBox(90, 130, "Thank you!", lcd.FONT_Default, 0xFFFFFF, rotate=0)
`);
    } catch (error) {
      console.log('Display reset failed:', error.message);
    }
    
    this.rl.close();
    
    if (this.connection) {
      await this.client.disconnectAll();
      console.log('🔌 Disconnected from device');
    }
  }
}

async function interactiveDemoExample() {
  const demo = new InteractiveDemo();
  
  try {
    const initialized = await demo.initialize();
    if (initialized) {
      await demo.startInteractiveMode();
    }
  } catch (error) {
    console.error('Demo error:', error.message);
  } finally {
    await demo.cleanup();
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  interactiveDemoExample().catch(console.error);
}

export { interactiveDemoExample };