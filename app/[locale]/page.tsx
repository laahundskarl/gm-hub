import { redirect } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'

export default async function Home() {
  redirect({ href: '/news', locale: await getLocale() })
}
