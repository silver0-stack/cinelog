import { Fragment, type ReactNode } from 'react'

// 우주 텍스트 오브젝트 전용 아주 가벼운 마크다운 서브셋 — 제목(#/##/###),
// **굵게**, *기울임*, 빈 줄로 문단 구분, `- ` 리스트만 지원한다. 링크/이미지/
// 표/코드블록은 의도적으로 뺐다(우주 안에 떠 있는 개인적인 글이라는 맥락에
// 안 맞고, 이 정도 범위를 넘어가면 라이브러리 하나를 통째로 들여오는 게 더
// 무거워진다). dangerouslySetInnerHTML을 전혀 안 써서 임의 HTML이 섞일 걱정도 없다.

function parseInline(line: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let i = 0

  while ((match = regex.exec(line))) {
    if (match.index > lastIndex) nodes.push(line.slice(lastIndex, match.index))
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-${i++}`} className="font-normal text-white/95">
          {match[1]}
        </strong>,
      )
    } else if (match[2] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-${i++}`}>{match[2]}</em>)
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < line.length) nodes.push(line.slice(lastIndex))
  return nodes
}

const HEADER_SCALE: Record<number, string> = { 1: '1.4em', 2: '1.2em', 3: '1.08em' }

export function parseLiteMarkdown(content: string): ReactNode {
  const lines = content.split('\n')
  const blocks: ReactNode[] = []
  let paragraphLines: string[] = []
  let listItems: string[] = []

  const flushParagraph = (key: string) => {
    if (paragraphLines.length === 0) return
    const collected = paragraphLines
    blocks.push(
      <p key={key} className="my-0">
        {collected.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {parseInline(line, `${key}-${i}`)}
          </Fragment>
        ))}
      </p>,
    )
    paragraphLines = []
  }

  const flushList = (key: string) => {
    if (listItems.length === 0) return
    const collected = listItems
    blocks.push(
      <ul key={key} className="my-0 list-none">
        {collected.map((item, i) => (
          <li key={i} className="flex gap-1.5">
            <span aria-hidden="true" className="text-white/40">
              ·
            </span>
            <span>{parseInline(item, `${key}-li-${i}`)}</span>
          </li>
        ))}
      </ul>,
    )
    listItems = []
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()
    const headerMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed)
    const listMatch = /^-\s+(.*)$/.exec(trimmed)

    if (trimmed === '') {
      flushParagraph(`p-${idx}`)
      flushList(`l-${idx}`)
      return
    }
    if (headerMatch) {
      flushParagraph(`p-${idx}`)
      flushList(`l-${idx}`)
      const level = headerMatch[1].length
      const HeadingTag = (`h${level}` as unknown) as 'h1' | 'h2' | 'h3'
      blocks.push(
        <HeadingTag key={`h-${idx}`} style={{ fontSize: HEADER_SCALE[level] }} className="my-0 font-normal text-white/90">
          {parseInline(headerMatch[2], `h-${idx}`)}
        </HeadingTag>,
      )
      return
    }
    if (listMatch) {
      flushParagraph(`p-${idx}`)
      listItems.push(listMatch[1])
      return
    }
    flushList(`l-${idx}`)
    paragraphLines.push(line)
  })
  flushParagraph('p-end')
  flushList('l-end')

  return <>{blocks}</>
}
