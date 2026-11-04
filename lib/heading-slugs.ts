// Shared heading-id slugging logic.
//
// Previously lib/chapters.ts (server: search index + heading list) and
// components/MarkdownContent.tsx (client: heading anchors rendered by
// react-markdown) each wrote their own GithubSlugger call sequence to turn
// heading text into an `id`. Search results link to `/guide/{slug}#{id}`
// using the id lib/chapters.ts computed, and the target anchor is the id
// MarkdownContent assigns when it renders — those two independently
// written implementations had to happen to agree, with nothing enforcing
// it. Extracting both the text-extraction and the slugger-sequencing here
// means there is exactly one algorithm, so the two call sites cannot drift.
import GithubSlugger from "github-slugger";
import type { Heading, Nodes, Parents } from "mdast";

export type MdastTextOptions = {
  excludeCode?: boolean;
};

// Flattens an mdast node's text content, joining sibling text with a single
// space (matches GithubSlugger's expectations for heading text and the
// search index's word-boundary needs).
export function mdastTextContent(node: Nodes, options: MdastTextOptions = {}): string {
  if (options.excludeCode && (node.type === "code" || node.type === "inlineCode")) {
    return "";
  }

  if ("value" in node && typeof node.value === "string") {
    return node.value;
  }

  if (!isMdastParent(node)) {
    return "";
  }

  return node.children.map((child) => mdastTextContent(child, options)).join(" ");
}

export function isMdastParent(node: Nodes): node is Parents {
  return "children" in node;
}

// Creates a fresh, per-document heading-id assigner. A single GithubSlugger
// instance must be reused across every heading in one document (never
// created per-heading) so repeated heading text is disambiguated the same
// way GitHub disambiguates it ("개요", "개요-1", "개요-2", ...).
export function createHeadingIdAssigner(): (heading: Heading) => string {
  const slugger = new GithubSlugger();
  return (heading: Heading) => slugger.slug(mdastTextContent(heading).trim());
}
