/**
 * Node.js Serial Connection Implementation
 *
 * Uses the 'serialport' package for Node.js environments
 */

import { SerialPort } from 'serialport';
import {
  BaseSerialConnection,
  ConnectionOptions,
  CommunicationError,
} from '@h1mpy-sdk/core';

export class NodeSerialConnection extends BaseSerialConnection {
  private serialPort?: SerialPort;

  constructor(port: string, options: ConnectionOptions = {}) {
    super(port, options);
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.serialPort = new SerialPort({
          path: this.port,
          baudRate: this.options.baudRate,
          autoOpen: false,
          // M5Stack specific settings for proper communication
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          rtscts: false,
          xon: false,
          xoff: false,
          xany: false,
        });

        this.serialPort.on('open', () => {
          // Set DTR and RTS for M5Stack communication
          this.serialPort!.set({ dtr: false, rts: false }, (err) => {
            if (err) {
              console.warn('Warning: Could not set DTR/RTS:', err.message);
            }
          });
          this.onConnected();
          resolve();
        });

        this.serialPort.on('error', (error) => {
          this.onError(error);
          reject(new CommunicationError(`Failed to connect: ${error.message}`));
        });

        this.serialPort.on('close', () => {
          this.onDisconnected();
        });

        this.serialPort.on('data', (data: Buffer) => {
          this.onDataReceived(data);
        });

        this.serialPort.open();
      } catch (error) {
        reject(new CommunicationError(`Failed to initialize serial port: ${error}`));
      }
    });
  }

  async disconnect(): Promise<void> {
    if (!this.serialPort || !this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.serialPort!.close((error) => {
        if (error) {
          reject(new CommunicationError(`Failed to disconnect: ${error.message}`));
        } else {
          this.serialPort = undefined;
          resolve();
        }
      });
    });
  }

  protected async writeRaw(data: Buffer): Promise<void> {
    if (!this.serialPort || !this.isConnected) {
      throw new CommunicationError('Not connected');
    }

    return new Promise((resolve, reject) => {
      this.serialPort!.write(data, (error) => {
        if (error) {
          reject(new CommunicationError(`Write failed: ${error.message}`));
          return;
        }

        this.serialPort!.drain((drainError) => {
          if (drainError) {
            reject(new CommunicationError(`Drain failed: ${drainError.message}`));
          } else {
            resolve();
          }
        });
      });
    });
  }

  isOpen(): boolean {
    return this.serialPort?.isOpen ?? false;
  }

  /**
   * Reset M5Stack device using DTR/RTS signals
   */
  async resetDevice(): Promise<void> {
    if (!this.serialPort || !this.isConnected) {
      throw new CommunicationError('Not connected');
    }

    return new Promise((resolve, reject) => {
      // M5Stack reset sequence: DTR high, RTS low, then both low
      this.serialPort!.set({ dtr: true, rts: false }, (err1) => {
        if (err1) {
          reject(new CommunicationError(`Reset phase 1 failed: ${err1.message}`));
          return;
        }

        setTimeout(() => {
          this.serialPort!.set({ dtr: false, rts: false }, (err2) => {
            if (err2) {
              reject(new CommunicationError(`Reset phase 2 failed: ${err2.message}`));
              return;
            }

            // Wait for device to boot
            setTimeout(() => {
              resolve();
            }, 2000);
          });
        }, 100);
      });
    });
  }

  /**
   * Get available serial ports
   */
  static async listPorts(): Promise<unknown[]> {
    try {
      return await SerialPort.list();
    } catch (error) {
      throw new CommunicationError(`Failed to list ports: ${error}`);
    }
  }
}
