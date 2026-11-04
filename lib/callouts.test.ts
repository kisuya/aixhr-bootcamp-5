import { describe, expect, it } from "vitest";
import { getCalloutKind } from "./callouts";

describe("getCalloutKind", () => {
  it("classifies each emoji marker", () => {
    expect(getCalloutKind("⚠️ **분기 1회 갱신 전제.** 오래 가지 않습니다.")).toBe("warning");
    expect(getCalloutKind("💡 무인 실행을 계획한다면 커넥터로 옮기세요.")).toBe("tip");
    expect(getCalloutKind("💰 캐시되어 반복 참조 시 부담이 낮습니다.")).toBe("cost");
    expect(getCalloutKind("📌 **2026년 8월 현재**")).toBe("check");
    expect(getCalloutKind("📋 **강사 노트**: 목적은 기법 학습이 아닙니다.")).toBe("instructor");
    expect(getCalloutKind("🖼️ **[그림 2-1]** 프롬프트 6원칙 체크카드")).toBe("figure");
  });

  it("returns null for plain blockquotes without an emoji marker", () => {
    expect(getCalloutKind("한 줄 정리 답을 원하면 Chat을 쓸 수 있습니다.")).toBeNull();
  });

  it("ignores leading whitespace before the marker", () => {
    expect(getCalloutKind("  ⚠️ 공백 이후에도 감지됩니다.")).toBe("warning");
  });
});
