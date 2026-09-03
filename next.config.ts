import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 모드에서만 뜨는 Next.js DevTools 인디케이터(좌측 하단 "N" 아이콘)를 끈다.
  // 실제 배포(프로덕션 빌드)에서는 어차피 안 뜨지만, 로컬 개발 중 이 사이트의
  // 절제된 톤과 안 어울려서 꺼둔다.
  devIndicators: false,
};

export default nextConfig;
