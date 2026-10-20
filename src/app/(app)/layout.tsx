import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavLinks from './NavLinks'

type Sub = {
  status: string
  trial_ends_at: string | null
  current_period_end: string | null
  grace_until: string | null
} | null

const DAY = 86_400_000
const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })

// Mirrors the clinic_has_access() SQL function, for the banner only.
// The dashboard itself is not locked when a subscription lapses, only the bot.
function billingNotice(sub: Sub): { tone: 'info' | 'warn'; text: string } | null {
  const now = Date.now()
  const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : null)
  const inactive = {
    tone: 'warn' as const,
    text: 'Your subscription is inactive, so the AI receptionist is not answering patients. Please contact support to reactivate it.',
  }
  if (!sub) return inactive

  if (sub.status === 'active') return null

  if (sub.status === 'trialing') {
    const t = ms(sub.trial_ends_at)
    if (!t || t <= now) return inactive
    const days = Math.ceil((t - now) / DAY)
    return days <= 7
      ? { tone: 'info', text: `Free trial: ${days} day${days === 1 ? '' : 's'} left.` }
      : null
  }

  if (sub.status === 'past_due') {
    const g = ms(sub.grace_until)
    if (!g || g <= now) return inactive
    const days = Math.ceil((g - now) / DAY)
    return {
      tone: 'warn',
      text: `Your last payment failed. Please update your payment method within ${days} day${days === 1 ? '' : 's'} or the AI receptionist will stop answering patients.`,
    }
  }

  if (sub.status === 'cancelled') {
    const p = ms(sub.current_period_end)
    if (!p || p <= now) return inactive
    return { tone: 'info', text: `Subscription cancelled. The AI receptionist stays on until ${fmtDate(p)}.` }
  }

  return inactive // halted, expired
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership, error } = await supabase
    .from('clinic_members')
    .select('clinic_id, role, clinics(name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (error) console.error('membership query failed:', error)
  if (!membership) redirect('/onboarding')

  const clinicName = (membership.clinics as unknown as { name: string }).name

  // If this query fails (for example before the billing migration has run) no banner is shown.
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_end, grace_until')
    .eq('clinic_id', membership.clinic_id)
    .maybeSingle()
  if (subError) console.error('subscription query failed:', subError)
  const notice = subError ? null : billingNotice(sub as Sub)

  return (
    <div>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark">{clinicName.charAt(0).toUpperCase()}</span>
            <span className="brand-name">{clinicName}</span>
          </div>
          <NavLinks />
          {/* TODO: add a sign-out action to this chip once a signOut server action exists */}
          <div className="user-chip" title={user.email ?? ''}>
            <span className="avatar">{(user.email ?? '?').charAt(0).toUpperCase()}</span>
            <span className="user-email">{user.email}</span>
          </div>
        </div>
      </header>
      {notice && (
        <div
          role="status"
          style={{
            background: notice.tone === 'warn' ? '#fef3c7' : '#ecfeff',
            color: notice.tone === 'warn' ? '#92400e' : '#0e7490',
            padding: '8px 16px',
            textAlign: 'center',
            fontSize: 14,
          }}
        >
          {notice.text}{' '}
          <Link href="/clinic" style={{ color: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
            View billing
          </Link>
        </div>
      )}
      <main className="app-main">{children}</main>
    </div>
  )
}