'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import RecordingList from './RecordingList'
import Player from './Player'
import type { Recording } from '@/lib/storage'

type RecorderState = 'idle' | 'recording' | 'paused'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Dictaphone() {
  const [state, setState] = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [activeRecording, setActiveRecording] = useState<Recording | null>(null)
  const [uploading, setUploading] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    fetchRecordings()
  }, [])

  async function fetchRecordings() {
    const res = await fetch('/api/recordings')
    const data = await res.json()
    setRecordings(data)
  }

  function startTimer() {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.start(100)
    setState('recording')
    setElapsed(0)
    startTimer()
  }

  function pauseRecording() {
    mediaRecorderRef.current?.pause()
    setState('paused')
    stopTimer()
  }

  function resumeRecording() {
    mediaRecorderRef.current?.resume()
    setState('recording')
    startTimer()
  }

  const stopAndSave = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return

    stopTimer()
    setUploading(true)

    await new Promise<void>(resolve => {
      recorder.onstop = () => resolve()
      recorder.stop()
    })

    streamRef.current?.getTracks().forEach(t => t.stop())
    setState('idle')

    const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
    const name = `Note ${new Date().toLocaleString('fr-FR')}`

    const form = new FormData()
    form.append('file', blob, 'recording.webm')
    form.append('duration', String(elapsed))
    form.append('name', name)

    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const json = await res.json()
    if (!res.ok) {
      alert(`Erreur upload : ${json.error}`)
    }
    setElapsed(0)
    setUploading(false)
    fetchRecordings()
  }, [elapsed])

  async function handleDelete(id: string, url: string) {
    await fetch('/api/recordings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, url }),
    })
    setRecordings(r => r.filter(rec => rec.id !== id))
    if (activeRecording?.id === id) setActiveRecording(null)
  }

  async function handleRename(id: string, name: string) {
    await fetch('/api/recordings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    })
    setRecordings(r => r.map(rec => rec.id === id ? { ...rec, name } : rec))
  }

  const isRecording = state === 'recording'
  const isPaused = state === 'paused'
  const isActive = isRecording || isPaused

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div>
          <h1 className="text-lg font-semibold tracking-wide">Dictaphone</h1>
          <p className="text-xs text-gray-600 font-mono">
            {new Date(process.env.NEXT_PUBLIC_BUILD_TIME!).toLocaleString('fr-FR')}
          </p>
        </div>
        <form action="/api/auth" method="POST">
          <button
            type="button"
            onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); location.href = '/login' }}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            Déconnexion
          </button>
        </form>
      </div>

      {/* Recorder */}
      <div className="flex flex-col items-center gap-8 py-12 px-6">
        {/* Timer */}
        <div className="text-6xl font-mono tabular-nums text-white">
          {formatTime(elapsed)}
        </div>

        {/* Waveform indicator */}
        <div className="flex items-center gap-1 h-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-150 ${
                isRecording
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-gray-700'
              }`}
              style={{
                height: isRecording ? `${Math.random() * 100}%` : '30%',
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          {!isActive ? (
            <button
              onClick={startRecording}
              disabled={uploading}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
              title="Enregistrer"
            >
              <div className="w-6 h-6 rounded-full bg-white" />
            </button>
          ) : (
            <>
              <button
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                title={isPaused ? 'Reprendre' : 'Pause'}
              >
                {isPaused ? (
                  <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>

              <button
                onClick={stopAndSave}
                disabled={uploading}
                className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
                title="Arrêter et sauvegarder"
              >
                <div className="w-6 h-6 bg-white rounded-sm" />
              </button>
            </>
          )}
        </div>

        {uploading && (
          <p className="text-gray-400 text-sm animate-pulse">Sauvegarde en cours…</p>
        )}
      </div>

      {/* Player */}
      {activeRecording && (
        <div className="px-6 pb-6">
          <Player recording={activeRecording} onClose={() => setActiveRecording(null)} />
        </div>
      )}

      {/* List */}
      <div className="flex-1 px-6 pb-8 overflow-y-auto">
        <RecordingList
          recordings={recordings}
          activeId={activeRecording?.id ?? null}
          onPlay={setActiveRecording}
          onDelete={handleDelete}
          onRename={handleRename}
        />
      </div>
    </div>
  )
}
