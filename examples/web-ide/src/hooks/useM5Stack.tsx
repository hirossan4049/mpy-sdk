import { Connection, M5StackClient, WebSerialConnection } from '@h1mpy-sdk/web'
import { createContext, ReactNode, useCallback, useContext, useState } from 'react'

interface M5FileInfo {
  name: string
  size: number
  isDirectory: boolean
  path: string
}

interface M5StackContextType {
  client: M5StackClient | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  listDirectory: (path: string) => Promise<M5FileInfo[]>
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  executeCode: (code: string) => Promise<string>
  replCommand: (command: string) => Promise<string>
  resetREPL: () => Promise<void>
  terminalOutput: string[]
  addTerminalOutput: (text: string, type?: 'input' | 'output' | 'error') => void
  clearTerminalOutput: () => void
  outputLogs: string[]
  addOutputLog: (text: string) => void
  clearOutputLogs: () => void
}

const M5StackContext = createContext<M5StackContextType | null>(null)

export const M5StackProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(() => new M5StackClient())
  const [isConnected, setIsConnected] = useState(false)
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null)
  const [activePort, setActivePort] = useState<any>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [terminalOutput, setTerminalOutput] = useState<string[]>(['Welcome to M5Stack Terminal'])
  const [outputLogs, setOutputLogs] = useState<string[]>(['Output log started...'])
  const MAX_OUTPUT_LOGS = 100 // Limit output logs to prevent performance issues

  // Track previous REPL buffer content to show only new additions
  const [previousREPLBuffer, setPreviousREPLBuffer] = useState<string>('')

  // Intercept console.log to capture M5Stack SDK output
  const originalConsoleLog = console.log
  console.log = (...args) => {
    // Call original console.log
    originalConsoleLog(...args)
    
    // Capture output for the Output tab
    const message = args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ')
    
    if (message.includes('REPL buffer:')) {
      // Extract the REPL buffer content
      const bufferMatch = message.match(/REPL buffer: (.+)$/)
      if (bufferMatch) {
        const currentBuffer = bufferMatch[1]
        
        // Get only the new part by removing the previous buffer content
        let newContent = currentBuffer
        if (previousREPLBuffer && currentBuffer.startsWith(previousREPLBuffer)) {
          newContent = currentBuffer.substring(previousREPLBuffer.length)
        } else if (previousREPLBuffer && currentBuffer.length > previousREPLBuffer.length) {
          // If current buffer doesn't start with previous, try to find the common part
          let commonLength = 0
          const minLength = Math.min(previousREPLBuffer.length, currentBuffer.length)
          for (let i = 0; i < minLength; i++) {
            if (previousREPLBuffer[i] === currentBuffer[i]) {
              commonLength = i + 1
            } else {
              break
            }
          }
          newContent = currentBuffer.substring(commonLength)
        }
        
        // Update previous buffer state
        setPreviousREPLBuffer(currentBuffer)
        
        // Add only the new content to output logs
        if (newContent.trim()) {
          const timestamp = new Date().toLocaleTimeString()
          
          // Convert \r\n and \n to actual line breaks and split into separate log entries
          const lines = newContent.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').split('\n')
          const newEntries: string[] = []
          lines.forEach(line => {
            if (line.trim()) {
              newEntries.push(`[${timestamp}] ${line.trim()}`)
            }
          })
          
          // Batch update to reduce re-renders and limit total logs
          if (newEntries.length > 0) {
            setOutputLogs(prev => {
              const updated = [...prev, ...newEntries]
              return updated.length > MAX_OUTPUT_LOGS ? updated.slice(-MAX_OUTPUT_LOGS) : updated
            })
          }
        }
      }
    } else if (message.includes('send:') || message.includes('M5Stack')) {
      const timestamp = new Date().toLocaleTimeString()
      setOutputLogs(prev => {
        const updated = [...prev, `[${timestamp}] ${message}`]
        return updated.length > MAX_OUTPUT_LOGS ? updated.slice(-MAX_OUTPUT_LOGS) : updated
      })
    }
  }

  const connect = useCallback(async () => {
    try {
      // Check if Web Serial API is supported
      if (!WebSerialConnection.isSupported()) {
        const msg = 'Web Serial API is not supported in this browser. Please use Chrome 89+ or Edge 89+'
        console.error(msg)
        alert(msg)
        throw new Error(msg)
      }

      // Request a serial port from the browser
      const port = await WebSerialConnection.requestPort()
      setActivePort(port)

      // Connect using the M5StackClient
      const connection = await client.connect(port)
      setActiveConnection(connection)
      setIsConnected(true)

      // Setup connection events
      connection.on('disconnect', () => {
        console.log('Device disconnected')
        setIsConnected(false)
        setActiveConnection(null)
        setActivePort(null)
      })

      connection.on('error', (error: Error) => {
        console.error('Connection error:', error)

        // Handle timeout errors with REPL reset
        if (error.message?.includes('timeout') || error.message?.includes('Command timeout')) {
          console.log('Timeout detected, attempting to reset REPL...')
          handleTimeoutWithReset()
        }
      })

    } catch (error: any) {
      console.error('Failed to connect:', error)
      if (error.name === 'NotAllowedError') {
        alert('Permission denied. Please select a serial port when prompted.')
      } else if (error.message?.includes('No port selected')) {
        // User cancelled the port selection
        console.log('Port selection cancelled')
      } else if (error.message?.includes('timeout') || error.message?.includes('Command timeout')) {
        // Handle timeout during initial connection
        console.log('Initial connection timeout, attempting to reset REPL...')
        handleTimeoutWithReset()
      } else {
        alert(`Connection failed: ${error.message || error}`)
      }
      throw error
    }
  }, [client])

  const disconnect = useCallback(async () => {
    if (activeConnection && activePort) {
      try {
        await client.disconnect(activePort)
      } catch (error) {
        console.error('Failed to disconnect:', error)
      }
      setActiveConnection(null)
      setActivePort(null)
      setIsConnected(false)
    }
  }, [activeConnection, activePort, client])

  const listDirectory = useCallback(async (path: string) => {
    if (!activeConnection) throw new Error('Not connected')

    try {
      // Wait a bit before listing directory to ensure connection is stable
      await resetREPL()
      await new Promise(resolve => setTimeout(resolve, 500)) // Reduced wait time
      
      const result = await activeConnection.listDirectory(path)
      addOutputLog(`Listed directory ${path}: ${result.length} items`)
      return result
    } catch (error) {
      console.error('Directory listing failed for', path, ':', error)
      addOutputLog(`Failed to list directory ${path}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }, [activeConnection])

  const readFile = useCallback(async (path: string) => {
    if (!activeConnection) throw new Error('Not connected')
    try {
      console.log('Reading file:', path)

      // Use a one-liner approach to avoid multi-line REPL mode
      const command = `open('${path}', 'r').read()`
      const result = await activeConnection.executeCode(command)

      if (result && result.output) {
        let content = result.output

        // Split into lines
        const lines = content.split('\n')

        // Remove the first line if it contains the command echo
        if (lines.length > 0 && lines[0].includes(command)) {
          lines.shift()
        }

        // Join remaining lines
        content = lines.join('\n').trim()

        // Remove surrounding quotes if present
        if ((content.startsWith("'") && content.endsWith("'")) ||
          (content.startsWith('"') && content.endsWith('"'))) {
          content = content.slice(1, -1)
        }

        // Process escape sequences properly for Python string literals
        // Convert \\n to actual newlines, but preserve \n in string literals
        try {
          // Use JSON.parse to properly handle escape sequences
          content = JSON.parse('"' + content.replace(/"/g, '\\"') + '"')
        } catch {
          // If JSON.parse fails, handle manually
          content = content.replace(/\\n/g, '\n')
                          .replace(/\\r/g, '\r')
                          .replace(/\\t/g, '\t')
                          .replace(/\\'/g, "'")
                          .replace(/\\"/g, '"')
                          .replace(/\\\\/g, '\\')
        }

        return content
      }

      // Fallback to hex-encoded method if simple read fails
      const data = await activeConnection.readFile(path)

      // If it's Uint8Array or ArrayBuffer, decode it
      if ((data as any) instanceof Uint8Array || (data as any) instanceof ArrayBuffer) {
        const decoder = new TextDecoder()
        return decoder.decode(data as any)
      }

      // Check if data is already a string
      if (typeof data === 'string') {
        return data
      }

      // Fallback - convert to string
      return String(data)

    } catch (error) {
      console.error('Failed to read file:', error)
      throw error
    }
  }, [activeConnection])

  const writeFile = useCallback(async (path: string, content: string) => {
    if (!activeConnection) throw new Error('Not connected')
    return activeConnection.writeFile(path, content)
  }, [activeConnection])

  const deleteFile = useCallback(async (path: string) => {
    if (!activeConnection) throw new Error('Not connected')
    return activeConnection.deleteFile(path)
  }, [activeConnection])

  const executeCode = useCallback(async (code: string) => {
    if (!activeConnection) throw new Error('Not connected')
    const result = await activeConnection.executeCode(code)
    return result.output || result.error || ''
  }, [activeConnection])

  const replCommand = useCallback(async (command: string) => {
    if (!activeConnection) throw new Error('Not connected')
    const result = await activeConnection.executeCode(command)
    return result.output || result.error || ''
  }, [activeConnection])

  const resetREPL = useCallback(async () => {
    if (!activeConnection) throw new Error('Not connected')
    try {
      // Send Ctrl+C three times to interrupt and get back to normal REPL
      const ctrlC = '\x03'
      await activeConnection.executeCode(ctrlC)
      await new Promise(resolve => setTimeout(resolve, 100))
      await activeConnection.executeCode(ctrlC)
      await new Promise(resolve => setTimeout(resolve, 100))
      await activeConnection.executeCode(ctrlC)
      await new Promise(resolve => setTimeout(resolve, 100))

      // Reset REPL buffer tracking when REPL is reset
      setPreviousREPLBuffer('')
      
      console.log('REPL reset')
    } catch (error) {
      console.error('Failed to reset REPL:', error)
      throw error
    }
  }, [activeConnection])

  const handleTimeoutWithReset = useCallback(async () => {
    if (reconnectAttempts >= 3) {
      console.error('Maximum REPL reset attempts reached')
      alert('REPL reset failed multiple times. Please reload the page and try again.')
      return
    }

    setReconnectAttempts(prev => prev + 1)
    console.log(`REPL reset attempt ${reconnectAttempts + 1}/3...`)

    try {
      if (activeConnection) {
        // Try to reset REPL first
        console.log('Resetting REPL...')
        await resetREPL()
        console.log('REPL reset successful!')
        setReconnectAttempts(0) // Reset counter on success
      } else {
        throw new Error('No active connection')
      }

    } catch (error: any) {
      console.error('REPL reset failed:', error)

      // Try again after a delay
      setTimeout(() => handleTimeoutWithReset(), 3000)
    }
  }, [reconnectAttempts, activeConnection, resetREPL])

  const addTerminalOutput = useCallback((text: string, type: 'input' | 'output' | 'error' = 'output') => {
    const prefix = type === 'input' ? '>>> ' : ''
    setTerminalOutput(prev => [...prev, `${prefix}${text}`])
  }, [])

  const clearTerminalOutput = useCallback(() => {
    setTerminalOutput(['Welcome to M5Stack Terminal'])
  }, [])

  const addOutputLog = useCallback((text: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setOutputLogs(prev => {
      const updated = [...prev, `[${timestamp}] ${text}`]
      return updated.length > MAX_OUTPUT_LOGS ? updated.slice(-MAX_OUTPUT_LOGS) : updated
    })
  }, [])

  const clearOutputLogs = useCallback(() => {
    setOutputLogs(['Output log started...'])
    setPreviousREPLBuffer('') // Reset REPL buffer tracking
  }, [])

  const value: M5StackContextType = {
    client,
    isConnected,
    connect,
    disconnect,
    listDirectory,
    readFile,
    writeFile,
    deleteFile,
    executeCode,
    replCommand,
    resetREPL,
    terminalOutput,
    addTerminalOutput,
    clearTerminalOutput,
    outputLogs,
    addOutputLog,
    clearOutputLogs,
  }

  return (
    <M5StackContext.Provider value={value}>
      {children}
    </M5StackContext.Provider>
  )
}

export const useM5Stack = () => {
  const context = useContext(M5StackContext)
  if (!context) {
    throw new Error('useM5Stack must be used within M5StackProvider')
  }
  return context
}