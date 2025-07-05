import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { M5StackProvider } from './hooks/useM5Stack'
import ActivityBar from './components/ActivityBar'
import Sidebar from './components/Sidebar'
import EditorPanel from './components/EditorPanel'
import Terminal from './components/Terminal'
import StatusBar from './components/StatusBar'
import './styles/App.css'

export type ViewType = 'explorer' | 'search' | 'git' | 'extensions'

function App() {
  const [activeView, setActiveView] = useState<ViewType>('explorer')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [terminalCollapsed, setTerminalCollapsed] = useState(false)
  const [openFiles, setOpenFiles] = useState<Array<{ path: string; content: string }>>([])

  const handleFileSelect = (path: string, content: string) => {
    // Check if file is already open
    const existingIndex = openFiles.findIndex(f => f.path === path)
    if (existingIndex === -1) {
      setOpenFiles([...openFiles, { path, content }])
    } else {
      // Update content if file already open
      const updated = [...openFiles]
      updated[existingIndex] = { path, content }
      setOpenFiles(updated)
    }
  }

  return (
    <M5StackProvider>
      <div className="app">
        <div className="app-body">
          <ActivityBar activeView={activeView} onViewChange={setActiveView} />
          
          <PanelGroup direction="horizontal" className="main-content">
            {!sidebarCollapsed && (
              <>
                <Panel defaultSize={20} minSize={15} maxSize={40}>
                  <Sidebar view={activeView} onFileSelect={handleFileSelect} />
                </Panel>
                <PanelResizeHandle className="resize-handle vertical" />
              </>
            )}
            
            <Panel defaultSize={80}>
              <PanelGroup direction="vertical">
                <Panel defaultSize={70}>
                  <EditorPanel openFiles={openFiles} />
                </Panel>
                
                {!terminalCollapsed && (
                  <>
                    <PanelResizeHandle className="resize-handle horizontal" />
                    <Panel defaultSize={30} minSize={10} maxSize={60}>
                      <Terminal />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </div>
        
        <StatusBar />
      </div>
    </M5StackProvider>
  )
}

export default App