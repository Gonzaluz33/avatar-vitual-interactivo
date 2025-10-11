import { useState, useEffect } from 'react'
import { useApp } from './context/AppContext'
import Header from './components/Header'
import ChatInterface from './components/ChatInterface'
import VoiceRecorder from './components/VoiceRecorder'
import StatusBar from './components/StatusBar'

function App() {
  const { wsStatus, connect } = useApp()
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    // Conectar al WebSocket al iniciar
    connect()
  }, [connect])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Panel principal - Chat */}
          <div className="lg:col-span-2">
            <ChatInterface />
          </div>
          
          {/* Panel lateral - Controles de voz */}
          <div className="lg:col-span-1">
            <VoiceRecorder />
            <StatusBar />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
