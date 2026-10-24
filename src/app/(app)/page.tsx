import { createClient } from '@/lib/supabase/server'
import AppointmentsView from './AppointmentsView'

// TODO: use the clinic's timezone instead of hardcoded IST
const IST_OFFSET = '+05:30'

function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) // YYYY-MM-DD
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayIST()

  const dayStart = new Date(`${date}T00:00:00${IST_OFFSET}`)
  if (isNaN(dayStart.getTime())) throw new Error('Invalid date')
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000)

  const supabase = await createClient()

  const [appts, doctors, patients , newPatients] = await Promise.all([
    supabase
      .from('appointments')
      .select(
        'id, patient_id, doctor_id, procedure, starts_at, ends_at, status, source, cancel_reason, patients(full_name, phone), doctors(name)'
      )
      .gte('starts_at', dayStart.toISOString())
      .lt('starts_at', dayEnd.toISOString())
      .order('starts_at', { ascending: true }),
    supabase.from('doctors').select('id, name, slot_minutes').eq('active', true).order('name'),
    supabase.from('patients').select('id, full_name, phone').order('full_name').limit(500),
    // TODO: replace the patient dropdown with server-side search once a clinic has more than 500 patients
     supabase
      .from('patients')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString()),
  ])

  if (appts.error) console.error('appointments query failed:', appts.error)

  return (
    <AppointmentsView
      date={date}
      appointments={(appts.data ?? []) as never}
      doctors={doctors.data ?? []}
      patients={patients.data ?? []}
      newPatients={newPatients.count ?? 0}
    />
  )
}