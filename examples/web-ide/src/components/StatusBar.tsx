import { VscRemote, VscSync, VscError, VscCheck } from 'react-icons/vsc'
import { useM5Stack } from '../hooks/useM5Stack'
import './StatusBar.css'

const StatusBar = () => {
  const { isConnected, connect, disconnect } = useM5Stack()

  const handleConnectionClick = () => {
    if (isConnected) {
      disconnect()
    } else {
      connect().catch(console.error)
    }
  }

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <button 
          className={`status-item clickable ${isConnected ? 'connected' : 'disconnected'}`}
          onClick={handleConnectionClick}
        >
          <VscRemote size={14} />
          <span>{isConnected ? 'M5Stack Connected' : 'M5Stack Disconnected'}</span>
        </button>
      </div>
      
      <div className="status-bar-right">
        <div className="status-item">
          <span>Python</span>
        </div>
        <div className="status-item">
          <span>UTF-8</span>
        </div>
        <div className="status-item">
          <span>LF</span>
        </div>
      </div>
    </div>
  )
}

export default StatusBar