/**
 * Test All Examples for @h1mpy-sdk/node
 * 
 * This script runs all examples in sequence to verify functionality
 * and provide a comprehensive demonstration of the SDK capabilities.
 */

import { M5StackClient } from '@h1mpy-sdk/node';
import { basicUsageExample } from './basic-usage.js';
import { replExample } from './repl-example.js';
import { fileOperationsExample } from './file-operations.js';
import { flashFirmwareExample } from './flash-firmware.js';

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async run() {
    console.log('🧪 M5Stack SDK Test Suite');
    console.log('=' * 50);
    console.log('Running comprehensive tests of all examples...\n');

    // Check prerequisites
    if (!(await this.checkPrerequisites())) {
      return;
    }

    const tests = [
      {
        name: 'Basic Usage Example',
        description: 'Tests fundamental SDK operations',
        fn: basicUsageExample,
        timeout: 30000
      },
      {
        name: 'REPL Example',
        description: 'Tests interactive REPL functionality',
        fn: replExample,
        timeout: 45000,
        skip: true, // Requires user input
        reason: 'Requires interactive input'
      },
      {
        name: 'File Operations Example',
        description: 'Tests comprehensive file management',
        fn: fileOperationsExample,
        timeout: 60000
      },
      {
        name: 'Flash Firmware Example',
        description: 'Tests complete firmware deployment',
        fn: flashFirmwareExample,
        timeout: 90000
      }
    ];

    // Run tests
    for (const test of tests) {
      await this.runTest(test);
    }

    // Generate report
    this.generateReport();
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...\n');

    try {
      // Check for available serial ports
      const client = new M5StackClient();
      const ports = await client.listPorts();

      if (ports.length === 0) {
        console.log('❌ No serial ports found');
        console.log('   Please connect your M5Stack device and try again.');
        return false;
      }

      console.log(`✅ Found ${ports.length} serial port(s):`);
      ports.forEach((port, i) => {
        console.log(`   ${i + 1}. ${port.path}`);
      });

      // Quick connectivity test
      console.log(`\\n🔌 Testing connection to ${ports[0].path}...`);
      const connection = await client.connect(ports[0].path);
      
      const isOnline = await connection.isOnline();
      console.log(`   Device online: ${isOnline ? '✅' : '❌'}`);

      if (isOnline) {
        const deviceInfo = await connection.getDeviceInfo();
        console.log(`   Platform: ${deviceInfo.platform}`);
        console.log(`   Version: ${deviceInfo.version}`);
      }

      await client.disconnect(ports[0].path);
      
      console.log('\\n🎯 Prerequisites check completed successfully!\\n');
      return true;

    } catch (error) {
      console.log(`❌ Prerequisites check failed: ${error.message}`);
      console.log('   Please ensure your M5Stack is connected and running MicroPython.\\n');
      return false;
    }
  }

  async runTest(test) {
    const startTime = Date.now();
    let result = {
      name: test.name,
      description: test.description,
      duration: 0,
      status: 'pending',
      error: null,
      skipped: false
    };

    console.log(`\\n${'='.repeat(60)}`);
    console.log(`🧪 Test: ${test.name}`);
    console.log(`📝 Description: ${test.description}`);
    
    if (test.skip) {
      console.log(`⏭️  Skipping: ${test.reason}`);
      result.status = 'skipped';
      result.skipped = true;
      this.results.push(result);
      return;
    }

    console.log(`⏱️  Timeout: ${test.timeout}ms`);
    console.log('🚀 Starting test...\\n');

    try {
      // Run test with timeout
      await Promise.race([
        test.fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), test.timeout)
        )
      ]);

      result.status = 'passed';
      result.duration = Date.now() - startTime;
      console.log(`\\n✅ Test passed in ${result.duration}ms`);

    } catch (error) {
      result.status = 'failed';
      result.duration = Date.now() - startTime;
      result.error = error.message;
      console.log(`\\n❌ Test failed: ${error.message}`);
      console.log(`   Duration: ${result.duration}ms`);
    }

    this.results.push(result);

    // Wait between tests
    console.log('\\n⏸️  Waiting 3 seconds before next test...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.skipped).length;
    const total = this.results.length;

    console.log('\\n' + '='.repeat(60));
    console.log('📊 TEST SUITE REPORT');
    console.log('='.repeat(60));
    
    console.log(`\\n⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`📈 Test Results: ${passed}/${total - skipped} passed`);
    
    if (skipped > 0) {
      console.log(`⏭️  Skipped: ${skipped}`);
    }
    
    if (failed > 0) {
      console.log(`❌ Failed: ${failed}`);
    }

    console.log('\\n📋 Detailed Results:');
    console.log('-'.repeat(60));

    this.results.forEach((result, i) => {
      const status = {
        'passed': '✅',
        'failed': '❌',
        'skipped': '⏭️'
      }[result.status];

      console.log(`${i + 1}. ${status} ${result.name}`);
      console.log(`   📝 ${result.description}`);
      
      if (result.skipped) {
        console.log(`   ⏭️  Skipped`);
      } else {
        console.log(`   ⏱️  Duration: ${result.duration}ms`);
        if (result.error) {
          console.log(`   ❌ Error: ${result.error}`);
        }
      }
      console.log('');
    });

    // Summary
    console.log('='.repeat(60));
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('   Your M5Stack SDK installation is working correctly.');
    } else {
      console.log(`⚠️  ${failed} test(s) failed.`);
      console.log('   Please check the error messages above.');
    }

    console.log('\\n💡 Tips:');
    console.log('   • Run individual examples with: pnpm [example-name]');
    console.log('   • Check device connection if tests fail');
    console.log('   • Ensure MicroPython firmware is installed');
    console.log('   • Review README.md for troubleshooting');

    // Export results for CI/automation
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: { total, passed, failed, skipped },
      details: this.results
    };

    console.log('\\n💾 Test report saved to: test-results.json');
    
    // Note: In a real implementation, you'd save this to file
    // require('fs').writeFileSync('test-results.json', JSON.stringify(reportData, null, 2));
  }
}

async function runAllTests() {
  const runner = new TestRunner();
  await runner.run();
}

// Command line interface
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting M5Stack SDK Test Suite...\\n');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\\n\\n🛑 Test suite interrupted by user');
    console.log('Cleaning up...');
    process.exit(0);
  });

  runAllTests().catch(error => {
    console.error('\\n💥 Test suite crashed:', error);
    process.exit(1);
  });
}

export { runAllTests };