'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { normalizeIndianPhone } from '@/lib/phone'

async function getClinicId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('clinic_members')
    .select('clinic_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (error || !data) throw new Error('No clinic found')
  return { supabase, clinicId: data.clinic_id as string }
}

export async function savePatient(input: {
  id?: string
  full_name: string
  phone: string
  preferred_language: string
  notes?: string
  consent: boolean
}) {
  const { supabase, clinicId } = await getClinicId()

  const full_name = input.full_name.trim()
  if (!full_name) return { error: 'Name is required' }

  const phone = normalizeIndianPhone(input.phone)
  if (!phone) return { error: 'Enter a valid 10-digit Indian mobile number' }

  const row = {
    full_name,
    phone,
    preferred_language: input.preferred_language,
    notes: input.notes?.trim() || null,
  }

  if (input.id) {
    // Edit: only set consent_at when consent is newly given; never silently clear a past consent time here.
    const { data: existing } = await supabase
      .from('patients')
      .select('consent_at')
      .eq('id', input.id)
      .maybeSingle()

    const consent_at =
      input.consent ? existing?.consent_at ?? new Date().toISOString() : null

    const { error } = await supabase
      .from('patients')
      .update({ ...row, consent_at })
      .eq('id', input.id)
    if (error) return { error: friendlyError(error) }
  } else {
    const { error } = await supabase.from('patients').insert({
      ...row,
      clinic_id: clinicId,
      consent_at: input.consent ? new Date().toISOString() : null,
    })
    if (error) return { error: friendlyError(error) }
  }

  revalidatePath('/patients')
  return { error: null }
}

function friendlyError(error: { code?: string; message: string }) {
  // 23505 = unique violation on (clinic_id, phone)
  if (error.code === '23505') return 'A patient with this phone number already exists'
  return error.message
}