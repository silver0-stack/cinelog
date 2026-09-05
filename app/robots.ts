import type { MetadataRoute } from 'next'

const siteUrl = 'https://cinelog.dev'

// /u/[slug], /m/[slug]는 "링크를 아는 사람만 볼 수 있다"는 게 이 프로젝트의
// 의도된 공유 방식이다(CLAUDE.md 섹션 2 — 실시간 프레즌스/소셜 디스커버리를
// 의도적으로 안 만듦). 여기서 안 막으면 구글이 남의 개인 우주/영화 카드를
// 색인해서 검색으로 우연히 찾아지게 되니, SEO를 위해 오히려 이 두 경로는
// 명시적으로 막아야 한다. /archive, /login, /auth도 로그인 전용이거나
// 리다이렉트 핸들러라 색인할 콘텐츠 가치가 없다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/archive', '/login', '/auth', '/u/', '/m/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
