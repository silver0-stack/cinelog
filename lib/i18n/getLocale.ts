import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, isValidLocale, LOCALE_COOKIE, type Locale } from './locale'

// 서버 컴포넌트/서버 액션 전용 — 클라이언트 컴포넌트는 LocaleProvider의
// useLocale()을 쓴다. next/headers를 쓰기 때문에 lib/i18n/locale.ts(타입·상수만
// 있는 파일)와 분리돼 있다 — 합쳐두면 클라이언트 컴포넌트가 타입만 가져다 써도
// next/headers까지 번들에 끌려 들어가 빌드 에러가 난다.
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return isValidLocale(value) ? value : DEFAULT_LOCALE
}
