import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireUser() {
  const user = await getUser()
  if (!user) redirect('/login')
  return { id: user.id, email: user.email ?? '' }
}

export async function ensureProfile(userId: string, name: string) {
  return db.profile.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name },
  })
}
