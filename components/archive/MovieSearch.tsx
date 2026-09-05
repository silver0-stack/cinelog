'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { useClickOutside } from '@/lib/useClickOutside'
import { SearchIcon } from '@/components/icons/SearchIcon'

const navLinkClass =
  'flex items-center gap-1 text-xs font-light tracking-[0.2em] sm:tracking-[0.4em] text-white/40 outline-none transition-colors duration-700 hover:text-white/80'

// <button>은 부모의 text-shadow를 자동으로 물려받지 않는(폼 컨트롤이라 그런)
// 브라우저 기본 동작이 있어서, 화면 위쪽의 밝은 포스터 위에서도 글자가
// 읽히려면 버튼 자신에 직접 걸어야 한다(MovieUniverse의 idle 힌트와 같은 값).
const navTextShadow = { textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)' }

type SearchEntry = { id: string; title: string; director: string }

// 검색은 "탐색"(구 패턴) 드롭다운 안에 같이 있었는데, 우주가 커질수록 자주 쓸
// 기능이라 2단계(계정 → 탐색 → 클릭)씩 숨어있으면 마찰이 크다는 피드백으로
// 분리했다 — "+ 기록"/"우주 링크 복사"처럼 항상 보이는 상시 트리거로 승격.
// 재관람 목록/감독·장르 요약은 가끔 궁금할 때만 보는 것이라 여전히 "탐색"
// 드롭다운에 남겨둔다(빈도에 맞춰 노출 단계를 다르게 뒀다).
//
// 결과를 눌렀을 때 `/archive?focus=<id>` 링크로 이동시켰더니, 이 페이지가
// 서버 컴포넌트라(요청마다 Supabase 쿼리 5번) 클릭하고 카메라가 움직이기까지
// 3초 가까이 걸렸다 — 이미 다 로드된 영화로 "카메라만" 옮기는 거라 서버 왕복이
// 필요 없다. 그래서 Link 대신 onSelect 콜백으로 바꿨다(ArchiveShell이 들고
// 있는 focusMovieId state를 직접 바꾼다).
//
// 검색 결과 패널을 예전엔 이 버튼 자신의 `relative` wrapper 기준
// `absolute right-0`로 띄웠다 — "검색" 버튼이 상단 버튼 줄의 맨 끝이었을 땐
// 그 오른쪽 끝이 화면 오른쪽 끝과 같아서 문제가 없었는데, 가이드/+ 기록/계정이
// 그 뒤에 추가되면서 "검색"이 줄 중간으로 밀렸다 — 그 좁은 wrapper 기준으로
// `right-0`를 계속 쓰니 패널이 화면 왼쪽 밖으로 잘려나갔다(모바일에서 실제로
// 확인됨). 트리거가 줄의 몇 번째에 있든 항상 화면 오른쪽 모서리에 붙도록
// `fixed` + 실제 뷰포트 기준 오프셋으로 바꿨다.
export function MovieSearch({ searchIndex, onSelect }: { searchIndex: SearchEntry[]; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useClickOutside(panelRef, open, () => close())

  function close() {
    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return searchIndex.filter((m) => m.title.toLowerCase().includes(q) || m.director.toLowerCase().includes(q)).slice(0, 8)
  }, [query, searchIndex])

  if (searchIndex.length === 0) return null

  return (
    <div ref={panelRef} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={navLinkClass} style={navTextShadow}>
        <SearchIcon />
        검색
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
              placeholder="영화 검색"
              className="w-full border-b border-white/15 bg-transparent px-1 py-1.5 text-[11px] font-light tracking-wide text-white/80 outline-none transition-colors duration-500 placeholder:text-white/25 focus:border-white/40"
            />

            {query.trim() && (
              <div className="themed-scroll flex max-h-[40vh] flex-col gap-1 overflow-y-auto">
                {results.length > 0 ? (
                  results.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSelect(m.id)
                        close()
                      }}
                      className="border-b border-white/5 py-1 text-left text-[10px] font-light tracking-wide text-white/60 outline-none transition-colors duration-300 hover:border-white/20 hover:text-white"
                    >
                      {m.title}
                    </button>
                  ))
                ) : (
                  <p className="text-[10px] font-light tracking-wide text-white/25">일치하는 영화가 없어</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
