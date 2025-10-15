import { Mic, Square } from 'lucide-react'
import { useApp } from '../context/AppContext'

const VoiceRecorder = () => {
  const { isRecording, isProcessing, startRecording, stopRecording, wsStatus } = useApp()

  const handleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const isDisabled = wsStatus !== 'connected' || isProcessing

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Control de Voz
      </h3>

      <div className="flex items-center justify-center h-32 mb-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-600 rounded-lg">
        {isRecording ? (
          <div className="flex items-center space-x-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-primary-500 rounded-full animate-wave-delay-${i}`}
                style={{
                  height: `${20 + Math.random() * 40}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center">
            <Mic className={`w-12 h-12 mx-auto ${isProcessing ? 'text-yellow-500 animate-pulse' : 'text-gray-400'}`} />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {isProcessing ? 'Procesando...' : 'Presiona para grabar'}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleRecording}
        disabled={isDisabled}
        className={`w-full py-4 rounded-lg font-semibold text-white transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
            : 'bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/50'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          {isRecording ? (
            <>
              <Square className="w-6 h-6" />
              <span>Detener Grabación</span>
            </>
          ) : (
            <>
              <Mic className="w-6 h-6" />
              <span>Iniciar Grabación</span>
            </>
          )}
        </div>
      </button>

      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          💡 <strong>Tip:</strong> Habla claramente y espera a que termine de procesar antes de enviar otro mensaje.
        </p>
        {wsStatus !== 'connected' && (
          <p className="text-xs text-red-500">
            ⚠️ Conectando al servidor... Por favor espera.
          </p>
        )}
      </div>
    </div>
  )
}

export default VoiceRecorder
