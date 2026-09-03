'use client'

import { useActionState } from 'react'
import { sendMagicLink } from '@/app/login/actions'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(sendMagicLink, null)

  if (state && 'sent' in state) {
    return (
      <p className="max-w-xs text-center text-xs font-light leading-relaxed tracking-widest text-white/50">
        이메일을 확인해줘.
        <br />
        도착한 링크를 누르면 로그인이 완료돼.
      </p>
    )
  }

  return (
    <form action={formAction} className="flex flex-col items-center gap-8">
      <input
        type="email"
        name="email"
        placeholder="you@example.com"
        required
        autoComplete="email"
        className="w-64 border-b border-white/15 bg-transparent px-1 py-2 text-center text-sm font-light tracking-widest text-white/80 outline-none transition-colors duration-500 placeholder:text-white/20 focus:border-white/40"
      />

      <button
        type="submit"
        disabled={pending}
        className="text-xs font-light tracking-[0.5em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80 focus-visible:text-white/80 disabled:text-white/20"
      >
        {pending ? 'SENDING' : 'SEND LINK'}
      </button>

      {state && 'error' in state && (
        <p className="text-xs font-light tracking-wider text-white/30">{state.error}</p>
      )}
    </form>
  )
}
