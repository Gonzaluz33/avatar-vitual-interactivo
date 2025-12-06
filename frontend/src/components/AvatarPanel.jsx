import React, { useMemo, useRef, useState, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, useGLTF, Html } from '@react-three/drei'
import { Play, Loader2 } from 'lucide-react'
import { avatarService } from '../services/avatarService'

const READY_PLAYER_ME_URL = 'https://models.readyplayer.me/69346d21347390125d33e7ae.glb'

function AvatarModel({ visemes, audioRef }) {
  const { scene } = useGLTF(READY_PLAYER_ME_URL)
  const skinnedMesh = useMemo(() => {
    let target = null
    scene.traverse((child) => {
      if (!target && child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        target = child
      }
    })
    return target
  }, [scene])

  const morphNames = useMemo(() => {
    if (!skinnedMesh?.morphTargetDictionary) return []
    return Object.keys(skinnedMesh.morphTargetDictionary)
  }, [skinnedMesh])

  const getActiveViseme = useCallback(
    (time) => {
      if (!visemes?.length) return null
      let active = visemes[0]
      for (const v of visemes) {
        if (v.t <= time) {
          active = v
        } else {
          break
        }
      }
      return active
    },
    [visemes]
  )

  useFrame(() => {
    if (!skinnedMesh || !audioRef.current || !visemes?.length) return
    const currentTime = audioRef.current.currentTime || 0
    const active = getActiveViseme(currentTime)
    if (!active) return

    const dict = skinnedMesh.morphTargetDictionary
    const influences = skinnedMesh.morphTargetInfluences

    morphNames.forEach((name) => {
      const idx = dict[name]
      if (typeof idx === 'number' && influences[idx] !== undefined) {
        influences[idx] = 0
      }
    })

    const idx = dict[active.blendshape]
    if (typeof idx === 'number' && influences[idx] !== undefined) {
      influences[idx] = Math.min(1, Math.max(0, active.weight))
    }
  })

  return <primitive object={scene} position={[0, -1.2, 0]} />
}

useGLTF.preload(READY_PLAYER_ME_URL)

const AvatarPanel = () => {
  const [text, setText] = useState('Hola, ¿cómo estás?')
  const [visemes, setVisemes] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [responseText, setResponseText] = useState('')
  const audioRef = useRef(null)

  const playAudioPayload = useCallback(
    (payload) => {
      if (!payload?.audio_url) return
      const audio = new Audio(`${avatarService.baseUrl}${payload.audio_url}`)
      audioRef.current = audio
      setStatus('playing')
      audio.onended = () => setStatus('idle')
      audio.onerror = () => setStatus('idle')
      audio.play().catch(() => setStatus('idle'))
    },
    []
  )

  const handleSpeak = async (event) => {
    event.preventDefault()
    if (!text.trim()) return
    setError('')
    setStatus('loading')

    try {
      const payload = await avatarService.speak(text.trim())
      setVisemes(payload.visemes || [])
      setResponseText(payload.text || '')
      playAudioPayload(payload)
    } catch (err) {
      console.error(err)
      setError('No pudimos generar el habla del avatar. Intenta nuevamente.')
      setStatus('idle')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Avatar Ready Player Me</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">GLB remoto con sincronía de visemas</p>
        </div>
        <div className={`text-sm ${status === 'playing' ? 'text-green-500' : 'text-gray-500'}`}>
          {status === 'playing' ? 'Reproduciendo' : status === 'loading' ? 'Generando...' : 'Listo'}
        </div>
      </div>

      <div className="h-80 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <Canvas camera={{ position: [0, 0.9, 2.4], fov: 35 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <Environment preset="city" />
          <SuspenseFallback visemes={visemes} audioRef={audioRef} />
          <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2} />
        </Canvas>
      </div>

      <form onSubmit={handleSpeak} className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="avatar-text">
          Texto a hablar
        </label>
        <textarea
          id="avatar-text"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe lo que debe decir el avatar"
        />
        <button
          type="submit"
          className="flex items-center justify-center w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generando respuesta...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 mr-2" /> Escuchar avatar
            </>
          )}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {responseText && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100">
            <p className="font-semibold mb-1">Última respuesta del asistente</p>
            <p className="whitespace-pre-wrap">{responseText}</p>
          </div>
        )}
      </form>
    </div>
  )
}

function SuspenseFallback({ visemes, audioRef }) {
  return (
    <Suspense
      fallback={
        <Html center>
          <div className="flex items-center space-x-2 text-gray-700 dark:text-gray-200">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Cargando avatar...</span>
          </div>
        </Html>
      }
    >
      <AvatarModel visemes={visemes} audioRef={audioRef} />
    </Suspense>
  )
}

export default AvatarPanel
