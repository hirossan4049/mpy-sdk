import { VscFiles, VscSearch, VscSourceControl, VscExtensions } from 'react-icons/vsc'
import type { ViewType } from '../App'
import './ActivityBar.css'

interface ActivityBarProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

const ActivityBar = ({ activeView, onViewChange }: ActivityBarProps) => {
  const activities = [
    { id: 'explorer' as ViewType, icon: VscFiles, title: 'Explorer' },
    { id: 'search' as ViewType, icon: VscSearch, title: 'Search' },
    { id: 'git' as ViewType, icon: VscSourceControl, title: 'Source Control' },
    { id: 'extensions' as ViewType, icon: VscExtensions, title: 'Extensions' },
  ]

  return (
    <div className="activity-bar">
      {activities.map(({ id, icon: Icon, title }) => (
        <button
          key={id}
          className={`activity-item ${activeView === id ? 'active' : ''}`}
          onClick={() => onViewChange(id)}
          title={title}
        >
          <Icon size={24} />
        </button>
      ))}
    </div>
  )
}

export default ActivityBar