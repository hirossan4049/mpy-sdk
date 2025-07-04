/**
 * Test File Upload Functionality
 * 
 * This test specifically checks file upload/write operations
 */

const { REPLAdapter } = require('../../packages/core/dist/adapters/REPLAdapter.js');

async function testFileUpload() {
  console.log('📁 Testing File Upload Functionality\n');

  const portPath = '/dev/tty.usbserial-55520ADC16';
  console.log(`📡 Connecting to ${portPath}...`);

  const adapter = new REPLAdapter(portPath);

  try {
    await adapter.connect();
    await adapter.initialize();
    console.log('✅ REPL connected!\n');

    // Test 1: Simple text file upload
    console.log('1️⃣ Testing simple text file upload...');
    const simpleContent = `# Simple test file
print("Hello from uploaded file!")
import time
print(f"Current time: {time.time()}")
`;

    try {
      await adapter.writeFile('/test_upload.py', simpleContent);
      console.log('   ✅ File uploaded successfully');
      
      // Verify the file exists and read it back
      const readBack = await adapter.readFile('/test_upload.py');
      console.log(`   📖 File size: ${readBack.length} bytes`);
      console.log(`   📋 Content preview: ${readBack.substring(0, 50)}...`);
      
      if (readBack === simpleContent) {
        console.log('   ✅ Content verification: PASSED');
      } else {
        console.log('   ❌ Content verification: FAILED');
        console.log(`   Expected length: ${simpleContent.length}, Got: ${readBack.length}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Upload failed: ${error.message}`);
    }

    // Test 2: Larger file upload
    console.log('\n2️⃣ Testing larger file upload...');
    const largeContent = `# Large test file with multiple lines
import gc
import time
from m5stack import lcd

def main():
    print("=== Large File Test ===")
    lcd.clear()
    lcd.print("Large File Test", 10, 10)
    
    for i in range(10):
        print(f"Loop iteration: {i}")
        lcd.print(f"Count: {i}", 10, 30 + i * 10)
        time.sleep_ms(100)
    
    print("Memory info:")
    print(f"Free memory: {gc.mem_free()} bytes")
    print("Test completed!")

if __name__ == "__main__":
    main()
`;

    try {
      await adapter.writeFile('/large_test.py', largeContent);
      console.log('   ✅ Large file uploaded successfully');
      
      // Execute the large file
      const result = await adapter.executeCode('exec(open("/large_test.py").read())');
      console.log('   🚀 Execution result:');
      console.log(`      ${result.output.trim()}`);
      
    } catch (error) {
      console.log(`   ❌ Large file upload failed: ${error.message}`);
    }

    // Test 3: Binary-like content (with special characters)
    console.log('\n3️⃣ Testing file with special characters...');
    const specialContent = `# File with special characters
text = "Hello 世界! 🌍 Special chars: àáâãäåæçèéêë"
print(text)

# Binary-like data simulation
data = bytes([0x48, 0x65, 0x6C, 0x6C, 0x6F])  # "Hello" in bytes
print("Bytes data:", data)
print("Decoded:", data.decode('utf-8'))

# Math expressions
import math
result = math.sqrt(16) + math.pi
print(f"Math result: {result}")
`;

    try {
      await adapter.writeFile('/special_chars.py', specialContent);
      console.log('   ✅ Special character file uploaded successfully');
      
      const specialReadBack = await adapter.readFile('/special_chars.py');
      if (specialReadBack === specialContent) {
        console.log('   ✅ Special character content verification: PASSED');
      } else {
        console.log('   ❌ Special character content verification: FAILED');
      }
      
    } catch (error) {
      console.log(`   ❌ Special character upload failed: ${error.message}`);
    }

    // Test 4: List files to see what was uploaded
    console.log('\n4️⃣ Listing uploaded files...');
    try {
      const files = await adapter.listDirectory('/');
      console.log('   📁 Files in root directory:');
      files.forEach(file => {
        const icon = file.type === 'directory' ? '📁' : '📄';
        console.log(`     ${icon} ${file.name}`);
      });
    } catch (error) {
      console.log(`   ❌ File listing failed: ${error.message}`);
    }

    // Test 5: Cleanup test files
    console.log('\n5️⃣ Cleaning up test files...');
    const testFiles = ['/test_upload.py', '/large_test.py', '/special_chars.py'];
    
    for (const filePath of testFiles) {
      try {
        await adapter.deleteFile(filePath);
        console.log(`   🗑️  Deleted: ${filePath}`);
      } catch (error) {
        console.log(`   ⚠️  Could not delete ${filePath}: ${error.message}`);
      }
    }

    console.log('\n🎉 File upload test completed!');

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error('Details:', error);
  } finally {
    try {
      await adapter.disconnect();
      console.log('\n📡 Disconnected');
    } catch (e) {
      console.error('Disconnect error:', e.message);
    }
  }
}

if (require.main === module) {
  testFileUpload().catch(console.error);
}

module.exports = { testFileUpload };