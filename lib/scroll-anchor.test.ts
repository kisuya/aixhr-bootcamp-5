import { describe, expect, it } from "vitest";
import { captureScrollAnchor, hashTargetId, restoreScrollAnchor, type AnchorElement } from "./scroll-anchor";

function block(top: number, height: number, connected = true): AnchorElement & { moveTo: (next: number) => void } {
  let currentTop = top;
  return {
    isConnected: connected,
    getBoundingClientRect: () => ({ top: currentTop, bottom: currentTop + height }),
    moveTo: (next: number) => {
      currentTop = next;
    }
  };
}

function container(blocks: AnchorElement[]) {
  return { querySelectorAll: () => blocks };
}

describe("hashTargetId", () => {
  it("퍼센트 인코딩된 절 주소를 푼다", () => {
    expect(hashTargetId("#6-%EC%96%BC%EB%A7%88%EB%82%98-%EB%93%A4%EC%97%88%EB%82%98")).toBe("6-얼마나-들었나");
  });

  it("한글 그대로인 절 주소도 받는다", () => {
    expect(hashTargetId("#숙제")).toBe("숙제");
  });

  it("비어 있으면 null이다", () => {
    expect(hashTargetId("")).toBeNull();
    expect(hashTargetId("#")).toBeNull();
  });

  it("잘못된 인코딩이면 받은 글자를 그대로 쓴다", () => {
    expect(hashTargetId("#%E0%A4%A")).toBe("%E0%A4%A");
  });
});

describe("captureScrollAnchor", () => {
  it("화면 맨 위에 걸친 첫 블록과 그 위치를 기억한다", () => {
    const above = block(-500, 200);
    const crossing = block(-40, 120);
    const below = block(80, 50);
    const anchor = captureScrollAnchor(container([above, crossing, below]));
    expect(anchor?.element).toBe(crossing);
    expect(anchor?.top).toBe(-40);
  });

  it("본문이 없으면 null이다", () => {
    expect(captureScrollAnchor(null)).toBeNull();
    expect(captureScrollAnchor(container([]))).toBeNull();
  });
});

describe("restoreScrollAnchor", () => {
  it("배치가 바뀌어 블록이 움직인 만큼 되돌려 스크롤한다", () => {
    const element = block(-40, 120);
    const anchor = { element, top: -40 };
    element.moveTo(900);
    const scrolled: number[] = [];
    restoreScrollAnchor(anchor, (delta) => scrolled.push(delta));
    expect(scrolled).toEqual([940]);
  });

  it("움직이지 않았거나 블록이 사라졌으면 스크롤하지 않는다", () => {
    const scrolled: number[] = [];
    restoreScrollAnchor({ element: block(10, 10), top: 10 }, (delta) => scrolled.push(delta));
    restoreScrollAnchor({ element: block(500, 10, false), top: 10 }, (delta) => scrolled.push(delta));
    restoreScrollAnchor(null, (delta) => scrolled.push(delta));
    expect(scrolled).toEqual([]);
  });
});
