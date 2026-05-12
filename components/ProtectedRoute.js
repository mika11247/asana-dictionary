'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/reset-password',
  '/privacy',
  '/guide',
  '/disclaimer',
]

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      if (loading) return

      // 未ログイン
      if (!user && !PUBLIC_PATHS.includes(pathname)) {
        router.replace('/login')
        return
      }

      // ログイン済みなら status 確認
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('status')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          console.error('profile取得エラー', error)
          return
        }

        // 退会申請中はマイページだけ許可
        if (profile?.status === 'scheduled_deletion') {
          if (pathname !== '/mypage') {
            router.replace('/mypage')
            return
          }
        }
      }
    }

    checkAccess()
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