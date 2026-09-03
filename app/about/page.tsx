import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'ABOUT — CINELOG',
  description: '영화 한 편을 하나의 우주로 재해석한 인터랙티브 공간.',
}

const lineClass = 'text-xs font-light leading-loose tracking-[0.2em] text-white/50 sm:text-sm'

// 기능 나열이 아니라, 입장 화면과 같은 톤의 아주 짧은 매니페스토다(섹션 9의
// 절제된 방향을 따른다). 이 페이지 하나로 "이게 뭐 하는 사이트인지"가
// 전달돼야 하지만, 설명서처럼 읽히면 안 된다.
export default function AboutPage() {
  return (
    <main className="relative flex h-dvh w-screen flex-col items-center justify-center gap-14 bg-black px-6 text-center">
      <div className="flex flex-col items-center gap-10">
        <p className={lineClass}>
          CINELOG는
          <br />
          영화 정보 사이트가 아니다.
        </p>

        <p className={lineClass}>
          영화 한 편을
          <br />
          하나의 우주로 재해석한다.
        </p>

        <p className={lineClass}>
          좌석에 앉는다.
          <br />
          공간이 무너진다.
          <br />
          좌석이 블랙홀이 된다.
        </p>

        <p className={lineClass}>
          영화들이 있다.
          <br />
          가깝거나, 멀거나.
          <br />
          같은 감독이어서, 같은 장르여서,
          <br />
          당신이 그렇게 느껴서.
        </p>

        <p className={lineClass}>
          로그인하면
          <br />
          당신이 본 영화들로
          <br />
          당신만의 우주가 시작된다.
        </p>
      </div>

      {/* 이 페이지는 "이게 뭔지 알고 싶어서 온" 사람을 위한 곳이라, 매니페스토를
          읽고 난 바로 이 순간이 실제 전환 지점이다 — 그래서 여기서만은 LOG IN을
          구석의 옅은 링크가 아니라 ENTER 버튼과 같은 존재감으로 둔다. */}
      <div className="flex flex-col items-center gap-6">
        <Link
          href="/login"
          className="animate-pulse-slow text-xs font-light tracking-[0.5em] text-white/50 outline-none transition-colors duration-700 hover:text-white/85 focus-visible:text-white/85"
        >
          LOG IN
        </Link>
        <Link
          href="/"
          className="text-[10px] font-light tracking-[0.4em] text-white/25 outline-none transition-colors duration-700 hover:text-white/60 focus-visible:text-white/60"
        >
          돌아가기
        </Link>
      </div>
    </main>
  )
}
