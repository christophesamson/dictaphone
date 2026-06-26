'use client'

import { useEffect, useRef, useState } from 'react'
import type { Recording } from '@/lib/storage'

function formatTime(s: number) {
  if (!isFinite(s)) return '00:00'
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export default function Player({ recording, onClose }: { recording: Recording; onClose: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = `/api/stream?url=${encodeURIComponent(recording.url)}`
    audio.load()
    setPlaying(false)
    setCurrent(0)
  }, [recording.url])

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
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta))
  }

  function handleSeekBar(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Number(e.target.value)
    setCurrent(Number(e.target.value))
  }

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(speed)
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length])
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-4 flex flex-col gap-3">
      <audio
        ref={audioRef}
        onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-white font-medium truncate flex-1 mr-4">{recording.name}</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 w-10 text-right">{formatTime(current)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={handleSeekBar}
          className="flex-1 accent-red-500 h-1"
        />
        <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => seek(-30)} className="text-gray-400 hover:text-white transition-colors" title="-30s">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          <span className="text-xs">−30</span>
        </button>

        <button onClick={() => seek(-10)} className="text-gray-400 hover:text-white transition-colors" title="-10s">
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

        <button onClick={() => seek(10)} className="text-gray-400 hover:text-white transition-colors" title="+10s">
          <svg className="w-5 h-5 fill-current" style={{transform:'scaleX(-1)'}} viewBox="0 0 24 24">
            <path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
          </svg>
          <span className="text-xs">+10</span>
        </button>

        <button onClick={() => seek(30)} className="text-gray-400 hover:text-white transition-colors" title="+30s">
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
