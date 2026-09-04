'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_SLOW } from '@/lib/motion'
import { secondaryNavLinkClass } from '@/lib/uiStyles'
import { useClickOutside } from '@/lib/useClickOutside'

type QA = { q: string; a: string }

// 어디서나 통하는 기본 질문. 우주가 뭔지, 별 사이 거리가 뭘 뜻하는지 자체를
// 몰라서 못 즐긴다는 피드백이 있었다 — 화면에 상시 설명을 깔지 않는 대신,
// 원할 때 꺼내볼 수 있는 이 패널 하나로 대응한다.
const UNIVERSE_QA: QA[] = [
  { q: '별 하나가 뭐야?', a: '영화 한 편이야. 화면 중앙의 별이 지금 보고 있는 영화고, 나머지는 그 영화와의 관계에 따라 자리 잡아.' },
  { q: '별 사이 거리는 뭘 뜻해?', a: '관계의 강도야. 같은 감독, 겹치는 장르·테마일수록, 또는 직접 연결해둔 사이일수록 가까워져.' },
  { q: '별을 누르면?', a: '그 영화를 열람해. 그 안의 "이 영화를 중심으로"를 누르면 그 영화 기준으로 우주 전체가 다시 배치돼 — 그렇게 관계를 따라 옮겨 다니는 거야.' },
  { q: '확대·축소는 어떻게 해?', a: '데스크톱은 Ctrl + 마우스 휠, 모바일은 두 손가락으로 핀치. 빈 공간을 드래그하면 화면이 움직여.' },
]

const DEMO_QA: QA[] = [
  { q: '이 우주는 진짜야?', a: '내가 직접 고른 24편이야. 실제로 계속 채워가는 개인 아카이브는 화면 구석 "제작자의 우주 구경하기"에서 볼 수 있어.' },
]

const ARCHIVE_QA: QA[] = [
  { q: '"다시 본 감상 남기기"는 뭐야?', a: '이 영화를 또 봤을 때 새 감상을 남기는 거야. 이전 감상을 덮어쓰지 않고 그대로 쌓여.' },
  { q: '우주 공유랑 영화 카드 공유는 뭐가 달라?', a: '우주 공유는 내 아카이브 전체를 보여주는 링크고, 영화 카드 공유는 그 영화 한 편만 보여주는 링크야.' },
]

type Props = {
  /** 'demo'면 비로그인 데모 우주용 질문을, 'archive'면 로그인한 개인 아카이브용 질문을 더한다. */
  variant: 'demo' | 'archive'
  /** 트리거 버튼 위치. 화면마다 이미 차지된 구석이 달라서 호출부에서 지정한다. */
  triggerClassName: string
  /** 패널이 트리거 기준 어느 방향으로 펼쳐질지. */
  panelClassName: string
}

export function GuidePanel({ variant, triggerClassName, panelClassName }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, open, () => setOpen(false))
  const items = [...UNIVERSE_QA, ...(variant === 'demo' ? DEMO_QA : ARCHIVE_QA)]

  return (
    <div ref={containerRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClassName}>
        가이드
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE_SLOW }}
            className={`themed-scroll z-20 max-h-[60vh] w-64 overflow-y-auto bg-black px-4 py-4 ${panelClassName}`}
          >
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.q}>
                  <p className="text-[10px] tracking-[0.15em] text-white/60">{item.q}</p>
                  <p className="mt-1.5 text-[10px] leading-relaxed tracking-wide text-white/35">{item.a}</p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`mt-4 ${secondaryNavLinkClass}`}
            >
              닫기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
