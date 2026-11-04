import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectImageSizes, listImageSources, readPngSize, readSvgSize, sizeFor } from "./image-sizes";

const PUBLIC_DIR = join(process.cwd(), "public");

function pngHeader(width: number, height: number): Buffer {
  const header = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.write("IHDR", 12, "ascii");
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

describe("readPngSize", () => {
  it("IHDR의 가로세로를 읽는다", () => {
    expect(readPngSize(pngHeader(1080, 435))).toEqual({ width: 1080, height: 435 });
  });

  it("PNG가 아니면 null이다", () => {
    expect(readPngSize(Buffer.from("not a png at all, just some text"))).toBeNull();
  });
});

describe("readSvgSize", () => {
  it("width와 height 속성을 읽는다", () => {
    expect(readSvgSize('<svg viewBox="0 0 10 10" width="720" height="252">')).toEqual({ width: 720, height: 252 });
  });

  it("크기 속성이 없거나 백분율이면 viewBox를 쓴다", () => {
    expect(readSvgSize('<svg width="100%" viewBox="0 0 640 320">')).toEqual({ width: 640, height: 320 });
  });

  it("크기를 알 수 없으면 null이다", () => {
    expect(readSvgSize("<svg>")).toBeNull();
  });
});

describe("listImageSources", () => {
  it("대체 텍스트에 대괄호가 있어도 경로를 찾는다", () => {
    const markdown = "![결과입니다. [확인 필요]가 붙은 숫자](/figures/a.png)\n\n![b](/figures/%ED%95%9C.png)";
    expect(listImageSources(markdown)).toEqual(["/figures/a.png", "/figures/한.png"]);
  });

  it("외부 주소와 일반 링크는 뺀다", () => {
    expect(listImageSources("![x](https://example.com/a.png) [파일](/practice-files/a.png)")).toEqual([]);
  });
});

describe("collectImageSizes", () => {
  it("본문 그림 경로마다 public 파일의 크기를 담는다", () => {
    const markdown = "![설명](/figures/session2-20261020/35-currentdoc-oauth-scopes.png)";
    const sizes = collectImageSizes(markdown, PUBLIC_DIR);
    const size = sizes["/figures/session2-20261020/35-currentdoc-oauth-scopes.png"];
    expect(size?.width).toBeGreaterThan(0);
    expect(size?.height).toBeGreaterThan(0);
  });

  it("외부 주소 그림은 건너뛴다", () => {
    expect(collectImageSizes("![x](https://example.com/a.png)", PUBLIC_DIR)).toEqual({});
  });

  it("없는 파일이면 경로를 담아 실패한다", () => {
    expect(() => collectImageSizes("![x](/figures/없는-그림.png)", PUBLIC_DIR)).toThrow("/figures/없는-그림.png");
  });
});

describe("sizeFor", () => {
  it("퍼센트 인코딩된 경로로도 찾는다", () => {
    const sizes = { "/figures/한글.png": { width: 10, height: 20 } };
    expect(sizeFor(sizes, "/figures/%ED%95%9C%EA%B8%80.png")).toEqual({ width: 10, height: 20 });
  });

  it("모르는 경로면 undefined다", () => {
    expect(sizeFor({}, "/figures/a.png")).toBeUndefined();
  });
});
