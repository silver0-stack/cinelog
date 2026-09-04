import Link from 'next/link'
import { secondaryNavLinkClass } from '@/lib/uiStyles'

const slug = process.env.NEXT_PUBLIC_CREATOR_UNIVERSE_SLUG

// 콜드스타트 우회 — 팔로우/피드 없이, 제작자 본인의 실제 아카이브를 유일한
// "이렇게 쓰는 거구나" 예시로 보여준다. /archive의 공유 버튼으로 만든 실제
// 공유 링크의 slug를 NEXT_PUBLIC_CREATOR_UNIVERSE_SLUG에 넣기 전까지는 아무것도
// 렌더링하지 않는다 — 값이 없는 채로 링크를 추측해서 깨진 링크를 노출하지 않는다.
export function CreatorUniverseLink() {
  if (!slug) return null

  return (
    <Link href={`/u/${slug}`} className={secondaryNavLinkClass}>
      → 제작자의 진짜 우주 구경하기
    </Link>
  )
}
