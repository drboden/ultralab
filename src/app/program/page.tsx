'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface DayPlan {
  session_type: string
  description: string
  duration_minutes: number
  intensity: string
}

interface StrengthExercise {
  name: string
  sets: number
  reps: string
  rest_seconds: number
  rationale: string
  coaching_cues: string
}

interface KeyTargets {
  easy_run_hr_min: number
  easy_run_hr_max: number
  threshold_pace: string
  weekly_km_target: number
}

interface Program {
  program_summary: string
  weekly_structure: Record<string, DayPlan>
  strength_exercises: StrengthExercise[]
  key_targets: KeyTargets
  priority_focus: string
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const INTENSITY_COLORS: Record<string, string> = {
  rest: 'text-zinc-500 print:text-zinc-400',
  easy: 'text-blue-400 print:text-blue-700',
  moderate: 'text-[#1D9E75] print:text-emerald-700',
  threshold: 'text-amber-400 print:text-amber-700',
  hard: 'text-red-400 print:text-red-700',
  recovery: 'text-zinc-400 print:text-zinc-500',
}

function intensityColor(intensity: string): string {
  const key = intensity?.toLowerCase() ?? ''
  for (const [k, v] of Object.entries(INTENSITY_COLORS)) {
    if (key.includes(k)) return v
  }
  return 'text-zinc-300 print:text-zinc-700'
}

function DayCard({ day, plan }: { day: string; plan?: DayPlan }) {
  const isRest = !plan || plan.session_type?.toLowerCase().includes('rest')
  return (
    <div className={`
      rounded-xl p-4 flex flex-col gap-2
      bg-zinc-900 border print:bg-white print:border-gray-200
      ${isRest ? 'border-zinc-800/50 opacity-60 print:opacity-50' : 'border-zinc-800'}
    `}>
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 print:text-gray-500">
        {day.charAt(0).toUpperCase() + day.slice(1)}
      </span>
      {plan ? (
        <>
          <p className="text-sm font-medium text-white leading-snug print:text-gray-900">{plan.session_type}</p>
          <p className="text-xs text-zinc-400 leading-relaxed print:text-gray-600">{plan.description}</p>
          <div className="flex items-center gap-3 mt-auto pt-1">
            {plan.duration_minutes > 0 && (
              <span className="text-xs text-zinc-500 print:text-gray-500">{plan.duration_minutes} min</span>
            )}
            {plan.intensity && (
              <span className={`text-xs font-medium ${intensityColor(plan.intensity)}`}>
                {plan.intensity}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm text-zinc-600 print:text-gray-400">Rest</p>
      )}
    </div>
  )
}

function ActionButton({
  onClick,
  disabled,
  children,
  variant = 'secondary',
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
}) {
  const base = 'flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]'
  const styles = {
    primary: 'bg-[#1D9E75] hover:bg-[#18896A] text-white font-semibold',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700',
    ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  )
}

export default function ProgramPage() {
  const [program, setProgram] = useState<Program | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [canShare, setCanShare] = useState(false)
  const [shareStatus, setShareStatus] = useState<'idle' | 'done'>('idle')
  const [copyLinkStatus, setCopyLinkStatus] = useState<'idle' | 'done'>('idle')
  const [sendStatus, setSendStatus] = useState<'idle' | 'done'>('idle')

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => { if (data) setUserRole(data.role) })
    })
  }, [])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/program/generate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Unknown error')
      setProgram(data.program as Program)
      setGeneratedAt(data.created_at)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate program')
    } finally {
      setGenerating(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  async function handleShare() {
    const firstSentence = program?.program_summary?.split(/[.!?]/)[0] ?? 'My UltraLab training program'
    const url = window.location.href
    if (canShare) {
      try {
        await navigator.share({
          title: 'My UltraLab Training Program',
          text: `My UltraLab training program — ${firstSentence}`,
          url,
        })
        setShareStatus('done')
        setTimeout(() => setShareStatus('idle'), 2000)
      } catch {
        // User cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopyLinkStatus('done')
      setTimeout(() => setCopyLinkStatus('idle'), 2000)
    }
  }

  async function handleSendToClient() {
    await navigator.clipboard.writeText(window.location.href)
    setSendStatus('done')
    setTimeout(() => setSendStatus('idle'), 2000)
  }

  const isAdmin = userRole === 'admin' || userRole === 'practitioner'
  const generatedAtFormatted = generatedAt
    ? new Date(generatedAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      {/* ── Print styles ───────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; }

          .no-print { display: none !important; }

          .print-header {
            display: flex !important;
            justify-content: space-between;
            align-items: baseline;
            border-bottom: 2px solid #111;
            padding-bottom: 8px;
            margin-bottom: 24px;
          }

          .print-footer {
            display: block !important;
            text-align: right;
            font-size: 10px;
            color: #9ca3af;
            margin-top: 32px;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
          }

          .print-week-grid {
            display: grid !important;
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .print-exercise-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          @page {
            margin: 20mm;
          }
        }

        .print-header { display: none; }
        .print-footer { display: none; }
      `}</style>

      <div className="min-h-screen bg-[#0A0A0A] print:bg-white px-4 py-12 print:py-0">
        <div className="max-w-5xl mx-auto space-y-8 print:space-y-6">

          {/* ── Print-only header ─────────────────────────────────────────────── */}
          <div className="print-header">
            <div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>UltraLab</span>
              <span style={{ color: '#6b7280', margin: '0 8px' }}>/</span>
              <span style={{ fontSize: 16 }}>Training Program</span>
            </div>
            {generatedAtFormatted && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Generated {generatedAtFormatted}</span>
            )}
          </div>

          {/* ── Nav header ────────────────────────────────────────────────────── */}
          <div className="no-print flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
              <span className="text-sm font-bold text-white tracking-tight">UltraLab</span>
              <span className="text-zinc-600 text-sm mx-1">/</span>
              <span className="text-sm text-zinc-400">Program</span>
            </div>
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Dashboard
            </Link>
          </div>

          {/* ── Title + action buttons ─────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white print:text-gray-900 tracking-tight mb-1">
                AI Exercise Program
              </h1>
              <p className="text-sm text-zinc-400 print:text-gray-600">
                Personalised 4-week plan generated from your lab and force plate data.
              </p>
              {generatedAtFormatted && (
                <p className="text-xs text-zinc-600 print:text-gray-400 mt-1">
                  Generated {generatedAtFormatted}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="no-print flex flex-wrap gap-2 sm:flex-nowrap sm:flex-shrink-0">
              {program && (
                <>
                  {/* Share / Copy link */}
                  <ActionButton onClick={handleShare} variant="ghost">
                    {canShare ? (
                      shareStatus === 'done' ? '✓ Shared' : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Share
                        </>
                      )
                    ) : (
                      copyLinkStatus === 'done' ? '✓ Copied' : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          Copy link
                        </>
                      )
                    )}
                  </ActionButton>

                  {/* Download PDF */}
                  <ActionButton onClick={handlePrint} variant="secondary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </ActionButton>

                  {/* Admin: Send to client */}
                  {isAdmin && (
                    <ActionButton onClick={handleSendToClient} variant="ghost">
                      {sendStatus === 'done' ? '✓ Link copied' : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Send to client
                        </>
                      )}
                    </ActionButton>
                  )}
                </>
              )}

              {/* Generate / Regenerate */}
              <ActionButton onClick={handleGenerate} disabled={generating} variant="primary">
                {generating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating…
                  </>
                ) : program ? 'Regenerate' : 'Generate Program'}
              </ActionButton>
            </div>
          </div>

          {error && (
            <div className="no-print bg-red-950/40 border border-red-800/60 rounded-xl p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!program && !generating && !error && (
            <div className="no-print bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
              <p className="text-4xl mb-4">🧬</p>
              <p className="text-zinc-300 font-medium mb-1">No program generated yet</p>
              <p className="text-zinc-500 text-sm">
                Click &ldquo;Generate Program&rdquo; to create a personalised plan based on your lab data.
              </p>
            </div>
          )}

          {generating && (
            <div className="no-print bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
              <div className="flex justify-center mb-4">
                <svg className="animate-spin h-8 w-8 text-[#1D9E75]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <p className="text-zinc-300 text-sm">Analysing your physiological data…</p>
            </div>
          )}

          {program && (
            <>
              {/* Summary */}
              <div className="bg-zinc-900 print:bg-white border border-zinc-800 print:border-gray-200 rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 print:text-gray-500 mb-2">
                  Program Summary
                </p>
                <p className="text-sm text-zinc-200 print:text-gray-800 leading-relaxed">
                  {program.program_summary}
                </p>
                {program.priority_focus && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1D9E75]/10 print:bg-emerald-50 border border-[#1D9E75]/30 print:border-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] print:bg-emerald-600" />
                    <span className="text-xs font-medium text-[#1D9E75] print:text-emerald-700">
                      {program.priority_focus}
                    </span>
                  </div>
                )}
              </div>

              {/* Key targets */}
              {program.key_targets && (
                <div className="bg-zinc-900 print:bg-white border border-zinc-800 print:border-gray-200 rounded-xl p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 print:text-gray-500 mb-4">
                    Key Targets
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-zinc-500 print:text-gray-500 mb-1">Easy run HR</p>
                      <p className="text-lg font-bold text-white print:text-gray-900">
                        {program.key_targets.easy_run_hr_min}–{program.key_targets.easy_run_hr_max}
                        <span className="text-sm font-normal text-zinc-400 print:text-gray-500 ml-1">bpm</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 print:text-gray-500 mb-1">Threshold pace</p>
                      <p className="text-lg font-bold text-white print:text-gray-900">
                        {program.key_targets.threshold_pace}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 print:text-gray-500 mb-1">Weekly target</p>
                      <p className="text-lg font-bold text-white print:text-gray-900">
                        {program.key_targets.weekly_km_target}
                        <span className="text-sm font-normal text-zinc-400 print:text-gray-500 ml-1">km</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Weekly grid */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 print:text-gray-500 mb-3">
                  Weekly Structure
                </p>
                <div className="print-week-grid grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {DAYS.map((day) => (
                    <DayCard key={day} day={day} plan={program.weekly_structure?.[day]} />
                  ))}
                </div>
              </div>

              {/* Strength exercises */}
              {program.strength_exercises?.length > 0 && (
                <div className="bg-zinc-900 print:bg-white border border-zinc-800 print:border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-zinc-800 print:border-gray-200">
                    <p className="text-sm font-semibold text-zinc-300 print:text-gray-800">Strength Exercises</p>
                  </div>
                  <div className="divide-y divide-zinc-800 print:divide-gray-200">
                    {program.strength_exercises.map((ex, i) => (
                      <div key={i} className="print-exercise-card px-5 py-4">
                        <div className="flex items-start justify-between gap-4 mb-1.5">
                          <p className="text-sm font-semibold text-white print:text-gray-900">{ex.name}</p>
                          <span className="flex-shrink-0 text-xs font-mono text-zinc-400 print:text-gray-600 bg-zinc-800 print:bg-gray-100 px-2 py-0.5 rounded">
                            {ex.sets}×{ex.reps}
                          </span>
                        </div>
                        {ex.rationale && (
                          <p className="text-xs text-zinc-400 print:text-gray-600 mb-1">{ex.rationale}</p>
                        )}
                        {ex.coaching_cues && (
                          <p className="text-xs text-zinc-500 print:text-gray-500 italic">{ex.coaching_cues}</p>
                        )}
                        {ex.rest_seconds > 0 && (
                          <p className="text-xs text-zinc-600 print:text-gray-400 mt-1">Rest: {ex.rest_seconds}s</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Print-only footer */}
              <div className="print-footer">
                Generated by UltraLab · ultralab.app
              </div>
            </>
          )}

        </div>
      </div>
    </>
  )
}
