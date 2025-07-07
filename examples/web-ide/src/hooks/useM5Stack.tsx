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
}

const M5StackContext = createContext<M5StackContextType | null>(null)

export const M5StackProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(() => new M5StackClient())
  const [isConnected, setIsConnected] = useState(false)
  const [activeConnection, setActiveConnection] = useState<Connection | null>(null)
  const [activePort, setActivePort] = useState<any>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

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

    // Wait a bit before listing directory to ensure connection is stable
    await resetREPL()
    await new Promise(resolve => setTimeout(resolve, 1000))

    return activeConnection.listDirectory(path)
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