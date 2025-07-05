import FileExplorer from './FileExplorer'
import type { ViewType } from '../App'
import './Sidebar.css'

interface SidebarProps {
  view: ViewType
  onFileSelect?: (path: string, content: string) => void
}

const Sidebar = ({ view, onFileSelect }: SidebarProps) => {
  const renderView = () => {
    switch (view) {
      case 'explorer':
        return <FileExplorer onFileSelect={onFileSelect} />
      case 'search':
        return <div className="sidebar-placeholder">Search functionality coming soon</div>
      case 'git':
        return <div className="sidebar-placeholder">Git integration coming soon</div>
      case 'extensions':
        return <div className="sidebar-placeholder">Extensions coming soon</div>
      default:
        return null
    }
  }

  const getTitle = () => {
    switch (view) {
      case 'explorer':
        return 'EXPLORER'
      case 'search':
        return 'SEARCH'
      case 'git':
        return 'SOURCE CONTROL'
      case 'extensions':
        return 'EXTENSIONS'
      default:
        return ''
    }
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">{getTitle()}</span>
      </div>
      <div className="sidebar-content">
        {renderView()}
      </div>
    </div>
  )
}

export default Sidebar