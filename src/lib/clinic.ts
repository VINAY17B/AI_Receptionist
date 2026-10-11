import { createClient } from '@/lib/supabase/server'

export async function getClinicContext() {
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