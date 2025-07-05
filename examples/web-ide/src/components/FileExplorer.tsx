import { useState, useEffect } from 'react'
import { VscChevronDown, VscChevronRight, VscFile, VscFolder, VscFolderOpened, VscRefresh, VscNewFile, VscNewFolder } from 'react-icons/vsc'
import { useM5Stack } from '../hooks/useM5Stack'
import './FileExplorer.css'

interface FileNode {
  name: string
  type: 'file' | 'directory'
  path: string
  children?: FileNode[]
  expanded?: boolean
}

interface FileExplorerProps {
  onFileSelect?: (path: string, content: string) => void
}

const FileExplorer = ({ onFileSelect }: FileExplorerProps) => {
  const { isConnected, listDirectory, readFile } = useM5Stack()
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const loadFiles = async (path = '/flash') => {
    if (!isConnected) return
    
    setLoading(true)
    try {
      const files = await listDirectory(path)
      const nodes: FileNode[] = files.map(file => ({
        name: file.name,
        type: file.isDirectory ? 'directory' : 'file',
        path: `${path}${path.endsWith('/') ? '' : '/'}${file.name}`,
        children: file.isDirectory ? [] : undefined,
        expanded: false
      }))
      
      if (path === '/flash') {
        setFileTree(nodes)
      }
      
      return nodes
    } catch (error) {
      console.error('Failed to load files:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isConnected) {
      loadFiles()
    }
  }, [isConnected])

  const toggleFolder = async (node: FileNode) => {
    if (node.type !== 'directory') return
    
    const newExpanded = !node.expanded
    node.expanded = newExpanded
    
    if (newExpanded && node.children?.length === 0) {
      const children = await loadFiles(node.path)
      node.children = children
    }
    
    setFileTree([...fileTree])
  }

  const renderNode = (node: FileNode, depth = 0) => {
    const isFolder = node.type === 'directory'
    const Icon = isFolder 
      ? (node.expanded ? VscFolderOpened : VscFolder)
      : VscFile

    return (
      <div key={node.path}>
        <div
          className={`file-item ${selectedFile === node.path ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={async () => {
            if (isFolder) {
              toggleFolder(node)
            } else {
              setSelectedFile(node.path)
              // Load file content when selected
              if (onFileSelect) {
                try {
                  console.log('Reading file:', node.path)
                  const content = await readFile(node.path)
                  console.log('File content:', content)
                  onFileSelect(node.path, content)
                } catch (error) {
                  console.error('Failed to read file:', error)
                  alert(`Failed to read file: ${error}`)
                }
              }
            }
          }}
        >
          {isFolder && (
            <span className="folder-chevron">
              {node.expanded ? <VscChevronDown size={16} /> : <VscChevronRight size={16} />}
            </span>
          )}
          <Icon size={16} className="file-icon" />
          <span className="file-name">{node.name}</span>
        </div>
        {isFolder && node.expanded && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="file-explorer-empty">
        <p>Connect to M5Stack device to browse files</p>
      </div>
    )
  }

  return (
    <div className="file-explorer">
      <div className="file-explorer-toolbar">
        <button className="toolbar-button" title="New File">
          <VscNewFile size={16} />
        </button>
        <button className="toolbar-button" title="New Folder">
          <VscNewFolder size={16} />
        </button>
        <button className="toolbar-button" onClick={() => loadFiles()} title="Refresh">
          <VscRefresh size={16} />
        </button>
      </div>
      <div className="file-tree">
        {loading ? (
          <div className="loading">Loading files...</div>
        ) : (
          fileTree.map(node => renderNode(node))
        )}
      </div>
    </div>
  )
}

export default FileExplorer