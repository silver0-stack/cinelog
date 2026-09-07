'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from '@/lib/i18n/getLocale'
import { t } from '@/lib/i18n/dictionary'

type SendMagicLinkResult = { error: string } | { sent: true }

export async function sendMagicLink(
  _prevState: SendMagicLinkResult | null,
  formData: FormData
): Promise<SendMagicLinkResult> {
  const email = String(formData.get('email') ?? '').trim()
  const locale = await getLocale()

  if (!email || !email.includes('@')) {
    return { error: t(locale, 'login.invalidEmail') }
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
    return { error: t(locale, 'login.sendFailed') }
  }

  return { sent: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
