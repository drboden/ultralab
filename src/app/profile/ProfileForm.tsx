'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  full_name: string | null
  date_of_birth: string | null
  sport: string | null
  phone: string | null
  avatar_url: string | null
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

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export default function ProfileForm({ userId, existingProfile, redirectTo }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fullName, setFullName] = useState(existingProfile?.full_name ?? '')
  const [dob, setDob] = useState(existingProfile?.date_of_birth ?? '')
  const [sport, setSport] = useState(existingProfile?.sport ?? '')
  const [phone, setPhone] = useState(existingProfile?.phone ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(existingProfile?.avatar_url ?? null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(existingProfile?.avatar_url ?? null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const initial = (fullName || 'U').charAt(0).toUpperCase()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE_BYTES) {
      setUploadError('File must be under 2 MB.')
      return
    }

    setUploadError(null)
    setUploading(true)

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setAvatarPreview(objectUrl)

    const supabase = createClient()
    const path = `${userId}/avatar.jpg`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadErr) {
      setUploadError(uploadErr.message)
      setAvatarPreview(avatarUrl) // revert preview
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

    // Bust cache with timestamp
    const bustedUrl = `${publicUrl}?t=${Date.now()}`

    // Persist immediately to profiles
    await supabase.from('profiles').upsert({ id: userId, avatar_url: publicUrl })

    setAvatarUrl(bustedUrl)
    setAvatarPreview(bustedUrl)
    setUploading(false)
  }

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
      // avatar_url already saved on upload; include to avoid overwriting with null
      ...(avatarUrl ? { avatar_url: avatarUrl.split('?')[0] } : {}),
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
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative group focus:outline-none"
          title="Upload photo"
        >
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-700 group-hover:border-[#1D9E75] transition-colors">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-[#1D9E75]/20 flex items-center justify-center text-2xl font-bold text-[#1D9E75] select-none">
                {initial}
              </div>
            )}
          </div>
          {/* Overlay on hover */}
          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-zinc-400 hover:text-[#1D9E75] transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : avatarPreview ? 'Change photo' : 'Upload photo'}
        </button>

        {uploadError && (
          <p className="text-xs text-red-400">{uploadError}</p>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Fields */}
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
        disabled={loading || uploading}
        className="w-full py-2.5 px-4 bg-[#1D9E75] hover:bg-[#18896A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
      >
        {loading ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
