// 홈(서버 컴포넌트)과 사이드바(클라이언트 컴포넌트)가 함께 쓰는 순수 함수.
// fs를 import하지 않으므로 양쪽에서 모두 부를 수 있다. 받은 chapters는
// 이미 공개 여부로 걸러진 목록이고, 여기서는 묶기만 한다.
import type { ChapterMeta } from "@/lib/chapters";
import { APPENDIX, getSessionNotice, VISIBLE_SESSIONS } from "@/lib/sessions";

export type SessionGroup = { id: string; label: string; title: string; items: ChapterMeta[] };

const GROUP_ORDER = [...VISIBLE_SESSIONS.map(({ id, label, title }) => ({ id, label, title })), APPENDIX];

export function groupChaptersBySession(chapters: ChapterMeta[]): SessionGroup[] {
  return GROUP_ORDER.map((group) => ({
    ...group,
    items: chapters.filter((chapter) => chapter.group === group.id)
  })).filter((group) => group.items.length > 0);
}

export type HomeSessionCard = {
  id: string;
  label: string;
  title: string;
  dateLabel: string;
  summary: string;
  open: boolean;
  notice: string | null;
  firstSlug: string | null;
  chapterTitles: string[];
};

// 홈의 회차 카드. 공개 전 회차도 제목과 날짜는 보여 주되 링크와
// 장 제목은 담지 않는다. hidden 회차는 카드를 만들지 않는다.
export function buildHomeSessionCards(chapters: ChapterMeta[]): HomeSessionCard[] {
  return VISIBLE_SESSIONS.map((session) => {
    const items = chapters.filter((chapter) => chapter.group === session.id);
    return {
      id: session.id,
      label: session.label,
      title: session.title,
      dateLabel: session.dateLabel,
      summary: session.summary,
      open: items.length > 0,
      notice: getSessionNotice(session.id),
      firstSlug: items[0]?.slug ?? null,
      chapterTitles: items.map((chapter) => chapter.title)
    };
  });
}
