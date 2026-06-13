import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminResultsClient from './AdminResultsClient'

export default async function AdminResultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name')
    .order('full_name', { ascending: true })

  return <AdminResultsClient clients={clients ?? []} />
}
