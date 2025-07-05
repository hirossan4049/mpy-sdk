import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { M5StackClient, Connection, WebSerialConnection } from '@h1mpy-sdk/web'

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
      })
      
    } catch (error: any) {
      console.error('Failed to connect:', error)
      if (error.name === 'NotAllowedError') {
        alert('Permission denied. Please select a serial port when prompted.')
      } else if (error.message?.includes('No port selected')) {
        // User cancelled the port selection
        console.log('Port selection cancelled')
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
    return activeConnection.listDirectory(path)
  }, [activeConnection])

  const readFile = useCallback(async (path: string) => {
    if (!activeConnection) throw new Error('Not connected')
    try {
      // Try reading file using print() to avoid REPL representation issues
      console.log('Reading file:', path)
      
      // Use exec with print to get clean output
      const readResult = await activeConnection.executeCode(
        `exec("with open('${path}', 'r') as f: print(f.read(), end='')")`
      )
      
      if (readResult && readResult.output) {
        // The output should be the file content directly
        return readResult.output
      }
      
      // Fallback to original method if above fails
      const data = await activeConnection.readFile(path)
      
      // If it's Uint8Array or ArrayBuffer, decode it
      if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
        const decoder = new TextDecoder()
        return decoder.decode(data)
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