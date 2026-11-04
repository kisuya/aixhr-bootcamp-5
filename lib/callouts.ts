// Classifies a blockquote's leading emoji marker into a callout kind.
// Adapted from claude-education-site's text-prefix classifier
// (components/MarkdownContent.tsx: getCalloutKindFromText), which matched
// Korean text prefixes ("실습 문제", "정답 예시", ...). This curriculum's
// source markdown (../claude/*.md) marks callouts with a leading emoji
// instead, so the classifier keys off emoji rather than text.
export type CalloutKind = "warning" | "tip" | "cost" | "check" | "instructor" | "figure";

const EMOJI_TO_KIND: ReadonlyArray<readonly [string, CalloutKind]> = [
  ["⚠️", "warning"],
  ["💡", "tip"],
  ["💰", "cost"],
  ["📌", "check"],
  ["📋", "instructor"],
  ["🖼️", "figure"]
];

export function getCalloutKind(text: string): CalloutKind | null {
  const normalized = text.trimStart();

  for (const [emoji, kind] of EMOJI_TO_KIND) {
    if (normalized.startsWith(emoji)) {
      return kind;
    }
  }

  return null;
}
