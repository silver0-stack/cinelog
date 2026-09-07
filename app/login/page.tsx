import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { BackLink } from '@/components/auth/BackLink'
import { getLocale } from '@/lib/i18n/getLocale'
import { t } from '@/lib/i18n/dictionary'

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = isSupabaseConfigured ? await getUser() : null
  const { error } = await searchParams
  const locale = await getLocale()

  return (
    <main className="relative flex h-dvh w-screen flex-col items-center justify-center gap-16 bg-black">
      {/* 여기 들어올 방법은 많은데(공유 카드 링크의 "나도 기록하기" 등) 나갈
          방법이 브라우저 뒤로가기뿐이었다 — 인스타그램/카카오톡 인앱 브라우저
          같은 데선 그게 잘 안 보여서 사실상 막다른 길이었다. 브라우저 UI에
          기대지 않고 이 링크 자체가 history.back()을 실행한다(BackLink). */}
      <BackLink />

      <h1 className="text-center text-sm font-light tracking-[0.55em] text-white/70 sm:text-base">
        CINELOG
      </h1>

      {!isSupabaseConfigured ? (
        <p className="max-w-xs text-center text-xs font-light leading-relaxed tracking-widest text-white/30">
          {t(locale, 'dev.supabaseNotConfigured1')}
          <br />
          {t(locale, 'dev.supabaseNotConfigured2')}
        </p>
      ) : user ? (
        <div className="flex flex-col items-center gap-8">
          <p className="text-xs font-light tracking-widest text-white/40">{user.email}</p>
          <Link
            href="/archive"
            className="text-xs font-light tracking-[var(--tk-50)] text-white/60 outline-none transition-colors duration-700 hover:text-white/90"
          >
            {t(locale, 'nav.goToMyUniverse')}
          </Link>
          <SignOutButton />
        </div>
      ) : (
        <LoginForm authError={error === 'auth'} />
      )}
    </main>
  )
}

async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
