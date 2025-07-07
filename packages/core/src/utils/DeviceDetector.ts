import { DeviceProfile, DeviceDetectionResult, DEVICE_PROFILES, UNKNOWN_DEVICE_PROFILE } from '../types/DeviceProfile';

export class DeviceDetector {
  /**
   * Detect device type based on USB vendor/product ID
   */
  static detectByUSBId(vendorId: number, productId: number): DeviceDetectionResult | null {
    for (const profile of Object.values(DEVICE_PROFILES)) {
      if (profile.vendorId === vendorId && profile.productId === productId) {
        return {
          profile,
          confidence: 0.9,
          detectionMethod: 'usb-id'
        };
      }
    }
    return null;
  }

  /**
   * Detect device type based on device info response
   */
  static detectByDeviceInfo(deviceInfo: Record<string, string>): DeviceDetectionResult {
    const platform = deviceInfo.platform?.toLowerCase() || '';
    const machine = deviceInfo.machine?.toLowerCase() || '';
    const version = deviceInfo.version?.toLowerCase() || '';

    // Check for ESP32 (M5Stack)
    if (platform.includes('esp32') || machine.includes('esp32')) {
      return {
        profile: DEVICE_PROFILES.m5stack,
        confidence: 0.8,
        detectionMethod: 'device-info'
      };
    }

    // Check for RP2040 (Raspberry Pi Pico)
    if (platform.includes('rp2') || machine.includes('rp2040') || machine.includes('pico')) {
      // Check if it's Pico W (has WiFi capabilities)
      if (deviceInfo.mac && deviceInfo.mac !== 'unknown') {
        return {
          profile: DEVICE_PROFILES.raspberrypi_pico_w,
          confidence: 0.8,
          detectionMethod: 'device-info'
        };
      } else {
        return {
          profile: DEVICE_PROFILES.raspberrypi_pico,
          confidence: 0.8,
          detectionMethod: 'device-info'
        };
      }
    }

    // Fallback to unknown device
    return {
      profile: UNKNOWN_DEVICE_PROFILE,
      confidence: 0.3,
      detectionMethod: 'fallback'
    };
  }

  /**
   * Detect device type based on port path pattern
   */
  static detectByPortPath(portPath: string): DeviceDetectionResult | null {
    const path = portPath.toLowerCase();

    // Common patterns for different devices
    if (path.includes('usbserial') || path.includes('ch340') || path.includes('cp210')) {
      // Likely M5Stack or ESP32 device
      return {
        profile: DEVICE_PROFILES.m5stack,
        confidence: 0.4,
        detectionMethod: 'usb-id'
      };
    }

    if (path.includes('pico') || path.includes('rp2040')) {
      // Likely Raspberry Pi Pico
      return {
        profile: DEVICE_PROFILES.raspberrypi_pico,
        confidence: 0.4,
        detectionMethod: 'usb-id'
      };
    }

    return null;
  }

  /**
   * Get device profile by name
   */
  static getProfileByName(name: string): DeviceProfile | null {
    return DEVICE_PROFILES[name] || null;
  }

  /**
   * Get all available device profiles
   */
  static getAllProfiles(): DeviceProfile[] {
    return Object.values(DEVICE_PROFILES);
  }

  /**
   * Parse device info response to extract structured data
   */
  static parseDeviceInfo(response: string): Record<string, string> {
    const info: Record<string, string> = {};
    const lines = response.split('\n');
    let capturing = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === 'DEVICE_INFO_START') {
        capturing = true;
        continue;
      }
      
      if (trimmed === 'DEVICE_INFO_END') {
        capturing = false;
        break;
      }
      
      if (capturing && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        info[key.trim()] = value.trim();
      }
    }

    return info;
  }

  /**
   * Create a manual device selection result
   */
  static createManualSelection(profileName: string): DeviceDetectionResult {
    const profile = this.getProfileByName(profileName) || UNKNOWN_DEVICE_PROFILE;
    return {
      profile,
      confidence: 1.0,
      detectionMethod: 'manual'
    };
  }
}