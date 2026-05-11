'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ensureProfile } from '@/lib/profile'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user || null

      setUser(currentUser)

      if (currentUser) {
        const profileData = await ensureProfile(currentUser)
        setProfile(profileData)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function getUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const currentUser = session?.user || null

    setUser(currentUser)

    if (currentUser) {
      const profileData = await ensureProfile(currentUser)
      setProfile(profileData)
    }

    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}