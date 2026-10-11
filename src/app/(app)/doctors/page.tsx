import { createClient } from '@/lib/supabase/server'
import DoctorsTable from './DoctorsTable'

export default async function DoctorsPage() {
  const supabase = await createClient()
  const { data: doctors, error } = await supabase
    .from('doctors')
    .select('id, name, specialty, slot_minutes, active')
    .order('created_at', { ascending: true })

  if (error) console.error('doctors query failed:', error)

  return <DoctorsTable doctors={doctors ?? []} />
}