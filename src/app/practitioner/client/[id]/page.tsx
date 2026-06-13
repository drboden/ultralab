import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import PractitionerNotes from './PractitionerNotes'

function formatPace(seconds: number | null | undefined): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function Cell({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td className={`px-4 py-3 text-sm ${muted ? 'text-zinc-500' : 'text-zinc-200'}`}>
      {children}
    </td>
  )
}

export default async function PractitionerClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Verify practitioner role
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!myProfile || (myProfile.role !== 'practitioner' && myProfile.role !== 'admin')) {
    redirect('/dashboard')
  }

  // Verify this client has granted access
  const { data: access } = await supabase
    .from('practitioner_access')
    .select('id')
    .eq('client_id', clientId)
    .eq('practitioner_id', user.id)
    .eq('status', 'active')
    .single()

  if (!access) notFound()

  // Use admin client for cross-user reads — access already verified above
  const admin = createAdminClient()

  const [clientProfileRes, labRes, forceRes, activitiesRes] = await Promise.all([
    admin
      .from('profiles')
      .select('full_name, sport, date_of_birth, phone')
      .eq('id', clientId)
      .single(),
    admin
      .from('lab_results')
      .select('*')
      .eq('user_id', clientId)
      .order('test_date', { ascending: false })
      .limit(10),
    admin
      .from('force_plate_results')
      .select('*')
      .eq('user_id', clientId)
      .order('test_date', { ascending: false })
      .limit(10),
    admin
      .from('strava_activities')
      .select('id, name, type, start_date, distance_meters, moving_time_seconds, average_heartrate, total_elevation_gain')
      .eq('user_id', clientId)
      .order('start_date', { ascending: false })
      .limit(10),
  ])

  const client = clientProfileRes.data
  const labs = labRes.data ?? []
  const forces = forceRes.data ?? []
  const activities = activitiesRes.data ?? []

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
            <span className="text-sm font-bold text-white tracking-tight">UltraLab</span>
            <span className="text-zinc-600 text-sm mx-1">/</span>
            <Link href="/practitioner" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              Roster
            </Link>
            <span className="text-zinc-600 text-sm mx-1">/</span>
            <span className="text-sm text-zinc-300">{client?.full_name ?? 'Client'}</span>
          </div>
          <Link href="/practitioner" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Back to roster
          </Link>
        </div>

        {/* Client summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h1 className="text-xl font-bold text-white mb-1">{client?.full_name ?? '—'}</h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-zinc-400">
            {client?.sport && <span>🏃 {client.sport}</span>}
            {client?.date_of_birth && (
              <span>
                🗓 {new Date(client.date_of_birth).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
            {client?.phone && <span>📞 {client.phone}</span>}
          </div>
        </div>

        {/* Lab results history */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">VO₂max &amp; threshold history</h2>
          </div>
          {labs.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Date', 'VO₂max', 'LT1 HR', 'LT1 pace', 'LT2 HR', 'LT2 pace', 'Max HR', 'Weight'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {labs.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-800/30">
                    <Cell>{new Date(r.test_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</Cell>
                    <Cell>{r.vo2max?.toFixed(1) ?? <span className="text-zinc-600">—</span>}</Cell>
                    <Cell muted>{r.lt1_hr ?? '—'}</Cell>
                    <Cell muted>{formatPace(r.lt1_pace)}</Cell>
                    <Cell>{r.lt2_hr ?? <span className="text-zinc-600">—</span>}</Cell>
                    <Cell>{formatPace(r.lt2_pace)}</Cell>
                    <Cell muted>{r.max_hr ?? '—'}</Cell>
                    <Cell muted>{r.weight_kg ? `${r.weight_kg} kg` : '—'}</Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-6 text-sm text-zinc-500">No lab results on file.</p>
          )}
        </div>

        {/* Force plate history */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Force plate history</h2>
          </div>
          {forces.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Date', 'IMTP', 'L quad', 'R quad', 'L add.', 'R add.', 'HQ L', 'HQ R'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {forces.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-800/30">
                    <Cell>{new Date(r.test_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</Cell>
                    <Cell>{r.imtp_score?.toFixed(2) ?? '—'}</Cell>
                    <Cell muted>{r.left_quad_strength?.toFixed(1) ?? '—'}</Cell>
                    <Cell muted>{r.right_quad_strength?.toFixed(1) ?? '—'}</Cell>
                    <Cell muted>{r.left_adductor_strength?.toFixed(1) ?? '—'}</Cell>
                    <Cell muted>{r.right_adductor_strength?.toFixed(1) ?? '—'}</Cell>
                    <Cell muted>{r.hq_ratio_left?.toFixed(2) ?? '—'}</Cell>
                    <Cell muted>{r.hq_ratio_right?.toFixed(2) ?? '—'}</Cell>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-6 text-sm text-zinc-500">No force plate results on file.</p>
          )}
        </div>

        {/* Strava activities */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-300">Recent Strava activities</h2>
          </div>
          {activities.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base flex-shrink-0">
                      {a.type === 'Run' ? '🏃' : a.type === 'Ride' ? '🚴' : a.type === 'Swim' ? '🏊' : '⚡'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{a.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(a.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0 text-right text-sm">
                    <div>
                      <p className="text-white font-medium">{a.distance_meters ? (a.distance_meters / 1000).toFixed(1) : '—'} km</p>
                      <p className="text-xs text-zinc-500">{a.moving_time_seconds ? formatDuration(a.moving_time_seconds) : '—'}</p>
                    </div>
                    {a.average_heartrate && (
                      <div className="hidden sm:block">
                        <p className="text-white font-medium">{Math.round(a.average_heartrate)} bpm</p>
                        <p className="text-xs text-zinc-500">avg HR</p>
                      </div>
                    )}
                    {a.total_elevation_gain != null && (
                      <div className="hidden md:block">
                        <p className="text-white font-medium">{a.total_elevation_gain}m</p>
                        <p className="text-xs text-zinc-500">elev</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-6 text-sm text-zinc-500">No Strava activities synced.</p>
          )}
        </div>

        {/* Practitioner notes */}
        <PractitionerNotes clientId={clientId} practitionerId={user.id} />

      </div>
    </div>
  )
}
