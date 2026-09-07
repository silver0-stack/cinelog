'use client'

import { useLocale } from '@/components/i18n/LocaleProvider'

const STARS = [1, 2, 3, 4, 5]

export function RatingPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (next: number | null) => void
}) {
  const { t } = useLocale()
  return (
    <div className="flex items-center gap-2">
      {STARS.map((n) => {
        const filled = value !== null && n <= value
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            aria-label={t('aria.rating', { n })}
            className={`text-lg leading-none outline-none transition-colors duration-300 ${
              filled ? 'text-white/80' : 'text-white/20 hover:text-white/40'
            }`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
