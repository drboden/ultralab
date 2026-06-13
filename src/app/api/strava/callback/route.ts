import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: { id: number }
}

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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard?strava=denied', request.url))
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/dashboard?strava=error', request.url))
  }

  const tokens: StravaTokenResponse = await tokenRes.json()

  // Save tokens to Supabase
  const { error: tokenError } = await supabase.from('strava_tokens').upsert({
    user_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expires_at,
    athlete_id: tokens.athlete.id,
  })

  if (tokenError) {
    return NextResponse.redirect(new URL('/dashboard?strava=error', request.url))
  }

  // Fetch last 30 activities
  const activitiesRes = await fetch(
    'https://www.strava.com/api/v3/athlete/activities?per_page=30',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  )

  if (activitiesRes.ok) {
    const activities: StravaActivity[] = await activitiesRes.json()

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

    await supabase.from('strava_activities').upsert(rows, { onConflict: 'id' })
  }

  return NextResponse.redirect(new URL('/dashboard?strava=connected', request.url))
}
