import { useApp } from '../context/AppContext'
import { Clock, MessageCircle } from 'lucide-react'

const StatusBar = () => {
  const { systemInfo } = useApp()

  const formatElapsedTime = (minutes) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`
    } else {
      const hours = Math.floor(minutes / 60)
      const mins = Math.round(minutes % 60)
      return `${hours}h ${mins}m`
    }
  }

  return (
    <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Estado de la Sesión
      </h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-primary-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Turnos</span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {systemInfo.turn}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-primary-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Tiempo transcurrido</span>
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatElapsedTime(systemInfo.elapsed_min)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default StatusBar
