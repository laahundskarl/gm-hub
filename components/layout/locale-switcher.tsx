'use client'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const other = locale === 'pt-BR' ? 'en' : 'pt-BR'
  return (
    <button
      className="text-sm text-muted-foreground hover:text-foreground"
      onClick={() => router.replace(pathname, { locale: other })}
    >
      {other === 'en' ? 'EN' : 'PT'}
    </button>
  )
}
