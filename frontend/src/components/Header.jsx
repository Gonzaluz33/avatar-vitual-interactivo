import { Moon, Sun, Wifi, WifiOff } from 'lucide-react'
import { useApp } from '../context/AppContext'

const Header = ({ darkMode, setDarkMode }) => {
  const { wsStatus } = useApp()

  return (
    <header className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Avatar Virtual Interactivo
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Conversación por voz en tiempo real
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {wsStatus === 'connected' ? (
              <>
                <Wifi className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Conectado</span>
              </>
            ) : wsStatus === 'connecting' ? (
              <>
                <Wifi className="w-5 h-5 text-yellow-500 animate-pulse" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Conectando...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Desconectado</span>
              </>
            )}
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
