import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavLinks from './NavLinks'

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
      <main className="app-main">{children}</main>
    </div>
  )
}