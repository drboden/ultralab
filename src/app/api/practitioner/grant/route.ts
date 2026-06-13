import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email } = await request.json()
  if (!email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  // Look up practitioner profile by matching against auth users via service role
  // We can't query auth.users directly from the client, so we use a profiles join approach:
  // Profiles don't store email, so we use the Supabase admin API via the secret key.
  const adminRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
      },
    }
  )

  if (!adminRes.ok) {
    return NextResponse.json({ error: 'Failed to look up user.' }, { status: 500 })
  }

  const adminData = await adminRes.json()
  const users = adminData.users ?? []
  const practitioner = users.find((u: { email: string }) => u.email === email)

  if (!practitioner) {
    return NextResponse.json({ error: 'No account found with that email.' }, { status: 404 })
  }

  if (practitioner.id === user.id) {
    return NextResponse.json({ error: 'You cannot add yourself.' }, { status: 400 })
  }

  // Fetch practitioner's profile name
  const { data: practProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', practitioner.id)
    .single()

  const { data: row, error } = await supabase
    .from('practitioner_access')
    .upsert(
      { client_id: user.id, practitioner_id: practitioner.id, status: 'active' },
      { onConflict: 'client_id,practitioner_id' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    row: {
      ...row,
      profiles: { full_name: practProfile?.full_name ?? null, email },
    },
  })
}
