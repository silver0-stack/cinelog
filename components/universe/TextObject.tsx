'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { motion, type MotionValue } from 'framer-motion'
import { DURATION, EASE_SLOW } from '@/lib/motion'
import { parseLiteMarkdown } from '@/lib/liteMarkdown'
import type { UniverseText } from '@/lib/universeTexts'

const BASE_FONT_SIZE = 16
const MIN_SIZE = 0.6
const MAX_SIZE = 3
const DRAG_START_THRESHOLD = 10
// 대각선으로 이만큼(월드 px) 끌어야 크기가 1단계(예: 1 → 1.1) 바뀐다 — 손끝
// 움직임과 크기 변화가 너무 예민하지도, 둔하지도 않게 잡은 값.
const RESIZE_SENSITIVITY = 80
// (2026-09-07) 처음엔 편집창 너비를 글자 수(ch)만큼 그때그때 늘려서 라벨
// 용도에만 맞았다 — 짧은 라벨뿐 아니라 우주에 대한 긴 글도 자유롭게 쓸 수
// 있어야 한다는 방향으로 바뀌면서(마크다운 지원과 같은 이유) 고정 너비 +
// 자동 줄바꿈 + 세로로 늘어나는 방식으로 바꿨다. size가 커질수록 한 줄에
// 담기는 글자가 너무 적어지지 않도록 너비도 같이 조금씩 늘린다.
const EDITOR_BASE_WIDTH = 220

type Props = {
  text: UniverseText
  /** true면(본인 아카이브) 클릭해서 편집·드래그로 이동·리사이즈 핸들이 전부
   * 켜진다. 없으면(데모/공유 우주) 그냥 놓인 텍스트를 읽기 전용으로만 본다. */
  editable: boolean
  zoomScale: MotionValue<number>
  onDragPosition: (id: string, x: number, y: number) => void
  onCommitPosition: (id: string, x: number, y: number) => void
  onResize: (id: string, size: number) => void
  onCommitResize: (id: string, size: number) => void
  /** 편집을 끝내고 블러했을 때 호출 — 빈 문자열이면 호출부가 삭제로 처리한다. */
  onCommitContent: (id: string, content: string) => void
}

// 우주 아무 데나 자유롭게 놓는 텍스트 — 별자리(선으로 잇기)를 실제로 만들어보고
// "결국 거미줄이 된다"는 문제로 되돌린 뒤 나온 대안이다(CLAUDE.md 2026-09-07).
// 영화를 한데 모으고 싶으면 이미 있는 자유 드래그 배치를 쓰고, 거기에 이름을
// 붙이고 싶으면 이 텍스트를 근처에 놓는다 — "그룹"이라는 관계는 DB에 없고
// 순전히 공간 배치로만 표현된다. MovieBody의 위치 규약(자가 중심 정렬 +
// pointerdown/move/up 드래그)을 그대로 따르되, 포스터·흔들림 애니메이션은
// 없다 — 별이 아니라 "놓아둔 오브젝트"라 드리프트하면 오히려 읽기 어렵다.
export function TextObject({
  text,
  editable,
  zoomScale,
  onDragPosition,
  onCommitPosition,
  onResize,
  onCommitResize,
  onCommitContent,
}: Props) {
  const { id, x, y, size } = text
  // 내용이 비어있는 채로 마운트됐다는 건 방금 "+ 텍스트"로 막 만들어졌다는
  // 뜻이다 — 그 경우에만 곧바로 편집 모드로 시작한다(별도 트리거 prop 없이).
  const [isEditing, setIsEditing] = useState(editable && text.content === '')
  const [draft, setDraft] = useState(text.content)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const cancelledRef = useRef(false)

  const dragRef = useRef<
    | { mode: 'idle' }
    | { mode: 'pending'; startX: number; startY: number }
    | { mode: 'drag'; startWorldX: number; startWorldY: number; startX: number; startY: number }
  >({ mode: 'idle' })
  const suppressClickRef = useRef(false)
  const lastDragPositionRef = useRef({ x, y })

  // MovieBody.handlePointerDown과 같은 pending→threshold→drag 패턴(포스터/제목
  // 분리 없이 텍스트 하나에만 적용하면 되므로 더 단순하다) — 임계값 안에서
  // 놓으면 "클릭"(편집 진입), 넘으면 "드래그"(위치 이동)로 갈린다.
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!editable || e.button !== 0 || isEditing) return

    const startX = e.clientX
    const startY = e.clientY
    dragRef.current = { mode: 'pending', startX, startY }

    const applyMove = (clientX: number, clientY: number) => {
      let state = dragRef.current
      if (state.mode === 'idle') return

      if (state.mode === 'pending') {
        if (Math.hypot(clientX - state.startX, clientY - state.startY) < DRAG_START_THRESHOLD) return
        state = { mode: 'drag', startWorldX: x, startWorldY: y, startX: state.startX, startY: state.startY }
        dragRef.current = state
        suppressClickRef.current = true
        setIsDragging(true)
      }

      const zoom = zoomScale.get() || 1
      const nextX = state.startWorldX + (clientX - state.startX) / zoom
      const nextY = state.startWorldY + (clientY - state.startY) / zoom
      lastDragPositionRef.current = { x: nextX, y: nextY }
      onDragPosition(id, nextX, nextY)
    }

    const handleWindowPointerMove = (ev: PointerEvent) => applyMove(ev.clientX, ev.clientY)
    const endDrag = (ev: PointerEvent) => {
      applyMove(ev.clientX, ev.clientY)
      if (dragRef.current.mode === 'drag') {
        onCommitPosition(id, lastDragPositionRef.current.x, lastDragPositionRef.current.y)
      }
      dragRef.current = { mode: 'idle' }
      setIsDragging(false)
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (!editable) return
    cancelledRef.current = false
    setDraft(text.content)
    setIsEditing(true)
  }

  // 고정 너비 textarea가 내용에 맞춰 세로로만 늘어나게 한다(가로로 계속
  // 넓어지던 예전 방식 대신) — 흔히 쓰는 "auto-grow textarea" 기법.
  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  const handleBlur = () => {
    setIsEditing(false)
    if (cancelledRef.current) return
    onCommitContent(id, draft.trim())
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      cancelledRef.current = true
      setDraft(text.content)
      e.currentTarget.blur()
    }
  }

  // 리사이즈 핸들 — 위치 드래그와 완전히 독립된 별도 포인터 제스처(다른 DOM
  // 엘리먼트에서 시작). 오른쪽 아래로 끌수록(대각선 합산 거리) 커진다.
  const resizeStartRef = useRef<{ startX: number; startY: number; startSize: number } | null>(null)
  const lastSizeRef = useRef(size)
  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    // 기본 동작(mousedown이 포커스를 이 div로 옮기려는 것)을 막아야 한다 — 안
    // 막으면 편집 중이던 textarea가 이 순간 바로 blur되고, blur 핸들러가 편집을
    // 끝내버려서 핸들 자체가 리렌더로 사라진다(리사이즈 제스처가 시작하자마자
    // 끝나버려서 실제로는 크기가 안 바뀌는 것처럼 보였다 — 실제로 겪은 버그).
    e.preventDefault()
    resizeStartRef.current = { startX: e.clientX, startY: e.clientY, startSize: size }
    lastSizeRef.current = size
    setIsResizing(true)

    const applyResize = (clientX: number, clientY: number) => {
      const start = resizeStartRef.current
      if (!start) return
      const zoom = zoomScale.get() || 1
      const delta = (clientX - start.startX + (clientY - start.startY)) / zoom
      const nextSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, start.startSize + delta / RESIZE_SENSITIVITY))
      lastSizeRef.current = nextSize
      onResize(id, nextSize)
    }

    const handleMove = (ev: PointerEvent) => applyResize(ev.clientX, ev.clientY)
    const endResize = (ev: PointerEvent) => {
      applyResize(ev.clientX, ev.clientY)
      resizeStartRef.current = null
      setIsResizing(false)
      onCommitResize(id, lastSizeRef.current)
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', endResize)
      window.removeEventListener('pointercancel', endResize)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', endResize)
    window.addEventListener('pointercancel', endResize)
  }

  const fontSize = BASE_FONT_SIZE * size

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{ zIndex: isEditing || isDragging ? 500 : 0 }}
      initial={{ x, y }}
      animate={{ x, y }}
      transition={{ duration: isDragging ? 0 : DURATION.approach, ease: EASE_SLOW }}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <div
          data-star=""
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          className={`relative inline-block select-none whitespace-pre-wrap ${
            !editable ? '' : isDragging || isResizing ? 'cursor-grabbing' : isEditing ? 'cursor-text' : 'cursor-grab'
          }`}
        >
          {isEditing ? (
            <textarea
              autoFocus
              ref={(el) => {
                if (el) autoGrow(el)
              }}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                autoGrow(e.target)
              }}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="텍스트 (마크다운 가능: # 제목, **굵게**, *기울임*, - 목록)"
              rows={1}
              className="resize-none overflow-hidden border-b border-white/20 bg-transparent text-white/85 outline-none placeholder:text-white/25"
              style={{ fontSize, width: Math.round(EDITOR_BASE_WIDTH * Math.max(1, size)) }}
            />
          ) : (
            <div
              className="text-white/70"
              style={{ fontSize, textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)' }}
            >
              {parseLiteMarkdown(text.content)}
            </div>
          )}

          {/* 리사이즈 핸들은 편집 모드일 때만 보인다 — 평소엔 화면에 안
              보여서 어지럽지 않다. */}
          {isEditing && (
            <div
              onPointerDown={handleResizePointerDown}
              className="absolute -bottom-2 -right-2 h-3 w-3 cursor-nwse-resize rounded-full border border-white/50 bg-black"
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}
