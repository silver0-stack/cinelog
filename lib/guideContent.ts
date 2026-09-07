import type { Locale } from './i18n/locale'

export type QA = { q: string; a: string }

// GuidePanel(데모/공유 우주의 팝업 가이드)와 아카이브 설정 페이지(/archive/settings)가
// 같은 FAQ 내용을 공유한다 — 팝업이냐 페이지 한 섹션이냐만 다르고 질문/답변
// 자체는 같아야 하므로 한 곳에 둔다(2026-09-08, 아카이브 설정 페이지 신설과 함께
// GuidePanel.tsx에서 이 파일로 옮김).
//
// 포스터가 늘 보이니 "이게 영화 목록이다"는 이제 화면만 봐도 안다 — 그래서
// "별이 뭐야"류 정의는 뺐다. 지금 화면에서 실제로 안 보이는 것(왜 이 자리에
// 있는지, 눌렀을 때 뭐가 일어나는지)만 남긴다.
export const UNIVERSE_QA: Record<Locale, QA[]> = {
  ko: [
    {
      q: '영화들이 왜 이 자리에 있어?',
      a: '기본적으로는 우주 전체에서 자기와 가장 강하게 이어진 한 편과의 관계로 자리가 정해져(같은 감독, 겹치는 장르·테마일수록 안쪽으로, 같은 장르는 같은 방향으로). 별을 직접 드래그해서 옮기면 그때부터는 그 자리가 그대로 저장되고, 다시는 자동으로 안 움직여 — 데이터로는 안 잡히는 나만의 연결을 표현하는 거야.',
    },
    {
      q: '제목 밑에 보이는 평점/메모는 뭐야?',
      a: '그 영화에 남긴 감상 미리보기야. 별점 옆에 "2회"처럼 숫자가 있으면 그 영화를 다시 본 횟수야. 눌러서 전체를 볼 수 있어.',
    },
    {
      q: '눌러보면?',
      a: '카메라가 그 포스터로 확대해서 다가가고, 옆(좁은 화면에서는 아래)에 평점·메모·감상 이력이 펼쳐져. 동시에 그 영화와 관계 깊은 별들만 밝아지고 나머지는 어두워져 — 재배치 없이 관계를 보여주는 거야. 포스터를 다시 누르거나 빈 공간을 누르면 원래대로 돌아가.',
    },
    {
      q: '확대·축소는 어떻게 해?',
      a: '데스크톱은 Ctrl + 마우스 휠, 모바일은 두 손가락으로 핀치. 빈 공간을 드래그하면 화면이 움직여. 많이 축소하면 포스터가 그 영화 색의 흐린 빛으로 접혀 보여. 다시 확대하면 원래대로 돌아와.',
    },
  ],
  en: [
    {
      q: 'Why are the movies positioned where they are?',
      a: "By default, each one settles based on its relationship to the one movie it's most strongly tied to across the whole universe (same director, overlapping genres or themes pull it inward; same genre pulls it toward the same direction). Drag a star to move it yourself, and from then on that spot is saved and it never moves automatically again — a way to express connections the data can't capture.",
    },
    {
      q: "What's the rating/note under the title?",
      a: 'A preview of what you logged for that movie. A number like "2x" next to the rating means how many times you\'ve rewatched it. Click to see everything.',
    },
    {
      q: 'What happens if I click one?',
      a: "The camera zooms in on that poster, and its rating, note, and viewing history unfold beside it (below, on narrow screens). At the same time, only the stars closely related to it light up while the rest dim — showing relationships without rearranging anything. Click the poster again, or click empty space, to go back.",
    },
    {
      q: 'How do I zoom in and out?',
      a: 'Ctrl + scroll wheel on desktop, pinch with two fingers on mobile. Drag empty space to pan. Zoom out far enough and posters fold into a faint glow of that movie\'s color. Zoom back in and they return.',
    },
  ],
}

export const DEMO_QA: Record<Locale, QA[]> = {
  ko: [
    { q: '이 우주는 진짜야?', a: '내가 직접 고른 80편이야. 로그인하면 이 자리에 네가 실제로 본 영화들로 채운 진짜 우주가 생겨.' },
    { q: '평점이나 메모를 남길 수 있어?', a: '응, 데모 80편 어디에나 자유롭게 남겨볼 수 있어. 저장은 안 되고 새로고침하면 사라져. 로그인하면 진짜로 쌓여.' },
  ],
  en: [
    { q: 'Is this universe real?', a: "It's 80 movies I picked myself. Log in and this spot becomes a real universe made of movies you've actually watched." },
    {
      q: 'Can I leave a rating or note?',
      a: "Yes, freely, on any of the 80 demo movies. Nothing is saved though — refresh and it's gone. Log in and it actually sticks.",
    },
  ],
}

export const ARCHIVE_QA: Record<Locale, QA[]> = {
  ko: [
    { q: '"다시 본 감상 남기기"는 뭐야?', a: '이 영화를 또 봤을 때 새 감상을 남기는 거야. 이전 감상을 덮어쓰지 않고 그대로 쌓여.' },
    { q: '우주 공유랑 영화 카드 공유는 뭐가 달라?', a: '우주 공유는 내 아카이브 전체를 보여주는 링크고, 영화 카드 공유는 그 영화 한 편만 보여주는 링크야.' },
    {
      q: '히스토리는 뭐야?',
      a: '내 우주가 시간이 지나며 어떻게 자라났는지 다시 보는 기능이야. "탐색" 패널 안의 히스토리 보기를 누르면 화면 아래 타임라인이 뜨고, 드래그하면 그 시점까지 기록한 영화만 빛나 보여.',
    },
  ],
  en: [
    { q: 'What does "log another viewing" do?', a: "Adds a fresh entry for a rewatch. It doesn't overwrite the earlier one — both stay, stacked up." },
    {
      q: "What's the difference between sharing my universe and sharing a movie card?",
      a: 'Sharing your universe links to your whole archive. Sharing a movie card links to just that one film.',
    },
    {
      q: "What's history?",
      a: 'Replays how your universe grew over time. Click "view history" inside the Explore panel to open a timeline at the bottom — drag it and only the movies logged by that point light up.',
    },
  ],
}

// 공유 링크로 들어온 사람은 CINELOG를 이때 처음 볼 수도 있다 — 데모/내 우주와
// 달리 "이게 데모인지 진짜인지"가 아니라 "이게 누구 건지"가 가장 먼저 드는
// 의문이라 질문을 따로 둔다.
export const SHARED_QA: Record<Locale, QA[]> = {
  ko: [
    { q: '이 우주는 뭐야?', a: '이 링크를 보낸 사람이 실제로 기록한 영화들이야. 너도 로그인하면 똑같은 방식으로 네 우주를 만들 수 있어(화면 구석 "나도 기록하기").' },
  ],
  en: [
    {
      q: "What is this universe?",
      a: 'The movies the person who sent you this link has actually watched. You can log in and build your own the same way (see "Start my own" in the corner).',
    },
  ],
}
