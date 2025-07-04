/**
 * Simple File Upload Test
 * 
 * Tests basic file upload/download functionality with simplified commands
 */

const { REPLAdapter } = require('../../packages/core/dist/adapters/REPLAdapter.js');

async function simpleUploadTest() {
  console.log('📤 Simple File Upload Test\n');

  const portPath = '/dev/tty.usbserial-55520ADC16';
  console.log(`📡 Connecting to ${portPath}...`);

  const adapter = new REPLAdapter(portPath);

  try {
    await adapter.connect();
    await adapter.initialize();
    console.log('✅ REPL connected!\n');

    // Test simple text content
    const testContent = 'print("Hello from uploaded file!")\nimport time\nprint(f"Time: {time.time()}")';
    console.log('📝 Test content:');
    console.log(testContent);
    console.log();

    // Test step-by-step file upload process
    console.log('1️⃣ Testing individual upload commands...');
    
    try {
      console.log('   Importing binascii...');
      await adapter.sendREPLCommand('import binascii');
      
      console.log('   Converting content to hex...');
      const hexData = Buffer.from(testContent, 'utf8').toString('hex');
      console.log(`   Hex length: ${hexData.length} characters`);
      
      console.log('   Opening file for writing...');
      await adapter.sendREPLCommand(`f = open('/test_simple.py', 'wb')`);
      
      console.log('   Writing hex data...');
      await adapter.sendREPLCommand(`f.write(binascii.unhexlify('${hexData}'))`);
      
      console.log('   Closing file...');
      await adapter.sendREPLCommand('f.close()');
      
      console.log('   ✅ File uploaded using individual commands');
      
    } catch (error) {
      console.log(`   ❌ Individual command upload failed: ${error.message}`);
    }

    // Test reading the file back
    console.log('\n2️⃣ Testing file read back...');
    try {
      console.log('   Opening file for reading...');
      await adapter.sendREPLCommand(`f = open('/test_simple.py', 'rb')`);
      
      console.log('   Reading and converting to hex...');
      const hexResult = await adapter.sendREPLCommand('binascii.hexlify(f.read()).decode()');
      
      console.log('   Closing file...');
      await adapter.sendREPLCommand('f.close()');
      
      // Extract hex data from result
      const lines = hexResult.trim().split('\n');
      const hexContent = lines[lines.length - 1].replace(/'/g, '').trim();
      
      // Convert back to string
      const readContent = Buffer.from(hexContent, 'hex').toString('utf8');
      
      console.log(`   📖 Read content:\n${readContent}`);
      
      if (readContent === testContent) {
        console.log('   ✅ File content verification: PASSED');
      } else {
        console.log('   ❌ File content verification: FAILED');
        console.log(`   Expected: ${testContent.length} chars`);
        console.log(`   Got: ${readContent.length} chars`);
      }
      
    } catch (error) {
      console.log(`   ❌ File read failed: ${error.message}`);
    }

    // Test executing the uploaded file
    console.log('\n3️⃣ Testing file execution...');
    try {
      const execResult = await adapter.executeCode('exec(open("/test_simple.py").read())');
      console.log(`   🚀 Execution output:`);
      console.log(`   ${execResult.output.trim()}`);
    } catch (error) {
      console.log(`   ❌ File execution failed: ${error.message}`);
    }

    // Test using the REPLAdapter writeFile method
    console.log('\n4️⃣ Testing REPLAdapter.writeFile method...');
    try {
      const methodTestContent = 'print("Hello from REPLAdapter.writeFile method!")';
      await adapter.writeFile('/test_method.py', methodTestContent);
      console.log('   ✅ REPLAdapter.writeFile completed');
      
      // Read back using the method
      const readBuffer = await adapter.readFile('/test_method.py');
      const readMethodContent = readBuffer.toString('utf8');
      
      console.log(`   📖 Method read content: "${readMethodContent}"`);
      
      if (readMethodContent === methodTestContent) {
        console.log('   ✅ REPLAdapter method verification: PASSED');
      } else {
        console.log('   ❌ REPLAdapter method verification: FAILED');
      }
      
    } catch (error) {
      console.log(`   ❌ REPLAdapter method failed: ${error.message}`);
      console.log(`   Error details:`, error);
    }

    // Cleanup
    console.log('\n5️⃣ Cleaning up test files...');
    try {
      await adapter.sendREPLCommand('import os');
      await adapter.sendREPLCommand(`os.remove('/test_simple.py')`);
      await adapter.sendREPLCommand(`os.remove('/test_method.py')`);
      console.log('   🗑️  Test files cleaned up');
    } catch (error) {
      console.log(`   ⚠️  Cleanup warning: ${error.message}`);
    }

    console.log('\n🎉 Simple upload test completed!');

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error('Stack:', error.stack);
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
  simpleUploadTest().catch(console.error);
}

module.exports = { simpleUploadTest };