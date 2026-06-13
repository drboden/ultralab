import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

function formatPace(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profileRes, labRes, forceRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase
      .from('lab_results')
      .select('vo2max, lt2_hr, lt2_pace, test_date')
      .eq('user_id', user.id)
      .order('test_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('force_plate_results')
      .select('imtp_score, left_quad_strength, right_quad_strength, test_date')
      .eq('user_id', user.id)
      .order('test_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const profile = profileRes.data
  const lab = labRes.data
  const force = forceRes.data
  const hasProfile = !!profile?.full_name
  const hasRealData = !!(lab || force)

  // Derive quad asymmetry delta if we have force data
  let forceScore = '2.32'
  let forceDelta: string | undefined = '↓ Left quad deficit 23%'
  let forceDeltaColor: 'green' | 'red' | 'neutral' = 'red'

  if (force) {
    forceScore = force.imtp_score?.toFixed(2) ?? '—'
    if (force.left_quad_strength && force.right_quad_strength) {
      const stronger = Math.max(force.left_quad_strength, force.right_quad_strength)
      const weaker = Math.min(force.left_quad_strength, force.right_quad_strength)
      const deficit = Math.round(((stronger - weaker) / stronger) * 100)
      const side = force.left_quad_strength < force.right_quad_strength ? 'Left' : 'Right'
      forceDelta = deficit > 15
        ? `↓ ${side} quad deficit ${deficit}%`
        : `↑ Asymmetry within range (${deficit}%)`
      forceDeltaColor = deficit > 15 ? 'red' : 'green'
    } else {
      forceDelta = undefined
    }
  }

  const metrics = {
    vo2max: lab?.vo2max?.toFixed(1) ?? '49.2',
    lt2Pace: lab?.lt2_pace ? formatPace(lab.lt2_pace) : '5:00',
    lt2Hr: lab?.lt2_hr ?? 160,
    forceScore,
    forceDelta,
    forceDeltaColor,
    hasRealData,
  }

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <DashboardClient
      email={user.email ?? ''}
      fullName={profile?.full_name ?? null}
      hasProfile={hasProfile}
      metrics={metrics}
      signOut={signOut}
    />
  )
}
