import { Volume2, VolumeX, Pause, Play } from 'lucide-react'
import { useApp } from '../context/AppContext'

const TTSControls = () => {
  const { ttsEnabled, isSpeaking, toggleTTS, stopSpeaking, pauseSpeaking, resumeSpeaking } = useApp()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mt-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        Control de Voz 🔊
      </h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Lectura de voz
          </span>
          <button
            onClick={toggleTTS}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              ttsEnabled
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300'
            }`}
          >
            {ttsEnabled ? (
              <>
                <Volume2 className="w-4 h-4" />
                <span className="text-sm">Activado</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                <span className="text-sm">Desactivado</span>
              </>
            )}
          </button>
        </div>

        {isSpeaking && ttsEnabled && (
          <div className="flex items-center space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={stopSpeaking}
              className="flex-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
              title="Detener"
            >
              Detener
            </button>
          </div>
        )}

        {isSpeaking && (
          <div className="flex items-center space-x-2 text-xs text-green-600 dark:text-green-400">
            <div className="flex space-x-1">
              <div className="w-1 h-3 bg-green-500 rounded-full animate-wave"></div>
              <div className="w-1 h-3 bg-green-500 rounded-full animate-wave-delay-1"></div>
              <div className="w-1 h-3 bg-green-500 rounded-full animate-wave-delay-2"></div>
            </div>
            <span>Reproduciendo...</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 <strong>Tip:</strong> La voz cambia automáticamente según el tiempo de conversación:
        </p>
        <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <li>• 0-10 min: Voz infantil (Facundo, 6-8 años)</li>
          <li>• 10-20 min: Voz pre-adolescente (Rodrigo, 9-12 años)</li>
          <li>• 20-35 min: Voz adolescente (Javier, 13-15 años)</li>
          <li>• 35-50 min: Voz joven (Marcelo, 16-18 años)</li>
          <li>• 50+ min: Voz adulta (Ricardo)</li>
        </ul>
      </div>
    </div>
  )
}

export default TTSControls
