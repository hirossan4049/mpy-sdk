import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { VscClose, VscCircleFilled, VscRunAll } from 'react-icons/vsc'
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
  const { isConnected, executeCode, writeFile } = useM5Stack()
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
      
      // Execute the file
      const result = await executeCode(`exec(open('${activeTab.path}').read())`)
      console.log('Execution result:', result)
    } catch (error) {
      console.error('Failed to run file:', error)
    }
  }

  useEffect(() => {
    if (tabs.length === 0) {
      createTab('/untitled.py', '# Welcome to M5Stack Web IDE\n\nprint("Hello, M5Stack!")\n')
    }
  }, [])

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
            <p>No file open</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorPanel