import { describe, expect, it } from "vitest";
import { formatSessionNotice, getGroupMeta, getLockedSession, getSessionNotice, isGroupOpen, SESSIONS } from "./sessions";

describe("isGroupOpen", () => {
  it("부록(9)은 항상 열려 있다", () => {
    expect(isGroupOpen("9", {})).toBe(true);
  });

  it("sessions.json의 open 값을 따른다", () => {
    for (const session of SESSIONS) {
      expect(isGroupOpen(session.id, {})).toBe(session.open);
    }
  });

  it("PREVIEW_ALL_SESSIONS=1이면 숨기지 않은 회차가 모두 열린다", () => {
    for (const session of SESSIONS.filter((item) => !item.hidden)) {
      expect(isGroupOpen(session.id, { PREVIEW_ALL_SESSIONS: "1" })).toBe(true);
    }
  });

  it("hidden 회차는 미리보기에서도 열리지 않는다", () => {
    const hidden = SESSIONS.filter((item) => item.hidden);
    expect(hidden.map((item) => item.id)).toEqual(["4"]);
    for (const session of hidden) {
      expect(isGroupOpen(session.id, { PREVIEW_ALL_SESSIONS: "1" })).toBe(false);
    }
  });

  it("PREVIEW_ALL_SESSIONS가 1이 아니면 미리보기로 치지 않는다", () => {
    const closed = SESSIONS.filter((session) => !session.open);
    for (const session of closed) {
      expect(isGroupOpen(session.id, { PREVIEW_ALL_SESSIONS: "true" })).toBe(false);
    }
  });

  it("모르는 그룹은 미리보기에서도 열지 않는다", () => {
    expect(isGroupOpen("5", { PREVIEW_ALL_SESSIONS: "1" })).toBe(false);
  });
});

describe("formatSessionNotice", () => {
  it("tentative 회차에는 현장 상황에 따라 바뀔 수 있다는 안내를 만든다", () => {
    expect(formatSessionNotice({ label: "2회차", tentative: true })).toBe("2회차 교안은 현장 상황에 맞게 바뀔 수 있습니다.");
  });

  it("tentative가 없거나 false인 회차, 없는 회차는 안내가 없다", () => {
    expect(formatSessionNotice({ label: "2회차" })).toBeNull();
    expect(formatSessionNotice({ label: "2회차", tentative: false })).toBeNull();
    expect(formatSessionNotice(undefined)).toBeNull();
  });
});

describe("getSessionNotice", () => {
  it("숨기지 않은 회차는 sessions.json의 tentative 값을 따른다", () => {
    for (const session of SESSIONS.filter((item) => !item.hidden)) {
      expect(getSessionNotice(session.id)).toBe(formatSessionNotice(session));
    }
  });

  it("hidden 회차, 부록, 모르는 그룹은 안내가 없다", () => {
    for (const session of SESSIONS.filter((item) => item.hidden)) {
      expect(getSessionNotice(session.id)).toBeNull();
    }
    expect(getSessionNotice("9")).toBeNull();
    expect(getSessionNotice("5")).toBeNull();
  });
});

describe("getGroupMeta", () => {
  it("회차와 부록의 이름을 돌려준다", () => {
    expect(getGroupMeta("1")).toEqual({ id: "1", label: "1회차", title: "Claude 시작하기" });
    expect(getGroupMeta("9")).toEqual({ id: "9", label: "부록", title: "참고 자료" });
  });

  it("없는 그룹이면 throw한다", () => {
    expect(() => getGroupMeta("5")).toThrow();
  });
});

describe("getLockedSession", () => {
  const onlyFirstOpen = (groupId: string) => groupId === "1" || groupId === "9";

  it("아직 열리지 않은 회차의 장을 가리키면 그 회차를 돌려준다", () => {
    expect(getLockedSession("/guide/2-2/", onlyFirstOpen)?.id).toBe("2");
    expect(getLockedSession("/guide/3-3/#5-배포-전-보안-점검", onlyFirstOpen)?.id).toBe("3");
    expect(getLockedSession("/guide/4-2", onlyFirstOpen)?.dateLabel).toBe(SESSIONS[3].dateLabel);
  });

  it("hidden 회차를 가리키면 hidden 표시가 붙은 회차를 돌려준다(링크 대신 글자만 보여 준다)", () => {
    expect(getLockedSession("/guide/4-1/", onlyFirstOpen)?.hidden).toBe(true);
    expect(getLockedSession("/guide/2-1/", onlyFirstOpen)?.hidden ?? false).toBe(false);
  });

  it("열린 회차, 부록, 장이 아닌 주소는 잠그지 않는다", () => {
    expect(getLockedSession("/guide/1-2/", onlyFirstOpen)).toBeNull();
    expect(getLockedSession("/guide/9-2/#데이터가-가는-길", onlyFirstOpen)).toBeNull();
    expect(getLockedSession("#개요", onlyFirstOpen)).toBeNull();
    expect(getLockedSession("/practice-files/employees.csv", onlyFirstOpen)).toBeNull();
    expect(getLockedSession("https://example.com/guide/2-2/", onlyFirstOpen)).toBeNull();
    expect(getLockedSession(undefined, onlyFirstOpen)).toBeNull();
  });

  it("기본값은 sessions.json의 공개 상태를 따른다", () => {
    for (const session of SESSIONS) {
      const locked = getLockedSession(`/guide/${session.id}-1/`, (groupId) => isGroupOpen(groupId, {}));
      expect(locked?.id ?? null).toBe(session.open ? null : session.id);
    }
  });
});
