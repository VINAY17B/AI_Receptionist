import { createClient } from '@/lib/supabase/server'
import PatientsTable from './PatientsTable'

export default async function PatientsPage() {
  const supabase = await createClient()
  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, full_name, phone, preferred_language, notes, consent_at, created_at')
    .order('created_at', { ascending: false })
    .limit(500) // TODO: server-side search and pagination once a clinic has more patients than this

  if (error) console.error('patients query failed:', error)

  return <PatientsTable patients={patients ?? []} />
}