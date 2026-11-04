import Link from "next/link";
import { GuideShell } from "@/components/GuideShell";
import { buildHomeSessionCards, groupChaptersBySession } from "@/lib/chapter-groups";
import { getChapters } from "@/lib/chapters";
import { VISIBLE_SESSIONS } from "@/lib/sessions";

// 1회차 전에 준비할 것. 공개 전에도 보여야 하므로 홈에 둔다.
const PREPARATION = [
  "Claude 유료 플랜(Pro, Max, Team, Enterprise). Free 플랜은 Cowork, Claude in Chrome, 예약 작업, Claude Code를 쓸 수 없어 2회차부터 실습 대부분을 직접 할 수 없습니다.",
  "Claude 데스크톱 앱 설치",
  "Chrome 브라우저와 Claude in Chrome 확장 설치(회사 계정이 로그인되지 않은 실습용 브라우저 프로필에)",
  "사전 VOD로 LLM, RAG, Agent의 기본 개념 예습",
  "Claude에 맡겨 볼 내 업무 후보 2개. 샘플 데이터는 없어도 되고, 가져온다면 이름과 사번을 지우고 필요한 열만 남겨 옵니다"
];

export default function Home() {
  const chapters = getChapters();
  const cards = buildHomeSessionCards(chapters);
  const appendix = groupChaptersBySession(chapters).find((group) => group.id === "9");
  const hasClosed = VISIBLE_SESSIONS.some((session) => !session.open);

  return (
    <GuideShell chapters={chapters} current={null}>
      <section className="home-hero">
        <p className="home-hero__eyebrow">원티드랩 Claude 심화 부트캠프</p>
        <h1>AI와 일하는 HR 5기 교안</h1>
        <p className="home-hero__desc">
          채팅으로는 이미 Claude를 쓰고 계신 HR 담당자를 위한 4주 과정입니다. 매주 내 업무 하나를 한 단계씩 더 맡기고,
          마지막 주에는 수료 후에도 회사에서 계속 쓸 HR 도구를 각자 직접 만들어 봅니다.
        </p>
        <p className="home-hero__cycle">
          1회차 문제 정의와 첫 실행 → 2회차 스킬과 자동화 → 3회차 Claude Code로 미니앱
        </p>
      </section>

      <section className="home-track">
        <h2>회차별 흐름</h2>
        <p className="home-track-desc">
          {hasClosed ? "열린 회차와 부록은 지금 볼 수 있고, 나머지 회차는 수업 날 공개됩니다. " : ""}공개된 교안은 수료 후에도 그대로 남습니다.
        </p>
        <div className="home-card-grid">
          {cards.map((card) =>
            card.open && card.firstSlug ? (
              <Link key={card.id} href={`/guide/${card.firstSlug}`} className="home-card">
                <span className="home-card-number">
                  {card.label} {card.dateLabel}
                </span>
                <span className="home-card-title">{card.title}</span>
                <span className="home-card-desc">{card.summary}</span>
                {card.notice ? <span className="home-card-notice">{card.notice}</span> : null}
              </Link>
            ) : (
              <div key={card.id} className="home-card home-card--locked" aria-disabled="true">
                <span className="home-card-number">
                  {card.label} {card.dateLabel}
                </span>
                <span className="home-card-title">{card.title}</span>
                <span className="home-card-desc">{card.dateLabel} 수업 날 공개됩니다.</span>
              </div>
            )
          )}
        </div>
      </section>

      <section className="home-track">
        <h2>1회차 전에 준비할 것</h2>
        <ul className="home-prep">
          {PREPARATION.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="home-track-desc">
          설치 방법은 <Link href="/guide/9-3/">설치, 대화 요령, 용어</Link>에 있습니다. 2회차 API 실습과 3회차 보고문 초안 버튼에 쓰는 Claude Console, 3회차에 쓰는 준비물(Claude Code,
          Node.js 22 이상, Git, GitHub와 Vercel 개인 계정)도 같은 장에 어느 회차에 쓰는지 표로 정리해 두었습니다. 실습은 강의에서 드리는 가상 회사 데이터로 하므로
          회사 데이터는 가져오지 않아도 됩니다.
        </p>
      </section>

      <section className="home-track">
        <h2>금요일 진행상황 공유</h2>
        <p className="home-track-desc">매주 금요일 12:10~12:50(40분)에는 가볍게 진행상황을 공유하는 시간을 가집니다.</p>
      </section>

      {appendix ? (
        <section className="home-track">
          <h2>부록</h2>
          <p className="home-track-desc">회차와 관계없이 처음부터 볼 수 있습니다.</p>
          <div className="home-card-grid">
            {appendix.items.map((chapter) => (
              <Link key={chapter.slug} href={`/guide/${chapter.slug}`} className="home-card">
                <span className="home-card-number">{chapter.number}</span>
                <span className="home-card-title">{chapter.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </GuideShell>
  );
}
