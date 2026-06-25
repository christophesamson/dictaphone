'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded-2xl w-80 flex flex-col gap-4">
        <h1 className="text-white text-xl font-semibold text-center">Dictaphone</h1>
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false) }}
          className="bg-gray-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm text-center">Mot de passe incorrect</p>}
        <button
          type="submit"
          className="bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 font-medium transition-colors"
        >
          Entrer
        </button>
      </form>
    </div>
  )
}
