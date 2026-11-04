// 각 장 개요의 "이 장의 실습" 표에서 실습별 구분(함께 완성, 강사 시연, 선택 확장)을 읽는다.
// 본문의 실습 제목 옆 표시는 이 표 하나만 보고 달아서, 표와 본문이 어긋나지 않게 한다.
export const PRACTICE_KINDS = ["함께 완성", "강사 시연", "선택 확장"] as const;
export type PracticeKind = (typeof PRACTICE_KINDS)[number];
export type PracticeLabels = Record<string, PracticeKind>;

const TABLE_ROW = /^\| (.+?) \| (.+?) \|$/gm;
const SECTION_KEY = /^(\d+)절/;

export function parsePracticeLabels(markdown: string): PracticeLabels {
  const start = markdown.indexOf("## 개요");
  if (start < 0) return {};
  const next = markdown.indexOf("\n## ", start + 5);
  const overview = markdown.slice(start, next < 0 ? undefined : next);

  const labels: PracticeLabels = {};
  for (const [, key, label] of overview.matchAll(TABLE_ROW)) {
    const kind = PRACTICE_KINDS.find((candidate) => label.trim().startsWith(candidate));
    if (!kind) continue;
    const section = key.trim().match(SECTION_KEY);
    labels[section ? `${section[1]}절` : key.trim()] = kind;
  }
  return labels;
}

// "N절"로 적은 구분은 "N. "으로 시작하는 h2에만 붙인다. 나머지는 제목 전체가 표의 첫 칸과 같아야 한다.
export function practiceKindFor(headingText: string, labels: PracticeLabels, level: number): PracticeKind | null {
  const text = headingText.trim();
  if (level === 2) {
    const numbered = text.match(/^(\d+)\. /);
    return numbered ? (labels[`${numbered[1]}절`] ?? null) : null;
  }
  return labels[text] ?? null;
}
