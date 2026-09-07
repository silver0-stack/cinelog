import type { Locale } from './locale'

// 여기저기서 재사용되는 짧은 UI 문구만 모은다 — 한 곳에서만 쓰이는 긴 문단
// (GuidePanel QA, Entrance 카피, LoginForm 안내문 등)은 그 컴포넌트 옆에
// Record<Locale, T> 형태로 따로 둔다(README 격인 계획 문서 참고).
type Dict = Record<string, string>

const ko: Dict = {
  // 공통 네비게이션 / 버튼
  'nav.guide': '가이드',
  'nav.search': '검색',
  'nav.addLog': '+ 기록',
  'nav.addText': '+ 텍스트',
  'nav.account': '계정',
  'nav.exit': '← 나가기',
  'nav.recenter': '처음으로',
  'nav.back': '← 뒤로',
  'nav.close': '닫기',
  'nav.closeArrow': '← 닫기',
  'nav.explore': '탐색',
  'nav.viewHistory': '히스토리 보기',
  'nav.backToArchive': '아카이브로',
  'nav.logMovie': '영화 기록하기',
  'nav.iAlsoWantToLog': '나도 기록하기',
  'nav.goToMyUniverse': '내 우주 가기',
  'nav.createMyUniverse': '내 우주 만들기',

  // 검색
  'search.placeholder': '영화 검색',
  'search.hint': '우주에서 빛나는 별을 눌러봐',
  'search.noMatch': '일치하는 영화가 없어',

  // + 기록 폼 (LogMovieForm)
  'form.title': '제목',
  'form.year': '연도',
  'form.director': '감독',
  'form.notePlaceholder': '메모 (선택, 짧게 한 줄이어도 길게 리뷰여도 괜찮아)',
  'form.enterManually': '직접 입력할게',
  'form.back': '뒤로',
  'form.save': 'SAVE',
  'form.saving': 'SAVING',
  'form.loggedMovie': '{title} 기록했어.',
  'form.duplicateMovie': '{title}, 이미 기록했어.',
  'form.logAnother': '다른 영화 기록하기',
  'form.viewInUniverse': '우주에서 보기',
  'form.duplicateHint': '다시 봤다면 그 포스터를 열어서 새 감상을 남겨봐.',
  'form.searchAnother': '다른 영화 검색',
  'form.goToThatPoster': '그 포스터로 가기',
  'error.requiredFields': '제목과 연도는 채워줘.',
  'error.saveFailed': '저장하지 못했어. 잠시 후 다시 시도해줘.',

  // 우주 공유
  'share.universe': '우주 공유',
  'share.copyLink': '우주 링크 복사',
  'share.copied': '복사됨',
  'share.creating': '만드는 중',
  'share.hint': '이 링크를 보내서 네 우주를 보여줘봐',

  // 영화 카드 공유
  'shareCard.copyLink': '카드 링크 복사',
  'shareCard.share': '영화 카드 공유',
  'shareCard.copied': '복사됨',
  'shareCard.creating': '만드는 중',
  'ticket.title': '영화입장권',
  'ticket.watchedAt': '관람일',
  'ticket.rating': '평점',
  'ticket.rewatch': '다시 봄',
  'ticket.noPoster': '포스터 없음',
  'ticket.saveImage': '이미지 저장',
  'ticket.notRealTicket': '본 티켓은 실사용 불가',
  'ticket.rewatchScroll': '이전 관람 {count}회 · 스크롤',
  'ticket.rewatchCount': '{count}회',

  // peek 패널
  'peek.saving': '저장 중',
  'peek.save': '저장',
  'peek.cancel': '취소',
  'peek.logAnotherViewing': '다시 본 감상 남기기',
  'peek.logViewing': '감상 남기기',
  'peek.editViewing': '이 감상 고치기',
  'peek.delete': '삭제',
  'peek.duplicateError': '이미 기록한 다른 영화와 같은 작품이야.',
  'peek.rewatchHint': '같은 영화를 또 봤다면 새 감상을 남겨. 이전 감상은 지워지지 않고 쌓여',
  'peek.loadedFromTmdb': 'TMDB에서 불러옴',
  'nav.editInfo': '정보 수정',

  // 로그인
  'login.goToUniverse': '내 우주로 가기',
  'login.sendLink': 'SEND LINK',
  'login.sending': 'SENDING',
  'login.invalidEmail': '올바른 이메일 주소를 입력해줘.',
  'login.sendFailed': '링크를 보내지 못했어. 잠시 후 다시 시도해줘.',

  'dev.supabaseNotConfigured1': 'Supabase 프로젝트가 아직 연결되지 않았어.',
  'dev.supabaseNotConfigured2': '.env.local에 URL과 anon key를 채워줘.',

  // 빈 상태 / 에러 페이지
  'empty.archive.title': '아직 기록한 영화가 없어.',
  'empty.archive.subtitle': '첫 영화를 기록하면 우주가 시작돼.',
  'empty.archive.cta': '첫 영화 기록하기',
  'notFound.generic': '이 자리엔 아무것도 없어.',
  'notFound.link': '링크를 찾을 수 없어.',
  'notFound.noMoviesYet': '아직 기록된 영화가 없어.',

  // 텍스트 오브젝트
  'text.placeholder': '텍스트 (마크다운 가능: # 제목, **굵게**, *기울임*, - 목록)',

  // 히스토리 레일
  'history.dragHint': '드래그해서 영화가 기록된 순서대로 우주가 자라나는 걸 봐',
  'history.backToNow': '현재로 돌아가기',

  // 탐색 패널 인사이트
  'insight.topDirector': '가장 짙은 중력',
  'insight.topGenre': '가장 흔한 결',
  'insight.topEra': '가장 머무른 시대',
  'insight.topRating': '가장 많이 준 평점',
  'insight.filmCount': '{count}편',
  'insight.hint': '재관람한 영화와 감독·장르 경향을 여기서 볼 수 있어',
  'insight.rewatchCount': '{count}회',
  'insight.summary': '{label} · {value} ({detail})',

  'search.moviePlaceholder': '영화 제목',
  'loading.fetching': '불러오는 중',
  'loading.searching': '검색 중',

  // 데모 별 추가
  'demoAddStar.cta': '+ 영화 등록해보기',
  'demoAddStar.notSaved1': '이 포스터는 저장되지 않아.',
  'demoAddStar.notSaved2': '어떻게 자리 잡는지만 잠깐 볼 수 있어.',
  'demoAddStar.submit': '넣어보기',
  'demoAddStar.close': '닫기',
  'demoAddStar.back': '뒤로',
  'demoAddStar.willVanish': '로그인하지 않으면 이 포스터는 사라져.',

  'aria.openMovie': '{title} 열람하기',
  'aria.closeMovie': '{title} 닫기',
  'aria.rating': '별점 {n}',

  // 언어 토글
  'locale.toggleTo': 'EN',

  // 장르
  'genre.액션': '액션',
  'genre.애니메이션': '애니메이션',
  'genre.코미디': '코미디',
  'genre.범죄': '범죄',
  'genre.다큐멘터리': '다큐멘터리',
  'genre.드라마': '드라마',
  'genre.가족': '가족',
  'genre.판타지': '판타지',
  'genre.공포': '공포',
  'genre.음악': '음악',
  'genre.미스터리': '미스터리',
  'genre.로맨스': '로맨스',
  'genre.SF': 'SF',
  'genre.스릴러': '스릴러',
}

const en: Dict = {
  'nav.guide': 'Guide',
  'nav.search': 'Search',
  'nav.addLog': '+ Log',
  'nav.addText': '+ Text',
  'nav.account': 'Account',
  'nav.exit': '← Exit',
  'nav.recenter': 'Recenter',
  'nav.back': '← Back',
  'nav.close': 'Close',
  'nav.closeArrow': '← Close',
  'nav.explore': 'Explore',
  'nav.viewHistory': 'View history',
  'nav.backToArchive': 'To archive',
  'nav.logMovie': 'Log a movie',
  'nav.iAlsoWantToLog': 'Start my own',
  'nav.goToMyUniverse': 'Go to my universe',
  'nav.createMyUniverse': 'Create my universe',

  'search.placeholder': 'Search movies',
  'search.hint': 'Tap a glowing star in the universe',
  'search.noMatch': 'No matching movies',

  'form.title': 'Title',
  'form.year': 'Year',
  'form.director': 'Director',
  'form.notePlaceholder': 'Note (optional — a quick line or a full review, either works)',
  'form.enterManually': "I'll enter it myself",
  'form.back': 'Back',
  'form.save': 'SAVE',
  'form.saving': 'SAVING',
  'form.loggedMovie': 'Logged {title}.',
  'form.duplicateMovie': "You've already logged {title}.",
  'form.logAnother': 'Log another movie',
  'form.viewInUniverse': 'View in universe',
  'form.duplicateHint': "If you watched it again, open that poster and log a new viewing.",
  'form.searchAnother': 'Search another movie',
  'form.goToThatPoster': 'Go to that poster',
  'error.requiredFields': 'Fill in the title and year.',
  'error.saveFailed': "Couldn't save. Try again in a moment.",

  'share.universe': 'Share universe',
  'share.copyLink': 'Copy universe link',
  'share.copied': 'Copied',
  'share.creating': 'Creating',
  'share.hint': 'Send this link to show off your universe',

  'shareCard.copyLink': 'Copy card link',
  'shareCard.share': 'Share movie card',
  'shareCard.copied': 'Copied',
  'shareCard.creating': 'Creating',
  'ticket.title': 'ADMIT ONE',
  'ticket.watchedAt': 'Watched',
  'ticket.rating': 'Rating',
  'ticket.rewatch': 'Rewatched',
  'ticket.noPoster': 'No poster',
  'ticket.saveImage': 'Save image',
  'ticket.notRealTicket': 'Not a real ticket',
  'ticket.rewatchScroll': '{count} earlier viewings · scroll',
  'ticket.rewatchCount': '×{count}',

  'peek.saving': 'Saving',
  'peek.save': 'Save',
  'peek.cancel': 'Cancel',
  'peek.logAnotherViewing': 'Log another viewing',
  'peek.logViewing': 'Log this viewing',
  'peek.editViewing': 'Edit this viewing',
  'peek.delete': 'Delete',
  'peek.duplicateError': "You've already logged this as another entry.",
  'peek.rewatchHint': "If you watched this again, log a new viewing. Earlier ones stay, they don't get erased",
  'peek.loadedFromTmdb': 'Loaded from TMDB',
  'nav.editInfo': 'Edit info',

  'login.goToUniverse': 'Go to my universe',
  'login.sendLink': 'SEND LINK',
  'login.sending': 'SENDING',
  'login.invalidEmail': 'Enter a valid email address.',
  'login.sendFailed': "Couldn't send the link. Try again in a moment.",

  'dev.supabaseNotConfigured1': "Supabase isn't connected yet.",
  'dev.supabaseNotConfigured2': 'Fill in the URL and anon key in .env.local.',

  'empty.archive.title': "You haven't logged any movies yet.",
  'empty.archive.subtitle': 'Log your first movie and your universe begins.',
  'empty.archive.cta': 'Log your first movie',
  'notFound.generic': "There's nothing here.",
  'notFound.link': "Couldn't find that link.",
  'notFound.noMoviesYet': 'No movies logged yet.',

  'text.placeholder': 'Text (markdown: # heading, **bold**, *italic*, - list)',

  'history.dragHint': 'Drag to watch the universe grow in the order movies were logged',
  'history.backToNow': 'Back to now',

  'insight.topDirector': 'Strongest gravity',
  'insight.topGenre': 'Most common thread',
  'insight.topEra': 'Most lingered-in era',
  'insight.topRating': 'Most given rating',
  'insight.filmCount': '{count} films',
  'insight.hint': 'See your rewatches and director/genre trends here',
  'insight.rewatchCount': '×{count}',
  'insight.summary': '{label} · {value} ({detail})',

  'search.moviePlaceholder': 'Movie title',
  'loading.fetching': 'Loading',
  'loading.searching': 'Searching',

  'demoAddStar.cta': '+ Try logging a movie',
  'demoAddStar.notSaved1': "This poster won't be saved.",
  'demoAddStar.notSaved2': "It's just a preview of how it settles into place.",
  'demoAddStar.submit': 'Try it',
  'demoAddStar.close': 'Close',
  'demoAddStar.back': 'Back',
  'demoAddStar.willVanish': "This poster disappears unless you're logged in.",

  'aria.openMovie': 'Open {title}',
  'aria.closeMovie': 'Close {title}',
  'aria.rating': 'Rating {n}',

  'locale.toggleTo': 'KO',

  'genre.액션': 'Action',
  'genre.애니메이션': 'Animation',
  'genre.코미디': 'Comedy',
  'genre.범죄': 'Crime',
  'genre.다큐멘터리': 'Documentary',
  'genre.드라마': 'Drama',
  'genre.가족': 'Family',
  'genre.판타지': 'Fantasy',
  'genre.공포': 'Horror',
  'genre.음악': 'Music',
  'genre.미스터리': 'Mystery',
  'genre.로맨스': 'Romance',
  'genre.SF': 'Sci-Fi',
  'genre.스릴러': 'Thriller',
}

const dictionaries: Record<Locale, Dict> = { ko, en }

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const template = dictionaries[locale][key] ?? dictionaries.ko[key] ?? key
  if (!vars) return template
  return Object.entries(vars).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)), template)
}
