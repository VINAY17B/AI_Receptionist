import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.DEV_NEXT_PUBLIC_SUPABASE_URL!,
    process.env.DEV_NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )