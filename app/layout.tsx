import type { Metadata } from "next";
import "./globals.css";

// 검색엔진 색인만 막는다. 볼 사람을 제한하려면 Vercel의 Deployment Protection을 쓴다.
export const metadata: Metadata = {
  title: "AI와 일하는 HR 5기 교안",
  description: "원티드랩 Claude 심화 부트캠프 AI와 일하는 HR 5기 교안",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
