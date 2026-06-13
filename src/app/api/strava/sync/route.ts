import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface StravaActivity {
  id: number
  name: string
  type: string
  start_date: string
  distance: number
  moving_time: number
  average_heartrate?: number
  max_heartrate?: number
  total_elevation_gain: number
}

interface StravaRefreshResponse {
  access_token: string
  refresh_token: string
  expires_at: number
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tokenRow, error: tokenError } = await supabase
    .from('strava_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .single()

  if (tokenError || !tokenRow) {
    return NextResponse.json({ error: 'Strava not connected' }, { status: 400 })
  }

  let accessToken = tokenRow.access_token
  const nowSecs = Math.floor(Date.now() / 1000)

  // Refresh if expired (with 60s buffer)
  if (tokenRow.expires_at < nowSecs + 60) {
    const refreshRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tokenRow.refresh_token,
      }),
    })

    if (!refreshRes.ok) {
      return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 })
    }

    const refreshed: StravaRefreshResponse = await refreshRes.json()
    accessToken = refreshed.access_token

    await supabase.from('strava_tokens').update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
    }).eq('user_id', user.id)
  }

  // Find the most recent synced activity to fetch only newer ones
  const { data: latest } = await supabase
    .from('strava_activities')
    .select('start_date')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const afterParam = latest?.start_date
    ? `&after=${Math.floor(new Date(latest.start_date).getTime() / 1000)}`
    : ''

  const activitiesRes = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=50${afterParam}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!activitiesRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }

  const activities: StravaActivity[] = await activitiesRes.json()

  if (activities.length === 0) {
    return NextResponse.json({ synced: 0 })
  }

  const rows = activities.map((a) => ({
    id: a.id,
    user_id: user.id,
    name: a.name,
    type: a.type,
    start_date: a.start_date,
    distance_meters: a.distance,
    moving_time_seconds: a.moving_time,
    average_heartrate: a.average_heartrate ?? null,
    max_heartrate: a.max_heartrate ?? null,
    total_elevation_gain: a.total_elevation_gain,
  }))

  const { error: upsertError } = await supabase
    .from('strava_activities')
    .upsert(rows, { onConflict: 'id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  return NextResponse.json({ synced: rows.length })
}
