import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, date_of_birth, sport, phone, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
            <span className="text-sm font-bold text-white tracking-tight">UltraLab</span>
          </div>
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Back to dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Your profile</h1>
          <p className="mt-2 text-sm text-zinc-400">{user.email}</p>
        </div>

        <ProfileForm
          userId={user.id}
          existingProfile={profile}
          redirectTo="/dashboard"
        />
      </div>
    </div>
  )
}
