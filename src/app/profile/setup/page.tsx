import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from '../ProfileForm'

export default async function ProfileSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
          <span className="text-sm font-bold text-white tracking-tight">UltraLab</span>
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Complete your profile</h1>
          <p className="mt-2 text-sm text-zinc-400">This helps us personalise your program.</p>
        </div>
        <ProfileForm userId={user.id} existingProfile={null} redirectTo="/dashboard" />
      </div>
    </div>
  )
}
