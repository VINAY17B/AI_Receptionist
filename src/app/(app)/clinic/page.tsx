import { getClinicContext } from '@/lib/clinic'
import ClinicView, { type ClinicInfo, type SubscriptionInfo, type BillingPayment } from './ClinicView'

export default async function ClinicPage() {
  const { supabase, clinicId } = await getClinicContext()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: member } = await supabase
    .from('clinic_members')
    .select('role')
    .eq('clinic_id', clinicId)
    .eq('user_id', user?.id ?? '')
    .maybeSingle()
  const isOwner = member?.role === 'owner'

  const [clinicRes, subRes, payRes] = await Promise.all([
    supabase
      .from('clinics')
      .select('name, phone, address, timezone, open_time, close_time, working_days, faq_text, whatsapp_phone_number_id')
      .eq('id', clinicId)
      .single(),
    supabase
      .from('subscriptions')
      .select('status, trial_ends_at, current_period_end, grace_until, cancel_at_period_end, plans(name, amount_inr, period)')
      .eq('clinic_id', clinicId)
      .maybeSingle(),
    // Payment history is for the owner only (the database enforces this too)
    isOwner
      ? supabase
          .from('billing_payments')
          .select('id, amount_inr, status, method, description, razorpay_payment_id, paid_at')
          .eq('clinic_id', clinicId)
          .order('paid_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (clinicRes.error) console.error('clinic query failed:', clinicRes.error)
  if (subRes.error) console.error('subscription query failed:', subRes.error)
  if (payRes.error) console.error('billing payments query failed:', payRes.error)

  return (
    <ClinicView
      clinic={clinicRes.data as unknown as ClinicInfo}
      subscription={(subRes.error ? null : subRes.data) as unknown as SubscriptionInfo | null}
      payments={(payRes.data ?? []) as unknown as BillingPayment[]}
      isOwner={isOwner}
    />
  )
} 