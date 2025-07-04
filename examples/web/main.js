import { M5StackClient } from '@hirossan4049/mpy-sdk/browser';

// UI Elements
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const deviceInfoBtn = document.getElementById('deviceInfoBtn');
const listFilesBtn = document.getElementById('listFilesBtn');
const flashSampleBtn = document.getElementById('flashSampleBtn');
const executeBtn = document.getElementById('executeBtn');
const clearCodeBtn = document.getElementById('clearCodeBtn');
const saveFileBtn = document.getElementById('saveFileBtn');
const refreshFilesBtn = document.getElementById('refreshFilesBtn');
const clearOutputBtn = document.getElementById('clearOutputBtn');

const statusDiv = document.getElementById('status');
const outputDiv = document.getElementById('output');
const codeEditor = document.getElementById('codeEditor');
const fileList = document.getElementById('fileList');
const deviceInfo = document.getElementById('deviceInfo');

// State
let client = null;
let connection = null;
let selectedPort = null;

// Initialize client
client = new M5StackClient({
    logLevel: 'info',
    timeout: 10000
});

// Utility functions
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    outputDiv.textContent += `[${timestamp}] ${prefix} ${message}\n`;
    outputDiv.scrollTop = outputDiv.scrollHeight;
}

function updateStatus(connected, deviceName = '') {
    if (connected) {
        statusDiv.className = 'status connected';
        statusDiv.textContent = `Connected ${deviceName ? `to ${deviceName}` : ''}`;
    } else {
        statusDiv.className = 'status disconnected';
        statusDiv.textContent = 'Not Connected';
    }
}

function updateButtons(connected) {
    connectBtn.disabled = connected;
    disconnectBtn.disabled = !connected;
    deviceInfoBtn.disabled = !connected;
    listFilesBtn.disabled = !connected;
    flashSampleBtn.disabled = !connected;
    executeBtn.disabled = !connected;
    saveFileBtn.disabled = !connected;
    refreshFilesBtn.disabled = !connected;
}

function updateFileList(files) {
    if (!files || files.length === 0) {
        fileList.innerHTML = '<div style="text-align: center; color: #ccc; padding: 20px;">No files found</div>';
        return;
    }
    
    fileList.innerHTML = files.map(file => `
        <div class="file-item">
            <span>${file.name} (${file.size} bytes)</span>
            <div>
                <button onclick="downloadFile('${file.name}')" class="action-btn">Download</button>
                <button onclick="deleteFile('${file.name}')" class="disconnect-btn">Delete</button>
            </div>
        </div>
    `).join('');
}

function updateDeviceInfo(info) {
    if (!info) return;
    
    document.getElementById('platform').textContent = info.platform || '-';
    document.getElementById('version').textContent = info.version || '-';
    document.getElementById('implementation').textContent = info.implementation || '-';
    document.getElementById('machine').textContent = info.machine || '-';
    
    deviceInfo.style.display = 'block';
}

// Connection functions
async function connectToDevice() {
    try {
        log('Requesting device access...');
        
        // Check if Web Serial is supported
        if (!('serial' in navigator)) {
            throw new Error('Web Serial API not supported in this browser');
        }
        
        // Request port access
        const ports = await navigator.serial.requestPort();
        selectedPort = ports;
        
        log('Connecting to device...');
        connection = await client.connect(selectedPort);
        
        log('Connected successfully!', 'success');
        updateStatus(true, 'M5Stack Device');
        updateButtons(true);
        
        // Get device info automatically
        await getDeviceInfo();
        
    } catch (error) {
        log(`Connection failed: ${error.message}`, 'error');
        console.error('Connection error:', error);
    }
}

async function disconnectFromDevice() {
    try {
        if (connection && selectedPort) {
            log('Disconnecting from device...');
            await client.disconnect(selectedPort);
            connection = null;
            selectedPort = null;
            
            log('Disconnected successfully', 'success');
            updateStatus(false);
            updateButtons(false);
            deviceInfo.style.display = 'none';
            fileList.innerHTML = '<div style="text-align: center; color: #ccc; padding: 20px;">Connect to device to view files</div>';
        }
    } catch (error) {
        log(`Disconnect failed: ${error.message}`, 'error');
        console.error('Disconnect error:', error);
    }
}

async function getDeviceInfo() {
    try {
        if (!connection) return;
        
        log('Getting device information...');
        const info = await connection.getInfo();
        
        updateDeviceInfo(info);
        log('Device info retrieved successfully', 'success');
        
    } catch (error) {
        log(`Failed to get device info: ${error.message}`, 'error');
        console.error('Device info error:', error);
    }
}

async function listFiles() {
    try {
        if (!connection) return;
        
        log('Listing files...');
        const files = await connection.listDirectory('/flash');
        
        updateFileList(files);
        log(`Found ${files.length} files`, 'success');
        
    } catch (error) {
        log(`Failed to list files: ${error.message}`, 'error');
        console.error('List files error:', error);
    }
}

async function executeCode() {
    try {
        if (!connection) return;
        
        const code = codeEditor.value.trim();
        if (!code) {
            log('No code to execute', 'warn');
            return;
        }
        
        log('Executing code...');
        const result = await connection.executeCode(code);
        
        if (result.output) {
            log('Code output:', 'success');
            log(result.output);
        }
        
        if (result.error) {
            log('Code error:', 'error');
            log(result.error);
        }
        
        log('Code execution completed', 'success');
        
    } catch (error) {
        log(`Code execution failed: ${error.message}`, 'error');
        console.error('Execute code error:', error);
    }
}

async function saveFile() {
    try {
        if (!connection) return;
        
        const code = codeEditor.value.trim();
        if (!code) {
            log('No code to save', 'warn');
            return;
        }
        
        log('Saving file as main.py...');
        await connection.writeFile('/flash/main.py', code);
        
        log('File saved successfully', 'success');
        
        // Refresh file list
        await listFiles();
        
    } catch (error) {
        log(`Failed to save file: ${error.message}`, 'error');
        console.error('Save file error:', error);
    }
}

async function flashSample() {
    try {
        if (!connection) return;
        
        log('Flashing sample code...');
        
        const sampleCode = `# M5Stack Web Serial Sample
from m5stack import *
from m5ui import *
import time
import urandom

# Initialize
lcd.clear()
setScreenColor(0x000000)

# Title
title = M5TextBox(10, 10, "WEB SERIAL DEMO", lcd.FONT_DejaVu24, 0xFFFFFF, rotate=0)
subtitle = M5TextBox(10, 40, "Running from Browser!", lcd.FONT_Default, 0x00FFFF, rotate=0)

# Animation loop
for i in range(50):
    # Random colors
    r = urandom.getrandbits(8)
    g = urandom.getrandbits(8) 
    b = urandom.getrandbits(8)
    color = (r << 16) | (g << 8) | b
    
    # Draw circles
    lcd.circle(160, 120, 20 + (i % 30), color)
    
    # Update counter
    counter = M5TextBox(10, 70, f"Count: {i+1}", lcd.FONT_DejaVu18, 0xFFFF00, rotate=0)
    
    # Button check
    if btnA.isPressed():
        subtitle.setText("Button A Pressed!")
        subtitle.setColor(0xFF0000)
    elif btnB.isPressed():
        subtitle.setText("Button B Pressed!")
        subtitle.setColor(0x00FF00)
    elif btnC.isPressed():
        subtitle.setText("Button C Pressed!")
        subtitle.setColor(0x0000FF)
    else:
        subtitle.setText("Running from Browser!")
        subtitle.setColor(0x00FFFF)
    
    time.sleep(0.2)

# Completion message
lcd.clear()
final_msg = M5TextBox(10, 60, "Sample Complete!", lcd.FONT_DejaVu24, 0x00FF00, rotate=0)
print("Web Serial sample completed!")
`;
        
        await connection.writeFile('/flash/main.py', sampleCode);
        log('Sample code saved to main.py', 'success');
        
        // Execute the sample
        log('Executing sample code...');
        await connection.executeCode(sampleCode);
        
        log('Sample code executed successfully', 'success');
        
        // Refresh file list
        await listFiles();
        
    } catch (error) {
        log(`Failed to flash sample: ${error.message}`, 'error');
        console.error('Flash sample error:', error);
    }
}

// Global functions for file operations
window.downloadFile = async function(filename) {
    try {
        if (!connection) return;
        
        log(`Downloading ${filename}...`);
        const content = await connection.readFile(`/flash/${filename}`);
        
        // Create download link
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        log(`Downloaded ${filename}`, 'success');
        
    } catch (error) {
        log(`Failed to download ${filename}: ${error.message}`, 'error');
    }
};

window.deleteFile = async function(filename) {
    try {
        if (!connection) return;
        
        if (!confirm(`Are you sure you want to delete ${filename}?`)) {
            return;
        }
        
        log(`Deleting ${filename}...`);
        await connection.removeFile(`/flash/${filename}`);
        
        log(`Deleted ${filename}`, 'success');
        
        // Refresh file list
        await listFiles();
        
    } catch (error) {
        log(`Failed to delete ${filename}: ${error.message}`, 'error');
    }
};

// Event listeners
connectBtn.addEventListener('click', connectToDevice);
disconnectBtn.addEventListener('click', disconnectFromDevice);
deviceInfoBtn.addEventListener('click', getDeviceInfo);
listFilesBtn.addEventListener('click', listFiles);
flashSampleBtn.addEventListener('click', flashSample);
executeBtn.addEventListener('click', executeCode);
saveFileBtn.addEventListener('click', saveFile);
refreshFilesBtn.addEventListener('click', listFiles);

clearCodeBtn.addEventListener('click', () => {
    codeEditor.value = '';
    log('Code editor cleared');
});

clearOutputBtn.addEventListener('click', () => {
    outputDiv.textContent = '';
    log('Console output cleared');
});

// Initialize
log('M5Stack Web Serial Example loaded');
log('Click "Connect to M5Stack" to get started');

// Handle page unload
window.addEventListener('beforeunload', async () => {
    if (connection) {
        await disconnectFromDevice();
    }
});