export interface DeviceProfile {
  name: string;
  displayName: string;
  platformType: 'esp32' | 'rp2040' | 'unknown';
  
  // USB device identification
  vendorId?: number;
  productId?: number;
  
  // Serial communication settings
  baudRate: number;
  
  // File system configuration
  defaultBasePath: string;
  supportedPaths: string[];
  
  // Hardware capabilities
  hasLCD: boolean;
  hasButtons: boolean;
  hasIMU: boolean;
  hasRGB: boolean;
  hasSpeaker: boolean;
  hasWiFi: boolean;
  hasBluetooth: boolean;
  
  // Device-specific modules and imports
  availableModules: string[];
  
  // Device info retrieval code
  getDeviceInfoCode: string;
  
  // Welcome message and branding
  welcomeMessage: string;
  brandingColor: string;
}

export interface DeviceDetectionResult {
  profile: DeviceProfile;
  confidence: number; // 0-1, how confident we are in the detection
  detectionMethod: 'usb-id' | 'device-info' | 'manual' | 'fallback';
}

export const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  m5stack: {
    name: 'm5stack',
    displayName: 'M5Stack',
    platformType: 'esp32',
    vendorId: 0x1a86, // CH340 USB-to-Serial
    productId: 0x7523,
    baudRate: 115200,
    defaultBasePath: '/flash',
    supportedPaths: ['/flash', '/sd'],
    hasLCD: true,
    hasButtons: true,
    hasIMU: true,
    hasRGB: true,
    hasSpeaker: true,
    hasWiFi: true,
    hasBluetooth: true,
    availableModules: [
      'machine', 'time', 'os', 'sys', 'gc', 'network',
      'lcd', 'buttons', 'imu', 'rgb', 'speaker', 'timer',
      'esp', 'esp32', 'bluetooth', 'wifi'
    ],
    getDeviceInfoCode: `
import sys
import os
import gc
try:
    import network
    wlan = network.WLAN(network.STA_IF)
    mac = ':'.join(['{:02x}'.format(b) for b in wlan.config('mac')])
except:
    mac = 'unknown'

print('DEVICE_INFO_START')
print(f'platform={sys.platform}')
print(f'version={sys.version}')
print(f'implementation={sys.implementation.name}')
print(f'machine={os.uname().machine}')
print(f'mac={mac}')
print(f'free_memory={gc.mem_free()}')
print('DEVICE_INFO_END')
    `.trim(),
    welcomeMessage: 'Welcome to M5Stack Terminal',
    brandingColor: '#ff6b35'
  },
  
  raspberrypi_pico: {
    name: 'raspberrypi_pico',
    displayName: 'Raspberry Pi Pico',
    platformType: 'rp2040',
    vendorId: 0x2e8a, // Raspberry Pi Foundation
    productId: 0x0005, // Pico in MicroPython mode
    baudRate: 115200,
    defaultBasePath: '/',
    supportedPaths: ['/'],
    hasLCD: false,
    hasButtons: false,
    hasIMU: false,
    hasRGB: false,
    hasSpeaker: false,
    hasWiFi: false,
    hasBluetooth: false,
    availableModules: [
      'machine', 'time', 'os', 'sys', 'gc', 'utime',
      'rp2', 'pio', 'array', 'struct', 'select'
    ],
    getDeviceInfoCode: `
import sys
import os
import gc
import machine

print('DEVICE_INFO_START')
print(f'platform={sys.platform}')
print(f'version={sys.version}')
print(f'implementation={sys.implementation.name}')
print(f'machine={os.uname().machine}')
print(f'unique_id={machine.unique_id().hex()}')
print(f'freq={machine.freq()}')
print(f'free_memory={gc.mem_free()}')
print('DEVICE_INFO_END')
    `.trim(),
    welcomeMessage: 'Welcome to Raspberry Pi Pico Terminal',
    brandingColor: '#c51a4a'
  },
  
  raspberrypi_pico_w: {
    name: 'raspberrypi_pico_w',
    displayName: 'Raspberry Pi Pico W',
    platformType: 'rp2040',
    vendorId: 0x2e8a, // Raspberry Pi Foundation
    productId: 0x0005, // Pico W in MicroPython mode
    baudRate: 115200,
    defaultBasePath: '/',
    supportedPaths: ['/'],
    hasLCD: false,
    hasButtons: false,
    hasIMU: false,
    hasRGB: false,
    hasSpeaker: false,
    hasWiFi: true,
    hasBluetooth: true,
    availableModules: [
      'machine', 'time', 'os', 'sys', 'gc', 'utime',
      'rp2', 'pio', 'array', 'struct', 'select',
      'network', 'bluetooth', 'wifi'
    ],
    getDeviceInfoCode: `
import sys
import os
import gc
import machine
try:
    import network
    wlan = network.WLAN(network.STA_IF)
    mac = ':'.join(['{:02x}'.format(b) for b in wlan.config('mac')])
except:
    mac = 'unknown'

print('DEVICE_INFO_START')
print(f'platform={sys.platform}')
print(f'version={sys.version}')
print(f'implementation={sys.implementation.name}')
print(f'machine={os.uname().machine}')
print(f'unique_id={machine.unique_id().hex()}')
print(f'freq={machine.freq()}')
print(f'mac={mac}')
print(f'free_memory={gc.mem_free()}')
print('DEVICE_INFO_END')
    `.trim(),
    welcomeMessage: 'Welcome to Raspberry Pi Pico W Terminal',
    brandingColor: '#c51a4a'
  }
};

// Fallback profile for unknown devices
export const UNKNOWN_DEVICE_PROFILE: DeviceProfile = {
  name: 'unknown',
  displayName: 'MicroPython Device',
  platformType: 'unknown',
  baudRate: 115200,
  defaultBasePath: '/',
  supportedPaths: ['/'],
  hasLCD: false,
  hasButtons: false,
  hasIMU: false,
  hasRGB: false,
  hasSpeaker: false,
  hasWiFi: false,
  hasBluetooth: false,
  availableModules: ['machine', 'time', 'os', 'sys', 'gc'],
  getDeviceInfoCode: `
import sys
import os
import gc

print('DEVICE_INFO_START')
print(f'platform={sys.platform}')
print(f'version={sys.version}')
print(f'implementation={sys.implementation.name}')
print(f'machine={os.uname().machine}')
print(f'free_memory={gc.mem_free()}')
print('DEVICE_INFO_END')
  `.trim(),
  welcomeMessage: 'Welcome to MicroPython Terminal',
  brandingColor: '#4a90e2'
};