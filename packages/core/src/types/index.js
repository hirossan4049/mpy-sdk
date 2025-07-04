/**
 * @h1mpy-sdk/core Type Definitions
 *
 * Comprehensive type definitions for M5Stack serial communication
 */
export var CommandCode;
(function (CommandCode) {
    CommandCode[CommandCode["IS_ONLINE"] = 0] = "IS_ONLINE";
    CommandCode[CommandCode["GET_INFO"] = 1] = "GET_INFO";
    CommandCode[CommandCode["EXEC"] = 2] = "EXEC";
    CommandCode[CommandCode["LIST_DIR"] = 3] = "LIST_DIR";
    CommandCode[CommandCode["DOWNLOAD"] = 4] = "DOWNLOAD";
    CommandCode[CommandCode["GET_FILE"] = 5] = "GET_FILE";
    CommandCode[CommandCode["DOWNLOAD_FILE"] = 6] = "DOWNLOAD_FILE";
    CommandCode[CommandCode["REMOVE_FILE"] = 7] = "REMOVE_FILE";
    CommandCode[CommandCode["SET_WIFI"] = 8] = "SET_WIFI";
})(CommandCode || (CommandCode = {}));
export var ResponseStatus;
(function (ResponseStatus) {
    ResponseStatus[ResponseStatus["SUCCESS"] = 0] = "SUCCESS";
    ResponseStatus[ResponseStatus["ERROR"] = 1] = "ERROR";
    ResponseStatus[ResponseStatus["TIMEOUT"] = 2] = "TIMEOUT";
    ResponseStatus[ResponseStatus["BUSY"] = 3] = "BUSY";
    ResponseStatus[ResponseStatus["NOT_FOUND"] = 4] = "NOT_FOUND";
    ResponseStatus[ResponseStatus["PERMISSION_DENIED"] = 5] = "PERMISSION_DENIED";
})(ResponseStatus || (ResponseStatus = {}));
// Error Types
export class M5StackError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'M5StackError';
    }
}
export class CommunicationError extends M5StackError {
    constructor(message, details) {
        super(message, 'COMMUNICATION_ERROR', details);
        this.name = 'CommunicationError';
    }
}
export class TimeoutError extends M5StackError {
    constructor(message, details) {
        super(message, 'TIMEOUT_ERROR', details);
        this.name = 'TimeoutError';
    }
}
export class DeviceBusyError extends M5StackError {
    constructor(message, details) {
        super(message, 'DEVICE_BUSY_ERROR', details);
        this.name = 'DeviceBusyError';
    }
}
export class FileNotFoundError extends M5StackError {
    constructor(filename, details) {
        super(`File not found: ${filename}`, 'FILE_NOT_FOUND_ERROR', details);
        this.name = 'FileNotFoundError';
    }
}
export const DEFAULT_CONFIG = {
    defaultTimeout: 5000,
    defaultBaudRate: 115200,
    maxChunkSize: 256,
    protocolVersion: '1.0',
    crcPolynomial: 0x8005,
    frameDelimiters: {
        header: [0xaa, 0xab, 0xaa],
        footer: [0xab, 0xcc, 0xab],
    },
};
//# sourceMappingURL=index.js.map