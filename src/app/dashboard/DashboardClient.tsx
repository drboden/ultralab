'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

import type { StravaActivity } from './page'

interface MetricsData {
  vo2max: string
  lt2Pace: string
  lt2Hr: number
  forceScore: string
  forceDelta: string | undefined
  forceDeltaColor: 'green' | 'red' | 'neutral'
  hasRealData: boolean
}

interface Props {
  email: string
  fullName: string | null
  avatarUrl: string | null
  hasProfile: boolean
  metrics: MetricsData
  stravaConnected: boolean
  recentActivities: StravaActivity[]
  signOut: () => Promise<void>
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function NavLink({ href, label, active }: { href: string; label: string; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {label}
    </Link>
  )
}

function MetricCard({
  label,
  value,
  unit,
  sub,
  delta,
  deltaColor,
}: {
  label: string
  value: string
  unit: string
  sub: string
  delta?: string
  deltaColor?: 'green' | 'red' | 'neutral'
}) {
  const deltaClass =
    deltaColor === 'green'
      ? 'text-[#1D9E75]'
      : deltaColor === 'red'
      ? 'text-red-400'
      : 'text-zinc-400'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold text-white leading-none">{value}</span>
        <span className="text-sm text-zinc-400 mb-0.5">{unit}</span>
      </div>
      {delta && (
        <span className={`text-xs font-medium ${deltaClass}`}>{delta}</span>
      )}
      <span className="text-xs text-zinc-500 leading-relaxed">{sub}</span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-zinc-300 mb-4">{title}</h3>
      {children}
    </div>
  )
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/program', label: 'Program' },
  { href: '/reports', label: 'Reports' },
  { href: '/history', label: 'History' },
]

const STATIC_WEEKLY_METRIC = {
  label: 'Weekly Load',
  value: '62',
  unit: 'km',
  delta: '↑ 78% plan adherence',
  deltaColor: 'green' as const,
  sub: 'Across 6 sessions this week',
}

type ProgramStatus = 'in_progress' | 'complete' | 'upcoming'

interface ProgramItem {
  icon: string
  title: string
  description: string
  status: ProgramStatus
  progress?: number
  progressLabel?: string
}

const PROGRAM_ITEMS: ProgramItem[] = [
  {
    icon: '🏋️',
    title: 'Left quad & hip adductor protocol',
    description: '3×12 Bulgarian split squat, 3×15 adductor squeeze, Nordic curls 3×8',
    status: 'in_progress',
    progress: 67,
    progressLabel: '2 of 3 sessions done',
  },
  {
    icon: '🏃',
    title: 'Easy aerobic run — HR Zone 1',
    description: '60 min at 140–147 bpm. Flat route.',
    status: 'complete',
  },
  {
    icon: '🧘',
    title: 'Hip mobility & ITB protocol',
    description: '12 min daily. 90/90 stretch, couch stretch, lateral band walk.',
    status: 'upcoming',
    progress: 0,
    progressLabel: '0 of 3 sessions done',
  },
]

const LOAD_ZONES = [
  { label: 'Zone 1', pct: 42, color: 'bg-blue-500' },
  { label: 'Zone 2', pct: 31, color: 'bg-[#1D9E75]' },
  { label: 'Zone 3', pct: 15, color: 'bg-amber-400' },
  { label: 'Zone 4+', pct: 12, color: 'bg-red-500' },
]

const ALERTS = [
  {
    level: 'warn',
    title: 'Left quad asymmetry',
    body: 'Force deficit of 23% exceeds 15% threshold. Consider reducing bilateral load.',
  },
  {
    level: 'info',
    title: 'VO2max trending up',
    body: '+1.4 ml/kg/min since baseline. On track for program target of 52 by week 12.',
  },
  {
    level: 'info',
    title: 'Long run tomorrow',
    body: '28 km @ easy effort. Aim for HR < 148 bpm. Sleep target: 8 h.',
  },
]

export default function DashboardClient({ email, fullName, avatarUrl, hasProfile, metrics, stravaConnected, recentActivities, signOut }: Props) {
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  const initial = (fullName ?? email).charAt(0).toUpperCase()
  const firstName = fullName ? fullName.split(' ')[0] : null

  console.log('[DashboardClient] avatarUrl received:', avatarUrl)

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">

      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-0 flex items-center justify-between h-14 sticky top-0 bg-[#0A0A0A]/95 backdrop-blur z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
            <span className="text-sm font-bold text-white tracking-tight">UltraLab</span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} active={l.href === '/dashboard'} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile" title={email}>
            {avatarUrl ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700 hover:border-[#1D9E75] transition-colors flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${avatarUrl}?t=${Date.now()}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/40 hover:border-[#1D9E75] flex items-center justify-center text-xs font-bold text-[#1D9E75] select-none transition-colors">
                {initial}
              </div>
            )}
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Profile incomplete banner */}
        {!hasProfile && (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-300">Complete your profile to personalise your dashboard</p>
            </div>
            <Link
              href="/profile/setup"
              className="flex-shrink-0 text-xs font-medium text-amber-300 border border-amber-400/40 hover:bg-amber-400/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Set up profile →
            </Link>
          </div>
        )}

        {/* Greeting */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Week 2 of program
          </span>
        </div>

        {/* Metric cards */}
        <div className="space-y-2">
          {!metrics.hasRealData && (
            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 inline-block" />
              Sample data — no lab results on file yet
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="VO2max"
              value={metrics.vo2max}
              unit="ml/kg/min"
              delta={metrics.hasRealData ? undefined : '↑ +1.4 from baseline'}
              deltaColor="green"
              sub="Estimated from last threshold test"
            />
            <MetricCard
              label="LT2 Pace"
              value={metrics.lt2Pace}
              unit="/km"
              sub={`At ${metrics.lt2Hr} bpm threshold`}
            />
            <MetricCard
              label="Force Score"
              value={metrics.forceScore}
              unit="x BW"
              delta={metrics.forceDelta}
              deltaColor={metrics.forceDeltaColor}
              sub="IMTP relative peak force"
            />
            <MetricCard {...STATIC_WEEKLY_METRIC} />
          </div>
        </div>

        {/* Notification banner */}
        <div className="rounded-xl border border-[#3B82F6] bg-[#1E3A5F] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#3B82F6]/20 border border-[#3B82F6]/30 flex items-center justify-center text-[#3B82F6]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">VO₂max retest due in 31 days</p>
              <p className="text-xs text-blue-300/70 mt-0.5">14 July 2026 · ULTRA Lab · ~90 minutes</p>
            </div>
          </div>
          <button className="flex-shrink-0 px-4 py-2 rounded-lg border border-[#3B82F6] text-white text-sm font-medium hover:bg-[#3B82F6]/20 transition-colors">
            Book Now
          </button>
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Program */}
          <div className="lg:col-span-2">
            <SectionCard title="Today's program">
              <div className="space-y-4">
                {PROGRAM_ITEMS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3">
                        <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-zinc-100 leading-snug">{item.title}</p>
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                      {item.status === 'complete' && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/40 flex items-center justify-center text-[#1D9E75] text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    {item.status !== 'complete' && item.progress !== undefined && (
                      <div className="mt-3 space-y-1.5">
                        <div className="h-1.5 w-full bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1D9E75] transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-500">{item.progressLabel}</p>
                      </div>
                    )}
                    {item.status === 'complete' && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full bg-[#1D9E75]/20 rounded-full overflow-hidden">
                          <div className="h-full w-full rounded-full bg-[#1D9E75]" />
                        </div>
                        <p className="text-[10px] text-[#1D9E75] mt-1.5">Completed</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* Load distribution */}
          <SectionCard title="Training load distribution">
            <div className="space-y-3">
              {LOAD_ZONES.map((z) => (
                <div key={z.label} className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>{z.label}</span>
                    <span>{z.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${z.color}`}
                      style={{ width: `${z.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs text-zinc-500 leading-relaxed">
              80/20 target: 73% easy, 20% moderate, 7% hard. Currently slightly elevated in Z3.
            </p>
          </SectionCard>

        </div>

        {/* Alerts / insights */}
        <SectionCard title="Insights &amp; alerts">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ALERTS.map((a) => (
              <div
                key={a.title}
                className={`rounded-lg border px-4 py-3.5 ${
                  a.level === 'warn'
                    ? 'bg-amber-400/5 border-amber-400/20'
                    : 'bg-zinc-800/60 border-zinc-700/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      a.level === 'warn' ? 'bg-amber-400' : 'bg-[#1D9E75]'
                    }`}
                  />
                  <span className="text-xs font-semibold text-zinc-200">{a.title}</span>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{a.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Strava section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-300">Strava</h3>
            {stravaConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/30 text-[#1D9E75] text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />
                Connected
              </span>
            ) : (
              <Link
                href="/api/strava/connect"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-orange-500 text-orange-400 hover:bg-orange-500/10 text-xs font-semibold transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                </svg>
                Connect Strava
              </Link>
            )}
          </div>

          {stravaConnected && recentActivities.length > 0 ? (
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-zinc-800/50 border border-zinc-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base leading-none flex-shrink-0">
                      {activity.type === 'Run' ? '🏃' : activity.type === 'Ride' ? '🚴' : activity.type === 'Swim' ? '🏊' : '⚡'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{activity.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {new Date(activity.start_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <p className="text-sm font-medium text-white">{activity.distance_km} km</p>
                      <p className="text-xs text-zinc-500">{activity.duration}</p>
                    </div>
                    {activity.average_heartrate && (
                      <div className="hidden sm:block">
                        <p className="text-sm font-medium text-white">{Math.round(activity.average_heartrate)}</p>
                        <p className="text-xs text-zinc-500">avg bpm</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : stravaConnected ? (
            <p className="text-xs text-zinc-500">No activities synced yet. <Link href="/api/strava/sync" className="text-[#1D9E75] hover:underline">Sync now</Link></p>
          ) : (
            <p className="text-xs text-zinc-500">Connect your Strava account to see your recent activities here.</p>
          )}
        </div>

      </div>
    </div>
  )
}
