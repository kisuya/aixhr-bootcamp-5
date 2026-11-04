// 인용문 맨 앞의 이모지로 안내 상자 종류를 정한다.
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
