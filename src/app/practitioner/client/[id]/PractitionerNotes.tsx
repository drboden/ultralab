'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Note {
  id: string
  note: string
  created_at: string
}

interface Props {
  clientId: string
  practitionerId: string
}

export default function PractitionerNotes({ clientId, practitionerId }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('practitioner_notes')
      .select('id, note, created_at')
      .eq('client_id', clientId)
      .eq('practitioner_id', practitionerId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNotes(data ?? [])
        setFetching(false)
      })
  }, [clientId, practitionerId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('practitioner_notes')
      .insert({ client_id: clientId, practitioner_id: practitionerId, note: text.trim() })
      .select('id, note, created_at')
      .single()

    if (!error && data) {
      setNotes((prev) => [data, ...prev])
      setText('')
    }
    setLoading(false)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-zinc-300 mb-4">Practitioner notes</h2>

      <form onSubmit={handleSubmit} className="mb-5">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note about this client's progress, observations, or recommendations..."
          className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition resize-none mb-2"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-[#1D9E75] hover:bg-[#18896A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : 'Add note'}
        </button>
      </form>

      {fetching ? (
        <p className="text-xs text-zinc-500">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-zinc-600">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="border-l-2 border-zinc-700 pl-3">
              <p className="text-sm text-zinc-200 leading-relaxed">{n.note}</p>
              <p className="text-xs text-zinc-600 mt-1">
                {new Date(n.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
