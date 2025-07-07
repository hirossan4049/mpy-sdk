import { useState, useRef, useEffect } from 'react'
import { VscTerminal, VscClearAll, VscDebugRestart } from 'react-icons/vsc'
import { useM5Stack } from '../hooks/useM5Stack'
import './Terminal.css'

const Terminal = () => {
  const { isConnected, replCommand, writeFile, resetREPL, terminalOutput, addTerminalOutput, clearTerminalOutput } = useM5Stack()
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  // Use shared terminal output from context
  const addOutput = addTerminalOutput

  const handleCommand = async (command: string) => {
    if (!command.trim()) return
    
    addOutput(command, 'input')
    setHistory([...history, command])
    setHistoryIndex(-1)
    
    if (!isConnected) {
      addOutput('Error: Not connected to device', 'error')
      return
    }

    // Special commands for file operations
    if (command.startsWith('write ')) {
      const match = command.match(/write\s+["']([^"']+)["']\s+["']([^"']+)["']/)
      if (match) {
        const [, filename, content] = match
        try {
          await writeFile(filename, content)
          addOutput(`File written: ${filename}`)
          return
        } catch (error: any) {
          addOutput(`Error writing file: ${error.message}`, 'error')
          return
        }
      }
    }

    try {
      const result = await replCommand(command)
      if (result) {
        addOutput(result)
      }
    } catch (error: any) {
      addOutput(`Error: ${error.message || error}`, 'error')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0 && historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  const clearTerminal = () => {
    clearTerminalOutput()
  }

  const createTestFile = async () => {
    if (!isConnected) {
      addOutput('Error: Not connected to device', 'error')
      return
    }
    
    try {
      await writeFile('/flash/hello.py', 'print("Hello from M5Stack!")')
      addOutput('Created test file: /flash/hello.py')
    } catch (error: any) {
      addOutput(`Error creating test file: ${error.message}`, 'error')
    }
  }

  const handleResetREPL = async () => {
    if (!isConnected) {
      addOutput('Error: Not connected to device', 'error')
      return
    }
    
    try {
      addOutput('Resetting REPL...')
      await resetREPL()
      addOutput('REPL reset complete')
    } catch (error: any) {
      addOutput(`Error resetting REPL: ${error.message}`, 'error')
    }
  }

  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="terminal-title">
          <VscTerminal size={14} />
          <span>Terminal</span>
        </div>
        <div className="terminal-actions">
          <button 
            className="terminal-action" 
            onClick={createTestFile} 
            title="Create Test File"
            disabled={!isConnected}
          >
            📄
          </button>
          <button 
            className="terminal-action" 
            onClick={handleResetREPL} 
            title="Reset REPL"
            disabled={!isConnected}
          >
            <VscDebugRestart size={14} />
          </button>
          <button className="terminal-action" onClick={clearTerminal} title="Clear Terminal">
            <VscClearAll size={14} />
          </button>
        </div>
      </div>
      
      <div className="terminal-content" ref={terminalRef} onClick={() => inputRef.current?.focus()}>
        {terminalOutput.map((line, index) => (
          <div key={index} className={`terminal-line ${line.startsWith('Error:') ? 'error' : ''}`}>
            {line}
          </div>
        ))}
        
        <div className="terminal-input-line">
          <span className="terminal-prompt">{'>>> '}</span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}

export default Terminal