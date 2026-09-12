'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabaseClient'

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/reset-password',
  '/privacy',
  '/guide',
  '/disclaimer',
  '/demo',

  // ゲスト体験
  '/sequences',
  '/presets',
]

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    async function checkAccess() {
      if (loading) return

      // ========================================
      // 未ログイン
      // ========================================
      //
      // PUBLIC_PATHS に含まれているページだけ閲覧可能。
      //
      // /sequences と /presets は
      // 「新規登録後の画面を体験するページ」として
      // ゲストにも公開する。
      //
      // /sequences/[id] などの個別ページは
      // PUBLIC_PATHS に完全一致しないため、
      // 引き続きログイン必須。
      // ========================================

      if (!user && !PUBLIC_PATHS.includes(pathname)) {
        router.replace('/login')
        return
      }

      // ========================================
      // ログイン済み
      // ========================================

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

        // ========================================
        // 退会申請中
        // ========================================
        //
        // 退会申請中のユーザーは
        // マイページのみアクセス可能
        // ========================================

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

  // ========================================
  // Auth 読み込み中
  // ========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-white to-violet-50">
        <div className="rounded-3xl bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-gray-500">
            読み込み中...
          </p>
        </div>
      </main>
    )
  }

  // ========================================
  // 未ログイン ＆ 非公開ページ
  // ========================================
  //
  // useEffect の router.replace が完了するまで
  // 一瞬ページが表示されるのを防ぐ
  // ========================================

  if (!user && !PUBLIC_PATHS.includes(pathname)) {
    return null
  }

  // ========================================
  // 表示OK
  // ========================================

  return children
}