import { supabase } from '@/lib/supabaseClient'

export async function ensureProfile(user) {
  if (!user) return null

  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('profile取得エラー:', selectError)
    return null
  }

  if (existingProfile) {
    return existingProfile
  }

  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      display_name: user.email?.split('@')[0] || 'user',
      plan: 'free',
    })
    .select()
    .single()

  if (insertError) {
    console.error('profile作成エラー:', insertError)
    return null
  }

  return newProfile
}