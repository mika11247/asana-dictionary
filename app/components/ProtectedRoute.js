'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

const PUBLIC_PATHS = ['/login']

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace('/login')
    }
  }, [loading, user, pathname, router])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-white to-violet-50">
        <div className="rounded-3xl bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-gray-500">読み込み中...</p>
        </div>
      </main>
    )
  }

  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    return null
  }

  return children
}