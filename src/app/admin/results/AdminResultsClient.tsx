'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface ClientProfile {
  id: string
  full_name: string | null
}

interface Props {
  clients: ClientProfile[]
}

type TestType = 'vo2max' | 'force_plate'

function Field({
  label, id, type = 'text', value, onChange, placeholder, step,
}: {
  label: string
  id: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  step?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-300 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition [color-scheme:dark]"
      />
    </div>
  )
}

function parsePace(mmss: string): number | null {
  const parts = mmss.split(':')
  if (parts.length !== 2) return null
  const mins = parseInt(parts[0], 10)
  const secs = parseInt(parts[1], 10)
  if (isNaN(mins) || isNaN(secs)) return null
  return mins * 60 + secs
}

const EMPTY_VO2 = {
  testDate: '', vo2max: '', lt1Hr: '', lt1Pace: '', lt2Hr: '', lt2Pace: '',
  maxHr: '', weightKg: '', notes: '',
}

const EMPTY_FORCE = {
  testDate: '', imtpScore: '', leftQuad: '', rightQuad: '',
  leftAdductor: '', rightAdductor: '', hqLeft: '', hqRight: '', notes: '',
}

export default function AdminResultsClient({ clients }: Props) {
  const [selectedClient, setSelectedClient] = useState('')
  const [testType, setTestType] = useState<TestType>('vo2max')
  const [vo2, setVo2] = useState(EMPTY_VO2)
  const [force, setForce] = useState(EMPTY_FORCE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function setV(key: keyof typeof EMPTY_VO2) {
    return (v: string) => setVo2((p) => ({ ...p, [key]: v }))
  }

  function setF(key: keyof typeof EMPTY_FORCE) {
    return (v: string) => setForce((p) => ({ ...p, [key]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedClient) { setError('Please select a client.'); return }
    setLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    if (testType === 'vo2max') {
      const lt1PaceSec = parsePace(vo2.lt1Pace)
      const lt2PaceSec = parsePace(vo2.lt2Pace)
      const { error } = await supabase.from('lab_results').insert({
        user_id: selectedClient,
        test_date: vo2.testDate,
        test_type: 'vo2max',
        vo2max: vo2.vo2max ? parseFloat(vo2.vo2max) : null,
        lt1_hr: vo2.lt1Hr ? parseInt(vo2.lt1Hr) : null,
        lt1_pace: lt1PaceSec,
        lt2_hr: vo2.lt2Hr ? parseInt(vo2.lt2Hr) : null,
        lt2_pace: lt2PaceSec,
        max_hr: vo2.maxHr ? parseInt(vo2.maxHr) : null,
        weight_kg: vo2.weightKg ? parseFloat(vo2.weightKg) : null,
        notes: vo2.notes || null,
      })
      if (error) { setError(error.message); setLoading(false); return }
      setVo2(EMPTY_VO2)
    } else {
      const { error } = await supabase.from('force_plate_results').insert({
        user_id: selectedClient,
        test_date: force.testDate,
        imtp_score: force.imtpScore ? parseFloat(force.imtpScore) : null,
        left_quad_strength: force.leftQuad ? parseFloat(force.leftQuad) : null,
        right_quad_strength: force.rightQuad ? parseFloat(force.rightQuad) : null,
        left_adductor_strength: force.leftAdductor ? parseFloat(force.leftAdductor) : null,
        right_adductor_strength: force.rightAdductor ? parseFloat(force.rightAdductor) : null,
        hq_ratio_left: force.hqLeft ? parseFloat(force.hqLeft) : null,
        hq_ratio_right: force.hqRight ? parseFloat(force.hqRight) : null,
        notes: force.notes || null,
      })
      if (error) { setError(error.message); setLoading(false); return }
      setForce(EMPTY_FORCE)
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-12">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1D9E75]" />
            <span className="text-sm font-bold text-white tracking-tight">UltraLab</span>
            <span className="text-zinc-600 text-sm mx-1">/</span>
            <span className="text-sm text-zinc-400">Admin</span>
          </div>
          <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Enter lab results</h1>
        <p className="text-sm text-zinc-400 mb-8">Results are saved directly to the client&apos;s profile.</p>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Client selector */}
          <div>
            <label htmlFor="client" className="block text-sm font-medium text-zinc-300 mb-1.5">
              Client
            </label>
            <select
              id="client"
              required
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition"
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name ?? '(no name)'}
                </option>
              ))}
            </select>
          </div>

          {/* Test type toggle */}
          <div>
            <p className="block text-sm font-medium text-zinc-300 mb-2">Test type</p>
            <div className="flex gap-2">
              {(['vo2max', 'force_plate'] as TestType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTestType(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    testType === t
                      ? 'bg-[#1D9E75] border-[#1D9E75] text-white'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t === 'vo2max' ? 'VO₂max / Threshold' : 'Force Plate'}
                </button>
              ))}
            </div>
          </div>

          {/* VO2max form */}
          {testType === 'vo2max' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Test date" id="testDate" type="date" value={vo2.testDate} onChange={setV('testDate')} />
              </div>
              <Field label="VO₂max (ml/kg/min)" id="vo2max" type="number" step="0.1" value={vo2.vo2max} onChange={setV('vo2max')} placeholder="49.2" />
              <Field label="Weight (kg)" id="weightKg" type="number" step="0.1" value={vo2.weightKg} onChange={setV('weightKg')} placeholder="72.0" />
              <Field label="LT1 HR (bpm)" id="lt1Hr" type="number" value={vo2.lt1Hr} onChange={setV('lt1Hr')} placeholder="148" />
              <Field label="LT1 Pace (mm:ss /km)" id="lt1Pace" value={vo2.lt1Pace} onChange={setV('lt1Pace')} placeholder="5:30" />
              <Field label="LT2 HR (bpm)" id="lt2Hr" type="number" value={vo2.lt2Hr} onChange={setV('lt2Hr')} placeholder="162" />
              <Field label="LT2 Pace (mm:ss /km)" id="lt2Pace" value={vo2.lt2Pace} onChange={setV('lt2Pace')} placeholder="5:00" />
              <Field label="Max HR (bpm)" id="maxHr" type="number" value={vo2.maxHr} onChange={setV('maxHr')} placeholder="186" />
              <div className="col-span-2">
                <label htmlFor="vo2notes" className="block text-sm font-medium text-zinc-300 mb-1.5">Notes</label>
                <textarea
                  id="vo2notes"
                  rows={3}
                  value={vo2.notes}
                  onChange={(e) => setV('notes')(e.target.value)}
                  placeholder="Treadmill test, standard Bruce protocol..."
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition resize-none"
                />
              </div>
            </div>
          )}

          {/* Force plate form */}
          {testType === 'force_plate' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Test date" id="fpDate" type="date" value={force.testDate} onChange={setF('testDate')} />
              </div>
              <div className="col-span-2">
                <Field label="IMTP score (x BW)" id="imtpScore" type="number" step="0.01" value={force.imtpScore} onChange={setF('imtpScore')} placeholder="2.32" />
              </div>
              <Field label="Left quad strength (N/kg)" id="leftQuad" type="number" step="0.1" value={force.leftQuad} onChange={setF('leftQuad')} placeholder="3.2" />
              <Field label="Right quad strength (N/kg)" id="rightQuad" type="number" step="0.1" value={force.rightQuad} onChange={setF('rightQuad')} placeholder="4.1" />
              <Field label="Left adductor (N/kg)" id="leftAdductor" type="number" step="0.1" value={force.leftAdductor} onChange={setF('leftAdductor')} placeholder="2.8" />
              <Field label="Right adductor (N/kg)" id="rightAdductor" type="number" step="0.1" value={force.rightAdductor} onChange={setF('rightAdductor')} placeholder="2.9" />
              <Field label="H:Q ratio left" id="hqLeft" type="number" step="0.01" value={force.hqLeft} onChange={setF('hqLeft')} placeholder="0.62" />
              <Field label="H:Q ratio right" id="hqRight" type="number" step="0.01" value={force.hqRight} onChange={setF('hqRight')} placeholder="0.68" />
              <div className="col-span-2">
                <label htmlFor="fpNotes" className="block text-sm font-medium text-zinc-300 mb-1.5">Notes</label>
                <textarea
                  id="fpNotes"
                  rows={3}
                  value={force.notes}
                  onChange={(e) => setF('notes')(e.target.value)}
                  placeholder="Post 8-week rehab block. Left quad still tracking below threshold..."
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent transition resize-none"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-[#1D9E75] bg-[#1D9E75]/10 border border-[#1D9E75]/20 rounded-lg px-3.5 py-2.5">
              Results saved successfully.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#1D9E75] hover:bg-[#18896A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
          >
            {loading ? 'Saving…' : 'Save results'}
          </button>

        </form>
      </div>
    </div>
  )
}
