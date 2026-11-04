import type { Heading, Nodes, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { describe, expect, it } from "vitest";
import { createHeadingIdAssigner, mdastTextContent } from "./heading-slugs";

const FIXTURE_MARKDOWN = `
# 개요

첫 문단.

## 개요

중복된 제목의 두 번째 등장.

## Claude \`Code\` 소개

인라인 코드가 포함된 제목.

## 개요

중복된 제목의 세 번째 등장.

### 하위 섹션 A

내용.
`;

function parseTree(markdown: string): Root {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown) as Root;
}

// Mirrors lib/chapters.ts's traversal: an untyped `visit(tree, node => ...)`
// that manually checks `node.type === "heading"`.
function collectIdsLikeChapters(markdown: string): string[] {
  const tree = parseTree(markdown);
  const assignHeadingId = createHeadingIdAssigner();
  const ids: string[] = [];

  visit(tree, (node: Nodes) => {
    if (node.type === "heading") {
      ids.push(assignHeadingId(node as Heading));
    }
  });

  return ids;
}

// Mirrors components/MarkdownContent.tsx's traversal: a type-filtered
// `visit(tree, "heading", cb)` call, as used inside its `remarkHeadingIds`
// remark plugin.
function collectIdsLikeMarkdownContent(markdown: string): string[] {
  const tree = parseTree(markdown);
  const assignHeadingId = createHeadingIdAssigner();
  const ids: string[] = [];

  visit(tree, "heading", (node: Heading) => {
    ids.push(assignHeadingId(node));
  });

  return ids;
}

describe("mdastTextContent", () => {
  it("flattens nested inline nodes into space-joined text", () => {
    const tree = parseTree("## Claude **Code** 소개");
    const heading = tree.children[0];

    expect(mdastTextContent(heading as Nodes).trim()).toBe("Claude  Code  소개");
  });

  it("excludes code content when excludeCode is set", () => {
    const tree = parseTree("문단에 `인라인 코드`가 있습니다.");
    const paragraph = tree.children[0];

    expect(mdastTextContent(paragraph as Nodes, { excludeCode: true })).not.toContain("인라인 코드");
  });
});

describe("createHeadingIdAssigner", () => {
  it("disambiguates repeated heading text within one document, like GitHub does", () => {
    const ids = collectIdsLikeChapters(FIXTURE_MARKDOWN);

    expect(ids).toEqual(["개요", "개요-1", "claude--code--소개", "개요-2", "하위-섹션-a"]);
  });
});

describe("heading id parity between lib/chapters.ts and components/MarkdownContent.tsx", () => {
  // lib/chapters.ts (server: search index + TOC) and MarkdownContent.tsx
  // (client: the <hN id="..."> anchors actually rendered on the page) each
  // walk the parsed markdown tree independently — one with an untyped
  // `visit`, the other with unist-util-visit's type-filtered `visit`. A
  // search result links to `/guide/{slug}#{id}` using the id the first
  // produced; the anchor that has to exist on the page is the id the
  // second produces. If either traversal ever changes and stops visiting
  // headings in the same document order, search links silently break.
  it("produces identical, identically-ordered ids for the same document", () => {
    const chaptersStyleIds = collectIdsLikeChapters(FIXTURE_MARKDOWN);
    const markdownContentStyleIds = collectIdsLikeMarkdownContent(FIXTURE_MARKDOWN);

    expect(markdownContentStyleIds).toEqual(chaptersStyleIds);
  });

  it("holds for headings containing inline code, bold text, and Korean text alike", () => {
    const markdown = "# 한글 제목\n\n## Mixed **Bold** 와 `code` 제목\n\n## 한글 제목\n";

    expect(collectIdsLikeMarkdownContent(markdown)).toEqual(collectIdsLikeChapters(markdown));
  });
});
