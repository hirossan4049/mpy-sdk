#!/bin/bash

# M5Stack MicroPython CLI - Basic Usage Examples
# This script demonstrates basic operations with the M5Stack CLI

set -e # Exit on error

echo "🔧 M5Stack CLI Basic Usage Examples"
echo "=================================="

# Navigate to the correct directory to use pnpm cli
cd "../.."

# Check if pnpm is available
if ! command -v pnpm &>/dev/null; then
  echo "❌ pnpm not found. Please install it first:"
  echo "   npm install -g pnpm"
  exit 1
fi

# 1. List available ports
echo ""
echo "📡 Step 1: Listing available ports..."
pnpm cli list-ports

# Prompt for port selection
echo ""
read -p "Enter the port path (e.g., /dev/tty.usbserial-XXXX): " PORT

if [ -z "$PORT" ]; then
  echo "❌ Port path is required"
  exit 1
fi

# 2. Get device information
echo ""
echo "📊 Step 2: Getting device information..."
pnpm cli info "$PORT"

# 3. Execute simple Python code
echo ""
echo "🐍 Step 3: Executing simple Python code..."
pnpm cli exec "$PORT" "print('Hello from M5Stack!')"

# 4. List files on device
echo ""
echo "📁 Step 4: Listing files on device..."
pnpm cli ls "$PORT"

# 5. Create a simple test file
echo ""
echo "📝 Step 5: Creating a main.py file..."
cat >main.py <<'EOF'
# Simple LED blink test
import time
from m5stack import lcd

lcd.clear()
lcd.print("LED Test Started")

# Blink built-in LED if available
try:
    import machine
    led = machine.Pin(2, machine.Pin.OUT)
    
    for i in range(5):
        led.on()
        time.sleep(0.5)
        led.off()
        time.sleep(0.5)
        print(f"Blink {i+1}")
    
    lcd.print("LED Test Complete")
except:
    print("LED not available")
EOF

# 6. Upload the main.py file
echo ""
echo "📤 Step 6: Uploading main.py file..."
pnpm cli upload "$PORT" main.py /flash/main.py

# 7. Execute the uploaded file
echo ""
echo "🚀 Step 7: Executing uploaded main.py..."
pnpm cli exec "$PORT" "exec(open('/flash/main.py').read())"

# 8. Download the file back (optional)
echo ""
echo "📥 Step 8: Downloading file back..."
pnpm cli download "$PORT" "/flash/main.py" downloaded_main.py

# Clean up
echo ""
echo "🧹 Cleaning up..."
rm -f main.py

echo ""
echo "✅ Basic usage examples completed!"
echo "   - Downloaded file: downloaded_main.py"
echo "   - You can now start a REPL session with: pnpm cli repl $PORT"
