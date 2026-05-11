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
      router.push('/login')
    }
  }, [loading, user, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 p-6 text-center text-gray-500">
        読み込み中...
      </div>
    )
  }

  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    return null
  }

  return children
}