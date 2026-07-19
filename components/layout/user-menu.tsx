'use client'

import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu({ userName }: { userName: string | null }) {
  const t = useTranslations()
  const router = useRouter()

  if (userName === null) {
    return (
      <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
        {t('auth.login')}
      </Link>
    )
  }

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-sm font-medium text-foreground">
        {userName}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link href="/settings" />}>{t('nav.settings')}</DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>{t('auth.logout')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
