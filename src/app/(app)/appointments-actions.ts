'use server'
import { revalidatePath } from 'next/cache'
import { getClinicContext } from '@/lib/clinic'

const STATUSES = ['booked', 'confirmed', 'completed', 'cancelled', 'no_show'] as const
export type ApptStatus = (typeof STATUSES)[number]

// TODO: read the clinic's timezone from clinics.timezone instead of hardcoding IST
const IST_OFFSET = '+05:30'

function friendlyError(error: { code?: string; message: string }) {
  // 23P01 = exclusion violation (doctor already booked in that window)
  if (error.code === '23P01') return 'This doctor already has an appointment at that time'
  return error.message
}

export async function saveAppointment(input: {
  id?: string
  patient_id: string
  doctor_id: string
  procedure?: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  duration: number
  status?: ApptStatus
}) {
  const { supabase, clinicId } = await getClinicContext()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    return { error: 'Invalid date or time' }
  }
  if (!(input.duration >= 5 && input.duration <= 480)) {
    return { error: 'Duration must be between 5 and 480 minutes' }
  }
  if (input.status && !STATUSES.includes(input.status)) return { error: 'Invalid status' }

  const starts = new Date(`${input.date}T${input.time}:00${IST_OFFSET}`)
  if (isNaN(starts.getTime())) return { error: 'Invalid date or time' }
  const ends = new Date(starts.getTime() + input.duration * 60_000)

  const row = {
    patient_id: input.patient_id,
    doctor_id: input.doctor_id,
    procedure: input.procedure?.trim() || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
  }

  const { error } = input.id
    ? await supabase
        .from('appointments')
        .update(input.status ? { ...row, status: input.status } : row)
        .eq('id', input.id)
    : await supabase
        .from('appointments')
        .insert({ ...row, clinic_id: clinicId, source: 'manual' })

  if (error) return { error: friendlyError(error) }
  revalidatePath('/')
  return { error: null }
}

export async function setAppointmentStatus(id: string, status: ApptStatus) {
  const { supabase } = await getClinicContext()
  if (!STATUSES.includes(status)) return { error: 'Invalid status' }
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
  if (error) return { error: friendlyError(error) }
  revalidatePath('/')
  return { error: null }
}