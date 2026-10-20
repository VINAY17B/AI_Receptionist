import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// The confirmation email links here with ?token_hash=...&type=email.
// Unlike the code flow, this works even if the link is opened in a different browser or on a phone.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/' // never redirect to another site

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
    console.error('auth confirm failed:', error.message)
  } else {
    console.error('auth confirm called without token_hash/type')
  }
  return NextResponse.redirect(`${origin}/login?error=confirm`)
}