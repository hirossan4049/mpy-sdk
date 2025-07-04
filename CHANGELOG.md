# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2024-07-04

### Added
- Basic connection test for debugging device communication issues
- Cross-platform examples with real hardware verification
- Improved error handling and timeout management
- Web Serial API implementation with enhanced REPL parsing

### Changed
- Fixed Web Serial REPL output parsing to extract actual values instead of raw Python code
- Improved file listing to show correct file sizes instead of 0 bytes
- Enhanced device info parsing for better data extraction
- Converted Node.js examples from ES modules to CommonJS for compatibility
- Updated documentation to reflect current working state and hardware testing

### Fixed
- REPL command result parsing for clean output extraction
- Web Serial file size display showing 0 bytes for all files
- Device information showing raw Python code instead of parsed values
- Build artifacts contamination in source directories
- Module import/export compatibility issues in Node.js examples

### Removed
- Build artifacts from source directories (index.js, index.d.ts, .map files)
- ES module configuration from Node.js examples package.json

### Hardware Testing
- ✅ **Verified working** with M5Stack device on `/dev/tty.usbserial-55520ADC16`
- ✅ REPL communication (36ms average response time)
- ✅ LCD control and display updates confirmed
- ✅ File operations (read/write/delete) functional
- ✅ Button status reading and system information retrieval
- ✅ Python code execution and directory listing operational

### Known Issues
- Protocol mode may timeout with newer M5Stack firmware (recommend using REPL mode)
- Device may become unresponsive requiring physical reset
- Web Serial API requires Chrome 89+ or Edge 89+ browsers
- Some Node.js examples may timeout if device is in unresponsive state

---

## [1.0.0] - 2024-01-01

### Added
- Initial release of packages under the `@h1mpy-sdk` scope
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