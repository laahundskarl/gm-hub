'use client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common')
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <p className="text-lg font-medium">{t('errorTitle')}</p>
      <Button variant="outline" onClick={reset}>{t('retry')}</Button>
    </div>
  )
}
