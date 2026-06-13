import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#1D9E75] mb-6" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
          Welcome to UltraLab
        </h1>
        <p className="text-zinc-400 text-sm mb-8">{user.email}</p>

        <form action={signOut}>
          <button
            type="submit"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium rounded-lg transition-colors border border-zinc-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
