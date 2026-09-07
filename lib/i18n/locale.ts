// 클라이언트/서버 어디서든 안전하게 import할 수 있는 타입·상수만 여기 둔다 —
// next/headers를 쓰는 getLocale()은 lib/i18n/getLocale.ts로 분리했다. 이 파일에
// cookies()가 섞여 있으면(예전엔 그랬다) LocaleProvider(클라이언트 컴포넌트)가
// type Locale 하나만 가져다 써도 next/headers까지 번들에 딸려 들어가면서
// "Pages Router에서만 쓸 수 있다"는 빌드 에러가 났다(실제로 겪은 문제).
export type Locale = 'ko' | 'en'

export const LOCALE_COOKIE = 'cinelog-locale'
export const DEFAULT_LOCALE: Locale = 'ko'

export function isValidLocale(value: string | undefined | null): value is Locale {
  return value === 'ko' || value === 'en'
}
