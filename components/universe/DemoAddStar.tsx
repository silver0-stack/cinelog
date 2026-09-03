'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { GenreChipPicker } from '@/components/archive/GenreChipPicker'
import { secondaryNavLinkClass as linkClass } from '@/lib/uiStyles'
import type { Movie } from '@/data/movies'

const fieldClass =
  'w-full border-b border-white/15 bg-transparent px-1 py-2 text-sm font-light tracking-widest text-white/80 outline-none transition-colors duration-500 placeholder:text-white/20 focus:border-white/40'

const WARNING_DURATION = 7000

// 로그인하지 않은 방문자도 이 데모 우주에 자기 영화 하나를 "실험 삼아" 넣어볼 수
// 있게 한다. 저장하지 않는다 — 새로고침하면 사라진다. 이 손실을 암묵적으로만
// 두지 않고, 별을 추가한 바로 그 순간에만 한 번 짧게 알려준다(배너 상시 노출이
// 아니라 방금 한 행동에 대한 피드백이라 CLAUDE.md의 절제된 톤과 충돌하지 않는다).
export function DemoAddStar({ onAdd }: { onAdd: (movie: Movie) => void }) {
  const [stage, setStage] = useState<'closed' | 'form' | 'warning'>('closed')
  const [title, setTitle] = useState('')
  const [year, setYear] = useState('')
  const [director, setDirector] = useState('')
  const [genres, setGenres] = useState<string[]>([])

  useEffect(() => {
    if (stage !== 'warning') return
    const timer = window.setTimeout(() => setStage('closed'), WARNING_DURATION)
    return () => window.clearTimeout(timer)
  }, [stage])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const y = Number(year)
    if (!title.trim() || !Number.isInteger(y)) return

    onAdd({
      id: `temp-${crypto.randomUUID()}`,
      title: title.trim(),
      year: y,
      director: director.trim(),
      genres,
      themes: [],
      moods: [],
      era: `${Math.floor(y / 10) * 10}s`,
      locations: [],
    })

    setTitle('')
    setYear('')
    setDirector('')
    setGenres([])
    setStage('warning')
  }

  return (
    <>
      {stage === 'closed' && (
        <button type="button" onClick={() => setStage('form')} className={`absolute bottom-14 right-6 z-10 ${linkClass}`}>
          + 내 영화 실험해보기
        </button>
      )}

      <AnimatePresence>
        {stage === 'form' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: EASE_SLOW }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/70"
          >
            <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col items-center gap-6">
              <p className="text-center text-[11px] font-light leading-relaxed tracking-widest text-white/30">
                이 별은 저장되지 않아.
                <br />
                어떻게 자리 잡는지만 잠깐 볼 수 있어.
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
                autoFocus
                required
                className={fieldClass}
              />
              <div className="flex w-full gap-4">
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="연도"
                  required
                  className={`w-1/2 ${fieldClass}`}
                />
                <input
                  type="text"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  placeholder="감독"
                  className={`w-1/2 ${fieldClass}`}
                />
              </div>
              <GenreChipPicker selected={genres} onChange={setGenres} />
              <div className="flex items-center gap-8">
                <button
                  type="button"
                  onClick={() => setStage('closed')}
                  className="text-xs font-light tracking-[0.4em] text-white/30 outline-none transition-colors duration-700 hover:text-white/70"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  className="text-xs font-light tracking-[0.5em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80"
                >
                  넣어보기
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 'warning' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: EASE_SLOW }}
            className="absolute bottom-14 right-6 z-10 flex items-center gap-3"
          >
            <p className="text-[10px] font-light tracking-widest text-white/30">로그인하지 않으면 이 별은 사라져.</p>
            <Link href="/login" className={linkClass}>
              LOG IN
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
