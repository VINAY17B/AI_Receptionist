'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

export async function saveDoctor(input: {
  id?: string
  name: string
  specialty?: string
  slot_minutes: number
}) {
  const { supabase, clinicId } = await getClinicId()
  const name = input.name.trim()
  if (!name) return { error: 'Name is required' }
  if (input.slot_minutes < 5 || input.slot_minutes > 240) {
    return { error: 'Slot length must be between 5 and 240 minutes' }
  }

  const row = {
    name,
    specialty: input.specialty?.trim() || null,
    slot_minutes: input.slot_minutes,
  }

  const { error } = input.id
    ? await supabase.from('doctors').update(row).eq('id', input.id)
    : await supabase.from('doctors').insert({ ...row, clinic_id: clinicId })

  if (error) return { error: error.message }
  revalidatePath('/doctors')
  return { error: null }
}

export async function setDoctorActive(id: string, active: boolean) {
  const { supabase } = await getClinicId()
  const { error } = await supabase.from('doctors').update({ active }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/doctors')
  return { error: null }
}