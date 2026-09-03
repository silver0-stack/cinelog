'use client'

const STARS = [1, 2, 3, 4, 5]

export function RatingPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (next: number | null) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {STARS.map((n) => {
        const filled = value !== null && n <= value
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            aria-label={`별점 ${n}`}
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
