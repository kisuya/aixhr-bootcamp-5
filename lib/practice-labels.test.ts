import { describe, expect, it } from "vitest";
import { parsePracticeLabels, practiceKindFor } from "./practice-labels";

const CHAPTER = `# 브라우저와 화면 제어로 일 맡기기

## 개요

| | 구독 | API |
|---|---|---|
| 결제 | 정액 | 쓴 만큼 |

**이 장의 실습**

| 실습 | 수업에서 |
|---|---|
| 실습 1. 보도자료를 표로 정리하기 | 강사 시연. 직접 해 보기는 수업 뒤에 합니다 |
| 내 업무 스킬로 대신하기 | 선택 확장. 기록이 쌓인 분이 합니다 |
| 실습 2. 예약 작업 하나 만들기 | 함께 완성 |
| 2절 화면 제어 | 강사 시연 |

## 1. 공개 사이트에서 정보 모으기

| 실습 3. 본문 표 | 함께 완성 |
`;

describe("parsePracticeLabels", () => {
  it("개요의 실습 구분표에서 실습별 구분을 읽는다", () => {
    expect(parsePracticeLabels(CHAPTER)).toEqual({
      "실습 1. 보도자료를 표로 정리하기": "강사 시연",
      "내 업무 스킬로 대신하기": "선택 확장",
      "실습 2. 예약 작업 하나 만들기": "함께 완성",
      "2절": "강사 시연"
    });
  });

  it("개요 밖의 표는 읽지 않는다", () => {
    expect(parsePracticeLabels(CHAPTER)["실습 3. 본문 표"]).toBeUndefined();
  });

  it("개요가 없으면 빈 결과를 돌려준다", () => {
    expect(parsePracticeLabels("# 제목\n\n본문")).toEqual({});
  });
});

describe("practiceKindFor", () => {
  const labels = parsePracticeLabels(CHAPTER);

  it("실습 제목과 같은 줄의 구분을 돌려준다", () => {
    expect(practiceKindFor("실습 1. 보도자료를 표로 정리하기", labels, 3)).toBe("강사 시연");
    expect(practiceKindFor("내 업무 스킬로 대신하기", labels, 3)).toBe("선택 확장");
  });

  it("'N절'로 적은 구분은 번호가 같은 h2에만 붙인다", () => {
    expect(practiceKindFor("2. 화면 제어를 쓸 때와 쓰지 않을 때", labels, 2)).toBe("강사 시연");
    expect(practiceKindFor("1. 공개 사이트에서 정보 모으기", labels, 2)).toBeNull();
    expect(practiceKindFor("2. 화면 제어를 쓸 때와 쓰지 않을 때", labels, 3)).toBeNull();
  });

  it("표에 없는 제목은 구분이 없다", () => {
    expect(practiceKindFor("실습 9. 없는 실습", labels, 3)).toBeNull();
  });
});
