import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignOutButton } from '@/components/auth/SignOutButton'

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function LoginPage() {
  const user = isSupabaseConfigured ? await getUser() : null

  return (
    <main className="flex h-dvh w-screen flex-col items-center justify-center gap-16 bg-black">
      <h1 className="text-center text-sm font-light tracking-[0.55em] text-white/70 sm:text-base">
        CINELOG
      </h1>

      {!isSupabaseConfigured ? (
        <p className="max-w-xs text-center text-xs font-light leading-relaxed tracking-widest text-white/30">
          Supabase 프로젝트가 아직 연결되지 않았어.
          <br />
          .env.local에 URL과 anon key를 채워줘.
        </p>
      ) : user ? (
        <div className="flex flex-col items-center gap-8">
          <p className="text-xs font-light tracking-widest text-white/40">{user.email}</p>
          <Link
            href="/archive"
            className="text-xs font-light tracking-[0.5em] text-white/60 outline-none transition-colors duration-700 hover:text-white/90"
          >
            내 우주로 가기
          </Link>
          <SignOutButton />
        </div>
      ) : (
        <LoginForm />
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
