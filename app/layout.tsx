import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// og:image 같은 메타데이터의 상대 경로를 절대 URL로 만드는 기준 도메인.
// 이게 없으면 Next가 http://localhost:3000을 기준으로 삼아서, 배포된
// 사이트에서도 카카오톡/트위터 크롤러가 접근 못 하는 깨진 이미지 URL이 나간다.
const siteUrl = "https://cinelog.dev";

// 한국 사용자가 "시네로그"(한글 표기)나 "영화 아카이빙"으로 검색했을 때도
// 걸리도록 title/description에 자연스럽게 녹였다. 화면에 보이는 카피(Entrance.tsx)는
// 절제된 톤을 그대로 유지하고, 검색엔진에만 보이는 이 메타데이터에서만 키워드를 더한다.
const description =
  "감독, 장르, 시대에 따라 영화들이 관계를 맺으며 우주를 이루는 영화 아카이빙 서비스. 본 영화를 기록하면 나만의 영화 우주가 자라나.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CINELOG(시네로그) · 영화와 영화 사이, 당신만의 우주",
  description,
  openGraph: {
    title: "CINELOG(시네로그)",
    description,
    url: siteUrl,
    siteName: "CINELOG",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "CINELOG(시네로그)",
    description,
  },
};

// 구글이 "시네로그"라는 한글 표기와 CINELOG를 같은 것으로 알아보게 하는 데
// title/description보다 더 직접적인 신호 — alternateName이 정확히 이 용도다.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "CINELOG",
  alternateName: "시네로그",
  url: siteUrl,
  description,
  inLanguage: "ko-KR",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">
        {children}
        {/* 바이럴이 실제로 왔는지 감으로만 판단하지 않으려고 추가 — 쿠키 없이
            방문자 수/유입 경로만 집계하는 방식이라 별도 동의 배너가 필요 없다.
            Vercel 대시보드에서 프로젝트의 Web Analytics를 켜야 실제로 수집된다
            (코드만 있고 대시보드에서 안 켜면 아무 일도 안 일어난다). */}
        <Analytics />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
