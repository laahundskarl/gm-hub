import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/auth'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const name = (user.user_metadata?.name as string) ?? user.email?.split('@')[0] ?? 'user'
  await ensureProfile(user.id, name)
  return NextResponse.json({ ok: true })
}
