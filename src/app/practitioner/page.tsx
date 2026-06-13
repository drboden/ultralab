import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

function formatPace(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default async function PractitionerPage() {
  // Auth + role check uses the cookie-scoped client (respects RLS correctly for own rows)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  console.log('[Practitioner] user.id:', user.id)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  console.log('[Practitioner] role:', profile?.role, '| profileError:', profileError?.message)

  if (!profile || (profile.role !== 'practitioner' && profile.role !== 'admin')) {
    redirect('/dashboard')
  }

  // Use the auth client to fetch access rows — practitioner SELECT policy covers this
  const { data: accessRows, error: accessError } = await supabase
    .from('practitioner_access')
    .select('client_id, status')
    .eq('practitioner_id', user.id)
    .eq('status', 'active')

  console.log('[Practitioner] accessRows:', JSON.stringify(accessRows))
  console.log('[Practitioner] accessError:', accessError?.message)

  const clientIds = (accessRows ?? []).map((r) => r.client_id)
  console.log('[Practitioner] clientIds:', clientIds)

  if (clientIds.length === 0) {
    return <EmptyRoster />
  }

  // Cross-user reads: use admin client to bypass per-user RLS on profiles/lab/force tables
  const admin = createAdminClient()

  const [clientProfilesRes, labsRes, forcesRes] = await Promise.all([
    admin.from('profiles').select('id, full_name, sport').in('id', clientIds),
    admin
      .from('lab_results')
      .select('user_id, vo2max, lt2_pace, test_date')
      .in('user_id', clientIds)
      .order('test_date', { ascending: false }),
    admin
      .from('force_plate_results')
      .select('user_id, imtp_score, test_date')
      .in('user_id', clientIds)
      .order('test_date', { ascending: false }),
  ])

  console.log('[Practitioner] clientProfiles:', JSON.stringify(clientProfilesRes.data))
  console.log('[Practitioner] clientProfilesError:', clientProfilesRes.error?.message)
  console.log('[Practitioner] labs count:', labsRes.data?.length, '| labsError:', labsRes.error?.message)
  console.log('[Practitioner] forces count:', forcesRes.data?.length, '| forcesError:', forcesRes.error?.message)

  const clientProfiles = clientProfilesRes.data ?? []

  // Keep only the most recent lab/force result per client
  const labMap: Record<string, { vo2max: number | null; lt2_pace: number | null; test_date: string }> = {}
  for (const lab of labsRes.data ?? []) {
    if (!labMap[lab.user_id]) labMap[lab.user_id] = lab
  }

  const forceMap: Record<string, { imtp_score: number | null }> = {}
  for (const f of forcesRes.data ?? []) {
    if (!forceMap[f.user_id]) forceMap[f.user_id] = f
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-12">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
            <span className="text-sm font-bold text-white tracking-tight">UltraLab</span>
            <span className="text-zinc-600 text-sm mx-1">/</span>
            <span className="text-sm text-zinc-400">Practitioner Portal</span>
          </div>
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Client roster</h1>
        <p className="text-sm text-zinc-400 mb-8">
          {clientProfiles.length} client{clientProfiles.length !== 1 ? 's' : ''} with active access.
        </p>

        {clientProfiles.length > 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Sport</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Last test</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">VO₂max</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">LT2 pace</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Force</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {clientProfiles.map((c) => {
                  const lab = labMap[c.id]
                  const force = forceMap[c.id]
                  return (
                    <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-white">{c.full_name ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-zinc-400 hidden sm:table-cell">{c.sport ?? '—'}</td>
                      <td className="px-5 py-4 text-zinc-400 hidden md:table-cell">
                        {lab?.test_date
                          ? new Date(lab.test_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        {lab?.vo2max
                          ? <span className="text-white font-medium">{lab.vo2max.toFixed(1)}</span>
                          : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {lab?.lt2_pace
                          ? <span className="text-white font-medium">{formatPace(lab.lt2_pace)}</span>
                          : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {force?.imtp_score
                          ? <span className="text-white font-medium">{force.imtp_score.toFixed(2)}×BW</span>
                          : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/practitioner/client/${c.id}`}
                          className="text-xs font-medium text-[#1D9E75] hover:text-[#18896A] transition-colors"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyRoster />
        )}
      </div>
    </div>
  )
}

function EmptyRoster() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
            <span className="text-sm font-bold text-white tracking-tight">UltraLab</span>
            <span className="text-zinc-600 text-sm mx-1">/</span>
            <span className="text-sm text-zinc-400">Practitioner Portal</span>
          </div>
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Client roster</h1>
        <p className="text-sm text-zinc-400 mb-8">Clients who have granted you access to their data.</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-400 text-sm">No clients have granted you access yet.</p>
          <p className="text-zinc-600 text-xs mt-2">Clients can add you from their profile page using your email address.</p>
        </div>
      </div>
    </div>
  )
}
