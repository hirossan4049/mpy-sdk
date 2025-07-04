#!/usr/bin/env node

/**
 * M5Stack Flash Sample Tool
 * サンプルコードをM5Stackにフラッシュするツール
 */

const { M5StackClient } = require('../dist/node/index.js');
const { REPLAdapter } = require('../dist/node/adapters/REPLAdapter.js');
const fs = require('fs');
const path = require('path');

// カラー出力関数
function log(icon, message, color = '\x1b[32m') {
  console.log(`${color}${icon} ${message}\x1b[0m`);
}

function logInfo(message) {
  console.log(`\x1b[36mℹ ${message}\x1b[0m`);
}

function logHeader(message) {
  console.log(`\n\x1b[1m\x1b[33m${message}\x1b[0m`);
}

function logError(message) {
  console.log(`\x1b[31m❌ ${message}\x1b[0m`);
}

// ポート選択
async function selectPort() {
  const client = new M5StackClient();
  const ports = await client.listPorts();
  
  const m5stackPorts = ports.filter(port => 
    port.path.includes('usbserial') || port.path.includes('COM')
  );

  if (m5stackPorts.length === 0) {
    logError('No M5Stack devices found');
    process.exit(1);
  }

  return m5stackPorts[0].path;
}

// サンプルファイル読み込み
function loadSampleCode(sampleType = 'simple') {
  const samplePath = path.join(__dirname, '..', 'examples', `flash-sample-${sampleType}.py`);
  
  if (!fs.existsSync(samplePath)) {
    throw new Error(`Sample file not found: ${samplePath}`);
  }
  
  return fs.readFileSync(samplePath, 'utf8');
}

// メイン関数
async function main() {
  try {
    const args = process.argv.slice(2);
    const sampleType = args[0] || 'simple'; // 'simple' or 'advanced'
    
    logHeader('🔥 M5Stack Flash Sample Tool');
    logInfo(`Sample type: ${sampleType}`);
    
    // ポート選択
    logInfo('Finding M5Stack device...');
    const port = await selectPort();
    logInfo(`Using port: ${port}`);
    
    // サンプルコード読み込み
    logInfo('Loading sample code...');
    const sampleCode = loadSampleCode(sampleType);
    log('📄', `Loaded ${sampleCode.split('\n').length} lines of code`);
    
    // デバイス接続
    log('📡', 'Connecting to M5Stack...');
    const adapter = new REPLAdapter(port);
    await adapter.connect();
    await adapter.initialize();
    log('✅', 'Connected successfully!');
    
    // main.pyにフラッシュ
    log('💾', 'Flashing sample code to main.py...');
    
    // base64エンコードして安全にファイル書き込み（/flash/に保存）
    try {
      const base64Content = Buffer.from(sampleCode, 'utf8').toString('base64');
      logInfo(`Base64 content length: ${base64Content.length} chars`);
      
      const result = await adapter.executeCode(`
import binascii
import os
print('Starting file write...')
content = binascii.a2b_base64('${base64Content}').decode('utf-8')
print('Content decoded, length:', len(content))
with open('/flash/main.py', 'w') as f:
    f.write(content)
print('File written successfully via base64')
print('Files in flash:', os.listdir('/flash'))
`);
      log('✅', 'Sample code flashed via base64 encoding!');
      logInfo(`Write result: "${result.output ? result.output.trim() : 'No output'}"`);
      logInfo(`Write error: "${result.error ? result.error.trim() : 'No error'}"`);
    } catch (error) {
      log('⚠️', 'Base64 write failed, trying REPLAdapter writeFile...', '\x1b[33m');
      await adapter.writeFile('/flash/main.py', sampleCode);
      log('✅', 'Sample code flashed via writeFile!');
    }
    
    // フラッシュ後の確認
    log('🔍', 'Verifying flashed content...');
    
    // ファイル存在確認
    try {
      const fileExists = await adapter.executeCode(`
import os
print('Checking file existence...')
flash_files = os.listdir('/flash')
print('Files in /flash:', flash_files)
if 'main.py' in flash_files:
    print('main.py exists in /flash/')
    with open('/flash/main.py', 'r') as f:
        content = f.read()
        print('File size:', len(content), 'bytes')
        print('First 100 chars:', repr(content[:100]))
else:
    print('main.py not found in /flash/')
print('Verification complete')
`);
      logInfo(`File check result: "${fileExists.output ? fileExists.output.trim() : 'No output'}"`);
      logInfo(`File check error: "${fileExists.error ? fileExists.error.trim() : 'No error'}"`);
    } catch (error) {
      log('❌', `File verification failed: ${error.message}`, '\x1b[31m');
    }
    
    // REPLAdapter のreadFileでも確認
    try {
      const flashedContent = await adapter.readFile('/flash/main.py');
      const flashedStr = flashedContent.toString('utf8').trim();
      const originalStr = sampleCode.trim();
      
      if (flashedStr === originalStr) {
        log('✅', 'Flash verification successful - content matches perfectly!');
      } else if (flashedStr.length > 0 && flashedStr.includes(originalStr.substring(0, 100))) {
        log('✅', 'Flash verification successful - content partially matches');
      } else if (flashedStr.length === 0) {
        log('❌', 'Flash verification failed - file is empty!', '\x1b[31m');
      } else {
        log('⚠️', 'Flash verification warning - content may differ', '\x1b[33m');
      }
      
      logInfo(`Original size: ${originalStr.length} chars`);
      logInfo(`Flashed size: ${flashedStr.length} chars`);
      
    } catch (error) {
      log('❌', `Read verification failed: ${error.message}`, '\x1b[31m');
    }
    
    // デバイス情報表示
    try {
      const deviceInfo = await adapter.getDeviceInfo();
      logInfo(`Device: ${deviceInfo.platform} ${deviceInfo.version}`);
    } catch (error) {
      // デバイス情報取得に失敗しても続行
    }
    
    // サンプル実行
    log('🚀', 'Starting sample application...');
    
    if (sampleType === 'simple') {
      logInfo('Running simple random color demo...');
      await adapter.executeCode(`
exec(open('/flash/main.py').read())
`);
    } else {
      logInfo('Running advanced UI demo...');
      await adapter.executeCode(`
exec(open('/flash/main.py').read())
`);
    }
    
    log('🎨', 'Sample is now running on your M5Stack!');
    console.log('\n📱 What you should see:');
    
    if (sampleType === 'simple') {
      console.log('  • Random background colors changing every second');
      console.log('  • "HELLO M5STACK" text with random colors');
      console.log('  • Incrementing counter');
    } else {
      console.log('  • Random background colors');
      console.log('  • Animated title with color cycling');
      console.log('  • Status indicators and counters');
      console.log('  • Progress bar animation');
      console.log('  • Button interaction (A/B/C)');
      console.log('  • Real-time clock');
    }
    
    console.log('\n🔄 To stop: Press Ctrl+C on the M5Stack console or reset the device');
    console.log('🔄 To restart: Power cycle the M5Stack (auto-runs from main.py)');
    
    // 接続終了
    await adapter.disconnect();
    log('📡', 'Disconnected');
    
  } catch (error) {
    logError(`Error: ${error.message}`);
    process.exit(1);
  }
}

// ヘルプ表示
function showHelp() {
  console.log(`
🔥 M5Stack Flash Sample Tool

Usage:
  node tools/flash-sample.js [type]

Sample Types:
  simple     - Simple random color demo (default)
  advanced   - Advanced UI with animations and interactions

Examples:
  node tools/flash-sample.js simple
  node tools/flash-sample.js advanced

The sample code will be flashed to main.py and run automatically.
`);
}

// コマンドライン引数処理
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

main();