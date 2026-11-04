import type { Metadata } from "next";
import "./globals.css";

// 유료 과정 교안이라 검색엔진 색인만 막는다. 접근 제한은 두지 않는다(설계 4절).
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
