'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type SendMagicLinkResult = { error: string } | { sent: true }

export async function sendMagicLink(
  _prevState: SendMagicLinkResult | null,
  formData: FormData
): Promise<SendMagicLinkResult> {
  const email = String(formData.get('email') ?? '').trim()

  if (!email || !email.includes('@')) {
    return { error: '올바른 이메일 주소를 입력해줘.' }
  }

  const origin = (await headers()).get('origin')
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: '링크를 보내지 못했어. 잠시 후 다시 시도해줘.' }
  }

  return { sent: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
