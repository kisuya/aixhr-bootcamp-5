import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildGlobalSearchIndex, getChapter, getChapters } from "./chapters";

const FIXTURE_DIR = path.join(__dirname, "__fixtures__", "chapters");
const BAD_DIR = path.join(__dirname, "__fixtures__", "bad-name");
const openOnly1 = (groupId: string) => groupId === "1" || groupId === "9";
const openAll = () => true;

describe("getChapters", () => {
  it("파일 이름에서 회차-순번 slug, 그룹, 그룹 이름을 읽는다", () => {
    const chapters = getChapters(FIXTURE_DIR, openAll);
    expect(chapters.map((chapter) => [chapter.slug, chapter.group, chapter.track])).toEqual([
      ["1-1", "1", "1회차"],
      ["1-2", "1", "1회차"],
      ["1-10", "1", "1회차"],
      ["2-1", "2", "2회차"],
      ["9-1", "9", "부록"]
    ]);
  });

  it("사이드바용 meta에는 h2만 담는다", () => {
    const [first] = getChapters(FIXTURE_DIR, openAll);
    expect(first.title).toBe("소개");
    expect(first.number).toBe("1-1");
    expect(first.file).toBe("1-1_소개.md");
    expect(first.headings).toEqual([{ id: "첫-번째-절", depth: 2, text: "첫 번째 절" }]);
  });

  it("닫힌 회차의 장은 목록에서 빠진다", () => {
    expect(getChapters(FIXTURE_DIR, openOnly1).map((chapter) => chapter.slug)).toEqual(["1-1", "1-2", "1-10", "9-1"]);
  });

  it("없는 회차 번호의 파일이 있으면 throw한다", () => {
    expect(() => getChapters(BAD_DIR, openAll)).toThrow(/회차/);
  });
});

describe("getChapter", () => {
  it("모르는 slug는 null이다", () => {
    expect(getChapter("8-8", FIXTURE_DIR, openAll)).toBeNull();
  });

  it("닫힌 회차의 장은 null이다", () => {
    expect(getChapter("2-1", FIXTURE_DIR, openOnly1)).toBeNull();
  });

  it("열린 장은 제목, 그룹, 전체 heading을 돌려준다", () => {
    const chapter = getChapter("1-1", FIXTURE_DIR, openOnly1);
    expect(chapter?.title).toBe("소개");
    expect(chapter?.group).toBe("1");
    expect(chapter?.headings.map((heading) => heading.text)).toEqual(["소개", "첫 번째 절", "하위 절"]);
  });

  it("검색 항목마다 장 slug를 단다", () => {
    const chapter = getChapter("1-1", FIXTURE_DIR, openAll);
    expect(chapter?.searchIndex.length).toBeGreaterThan(0);
    expect(chapter?.searchIndex.every((entry) => entry.slug === "1-1")).toBe(true);
  });

  it("코드 블록은 검색 색인에서 빠진다", () => {
    const text = getChapter("1-2", FIXTURE_DIR, openAll)?.searchIndex.map((entry) => entry.text).join(" ") ?? "";
    expect(text).not.toContain("echo test");
    expect(text).toContain("위임할 때는 완료 조건을 명확히 하세요");
  });
});

describe("buildGlobalSearchIndex", () => {
  it("닫힌 회차의 장은 검색 색인에 없다", () => {
    const index = buildGlobalSearchIndex(FIXTURE_DIR, openOnly1);
    const slugs = new Set(index.map((entry) => entry.slug));
    expect(slugs.has("2-1")).toBe(false);
    expect(slugs.has("1-1")).toBe(true);
    expect(slugs.has("9-1")).toBe(true);
    expect(index.map((entry) => entry.text).join(" ")).not.toContain("공개 전에는 보이면 안 되는 문장");
  });

  it("검색 항목에 장 제목을 단다", () => {
    const entry = buildGlobalSearchIndex(FIXTURE_DIR, openAll).find((item) => item.slug === "1-2");
    expect(entry?.chapterTitle).toBe("협업 기법");
  });
});

describe("물결 범위 표기", () => {
  it("한 줄에 물결 범위가 두 번 나와도 취소선이 되지 않는다", async () => {
    const { unified } = await import("unified");
    const remarkParse = (await import("remark-parse")).default;
    const remarkGfm = (await import("remark-gfm")).default;
    const tree = unified()
      .use(remarkParse)
      .use(remarkGfm, { singleTilde: false })
      .parse("근무는 09:00~18:00, 휴게는 12:00~13:00입니다. ~~취소~~는 그대로입니다.");
    const types: string[] = [];
    const walk = (node: { type: string; children?: unknown[] }) => {
      types.push(node.type);
      (node.children as { type: string; children?: unknown[] }[] | undefined)?.forEach(walk);
    };
    walk(tree as unknown as { type: string; children?: unknown[] });
    expect(types.filter((type) => type === "delete")).toHaveLength(1);
  });
});
