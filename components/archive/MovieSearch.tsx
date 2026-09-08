'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { useClickOutside } from '@/lib/useClickOutside'
import { SearchIcon } from '@/components/icons/SearchIcon'
import { navLinkClass } from '@/lib/uiStyles'
import { useLocale } from '@/components/i18n/LocaleProvider'

type SearchEntry = { id: string; title: string; director: string }

// 검색은 "탐색"(구 패턴) 드롭다운 안에 같이 있었는데, 우주가 커질수록 자주 쓸
// 기능이라 2단계(계정 → 탐색 → 클릭)씩 숨어있으면 마찰이 크다는 피드백으로
// 분리했다 — "+ 기록"/"우주 링크 복사"처럼 항상 보이는 상시 트리거로 승격.
// 재관람 목록/감독·장르 요약은 가끔 궁금할 때만 보는 것이라 여전히 "탐색"
// 드롭다운에 남겨둔다(빈도에 맞춰 노출 단계를 다르게 뒀다).
//
// (2026-09-06) 결과를 텍스트 목록으로 따로 보여주고 그중 하나를 또 클릭해야
// 이동하던 방식을 없앴다 — "검색 결과가 리스트로 뜰 필요 없이, 그냥 우주 안에서
// 해당하는 별만 바로 빛나면 된다"는 피드백. 타이핑하는 즉시 일치하는 영화들을
// onHighlightChange로 넘겨서(탐색 패널의 인사이트 하이라이트와 같은 메커니즘 —
// 위치는 그대로 두고 나머지만 어둡게 한다) 우주 자체가 검색 결과가 되게 한다.
// 어두워진 별은 dimmedByHighlight일 뿐 클릭은 그대로 되므로(MovieBody 참고),
// 빛나는 별을 직접 눌러 열람하면 된다 — 별도 "선택" 콜백이 필요 없다.
export function MovieSearch({
  searchIndex,
  onHighlightChange,
}: {
  searchIndex: SearchEntry[]
  onHighlightChange: (ids: string[] | null) => void
}) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function close() {
    setOpen(false)
    setQuery('')
  }

  // 별(우주 안의 포스터, data-star로 표시)을 누른 건 "바깥 클릭"으로 안 친다 —
  // lib/useClickOutside.ts의 2026-09-08 주석 참고. 검색으로 밝아진 별을 누르는
  // 순간 검색이 먼저 닫히면서 카메라가 흔들려 그 별을 놓치는 버그였다.
  useClickOutside(panelRef, open, close, '[data-star]')

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return searchIndex.filter((m) => m.title.toLowerCase().includes(q) || m.director.toLowerCase().includes(q))
  }, [query, searchIndex])

  // 패널을 닫으면(배경 클릭/닫기 등) query가 ''로 리셋되면서 이 이펙트가
  // 다시 실행돼 하이라이트도 같이 꺼진다 — 별도로 정리 로직을 두지 않아도 된다.
  useEffect(() => {
    onHighlightChange(query.trim() ? results.map((m) => m.id) : null)
  }, [query, results, onHighlightChange])

  if (searchIndex.length === 0) return null

  return (
    <div ref={panelRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={`flex items-center gap-1 ${navLinkClass}`}>
        <SearchIcon />
        {t('nav.search')}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_SLOW }}
            style={{ width: 'min(72vw, 240px)' }}
            className="fixed right-4 top-16 z-20 flex flex-col gap-2 border border-white/10 bg-black px-3 py-3 sm:right-6"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full border-b border-white/15 bg-transparent px-1 py-1.5 text-[11px] font-light tracking-wide text-white/80 outline-none transition-colors duration-500 placeholder:text-white/25 focus:border-white/40"
            />
            {query.trim() && (
              <p className="text-[10px] font-light tracking-wide text-white/25">
                {results.length > 0 ? t('search.hint') : t('search.noMatch')}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
