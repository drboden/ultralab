'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Practitioner {
  id: string
  practitioner_id: string
  status: string
  profiles: { full_name: string | null; email?: string | null } | null
}

interface Props {
  userId: string
  initialList: Practitioner[]
}

export default function PractitionerAccess({ userId, initialList }: Props) {
  const [email, setEmail] = useState('')
  const [list, setList] = useState<Practitioner[]>(initialList)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    // Look up practitioner by email via a custom RPC or profiles lookup
    // We look up profiles where a matching email exists via auth — use a server action instead
    // Simplest approach: call our own API route
    const res = await fetch('/api/practitioner/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to grant access.')
    } else {
      setSuccess(`Access granted to ${email}.`)
      setEmail('')
      setList((prev) => [...prev, data.row])
    }

    setLoading(false)
  }

  async function handleRevoke(rowId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('practitioner_access')
      .update({ status: 'revoked' })
      .eq('id', rowId)
      .eq('client_id', userId)

    if (error) {
      setError(error.message)
    } else {
      setList((prev) => prev.map((r) => r.id === rowId ? { ...r, status: 'revoked' } : r))
    }
  }

  async function handleRestore(rowId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('practitioner_access')
      .update({ status: 'active' })
      .eq('id', rowId)
      .eq('client_id', userId)

    if (!error) {
      setList((prev) => prev.map((r) => r.id === rowId ? { ...r, status: 'active' } : r))
    }
  }

  return (
    <div className="mt-10 pt-8 border-t border-zinc-800">
      <h2 className="text-lg font-semibold text-white mb-1">My practitioners</h2>
      <p className="text-xs text-zinc-500 mb-5">Grant a practitioner access to view your data and results.</p>

      <form onSubmit={handleGrant} className="flex gap-2 mb-6">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="practitioner@example.com"
          className="flex-1 px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2.5 bg-[#1D9E75] hover:bg-[#18896A] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? '…' : 'Add'}
        </button>
      </form>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      {success && <p className="text-sm text-[#1D9E75] mb-3">{success}</p>}

      {list.length === 0 ? (
        <p className="text-xs text-zinc-600">No practitioners added yet.</p>
      ) : (
        <div className="space-y-2">
          {list.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800"
            >
              <div>
                <p className="text-sm text-zinc-200">{row.profiles?.full_name ?? 'Unknown'}</p>
                <p className="text-xs text-zinc-500">{row.profiles?.email ?? ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                    row.status === 'active'
                      ? 'bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/30'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}
                >
                  {row.status}
                </span>
                {row.status === 'active' ? (
                  <button
                    onClick={() => handleRevoke(row.id)}
                    className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    Revoke
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestore(row.id)}
                    className="text-xs text-zinc-500 hover:text-[#1D9E75] transition-colors"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
