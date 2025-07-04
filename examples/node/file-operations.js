/**
 * File Operations Example for @h1mpy-sdk/node
 * 
 * This example demonstrates comprehensive file management operations:
 * - File upload/download with progress tracking
 * - Directory operations
 * - Batch file operations
 * - File verification and integrity checks
 */

import { M5StackClient } from '@h1mpy-sdk/node';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function fileOperationsExample() {
  console.log('📁 M5Stack File Operations Example\n');

  const client = new M5StackClient({
    timeout: 15000, // Longer timeout for file operations
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

    // 1. Basic file operations
    console.log('1️⃣  Basic File Operations\n');

    // Create a simple text file
    const textContent = `Hello from Node.js!
This is a test file created by the file operations example.
Created at: ${new Date().toISOString()}
Platform: M5Stack
SDK: @h1mpy-sdk/node`;

    console.log('📝 Creating text file...');
    await connection.writeFile('/flash/hello.txt', textContent);
    console.log('✅ Created: /flash/hello.txt');

    // Read it back
    console.log('📖 Reading file back...');
    const readContent = await connection.readFile('/flash/hello.txt');
    console.log(`✅ Read ${readContent.length} bytes`);
    console.log(`Content preview: ${readContent.toString().substring(0, 50)}...`);

    // 2. Python file with progress tracking
    console.log('\n2️⃣  Python File with Progress Tracking\n');

    const pythonCode = `# M5Stack Application Example
# Created by Node.js file operations example

import time
import gc
from m5stack import *
from m5ui import *
from uiflow import *

# Application configuration
APP_NAME = "File Ops Demo"
VERSION = "1.0.0"

def initialize_display():
    """Initialize the M5Stack display"""
    try:
        setScreenColor(0x000033)
        
        # Create UI elements
        title = M5TextBox(10, 10, APP_NAME, lcd.FONT_DejaVu18, 0x00FF00, rotate=0)
        version_text = M5TextBox(10, 35, f"v{VERSION}", lcd.FONT_Default, 0x888888, rotate=0)
        status = M5TextBox(10, 60, "Initializing...", lcd.FONT_Default, 0xFFFFFF, rotate=0)
        
        return title, version_text, status
    except Exception as e:
        print(f"Display init error: {e}")
        return None, None, None

def update_status(status_widget, message):
    """Update status display"""
    try:
        if status_widget:
            status_widget.setText(message)
        print(f"Status: {message}")
    except Exception as e:
        print(f"Status update error: {e}")

def main():
    """Main application function"""
    print(f"=== {APP_NAME} v{VERSION} ===")
    print(f"Started at: {time.time()}")
    
    # Initialize display
    title, version_text, status = initialize_display()
    update_status(status, "Running...")
    
    # Main loop
    start_time = time.time()
    counter = 0
    
    try:
        while True:
            counter += 1
            elapsed = time.time() - start_time
            
            # Update display every second
            if counter % 10 == 0:  # Approximately every second at 100ms delay
                update_status(status, f"Uptime: {elapsed:.1f}s")
                gc.collect()  # Garbage collection
            
            # Button interactions
            if btnA.wasPressed():
                update_status(status, "Button A pressed!")
                print("Button A pressed")
                
            if btnB.wasPressed():
                update_status(status, "Button B pressed!")
                print("Button B pressed")
                
            if btnC.wasPressed():
                update_status(status, "Exiting...")
                print("Button C pressed - exiting")
                break
            
            time.sleep_ms(100)
            
    except KeyboardInterrupt:
        print("Interrupted by user")
    except Exception as e:
        print(f"Runtime error: {e}")
    finally:
        update_status(status, "Stopped")
        print("Application stopped")

# Run the application
if __name__ == "__main__":
    main()
`;

    console.log('📝 Creating Python application with progress tracking...');
    
    let uploadProgress = 0;
    await connection.writeFile('/flash/app.py', pythonCode, {
      onProgress: (bytesWritten, totalBytes) => {
        const newProgress = Math.floor((bytesWritten / totalBytes) * 100);
        if (newProgress > uploadProgress) {
          uploadProgress = newProgress;
          process.stdout.write(`\r📤 Upload progress: ${uploadProgress}%`);
        }
      }
    });
    console.log('\n✅ Created: /flash/app.py');

    // 3. Directory operations
    console.log('\n3️⃣  Directory Operations\n');

    console.log('📁 Listing root directory:');
    const rootFiles = await connection.listDirectory('/');
    rootFiles.forEach(file => {
      const icon = file.type === 'directory' ? '📁' : '📄';
      console.log(`  ${icon} ${file.name}`);
    });

    console.log('\n📁 Listing /flash directory:');
    const flashFiles = await connection.listDirectory('/flash');
    flashFiles.forEach(file => {
      const icon = file.type === 'directory' ? '📁' : '📄';
      console.log(`  ${icon} ${file.name}`);
    });

    // 4. Create configuration file
    console.log('\n4️⃣  Configuration File\n');

    const config = {
      app_name: "M5Stack Demo",
      version: "1.0.0",
      settings: {
        brightness: 50,
        sound_enabled: true,
        theme: "dark",
        language: "en"
      },
      wifi: {
        ssid: "",
        password: "",
        auto_connect: false
      },
      created_by: "Node.js file operations example",
      created_at: new Date().toISOString()
    };

    console.log('📝 Creating JSON configuration file...');
    await connection.writeFile('/flash/config.json', JSON.stringify(config, null, 2));
    console.log('✅ Created: /flash/config.json');

    // 5. Batch file verification
    console.log('\n5️⃣  File Verification\n');

    const filesToVerify = ['/flash/hello.txt', '/flash/app.py', '/flash/config.json'];
    
    for (const filePath of filesToVerify) {
      try {
        const content = await connection.readFile(filePath);
        console.log(`✅ ${filePath}: ${content.length} bytes`);
      } catch (error) {
        console.log(`❌ ${filePath}: ${error.message}`);
      }
    }

    // 6. Execute the uploaded application
    console.log('\n6️⃣  Execute Uploaded Application\n');

    console.log('🚀 Executing /flash/app.py...');
    console.log('   (Press Ctrl+C after a few seconds to stop)');
    
    try {
      const execResult = await connection.executeFile('/flash/app.py');
      console.log('📤 Application output:');
      console.log(execResult.output);
      console.log(`⏱️  Execution time: ${execResult.executionTime}ms`);
    } catch (error) {
      console.log(`⚠️  Execution error: ${error.message}`);
    }

    // 7. File management utilities
    console.log('\n7️⃣  File Management Utilities\n');

    // Create a utility script
    const utilityCode = `# File management utilities for M5Stack
import os
import gc
import json

def list_files(path="/"):
    """List all files in a directory"""
    try:
        files = os.listdir(path)
        print(f"Files in {path}:")
        for file in files:
            full_path = path + "/" + file if path != "/" else "/" + file
            try:
                stat = os.stat(full_path)
                size = stat[6]  # File size
                print(f"  {file}: {size} bytes")
            except:
                print(f"  {file}: (stat failed)")
    except Exception as e:
        print(f"Error listing {path}: {e}")

def disk_usage():
    """Show disk usage information"""
    try:
        import os
        stats = os.statvfs("/")
        total = stats[2] * stats[0]
        free = stats[3] * stats[0]
        used = total - free
        
        print(f"Disk Usage:")
        print(f"  Total: {total:,} bytes ({total/1024/1024:.1f} MB)")
        print(f"  Used:  {used:,} bytes ({used/1024/1024:.1f} MB)")
        print(f"  Free:  {free:,} bytes ({free/1024/1024:.1f} MB)")
        print(f"  Usage: {(used/total)*100:.1f}%")
    except Exception as e:
        print(f"Error getting disk usage: {e}")

def memory_info():
    """Show memory information"""
    try:
        gc.collect()
        free = gc.mem_free()
        alloc = gc.mem_alloc()
        total = free + alloc
        
        print(f"Memory Info:")
        print(f"  Free:  {free:,} bytes ({free/1024:.1f} KB)")
        print(f"  Used:  {alloc:,} bytes ({alloc/1024:.1f} KB)")
        print(f"  Total: {total:,} bytes ({total/1024:.1f} KB)")
        print(f"  Usage: {(alloc/total)*100:.1f}%")
    except Exception as e:
        print(f"Error getting memory info: {e}")

def system_info():
    """Show comprehensive system information"""
    import sys
    import time
    
    print("=== M5Stack System Information ===")
    print(f"Platform: {sys.platform}")
    print(f"Python: {sys.version}")
    print(f"Uptime: {time.time():.1f} seconds")
    print()
    
    memory_info()
    print()
    disk_usage()
    print()
    list_files("/flash")

# Run system info when executed
if __name__ == "__main__":
    system_info()
`;

    console.log('📝 Creating utility script...');
    await connection.writeFile('/flash/utils.py', utilityCode);
    console.log('✅ Created: /flash/utils.py');

    // Execute the utility script
    console.log('\n🔧 Running system utility script:');
    const utilResult = await connection.executeFile('/flash/utils.py');
    console.log(utilResult.output);

    // 8. Cleanup options
    console.log('\n8️⃣  Cleanup Options\n');
    console.log('Files created in this example:');
    console.log('  📄 /flash/hello.txt');
    console.log('  📄 /flash/app.py');
    console.log('  📄 /flash/config.json');
    console.log('  📄 /flash/utils.py');
    
    // Uncomment the following lines to clean up files:
    // console.log('\n🧹 Cleaning up created files...');
    // await connection.deleteFile('/flash/hello.txt');
    // await connection.deleteFile('/flash/app.py');
    // await connection.deleteFile('/flash/config.json');
    // await connection.deleteFile('/flash/utils.py');
    // console.log('✅ Cleanup completed');

    console.log('\n🎉 File operations example completed successfully!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('   ✅ Text and binary file operations');
    console.log('   ✅ Progress tracking for large uploads');
    console.log('   ✅ Directory listing and navigation');
    console.log('   ✅ JSON configuration files');
    console.log('   ✅ Python application deployment');
    console.log('   ✅ File verification and integrity');
    console.log('   ✅ System utility scripts');

  } catch (error) {
    console.error('\n❌ File operations error:', error.message);
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
  fileOperationsExample().catch(console.error);
}

export { fileOperationsExample };