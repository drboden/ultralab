import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

function formatPace(seconds: number | null | undefined): string {
  if (!seconds) return 'unknown'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')} min/km`
}

function cleanJsonResponse(text: string): string {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
}

export async function POST() {
  // ── 1. Check env ────────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  console.log('[generate] ANTHROPIC_API_KEY present:', !!apiKey, '| prefix:', apiKey?.slice(0, 18))
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  // ── 2. Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr) console.error('[generate] auth error:', authErr.message)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  console.log('[generate] user.id:', user.id)

  // ── 3. Fetch lab + force data ────────────────────────────────────────────────
  const [labRes, forceRes] = await Promise.all([
    supabase
      .from('lab_results')
      .select('vo2max, lt2_hr, lt2_pace, lt1_hr, lt1_pace, max_hr, weight_kg, test_date')
      .eq('user_id', user.id)
      .order('test_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('force_plate_results')
      .select('imtp_score, left_quad_strength, right_quad_strength, left_adductor_strength, right_adductor_strength, hq_ratio_left, hq_ratio_right, test_date')
      .eq('user_id', user.id)
      .order('test_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])
  console.log('[generate] lab error:', labRes.error?.message ?? 'none', '| data:', JSON.stringify(labRes.data))
  console.log('[generate] force error:', forceRes.error?.message ?? 'none', '| data:', JSON.stringify(forceRes.data))

  const lab = labRes.data
  const force = forceRes.data

  const athleteLines = [
    lab && `VO2max: ${lab.vo2max?.toFixed(1) ?? 'unknown'} ml/kg/min`,
    lab && `LT2 HR: ${lab.lt2_hr ?? 'unknown'} bpm`,
    lab && `LT2 pace: ${formatPace(lab.lt2_pace)}`,
    lab && `LT1 HR: ${lab.lt1_hr ?? 'unknown'} bpm`,
    lab && `LT1 pace: ${formatPace(lab.lt1_pace)}`,
    lab && `Max HR: ${lab.max_hr ?? 'unknown'} bpm`,
    lab && `Body weight: ${lab.weight_kg ?? 'unknown'} kg`,
    force && `IMTP: ${force.imtp_score?.toFixed(2) ?? 'unknown'} × BW`,
    force && `Left quad: ${force.left_quad_strength?.toFixed(1) ?? 'unknown'} N/kg`,
    force && `Right quad: ${force.right_quad_strength?.toFixed(1) ?? 'unknown'} N/kg`,
    force && `Left adductor: ${force.left_adductor_strength?.toFixed(1) ?? 'unknown'} N/kg`,
    force && `Right adductor: ${force.right_adductor_strength?.toFixed(1) ?? 'unknown'} N/kg`,
    force && `H:Q left: ${force.hq_ratio_left?.toFixed(2) ?? 'unknown'}`,
    force && `H:Q right: ${force.hq_ratio_right?.toFixed(2) ?? 'unknown'}`,
  ].filter(Boolean).join('\n')

  const prompt = `Athlete data:\n${athleteLines || 'No data — use typical recreational endurance runner values.'}\n\nGenerate a personalised 4-week exercise program. Return ONLY valid JSON matching this structure exactly:\n{\n  "program_summary": "2-3 sentence overview",\n  "weekly_structure": {\n    "monday": { "session_type": "", "description": "", "duration_minutes": 0, "intensity": "" },\n    "tuesday": { "session_type": "", "description": "", "duration_minutes": 0, "intensity": "" },\n    "wednesday": { "session_type": "", "description": "", "duration_minutes": 0, "intensity": "" },\n    "thursday": { "session_type": "", "description": "", "duration_minutes": 0, "intensity": "" },\n    "friday": { "session_type": "", "description": "", "duration_minutes": 0, "intensity": "" },\n    "saturday": { "session_type": "", "description": "", "duration_minutes": 0, "intensity": "" },\n    "sunday": { "session_type": "", "description": "", "duration_minutes": 0, "intensity": "" }\n  },\n  "strength_exercises": [\n    { "name": "", "sets": 0, "reps": "", "rest_seconds": 0, "rationale": "", "coaching_cues": "" }\n  ],\n  "key_targets": {\n    "easy_run_hr_min": 0,\n    "easy_run_hr_max": 0,\n    "threshold_pace": "",\n    "weekly_km_target": 0\n  },\n  "priority_focus": ""\n}`

  // ── 4. Call Anthropic ────────────────────────────────────────────────────────
  let rawText: string
  try {
    console.log('[generate] calling claude-sonnet-4-6')
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: 'You are an expert exercise physiologist and strength & conditioning coach. Return ONLY valid JSON — no markdown, no prose.',
      messages: [{ role: 'user', content: prompt }],
    })
    console.log('[generate] stop_reason:', response.stop_reason)
    rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    console.log('[generate] response length:', rawText.length, '| preview:', rawText.slice(0, 100))
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; error?: unknown }
    console.error('[generate] Anthropic error:', e?.status, e?.message, JSON.stringify(e?.error))
    return NextResponse.json(
      { error: 'Anthropic API call failed', detail: e?.message ?? String(err), status: e?.status },
      { status: 500 }
    )
  }

  // ── 5. Parse JSON ────────────────────────────────────────────────────────────
  console.log('[generate] raw response text:')
  console.log(rawText)

  const cleanedText = cleanJsonResponse(rawText)
  console.log('[generate] cleaned text:')
  console.log(cleanedText)

  let programJson: unknown
  try {
    programJson = JSON.parse(cleanedText)
    console.log('[generate] JSON parsed OK')
  } catch (err) {
    console.error('[generate] JSON parse error:', String(err))
    console.error('[generate] raw text that failed:', rawText)
    console.error('[generate] cleaned text that failed:', cleanedText)
    return NextResponse.json(
      {
        error: 'Failed to parse model response as JSON',
        detail: String(err),
        raw: rawText,
        cleaned: cleanedText,
      },
      { status: 500 }
    )
  }

  // ── 6. Save to Supabase (non-fatal) ──────────────────────────────────────────
  let savedId: string | null = null
  let savedAt: string | null = null
  const { data: saved, error: saveErr } = await supabase
    .from('ai_programs')
    .insert({ user_id: user.id, program_json: programJson })
    .select('id, created_at')
    .single()

  if (saveErr) {
    console.error('[generate] Supabase save error (non-fatal):', saveErr.message)
  } else {
    savedId = saved.id
    savedAt = saved.created_at
    console.log('[generate] saved id:', savedId)
  }

  return NextResponse.json({
    id: savedId,
    created_at: savedAt,
    program: programJson,
    save_error: saveErr?.message ?? null,
  })
}
