'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error || !data.user) return setError(true)
    await fetch('/api/profile', { method: 'POST' })
    router.push('/onboarding')
    router.refresh()
  }

  async function signInGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center">
      <Card className="w-full">
        <CardHeader><CardTitle>{t('signup')}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={signUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{t('signupError')}</p>}
            <Button type="submit" className="w-full">{t('signup')}</Button>
            <Button type="button" variant="outline" className="w-full" onClick={signInGoogle}>{t('google')}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
