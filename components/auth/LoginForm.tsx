'use client'

import { useActionState } from 'react'
import { sendMagicLink } from '@/app/login/actions'

// 매직링크는 요청한 그 브라우저에 남겨둔 값(PKCE code verifier)과 짝을 맞춰야
// 로그인이 완료된다 — 이메일 앱(지메일 앱, 카카오톡 인앱 브라우저 등)에서 링크를
// 열면 요청했던 브라우저와 다른 곳이 되어 이 짝맞추기가 실패한다. 그럼 콜백이
// `/login?error=auth`로 돌아오는데, 예전엔 여기서 그냥 빈 폼만 다시 보여줘서
// "왜 안 되지" 하고 같은 절차를 반복하게 만들었다 — 실패 이유와 해결책(요청했던
// 그 브라우저에서 다시 받기)을 바로 알려준다.
export function LoginForm({ authError = false }: { authError?: boolean }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, null)

  if (state && 'sent' in state) {
    return (
      <div className="flex max-w-xs flex-col items-center gap-4 text-center">
        <p className="text-xs font-light leading-relaxed tracking-widest text-white/50">
          이메일을 확인해줘.
          <br />
          도착한 링크를 누르면 로그인이 완료돼.
        </p>
        <p className="text-[11px] font-light leading-relaxed tracking-wide text-white/25">
          안 보이면 스팸함도 확인해줘.
          <br />
          카카오톡·인스타그램 같은 앱 안에서 열고 있었다면, 링크는 거기 말고
          지금 이 화면을 보고 있던 브라우저에서 열어줘.
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="flex flex-col items-center gap-8">
      {authError && (
        <p className="max-w-xs text-center text-xs font-light leading-relaxed tracking-widest text-white/40">
          링크가 만료됐거나, 요청했던 것과 다른 브라우저(메일 앱 안의 브라우저 등)에서 열렸을 수 있어.
          <br />
          아래에서 새로 받아서, 받은 편지함 앱이 아니라 원래 쓰던 브라우저에서 열어봐.
        </p>
      )}
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
