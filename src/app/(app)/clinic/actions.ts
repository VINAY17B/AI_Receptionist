'use server'
import { revalidatePath } from 'next/cache'
import { getClinicContext } from '@/lib/clinic'

export async function updateClinicProfile(input: {
  name: string
  phone: string
  address: string
  open_time: string // HH:mm
  close_time: string // HH:mm
  working_days: number[] // 1 = Monday ... 7 = Sunday
  faq_text: string
}) {
  const { supabase, clinicId } = await getClinicContext()

  const name = input.name.trim()
  if (!name || name.length > 120) return { error: 'Clinic name must be 1 to 120 characters' }
  if (input.phone.length > 20 || !/^[0-9+()\-\s]*$/.test(input.phone)) {
    return { error: 'Enter a valid phone number' }
  }
  if (input.address.length > 300) return { error: 'Address is too long (300 characters max)' }
  if (input.faq_text.length > 2000) return { error: 'FAQ text is too long (2000 characters max)' }
  if (!/^\d{2}:\d{2}$/.test(input.open_time) || !/^\d{2}:\d{2}$/.test(input.close_time)) {
    return { error: 'Invalid opening or closing time' }
  }
  if (input.open_time >= input.close_time) return { error: 'Opening time must be before closing time' }
  const days = [...new Set(input.working_days)]
  if (days.length === 0 || days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
    return { error: 'Choose at least one working day' }
  }

  // The database function repeats these checks and only lets the clinic owner through
  const { error } = await supabase.rpc('update_clinic_profile', {
    p_clinic: clinicId,
    p_name: name,
    p_phone: input.phone.trim(),
    p_address: input.address.trim(),
    p_open_time: input.open_time,
    p_close_time: input.close_time,
    p_working_days: days.sort(),
    p_faq_text: input.faq_text.trim(),
  })
  if (error) return { error: error.code === '42501' ? 'Only the clinic owner can edit the profile' : error.message }

  revalidatePath('/', 'layout') // the clinic name in the header changes too
  return { error: null }
}