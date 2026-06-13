import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS. Only use in server-side code
// after verifying access at the application layer.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
