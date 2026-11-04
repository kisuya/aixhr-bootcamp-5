import { describe, expect, it } from "vitest";
import { buildHomeSessionCards, groupChaptersBySession } from "./chapter-groups";
import type { ChapterMeta } from "@/lib/chapters";
import { formatSessionNotice, VISIBLE_SESSIONS } from "@/lib/sessions";

function ch(slug: string): ChapterMeta {
  const group = slug.split("-")[0];
  return { slug, number: slug, group, track: "", title: `제목 ${slug}`, file: `${slug}_x.md`, headings: [] };
}

describe("groupChaptersBySession", () => {
  it("회차 1, 2, 3, 4, 부록 순서로 묶고 빈 그룹은 뺀다", () => {
    const groups = groupChaptersBySession([ch("9-1"), ch("2-1"), ch("1-1"), ch("1-2")]);
    expect(groups.map((group) => group.label)).toEqual(["1회차", "2회차", "부록"]);
    expect(groups[0].title).toBe("Claude 시작하기");
  });

  it("그룹 안에서는 받은 순서를 지킨다(정렬은 getChapters 책임)", () => {
    const groups = groupChaptersBySession([ch("1-2"), ch("1-1")]);
    expect(groups[0].items.map((chapter) => chapter.slug)).toEqual(["1-2", "1-1"]);
  });
});

describe("buildHomeSessionCards", () => {
  it("숨기지 않은 회차 카드를 만들고, 장이 없는 회차는 닫힌 카드로 둔다. hidden 회차는 카드가 없다", () => {
    const cards = buildHomeSessionCards([ch("1-1"), ch("1-2"), ch("9-1")]);
    expect(cards.map((card) => [card.id, card.open, card.firstSlug])).toEqual([
      ["1", true, "1-1"],
      ["2", false, null],
      ["3", false, null]
    ]);
  });

  it("닫힌 카드는 장 제목을 담지 않는다", () => {
    const cards = buildHomeSessionCards([ch("1-1")]);
    expect(cards[0].chapterTitles).toEqual(["제목 1-1"]);
    expect(cards[1].chapterTitles).toEqual([]);
  });

  it("카드 안내는 각 회차의 tentative 값을 따른다", () => {
    const cards = buildHomeSessionCards([ch("1-1"), ch("2-1"), ch("3-1")]);
    expect(cards.map((card) => card.notice)).toEqual(VISIBLE_SESSIONS.map((session) => formatSessionNotice(session)));
  });

  it("카드에 날짜와 요약을 담는다", () => {
    const [first] = buildHomeSessionCards([]);
    expect(first.dateLabel).toBe("10/14(수)");
    expect(first.summary.length).toBeGreaterThan(0);
  });
});
