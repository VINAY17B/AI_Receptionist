import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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

  return (
    <div>
<header
  style={{
    padding: '12px 24px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}
>
  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
    <strong>{clinicName}</strong>
    <Link href="/">Appointments</Link>
    <Link href="/doctors">Doctors</Link>
    <Link href="/patients">Patients</Link>
  </div>
  <span>{user.email}</span>
</header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  )
}