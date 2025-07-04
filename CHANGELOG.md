# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added
- Initial release of @hirossan4049/mpy-sdk
- Multi-platform support (Node.js, Browser, React Native)
- Serial communication with M5Stack devices
- File system operations (list, read, write, delete)
- Python code execution via REPL
- Device information retrieval
- WiFi configuration support
- Progress tracking for file transfers
- Python dependency analysis
- Interactive CLI tool
- Comprehensive examples and documentation

### Features
- Custom binary protocol with CRC16 validation
- Automatic retry mechanism for reliability
- Chunked file transfer (256-byte chunks)
- REPL adapter for MicroPython interaction
- TypeScript support with full type definitions
- Browser bundle via Webpack
- Peer dependency on serialport for Node.js

### Security
- Input validation on all public APIs
- Safe buffer handling
- Timeout protection on serial operations