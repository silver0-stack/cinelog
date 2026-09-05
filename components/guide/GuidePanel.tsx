'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { secondaryNavLinkClass } from '@/lib/uiStyles'
import { HelpIcon } from '@/components/icons/HelpIcon'

type QA = { q: string; a: string }

// 포스터가 늘 보이니 "이게 영화 목록이다"는 이제 화면만 봐도 안다 — 그래서
// "별이 뭐야"류 정의는 뺐다. 지금 화면에서 실제로 안 보이는 것(왜 이 자리에
// 있는지, 눌렀을 때 뭐가 일어나는지)만 남긴다.
const UNIVERSE_QA: QA[] = [
  {
    q: '영화들이 왜 이 자리에 있어?',
    a: '중심 영화와 가까울수록 그 영화와의 관계가 깊어. 같은 감독, 겹치는 장르·테마, 또는 직접 연결해둔 사이일수록 중심에 가까워져. 서로 이웃한 포스터끼리 꼭 관계가 있는 건 아니고, 각자 중심과의 관계로만 자리가 정해져.',
  },
  {
    q: '제목 밑에 보이는 평점/메모는 뭐야?',
    a: '그 영화에 남긴 감상 미리보기야. 별점 옆에 "2회"처럼 숫자가 있으면 그 영화를 다시 본 횟수야. 눌러서 전체를 볼 수 있어.',
  },
  {
    q: '눌러보면?',
    a: '카메라가 그 포스터로 확대해서 다가가고, 옆(좁은 화면에서는 아래)에 평점·메모·감상 이력이 펼쳐져. "이 영화를 중심으로"를 누르면 그 영화 기준으로 우주 전체가 다시 배치돼. 포스터를 다시 누르거나 빈 공간을 누르면 원래 보던 자리로 돌아가.',
  },
  {
    q: '확대·축소는 어떻게 해?',
    a: '데스크톱은 Ctrl + 마우스 휠, 모바일은 두 손가락으로 핀치. 빈 공간을 드래그하면 화면이 움직여. 많이 축소하면 포스터가 그 영화 색의 흐린 빛으로 접혀 보여. 다시 확대하면 원래대로 돌아와.',
  },
]

const DEMO_QA: QA[] = [
  { q: '이 우주는 진짜야?', a: '내가 직접 고른 24편이야. 로그인하면 이 자리에 네가 실제로 본 영화들로 채운 진짜 우주가 생겨.' },
  { q: '평점이나 메모를 남길 수 있어?', a: '응, 데모 24편 어디에나 자유롭게 남겨볼 수 있어. 저장은 안 되고 새로고침하면 사라져. 로그인하면 진짜로 쌓여.' },
]

const ARCHIVE_QA: QA[] = [
  { q: '"다시 본 감상 남기기"는 뭐야?', a: '이 영화를 또 봤을 때 새 감상을 남기는 거야. 이전 감상을 덮어쓰지 않고 그대로 쌓여.' },
  { q: '우주 공유랑 영화 카드 공유는 뭐가 달라?', a: '우주 공유는 내 아카이브 전체를 보여주는 링크고, 영화 카드 공유는 그 영화 한 편만 보여주는 링크야.' },
  {
    q: '히스토리는 뭐야?',
    a: '내 우주가 시간이 지나며 어떻게 자라났는지 다시 보는 기능이야. 계정 메뉴에서 히스토리를 누르면 화면 아래 타임라인이 뜨고, 드래그하면 그 시점까지 기록한 영화만 빛나 보여.',
  },
]

// 공유 링크로 들어온 사람은 CINELOG를 이때 처음 볼 수도 있다 — 데모/내 우주와
// 달리 "이게 데모인지 진짜인지"가 아니라 "이게 누구 건지"가 가장 먼저 드는
// 의문이라 질문을 따로 둔다.
const SHARED_QA: QA[] = [
  { q: '이 우주는 뭐야?', a: '이 링크를 보낸 사람이 실제로 기록한 영화들이야. 너도 로그인하면 똑같은 방식으로 네 우주를 만들 수 있어(화면 구석 "나도 기록하기").' },
]

type Props = {
  /** 'demo'면 비로그인 데모 우주용, 'archive'면 로그인한 개인 아카이브용,
   * 'shared'면 남의 공유 링크로 들어온 읽기 전용 화면용 질문을 더한다. */
  variant: 'demo' | 'archive' | 'shared'
  /** 트리거 버튼 위치. 자체 트리거를 그릴 때만 쓴다(controlled 모드에서는 생략). */
  triggerClassName?: string
  /** 지정하면 controlled 모드 — 자체 트리거 버튼을 그리지 않고, 외부(예: 계정
   * 드롭다운 메뉴의 "가이드" 항목)에서 열고 닫는다. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const EXTRA_QA: Record<Props['variant'], QA[]> = {
  demo: DEMO_QA,
  archive: ARCHIVE_QA,
  shared: SHARED_QA,
}

// 질문이 6개나 되고 문장도 길어서, 화면 구석 작은 박스에 넣고 내부 스크롤로
// 읽게 하면(특히 모바일에서) 답답하다 — 영화 카드 peek이 겪었던 것과 같은
// 문제라 같은 해법을 쓴다: 화면 중앙에 크게 띄우고, 배경을 누르면 닫힌다.
export function GuidePanel({ variant, triggerClassName, open: openProp, onOpenChange }: Props) {
  const controlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlled ? openProp : internalOpen
  const setOpen = (v: boolean) => (controlled ? onOpenChange?.(v) : setInternalOpen(v))
  const items = [...UNIVERSE_QA, ...EXTRA_QA[variant]]

  return (
    <>
      {!controlled && triggerClassName && (
        <button type="button" onClick={() => setOpen(!open)} className={`flex items-center gap-1 ${triggerClassName}`}>
          <HelpIcon />
          가이드
        </button>
      )}
      {/* z-index 숫자를 아무리 올려도 archive에서는 이 컴포넌트가 top bar의
          z-40짜리 위치 지정 div 안에 중첩돼 있어서, 그 부모의 스택 컨텍스트
          안에 갇혀 바깥(별들)과 직접 비교가 안 된다 — 밝은 중심 포스터가 패널을
          뚫고 올라와 보이던 버그의 진짜 원인이었다(열람 패널 하단 시트가 겪었던
          것과 같은 문제). document.body로 포탈해서 그 상위 스택 컨텍스트를
          아예 벗어나야 확실히 해결된다. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE_SLOW }}
                className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-6"
                onClick={() => setOpen(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="themed-scroll max-h-[85vh] w-[min(90vw,420px)] overflow-y-auto rounded-lg border border-white/10 bg-black px-5 py-5"
                >
                  <ul className="flex flex-col gap-5">
                    {items.map((item) => (
                      <li key={item.q}>
                        <p className="text-xs tracking-[0.15em] text-white/60">{item.q}</p>
                        <p className="mt-2 text-xs leading-relaxed tracking-wide text-white/35">{item.a}</p>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => setOpen(false)} className={`mt-6 ${secondaryNavLinkClass}`}>
                    닫기
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
