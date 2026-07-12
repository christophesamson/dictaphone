'use client'

import { useEffect, useRef, useState } from 'react'
import type { Recording } from '@/lib/storage'

function formatTime(s: number) {
  if (!isFinite(s) || isNaN(s)) return '00:00'
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export default function Player({ recording, onClose }: { recording: Recording; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(recording.duration || 0)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.src = `/api/stream?url=${encodeURIComponent(recording.url)}`
    audio.load()
    setPlaying(false)
    setCurrent(0)
    // Utilise la durée stockée en attendant que le navigateur la détecte
    setDuration(recording.duration || 0)

    // Workaround WebM : seek à la fin pour forcer le calcul de durée
    audio.addEventListener('loadedmetadata', () => {
      if (!isFinite(audio.duration)) {
        audio.currentTime = 1e10 // seek loin pour forcer le scan
      } else {
        setDuration(audio.duration)
      }
    }, { once: true })

    audio.addEventListener('durationchange', () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
        audio.currentTime = 0
      }
    }, { once: true })
  }, [recording.url, recording.duration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = speed
  }, [speed])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause() } else { audio.play() }
    setPlaying(!playing)
  }

  function seek(delta: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + delta))
  }

  function handleSeekBar(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const t = Number(e.target.value)
    audio.currentTime = t
    setCurrent(t)
  }

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(speed)
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length])
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
      <audio
        ref={audioRef}
        onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => { setPlaying(false); setCurrent(0) }}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-white font-medium truncate flex-1 mr-4">{recording.name}</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-10 text-right">{formatTime(current)}</span>
        <div className="flex-1 relative h-2 bg-gray-700 rounded-full cursor-pointer"
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            const ratio = (e.clientX - rect.left) / rect.width
            const t = ratio * duration
            if (audioRef.current) audioRef.current.currentTime = t
            setCurrent(t)
          }}
        >
          <div
            className="absolute left-0 top-0 h-full bg-red-500 rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => seek(-30)} className="flex flex-col items-center text-gray-400 hover:text-white transition-colors" title="-30s">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          <span className="text-xs">−30</span>
        </button>

        <button onClick={() => seek(-10)} className="flex flex-col items-center text-gray-400 hover:text-white transition-colors" title="-10s">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          <span className="text-xs">−10</span>
        </button>

        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
        >
          {playing ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button onClick={() => seek(10)} className="flex flex-col items-center text-gray-400 hover:text-white transition-colors" title="+10s">
          <svg className="w-5 h-5 fill-current" style={{transform:'scaleX(-1)'}} viewBox="0 0 24 24">
            <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          <span className="text-xs">+10</span>
        </button>

        <button onClick={() => seek(30)} className="flex flex-col items-center text-gray-400 hover:text-white transition-colors" title="+30s">
          <svg className="w-6 h-6 fill-current" style={{transform:'scaleX(-1)'}} viewBox="0 0 24 24">
            <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          <span className="text-xs">+30</span>
        </button>

        <button onClick={cycleSpeed} className="text-gray-400 hover:text-white text-sm font-medium w-10 text-center">
          {speed}×
        </button>
      </div>
    </div>
  )
}
