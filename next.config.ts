import type { NextConfig } from "next";

// 정적 내보내기. `npm run build` 한 번으로 Vercel 배포용과 오프라인 사본(out/)을
// 함께 만든다. 장 페이지가 /guide/1-1/ 같은 중첩 경로라 자원을 절대경로로 찾으므로,
// out/은 HTML 파일을 더블클릭하지 말고 로컬 서버로 연다. assetPrefix는 쓰지 않는다.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true
};

export default nextConfig;
