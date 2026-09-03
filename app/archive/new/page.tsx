import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogMovieForm } from '@/components/archive/LogMovieForm'

export default async function NewLoggedMoviePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="flex min-h-dvh w-screen flex-col items-center justify-center gap-16 bg-black px-6 py-16">
      <h1 className="text-center text-sm font-light tracking-[0.55em] text-white/70">
        영화 기록하기
      </h1>
      <LogMovieForm />
    </main>
  )
}
