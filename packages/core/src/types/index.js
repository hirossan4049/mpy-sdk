"use strict";
/**
 * @h1mpy-sdk/core Type Definitions
 *
 * Comprehensive type definitions for M5Stack serial communication
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.FileNotFoundError = exports.DeviceBusyError = exports.TimeoutError = exports.CommunicationError = exports.M5StackError = exports.ResponseStatus = exports.CommandCode = void 0;
var CommandCode;
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
})(CommandCode || (exports.CommandCode = CommandCode = {}));
var ResponseStatus;
(function (ResponseStatus) {
    ResponseStatus[ResponseStatus["SUCCESS"] = 0] = "SUCCESS";
    ResponseStatus[ResponseStatus["ERROR"] = 1] = "ERROR";
    ResponseStatus[ResponseStatus["TIMEOUT"] = 2] = "TIMEOUT";
    ResponseStatus[ResponseStatus["BUSY"] = 3] = "BUSY";
    ResponseStatus[ResponseStatus["NOT_FOUND"] = 4] = "NOT_FOUND";
    ResponseStatus[ResponseStatus["PERMISSION_DENIED"] = 5] = "PERMISSION_DENIED";
})(ResponseStatus || (exports.ResponseStatus = ResponseStatus = {}));
// Error Types
var M5StackError = /** @class */ (function (_super) {
    __extends(M5StackError, _super);
    function M5StackError(message, code, details) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.details = details;
        _this.name = 'M5StackError';
        return _this;
    }
    return M5StackError;
}(Error));
exports.M5StackError = M5StackError;
var CommunicationError = /** @class */ (function (_super) {
    __extends(CommunicationError, _super);
    function CommunicationError(message, details) {
        var _this = _super.call(this, message, 'COMMUNICATION_ERROR', details) || this;
        _this.name = 'CommunicationError';
        return _this;
    }
    return CommunicationError;
}(M5StackError));
exports.CommunicationError = CommunicationError;
var TimeoutError = /** @class */ (function (_super) {
    __extends(TimeoutError, _super);
    function TimeoutError(message, details) {
        var _this = _super.call(this, message, 'TIMEOUT_ERROR', details) || this;
        _this.name = 'TimeoutError';
        return _this;
    }
    return TimeoutError;
}(M5StackError));
exports.TimeoutError = TimeoutError;
var DeviceBusyError = /** @class */ (function (_super) {
    __extends(DeviceBusyError, _super);
    function DeviceBusyError(message, details) {
        var _this = _super.call(this, message, 'DEVICE_BUSY_ERROR', details) || this;
        _this.name = 'DeviceBusyError';
        return _this;
    }
    return DeviceBusyError;
}(M5StackError));
exports.DeviceBusyError = DeviceBusyError;
var FileNotFoundError = /** @class */ (function (_super) {
    __extends(FileNotFoundError, _super);
    function FileNotFoundError(filename, details) {
        var _this = _super.call(this, "File not found: ".concat(filename), 'FILE_NOT_FOUND_ERROR', details) || this;
        _this.name = 'FileNotFoundError';
        return _this;
    }
    return FileNotFoundError;
}(M5StackError));
exports.FileNotFoundError = FileNotFoundError;
exports.DEFAULT_CONFIG = {
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
