// 장 파일은 content/{회차}-{순번}_{제목}.md 이다. 회차 1~4와 부록 9가
// 있고, 회차는 sessions.json의 공개 여부에 따라 목록, 장 페이지, 검색
// 색인에서 함께 빠진다. 공개 판단은 이 파일의 세 함수(getChapters,
// getChapter, buildGlobalSearchIndex)가 모두 isOpen 한 곳을 거쳐서 한다.
import fs from "node:fs";
import path from "node:path";
import type { Heading, Nodes, Root, RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { createHeadingIdAssigner, mdastTextContent } from "@/lib/heading-slugs";
import { getGroupMeta, isGroupOpen } from "@/lib/sessions";

export type GuideHeading = {
  id: string;
  depth: number;
  text: string;
};

export type SearchEntry = {
  id: string;
  title: string;
  text: string;
  slug: string;
};

export type ChapterMeta = {
  slug: string;
  number: string;
  // 회차 번호("1"~"4") 또는 부록("9")
  group: string;
  // 그룹 이름("1회차", "부록")
  track: string;
  title: string;
  file: string;
  // Depth-2 headings only — the sidebar shows every chapter's h2 list at
  // all times (no collapsed menus), so each chapter's sections must travel
  // with its meta, not just with the currently parsed chapter.
  headings: GuideHeading[];
};

export type ParsedChapter = ChapterMeta & {
  markdown: string;
  headings: GuideHeading[];
  searchIndex: SearchEntry[];
};

export type GlobalSearchEntry = SearchEntry & { chapterTitle: string };

type IsOpen = (groupId: string) => boolean;

const DEFAULT_CONTENT_DIR = path.join(process.cwd(), "content");
const DEFAULT_IS_OPEN: IsOpen = (groupId) => isGroupOpen(groupId);
const SLUG_PREFIX = /^(\d)-(\d+)_/;

export function getChapters(dir: string = DEFAULT_CONTENT_DIR, isOpen: IsOpen = DEFAULT_IS_OPEN): ChapterMeta[] {
  // 닫힌 회차의 파일도 이름 검증은 거친다. 잘못된 파일 이름이 공개 전까지
  // 숨어 있다가 공개 날 빌드를 깨뜨리지 않게 하기 위해서다.
  return listChapterFiles(dir)
    .map((file) => buildChapterMeta(dir, file))
    .filter((meta) => isOpen(meta.group));
}

export function getChapter(
  slug: string,
  dir: string = DEFAULT_CONTENT_DIR,
  isOpen: IsOpen = DEFAULT_IS_OPEN
): ParsedChapter | null {
  const file = listChapterFiles(dir).find((candidate) => parseSlug(candidate).slug === slug);

  if (!file) {
    return null;
  }

  const { group } = parseSlug(file);
  if (!isOpen(group)) {
    return null;
  }

  const markdown = fs.readFileSync(path.join(dir, file), "utf8");
  const parsed = parseChapterMarkdown(markdown, slug);

  return {
    slug,
    number: slug,
    group,
    track: getGroupMeta(group).label,
    title: parsed.title,
    file,
    markdown,
    headings: parsed.headings,
    searchIndex: parsed.searchIndex
  };
}

export function buildGlobalSearchIndex(
  dir: string = DEFAULT_CONTENT_DIR,
  isOpen: IsOpen = DEFAULT_IS_OPEN
): GlobalSearchEntry[] {
  return getChapters(dir, isOpen).flatMap((meta) => {
    const chapter = getChapter(meta.slug, dir, isOpen);
    return chapter ? chapter.searchIndex.map((entry) => ({ ...entry, chapterTitle: chapter.title })) : [];
  });
}

function listChapterFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort(compareChapterFiles);
}

// 회차, 순번을 숫자로 비교한다. 문자열 정렬이면 1-10이 1-2 앞에 온다.
function compareChapterFiles(a: string, b: string): number {
  const [ga, na] = slugNumbers(a);
  const [gb, nb] = slugNumbers(b);
  return ga - gb || na - nb || a.localeCompare(b);
}

function slugNumbers(file: string): [number, number] {
  const match = file.match(SLUG_PREFIX);
  return match ? [Number(match[1]), Number(match[2])] : [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
}

function buildChapterMeta(dir: string, file: string): ChapterMeta {
  const { slug, group } = parseSlug(file);
  const markdown = fs.readFileSync(path.join(dir, file), "utf8");
  const parsed = parseChapterMarkdown(markdown, slug);

  return {
    slug,
    number: slug,
    group,
    track: getGroupMeta(group).label,
    title: parsed.title,
    file,
    headings: parsed.headings.filter((heading) => heading.depth === 2)
  };
}

function parseSlug(file: string): { slug: string; group: string } {
  const match = file.match(SLUG_PREFIX);
  if (!match) {
    throw new Error(`장 파일 "${file}"은 "회차-순번_" 형식으로 시작해야 합니다(예: 1-2_제목.md).`);
  }
  const group = match[1];
  // 없는 회차 번호면 getGroupMeta가 throw한다.
  getGroupMeta(group);
  return { slug: `${group}-${match[2]}`, group };
}

function parseChapterMarkdown(
  markdown: string,
  slug: string
): { title: string; headings: GuideHeading[]; searchIndex: SearchEntry[] } {
  // singleTilde: false. 교안은 범위를 "09:00~18:00"처럼 물결 하나로 쓰는데, 기본값이면
  // 한 줄의 물결 두 개가 짝을 지어 취소선이 된다. 취소선은 ~~두 개~~로만 인정한다.
  const tree = unified().use(remarkParse).use(remarkGfm, { singleTilde: false }).parse(markdown) as Root;
  const assignHeadingId = createHeadingIdAssigner();
  const headings: GuideHeading[] = [];
  const headingIds = new WeakMap<Heading, string>();
  const sectionTexts = new Map<string, string[]>();
  let title = "";

  visit(tree, (node: Nodes) => {
    if (isHeading(node)) {
      const text = mdastTextContent(node).trim();
      const id = assignHeadingId(node);
      headingIds.set(node, id);
      headings.push({ id, depth: node.depth, text });

      if (node.depth === 1 && !title) {
        title = text;
      }
      if (node.depth <= 2) {
        sectionTexts.set(id, [text]);
      }
    }
  });

  collectSearchText(tree, headingIds, sectionTexts);

  const searchIndex = Array.from(sectionTexts.entries()).map(([id, chunks]) => ({
    id,
    title: headings.find((heading) => heading.id === id)?.text ?? id,
    text: normalizeWhitespace(chunks.join(" ")),
    slug
  }));

  return { title, headings, searchIndex };
}

function collectSearchText(
  tree: Root,
  headingIds: WeakMap<Heading, string>,
  sectionTexts: Map<string, string[]>
): void {
  let currentSectionId = "";

  for (const node of tree.children) {
    if (isHeading(node)) {
      if (node.depth <= 2) {
        currentSectionId = headingIds.get(node) ?? "";
      }
      continue;
    }

    if (!currentSectionId || !isSearchBlock(node)) {
      continue;
    }

    const text = mdastTextContent(node, { excludeCode: true }).trim();
    if (text) {
      sectionTexts.get(currentSectionId)?.push(text);
    }
  }
}

function isHeading(node: Nodes): node is Heading {
  return node.type === "heading";
}

function isSearchBlock(node: RootContent): boolean {
  return node.type === "paragraph" || node.type === "blockquote" || node.type === "list" || node.type === "table";
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
