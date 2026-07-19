import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LocaleSwitcher } from './locale-switcher'
import { UserMenu } from './user-menu'

const NAV = [
  { href: '/feed', key: 'feed' },
  { href: '/news', key: 'news' },
  { href: '/teams', key: 'teams' },
  { href: '/players', key: 'players' },
  { href: '/free-agents', key: 'freeAgents' },
] as const

export function Header({ userName }: { userName: string | null }) {
  const t = useTranslations('nav')
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/news" className="font-bold tracking-tight">NBA FOH</Link>
        <nav className="flex flex-1 gap-4 text-sm">
          {NAV.map(({ href, key }) => (
            <Link key={key} href={href} className="text-muted-foreground hover:text-foreground">
              {t(key)}
            </Link>
          ))}
        </nav>
        <LocaleSwitcher />
        <UserMenu userName={userName} />
      </div>
    </header>
  )
}
