import type { MetadataRoute } from 'next'

const siteUrl = 'https://cinelog.dev'

// 랜딩 페이지 하나뿐이다 — /archive·/u/[slug]·/m/[slug]는 로그인 전용이거나
// "링크를 아는 사람만" 보는 공유 콘텐츠라 사이트맵에 넣지 않는다(robots.ts와
// 같은 이유). 넣으면 구글이 그 링크들을 알아서 찾아내 색인해버려서, 의도적으로
// 만든 비공개 공유 방식이 깨진다.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}
