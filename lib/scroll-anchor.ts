// 강의 모드를 켜고 끄면 본문 폭과 글자 크기가 바뀌어 같은 스크롤 위치에서
// 전혀 다른 곳이 보인다. 바꾸기 직전 화면 맨 위에 걸친 본문 블록을 기억해
// 두었다가, 바뀐 배치에서 그 블록이 같은 자리에 오도록 되돌린다.

export type AnchorRect = { top: number; bottom: number };
export type AnchorElement = {
  readonly isConnected: boolean;
  getBoundingClientRect(): AnchorRect;
};
export type AnchorContainer = {
  querySelectorAll(selectors: string): ArrayLike<AnchorElement> & Iterable<AnchorElement>;
};
export type ScrollAnchor = { element: AnchorElement; top: number };

const ANCHOR_BLOCKS = "h1, h2, h3, h4, p, li, pre, table, img, summary, blockquote";

// "#6-%EC%96%BC..."처럼 인코딩된 절 주소를 제목 id로 바꾼다.
export function hashTargetId(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;

  if (!raw) {
    return null;
  }

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function captureScrollAnchor(container: AnchorContainer | null): ScrollAnchor | null {
  if (!container) {
    return null;
  }

  const element = Array.from(container.querySelectorAll(ANCHOR_BLOCKS)).find(
    (candidate) => candidate.getBoundingClientRect().bottom > 0
  );

  return element ? { element, top: element.getBoundingClientRect().top } : null;
}

export function restoreScrollAnchor(anchor: ScrollAnchor | null, scrollBy: (delta: number) => void): void {
  if (!anchor || !anchor.element.isConnected) {
    return;
  }

  const delta = anchor.element.getBoundingClientRect().top - anchor.top;

  if (Math.abs(delta) >= 1) {
    scrollBy(delta);
  }
}
