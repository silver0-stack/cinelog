'use client'

import { GENRE_CHIPS } from '@/data/genreChips'

const MAX_SELECTED = 3

export function GenreChipPicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(chip: string) {
    if (selected.includes(chip)) {
      onChange(selected.filter((c) => c !== chip))
      return
    }
    if (selected.length >= MAX_SELECTED) return
    onChange([...selected, chip])
  }

  return (
    <div className="flex w-full flex-wrap justify-center gap-2">
      {GENRE_CHIPS.map((chip) => {
        const active = selected.includes(chip)
        return (
          <button
            key={chip}
            type="button"
            onClick={() => toggle(chip)}
            className={`border px-3 py-1 text-xs font-light tracking-wide outline-none transition-colors duration-300 ${
              active
                ? 'border-white/50 text-white/90'
                : 'border-white/10 text-white/35 hover:border-white/25 hover:text-white/60'
            }`}
          >
            {chip}
          </button>
        )
      })}
    </div>
  )
}
