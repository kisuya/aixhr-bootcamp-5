import Link from "next/link";
import { GuideShell } from "@/components/GuideShell";
import { getChapters } from "@/lib/chapters";
import { VISIBLE_SESSIONS } from "@/lib/sessions";

// 공개 전 회차나 없는 주소로 들어온 수강생이 보는 화면. 정적 내보내기에서는
// out/404.html이 되어, 아직 생성되지 않은 /guide/2-1/ 같은 주소에 쓰인다.
export default function NotFound() {
  const chapters = getChapters();
  const closed = VISIBLE_SESSIONS.filter((session) => !session.open);

  return (
    <GuideShell chapters={chapters} current={null}>
      <section className="home-hero">
        <p className="home-hero__eyebrow">원티드랩 Claude 심화 부트캠프</p>
        <h1>{closed.length > 0 ? "아직 열리지 않은 장이거나 없는 주소입니다" : "없는 주소입니다"}</h1>
        <p className="home-hero__desc">
          {closed.length > 0
            ? "아직 열리지 않은 회차의 교안은 수업 날 공개됩니다. 열린 회차와 부록은 지금 볼 수 있고, 공개된 교안은 수료 후에도 그대로 남습니다."
            : "주소를 다시 확인하거나 교안 홈에서 장을 고르세요."}
        </p>
        {closed.length > 0 ? (
          <ul className="home-prep">
            {closed.map((session) => (
              <li key={session.id}>
                <strong>{session.label}</strong> {session.title}: {session.dateLabel} 수업 날 공개
              </li>
            ))}
          </ul>
        ) : null}
        <p className="home-hero__desc">
          <Link href="/">교안 홈으로 돌아가기</Link>
        </p>
      </section>
    </GuideShell>
  );
}
