'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/locale'
import { t as translate } from '@/lib/i18n/dictionary'

type LocaleContextValue = {
  locale: Locale
  t: (key: string, vars?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

// 초기값은 서버(app/layout.tsx)가 쿠키에서 읽어 내려준다 — 클라이언트에서
// localStorage로 다시 읽으면 서버 렌더 결과와 어긋나는 hydration 깜빡임이 생긴다.
export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`
    // 번역된 문구는 이 state 변경으로 바로 바뀌는데, app/globals.css의 자간
    // 변수는 <html lang>이 "en"으로 바뀌어야 좁아진다 — 그 속성은 서버
    // 컴포넌트(app/layout.tsx)가 정하므로 router.refresh()가 끝나야 반영된다.
    // 그 사이(수 초) 새 언어 문구가 옛 자간(한글 기준, 넓음)으로 잠깐 보이는
    // 깜빡임이 실제로 있었다 — router.refresh()를 기다리지 않고 여기서
    // 곧바로 속성을 바꿔서 문구 전환과 자간 전환이 같은 순간에 일어나게 한다.
    document.documentElement.lang = next
    setLocaleState(next)
  }, [])

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, t: (key, vars) => translate(locale, key, vars), setLocale }),
    [locale, setLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale은 LocaleProvider 안에서만 쓸 수 있어')
  return ctx
}
