import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    if (data.user) {
      const name = (data.user.user_metadata?.name as string) ?? data.user.email?.split('@')[0] ?? 'user'
      await ensureProfile(data.user.id, name)
    }
  }
  return NextResponse.redirect(`${origin}/feed`)
}
