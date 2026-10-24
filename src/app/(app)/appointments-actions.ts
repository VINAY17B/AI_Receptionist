'use server'
import { revalidatePath } from 'next/cache'
import { getClinicContext } from '@/lib/clinic'
import { normalizeIndianPhone } from '@/lib/phone'

const STATUSES = ['booked', 'confirmed', 'completed', 'cancelled', 'no_show'] as const
export type ApptStatus = (typeof STATUSES)[number]

// TODO: read the clinic's timezone from clinics.timezone instead of hardcoding IST
const IST_OFFSET = '+05:30'

type Supa = Awaited<ReturnType<typeof getClinicContext>>['supabase']

function friendlyError(error: { code?: string; message: string }) {
  // 23P01 = exclusion violation (doctor already booked in that window)
  if (error.code === '23P01') return 'This doctor already has an appointment at that time'
  return error.message
}

async function patientByPhone(supabase: Supa, clinicId: string, phone: string) {
  const { data } = await supabase
    .from('patients')
    .select('id, full_name')
    .eq('clinic_id', clinicId)
    .eq('phone', phone)
    .maybeSingle()
  return (data as { id: string; full_name: string } | null) ?? null
}

export async function saveAppointment(input: {
  id?: string
  patient_id?: string
  new_patient?: { full_name: string; phone: string } // walk-in: created together with the booking
  doctor_id: string
  procedure?: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  duration: number
  status?: ApptStatus
  cancel_reason?: string
}) {
  const { supabase, clinicId } = await getClinicContext()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    return { error: 'Invalid date or time' }
  }
  if (!(input.duration >= 5 && input.duration <= 480)) {
    return { error: 'Duration must be between 5 and 480 minutes' }
  }
  if (input.status && !STATUSES.includes(input.status)) return { error: 'Invalid status' }

  const reason = input.cancel_reason?.trim() || null
  if (input.status === 'cancelled' && !reason) return { error: 'Cancellation reason is required' }
  if (reason && reason.length > 200) return { error: 'Reason is too long (max 200 characters)' }

  const starts = new Date(`${input.date}T${input.time}:00${IST_OFFSET}`)
  if (isNaN(starts.getTime())) return { error: 'Invalid date or time' }
  const ends = new Date(starts.getTime() + input.duration * 60_000)

  // Walk-in patient: reuse the patient if this phone already exists at the clinic, else create one
  let patientId = input.patient_id
  let createdPatientId: string | null = null
  let reusedName: string | null = null
  if (!input.id && input.new_patient) {
    const full_name = input.new_patient.full_name.trim()
    if (!full_name) return { error: 'Patient name is required' }
    if (full_name.length > 150) return { error: 'Patient name is too long' }
    const phone = normalizeIndianPhone(input.new_patient.phone)
    if (!phone) return { error: 'Enter a valid 10-digit Indian mobile number' }

    const existing = await patientByPhone(supabase, clinicId, phone)
    if (existing) {
      patientId = existing.id
      reusedName = existing.full_name
    } else {
      // TODO: ask whether consent was given; left empty for now. Language defaults to English.
      const { data, error } = await supabase
        .from('patients')
        .insert({ clinic_id: clinicId, full_name, phone, preferred_language: 'en' })
        .select('id')
        .single()
      if (error?.code === '23505') {
        // someone created the same phone a moment ago: use that patient
        const again = await patientByPhone(supabase, clinicId, phone)
        if (!again) return { error: 'Could not create the patient, please try again' }
        patientId = again.id
        reusedName = again.full_name
      } else if (error || !data) {
        return { error: error?.message ?? 'Could not create the patient' }
      } else {
        patientId = data.id as string
        createdPatientId = patientId
      }
    }
  }
  if (!patientId) return { error: 'Select a patient' }

  const row = {
    patient_id: patientId,
    doctor_id: input.doctor_id,
    procedure: input.procedure?.trim() || null,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
  }

  const { error } = input.id
    ? await supabase
        .from('appointments')
        .update(
          input.status
            ? { ...row, status: input.status, cancel_reason: input.status === 'cancelled' ? reason : null }
            : row
        )
        .eq('id', input.id)
    : await supabase
        .from('appointments')
        .insert({ ...row, clinic_id: clinicId, source: 'manual' })

  if (error) {
    // Do not leave a patient behind when the booking was rejected (e.g. doctor already booked)
    // TODO: do both writes in one database transaction (RPC) so this cleanup cannot fail
    if (createdPatientId) await supabase.from('patients').delete().eq('id', createdPatientId)
    return { error: friendlyError(error) }
  }
  revalidatePath('/')
  if (createdPatientId) revalidatePath('/patients')
  return { error: null, reused: reusedName }
}

export async function setAppointmentStatus(id: string, status: ApptStatus, cancelReason?: string) {
  const { supabase } = await getClinicContext()
  if (!STATUSES.includes(status)) return { error: 'Invalid status' }
  const reason = cancelReason?.trim() || null
  if (status === 'cancelled' && !reason) return { error: 'Cancellation reason is required' }
  if (reason && reason.length > 200) return { error: 'Reason is too long (max 200 characters)' }
  const { error } = await supabase
    .from('appointments')
    .update({ status, cancel_reason: status === 'cancelled' ? reason : null })
    .eq('id', id)
  if (error) return { error: friendlyError(error) }
  revalidatePath('/')
  return { error: null }
}