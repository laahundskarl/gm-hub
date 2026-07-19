import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'
import { updateSession } from '@/lib/supabase/middleware'

const intl = createIntlMiddleware(routing)

export default async function proxy(request: NextRequest) {
  return updateSession(request, intl(request))
}

export const config = { matcher: ['/((?!api|auth|_next|.*\\..*).*)'] }
