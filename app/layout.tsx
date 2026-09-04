import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CINELOG",
  description: "영화와 영화 사이, 당신만의 우주.",
  openGraph: {
    title: "CINELOG",
    description: "영화와 영화 사이, 당신만의 우주.",
    url: siteUrl,
    siteName: "CINELOG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CINELOG",
    description: "영화와 영화 사이, 당신만의 우주.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black">{children}</body>
    </html>
  );
}
