/**
 * @h1mpy-sdk/core Type Definitions
 *
 * Comprehensive type definitions for M5Stack serial communication
 */
export interface PortInfo {
    path: string;
    manufacturer?: string;
    serialNumber?: string;
    vendorId?: string;
    productId?: string;
    pnpId?: string;
    locationId?: string;
}
export interface ClientOptions {
    timeout?: number;
    logLevel?: LogLevel;
    autoReconnect?: boolean;
    maxRetries?: number;
    baudRate?: number;
}
export interface ConnectionOptions {
    baudRate?: number;
    timeout?: number;
    autoReconnect?: boolean;
}
export interface DirectoryEntry {
    name: string;
    type: 'file' | 'directory';
    size?: number;
    lastModified?: Date;
    path: string;
}
export interface WriteOptions {
    overwrite?: boolean;
    createDirectories?: boolean;
    encoding?: 'utf8' | 'binary';
    onProgress?: (bytesWritten: number, totalBytes: number) => void;
}
export interface ExecutionResult {
    output: string;
    error?: string;
    exitCode: number;
    executionTime: number;
    timestamp: Date;
}
export interface DeviceInfo {
    platform: string;
    version: string;
    chipId: string;
    flashSize: number;
    ramSize: number;
    macAddress: string;
}
export interface Command {
    code: CommandCode;
    data: Buffer | string;
    timeout?: number;
}
export interface CommandResponse {
    status: ResponseStatus;
    data: Buffer;
    timestamp: Date;
    duration: number;
}
export declare enum CommandCode {
    IS_ONLINE = 0,
    GET_INFO = 1,
    EXEC = 2,
    LIST_DIR = 3,
    DOWNLOAD = 4,
    GET_FILE = 5,
    DOWNLOAD_FILE = 6,
    REMOVE_FILE = 7,
    SET_WIFI = 8
}
export declare enum ResponseStatus {
    SUCCESS = 0,
    ERROR = 1,
    TIMEOUT = 2,
    BUSY = 3,
    NOT_FOUND = 4,
    PERMISSION_DENIED = 5
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface ConnectionEventMap {
    connect: () => void;
    disconnect: () => void;
    data: (data: Buffer) => void;
    error: (error: Error) => void;
    busy: (busy: boolean) => void;
    timeout: () => void;
}
export interface ProtocolFrame {
    header: Buffer;
    length: number;
    command: CommandCode;
    data: Buffer;
    crc: number;
    footer: Buffer;
}
export interface FileTransferProgress {
    filename: string;
    bytesTransferred: number;
    totalBytes: number;
    percentage: number;
    chunkIndex: number;
    totalChunks: number;
}
export interface BulkTransferOptions {
    chunkSize?: number;
    onProgress?: (progress: FileTransferProgress) => void;
    onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
    retryAttempts?: number;
}
export interface ImportStatement {
    type: 'import' | 'from_import';
    module: string;
    items?: string[];
    isRelative: boolean;
    line: number;
    raw: string;
}
export interface DependencyInfo {
    filename: string;
    dependencies: string[];
    dependents: string[];
    exists: boolean;
    lastModified?: Date;
    size?: number;
}
export interface DependencyGraph {
    [filename: string]: DependencyInfo;
}
export interface ProjectAnalysis {
    entryPoint: string;
    dependencies: DependencyGraph;
    missingFiles: string[];
    circularDependencies: string[][];
    totalFiles: number;
}
export declare class M5StackError extends Error {
    code: string;
    details?: unknown | undefined;
    constructor(message: string, code: string, details?: unknown | undefined);
}
export declare class CommunicationError extends M5StackError {
    constructor(message: string, details?: unknown);
}
export declare class TimeoutError extends M5StackError {
    constructor(message: string, details?: unknown);
}
export declare class DeviceBusyError extends M5StackError {
    constructor(message: string, details?: unknown);
}
export declare class FileNotFoundError extends M5StackError {
    constructor(filename: string, details?: unknown);
}
export interface ISerialConnection {
    connect(port: string, options?: ConnectionOptions): Promise<void>;
    disconnect(): Promise<void>;
    write(data: Buffer): Promise<void>;
    read(): Promise<Buffer>;
    isOpen(): boolean;
    on<K extends keyof ConnectionEventMap>(event: K, listener: ConnectionEventMap[K]): void;
    off<K extends keyof ConnectionEventMap>(event: K, listener: ConnectionEventMap[K]): void;
}
export interface ILogger {
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}
export interface IPlatformAdapter {
    listPorts(): Promise<PortInfo[]>;
    createConnection(port: string): ISerialConnection;
    isSupported(): boolean;
    getPlatformName(): string;
}
export interface SerialClientConfig {
    defaultTimeout: number;
    defaultBaudRate: number;
    maxChunkSize: number;
    protocolVersion: string;
    crcPolynomial: number;
    frameDelimiters: {
        header: number[];
        footer: number[];
    };
}
export declare const DEFAULT_CONFIG: SerialClientConfig;
//# sourceMappingURL=index.d.ts.map