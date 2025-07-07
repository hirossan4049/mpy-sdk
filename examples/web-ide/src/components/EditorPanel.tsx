import Editor from '@monaco-editor/react'
import { useEffect, useState } from 'react'
import { VscCircleFilled, VscClose, VscRunAll } from 'react-icons/vsc'
import { useM5Stack } from '../hooks/useM5Stack'
import './EditorPanel.css'

interface Tab {
  id: string
  title: string
  content: string
  path: string
  isDirty: boolean
}

interface EditorPanelProps {
  openFiles?: Array<{ path: string; content: string }>
}

const EditorPanel = ({ openFiles = [] }: EditorPanelProps) => {
  const { isConnected, executeCode, writeFile, connect, addTerminalOutput, resetREPL } = useM5Stack()
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  const createTab = (path: string, content: string) => {
    const filename = path.split('/').pop() || 'untitled'
    const newTab: Tab = {
      id: `tab-${Date.now()}`,
      title: filename,
      content,
      path,
      isDirty: false
    }

    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
    return newTab.id
  }

  const closeTab = (tabId: string) => {
    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)

    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id)
    }
  }

  const updateTabContent = (tabId: string, content: string) => {
    setTabs(tabs.map(tab =>
      tab.id === tabId
        ? { ...tab, content, isDirty: true }
        : tab
    ))
  }

  const handleEditorChange = (value: string | undefined) => {
    if (activeTabId && value !== undefined) {
      updateTabContent(activeTabId, value)
    }
  }

  const runCurrentFile = async () => {
    if (!activeTab || !isConnected) return

    try {
      // Reset REPL first to ensure clean state
      addTerminalOutput('Resetting REPL...', 'input')
      await resetREPL()

      // Save file first if it's dirty
      if (activeTab.isDirty) {
        await writeFile(activeTab.path, activeTab.content)
        // Mark as clean
        setTabs(tabs.map(tab =>
          tab.id === activeTab.id
            ? { ...tab, isDirty: false }
            : tab
        ))
      }

      // Execute the file - use soft reboot for main.py or exec for others
      let result

      addTerminalOutput(`Running ${activeTab.path}...`, 'input')

      if (activeTab.path === '/flash/main.py') {
        // For main.py, trigger soft reboot to run it properly
        result = await executeCode('\x04')  // Ctrl+D for soft reboot
        addTerminalOutput('Soft reboot triggered for main.py')

        // Display the raw execution output (convert only \r\n to \n)
        if (result) {
          const rawOutput = result.replace(/\r\n/g, '\n')

          if (rawOutput.trim()) {
            addTerminalOutput('--- Raw Output ---')
            addTerminalOutput(rawOutput)
            addTerminalOutput('--- End ---')
          }
        }
      } else {
        // For other files, use exec
        result = await executeCode(`exec(open('${activeTab.path}').read())`)
        addTerminalOutput(result || 'Script executed successfully')
      }
    } catch (error) {
      console.error('Failed to run file:', error)
      addTerminalOutput(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error')
    }
  }

  // Remove default untitled.py creation

  // Handle opening files from sidebar
  useEffect(() => {
    openFiles.forEach(file => {
      const existingTab = tabs.find(tab => tab.path === file.path)
      if (!existingTab) {
        createTab(file.path, file.content)
      }
    })
  }, [openFiles])

  return (
    <div className="editor-panel">
      <div className="editor-tabs">
        <div className="tabs-container">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`editor-tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="tab-title">
                {tab.title}
                {tab.isDirty && <VscCircleFilled size={8} className="dirty-indicator" />}
              </span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
              >
                <VscClose size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="editor-actions">
          <button
            className="editor-action-button"
            onClick={runCurrentFile}
            disabled={!isConnected || !activeTab}
            title="Run current file"
          >
            <VscRunAll size={16} />
          </button>
        </div>
      </div>

      <div className="editor-content">
        {activeTab ? (
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={activeTab.content}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
              automaticLayout: true,
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              wrappingIndent: 'indent'
            }}
          />
        ) : (
          <div className="editor-empty">
            <div className="empty-state">
              <h2>Welcome to M5Stack Web IDE</h2>
              <p>Connect your M5Stack device to get started</p>
              {!isConnected ? (
                <button
                  className="connect-button"
                  onClick={connect}
                  title="Connect to M5Stack device"
                >
                  🔌 Connect M5Stack
                </button>
              ) : (
                <div className="connected-message">
                  <p>✅ M5Stack connected!</p>
                  <p>Select a file from the explorer to start coding</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPanel