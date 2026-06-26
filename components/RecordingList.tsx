'use client'

import { useState } from 'react'
import type { Recording } from '@/lib/storage'

function formatDuration(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

interface Props {
  recordings: Recording[]
  activeId: string | null
  onPlay: (r: Recording) => void
  onDelete: (id: string, url: string) => void
  onRename: (id: string, name: string) => void
}

export default function RecordingList({ recordings, activeId, onPlay, onDelete, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function startEdit(r: Recording) {
    setEditingId(r.id)
    setEditName(r.name)
  }

  async function commitEdit(id: string) {
    if (editName.trim()) await onRename(id, editName.trim())
    setEditingId(null)
  }

  if (recordings.length === 0) {
    return <p className="text-gray-600 text-center py-8">Aucun enregistrement</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
        Enregistrements ({recordings.length})
      </h2>
      {recordings.map(r => (
        <div
          key={r.id}
          className={`rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${
            activeId === r.id ? 'bg-gray-800 ring-1 ring-red-500' : 'bg-gray-900 hover:bg-gray-800'
          }`}
        >
          {/* Play button */}
          <button
            onClick={() => onPlay(r)}
            className="w-9 h-9 rounded-full bg-gray-700 hover:bg-red-600 flex items-center justify-center flex-shrink-0 transition-colors"
          >
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editingId === r.id ? (
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => commitEdit(r.id)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(r.id); if (e.key === 'Escape') setEditingId(null) }}
                className="bg-gray-700 text-white rounded px-2 py-0.5 text-sm w-full outline-none"
              />
            ) : (
              <p
                className="text-sm font-medium text-white truncate cursor-pointer hover:text-red-400"
                onClick={() => startEdit(r)}
                title="Cliquer pour renommer"
              >
                {r.name}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDate(r.createdAt)} · {formatDuration(r.duration)} · {formatSize(r.size)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`/api/stream?url=${encodeURIComponent(r.url)}`}
              download={`${r.name}.webm`}
              className="text-gray-500 hover:text-white transition-colors"
              title="Télécharger"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>

            {confirmDelete === r.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { onDelete(r.id, r.url); setConfirmDelete(null) }}
                  className="text-xs text-red-400 hover:text-red-300 font-medium"
                >
                  Supprimer
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(r.id)}
                className="text-gray-600 hover:text-red-500 transition-colors"
                title="Supprimer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
