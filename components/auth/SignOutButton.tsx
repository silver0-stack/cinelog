'use client'

import { signOut } from '@/app/login/actions'

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut()}
      className="text-xs font-light tracking-[0.5em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80 focus-visible:text-white/80"
    >
      SIGN OUT
    </button>
  )
}
