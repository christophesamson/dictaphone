'use client'

import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream | null
  active: boolean
}

export default function Waveform({ stream, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!stream || !active) {
      cancelAnimationFrame(rafRef.current)
      // draw flat line when idle/paused
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.beginPath()
        ctx.strokeStyle = '#374151'
        ctx.lineWidth = 2
        ctx.moveTo(0, canvas.height / 2)
        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.stroke()
      }
      return
    }

    const audioCtx = new AudioContext()
    ctxRef.current = audioCtx
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 1024
    analyserRef.current = analyser

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      const W = canvas.width
      const H = canvas.height

      analyser.getByteTimeDomainData(dataArray)

      ctx.clearRect(0, 0, W, H)
      ctx.beginPath()
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'

      const sliceWidth = W / bufferLength
      let x = 0
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0
        const y = (v * H) / 2
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.lineTo(W, H / 2)
      ctx.stroke()
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      audioCtx.close()
    }
  }, [stream, active])

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={80}
      className="w-full max-w-sm rounded-lg bg-gray-900"
    />
  )
}
