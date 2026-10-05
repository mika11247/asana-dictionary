'use client'

import { useEffect, useState } from 'react'
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
  '/sequences',
  '/sequences/guest-surya-namaskar-a',
  '/presets',
  '/asanas',
  '/asana-create',
]

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  const pathname = usePathname()
  const router = useRouter()

  // ========================================
  // アクセス確認状態
  // ========================================
  //
  // ログイン済みユーザーについて、
  // profile / 管理者権限の確認が終わるまで
  // 保護ページの中身を表示しない
  // ========================================

  const [accessChecking, setAccessChecking] = useState(true)
  const [accessAllowed, setAccessAllowed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkAccess() {
      if (loading) {
        return
      }

      setAccessChecking(true)
      setAccessAllowed(false)

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

      if (!user) {
        if (!PUBLIC_PATHS.includes(pathname)) {
          router.replace('/login')

          if (!cancelled) {
            setAccessChecking(false)
          }

          return
        }

        if (!cancelled) {
          setAccessAllowed(true)
          setAccessChecking(false)
        }

        return
      }

      // ========================================
      // ログイン済み
      // ========================================

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('status, is_admin')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) {
        return
      }

      if (error) {
        console.error('profile取得エラー', error)

        // profileを確認できない場合は
        // 保護ページを表示しない
        setAccessAllowed(false)
        setAccessChecking(false)
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
          setAccessAllowed(false)
          setAccessChecking(false)
          return
        }
      }

      // ========================================
      // 管理者ページ
      // ========================================
      //
      // /admin 配下は
      // profiles.is_admin = true の
      // 管理者のみアクセス可能
      // ========================================

      if (pathname.startsWith('/admin') && !profile?.is_admin) {
        router.replace('/')
        setAccessAllowed(false)
        setAccessChecking(false)
        return
      }

      // ========================================
      // 表示OK
      // ========================================

      setAccessAllowed(true)
      setAccessChecking(false)
    }

    checkAccess()

    return () => {
      cancelled = true
    }
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
  // アクセス確認中
  // ========================================
  //
  // profile / is_admin の確認が終わるまで
  // children を表示しない
  // ========================================

  if (accessChecking) {
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
  // アクセス不可
  // ========================================
  //
  // router.replace が完了するまで
  // 元ページを一瞬表示しない
  // ========================================

  if (!accessAllowed) {
    return null
  }

  // ========================================
  // 表示OK
  // ========================================

  return children
}