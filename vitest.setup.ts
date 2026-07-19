import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Component tests render client components that call next/navigation hooks
// (via next-intl's navigation wrappers) outside of a mounted Next.js app
// router. Provide a minimal mock so those hooks don't throw in jsdom.
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>()
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => '/',
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
  }
})
