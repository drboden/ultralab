'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  full_name: string | null
  date_of_birth: string | null
  sport: string | null
  phone: string | null
}

interface Props {
  userId: string
  existingProfile: Profile | null
  redirectTo: string
}

const SPORTS = [
  'Running',
  'Cycling',
  'Triathlon',
  'Swimming',
  'Team Sports',
  'General Fitness',
]

export default function ProfileForm({ userId, existingProfile, redirectTo }: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(existingProfile?.full_name ?? '')
  const [dob, setDob] = useState(existingProfile?.date_of_birth ?? '')
  const [sport, setSport] = useState(existingProfile?.sport ?? '')
  const [phone, setPhone] = useState(existingProfile?.phone ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName || null,
      date_of_birth: dob || null,
      sport: sport || null,
      phone: phone || null,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Full name
        </label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition"
        />
      </div>

      <div>
        <label htmlFor="dob" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Date of birth
        </label>
        <input
          id="dob"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition [color-scheme:dark]"
        />
      </div>

      <div>
        <label htmlFor="sport" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Primary sport
        </label>
        <select
          id="sport"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition"
        >
          <option value="">Select a sport</option>
          {SPORTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-zinc-300 mb-1.5">
          Phone number
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+61 400 000 000"
          className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3.5 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-[#1D9E75] hover:bg-[#18896A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors mt-2"
      >
        {loading ? 'Saving…' : 'Complete setup'}
      </button>
    </form>
  )
}
