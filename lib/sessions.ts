// 회차 공개 여부의 유일한 관문. 공개 전환은 sessions.json의 open만 고친다.
// hidden이 붙은 회차는 강사 미리보기에서도 열지 않고, 홈과 사이드바, 본문 링크에서도 감춘다.
// tentative가 붙은 회차는 미리 공개하되, 장 제목 아래와 홈 카드에 바뀔 수 있다는 안내를 단다.
// fs를 쓰지 않으므로 클라이언트 컴포넌트에서도 import할 수 있다.
import data from "./sessions.json";

export type SessionInfo = {
  id: string;
  label: string;
  title: string;
  date: string;
  dateLabel: string;
  open: boolean;
  hidden?: boolean;
  tentative?: boolean;
  summary: string;
};

export type GroupMeta = { id: string; label: string; title: string };

export const SESSIONS: SessionInfo[] = data.sessions;
export const VISIBLE_SESSIONS: SessionInfo[] = SESSIONS.filter((session) => !session.hidden);
export const APPENDIX: GroupMeta = data.appendix;

type Env = Record<string, string | undefined>;

export function getSessionNotice(groupId: string): string | null {
  const session = VISIBLE_SESSIONS.find((item) => item.id === groupId);
  return session?.tentative ? `${session.label} 교안은 현장 상황에 맞게 바뀔 수 있습니다.` : null;
}

// 부록은 항상 열려 있다. 회차는 sessions.json의 open을 따르고,
// 강사 검토용 빌드(PREVIEW_ALL_SESSIONS=1)에서는 hidden이 아닌 회차를 전부 연다.
export function isGroupOpen(groupId: string, env: Env = process.env): boolean {
  if (groupId === APPENDIX.id) return true;
  const session = SESSIONS.find((item) => item.id === groupId);
  if (!session || session.hidden) return false;
  return env.PREVIEW_ALL_SESSIONS === "1" || session.open;
}

export function getGroupMeta(groupId: string): GroupMeta {
  if (groupId === APPENDIX.id) return APPENDIX;
  const session = SESSIONS.find((item) => item.id === groupId);
  if (!session) {
    throw new Error(`알 수 없는 회차 번호입니다: ${groupId}`);
  }
  return { id: session.id, label: session.label, title: session.title };
}

// 본문 링크가 아직 열리지 않은 회차의 장을 가리키면 그 회차를 돌려준다.
// 부록처럼 먼저 열리는 장이 뒤 회차를 가리킬 때, 링크 대신 공개일을 보여 주는 데 쓴다.
const GUIDE_LINK = /^\/guide\/(\d)-\d+\/?(?:#.*)?$/;

export function getLockedSession(
  href: string | undefined,
  isOpen: (groupId: string) => boolean = (groupId) => isGroupOpen(groupId)
): SessionInfo | null {
  const match = href?.match(GUIDE_LINK);
  if (!match || isOpen(match[1])) return null;
  return SESSIONS.find((item) => item.id === match[1]) ?? null;
}
