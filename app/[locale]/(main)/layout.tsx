import { Header } from '@/components/layout/header'
import { getUser } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  const profile = user ? await db.profile.findUnique({ where: { id: user.id } }) : null
  return (
    <>
      <Header userName={profile?.name ?? null} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  )
}
