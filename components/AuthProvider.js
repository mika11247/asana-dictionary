"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ensureProfile } from "@/lib/profile";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function ensureInitialData(currentUser) {
    if (!currentUser) return;

    const { count, error: countError } = await supabase
      .from("asanas")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUser.id);

    if (countError) {
      console.error("初期データ確認エラー:", countError);
      return;
    }

    if ((count || 0) > 0) return;

    const { error: copyError } = await supabase.rpc(
      "copy_initial_asanas_to_user",
      {
        target_user_id: currentUser.id,
      }
    );

    if (copyError) {
      console.error("初期データコピーエラー:", copyError);
    }
  }

  async function refreshProfile(currentUser = user) {
    if (!currentUser) {
      setProfile(null);
      return null;
    }

    const profileData = await ensureProfile(currentUser);
    await ensureInitialData(currentUser);

    setProfile(profileData);
    return profileData;
  }

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        setLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const currentUser = session?.user || null;

        if (!mounted) return;

        setUser(currentUser);

        if (currentUser) {
          const profileData = await ensureProfile(currentUser);
          await ensureInitialData(currentUser);

          if (mounted) setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth init error:", error);

        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;

      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        setProfile(null);
        return;
      }

      setTimeout(async () => {
        const profileData = await ensureProfile(currentUser);
        await ensureInitialData(currentUser);

        setProfile(profileData);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}