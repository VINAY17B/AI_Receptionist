'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Input = {
  patient_id: string;
  amount_inr: number;
  method: 'cash' | 'upi' | 'card' | 'other';
  status: 'paid' | 'pending';
  note?: string;
};

export async function addPayment(input: Input) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in' };

  // TODO: swap for your helper in lib/clinic.ts if it already returns clinic_id
  const { data: m } = await supabase
    .from('clinic_members').select('clinic_id').eq('user_id', user.id).limit(1).maybeSingle();
  if (!m) return { error: 'No clinic found' };

  if (!Number.isInteger(input.amount_inr) || input.amount_inr <= 0) {
    return { error: 'Enter a valid whole-rupee amount' };
  }

  // Make sure the patient belongs to this clinic
  const { data: p } = await supabase
    .from('patients').select('id').eq('id', input.patient_id).eq('clinic_id', m.clinic_id).maybeSingle();
  if (!p) return { error: 'Patient not found' };

  const { error } = await supabase.from('payments').insert({
    clinic_id: m.clinic_id,
    patient_id: input.patient_id,
    amount_inr: input.amount_inr,
    method: input.method,
    status: input.status,
    note: input.note?.trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath('/payments');
  return { error: null };
}

export async function markPaid(paymentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', paymentId);
  if (error) return { error: error.message };
  revalidatePath('/payments');
  return { error: null };
}