import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// The confirmation email link lands here with ?code=... ; we turn it into a logged-in session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/' // never redirect to another site

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
  }
  // Common cause: the link was opened in a different browser than the one used to sign up.
  // The email is usually confirmed already, so the login page tells the user to just sign in.
  return NextResponse.redirect(`${origin}/login?error=confirm`)
}