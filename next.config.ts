import type { NextConfig } from "next";

// 정적 내보내기. `npm run build` 한 번으로 Vercel 배포용과 오프라인 사본을
// 동시에 만든다. out/ 을 그대로 올리거나, 압축해 보내고 받는 쪽에서
// 로컬 서버로 열면 된다.
//
// assetPrefix 는 쓰지 않는다. day1(단일 페이지)은 상대경로 "." 로 file://
// 더블클릭을 지원했지만, day2 는 /guide/02/ 같은 중첩 라우트가 있고
// assetPrefix 는 페이지 깊이와 무관하게 일괄 적용된다. 챕터 페이지가
// out/guide/02/_next/ 를 찾게 되는데 그런 디렉터리는 없다. 상대경로로는
// file:// 든 로컬 서버든 챕터가 깨지므로, 절대경로로 두고 서버로 연다.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true
};

export default nextConfig;
