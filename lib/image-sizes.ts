// 본문 그림의 가로세로 크기를 빌드할 때 읽는다.
//
// <img>에 width와 height가 없으면 브라우저는 그림을 받기 전까지 높이를 0으로
// 둔다. 절 주소(#)로 들어오면 먼저 그 절로 이동한 뒤 위쪽 그림이 늦게 뜨면서
// 본문을 밀어내, 목표 절이 화면 밖으로 밀려난다. 크기를 미리 달아 두면
// 브라우저가 자리를 잡아 두므로 처음 이동한 위치가 그대로 유지된다.
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import type { Image, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export type ImageSize = { width: number; height: number };
export type ImageSizes = Readonly<Record<string, ImageSize>>;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function readPngSize(buffer: Buffer): ImageSize | null {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null;
  }

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

export function readSvgSize(text: string): ImageSize | null {
  const tag = text.match(/<svg\b[^>]*>/i)?.[0];

  if (!tag) {
    return null;
  }

  const width = positiveNumberAttr(tag, "width");
  const height = positiveNumberAttr(tag, "height");

  if (width && height) {
    return { width, height };
  }

  const viewBox = tag.match(/\sviewBox\s*=\s*["']([^"']+)["']/i)?.[1].trim().split(/[\s,]+/).map(Number);

  if (viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  return null;
}

function positiveNumberAttr(tag: string, name: string): number | null {
  const value = tag.match(new RegExp(`\\s${name}\\s*=\\s*["']([\\d.]+)(?:px)?["']`, "i"))?.[1];
  const parsed = value === undefined ? Number.NaN : Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readImageSize(filePath: string): ImageSize | null {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".png") {
    return readPngSize(readFileSync(filePath));
  }

  if (extension === ".svg") {
    return readSvgSize(readFileSync(filePath, "utf8"));
  }

  return null;
}

function decodePath(src: string): string {
  try {
    return decodeURIComponent(src);
  } catch {
    return src;
  }
}

// 본문의 사이트 안 그림(/로 시작) 경로. 대체 텍스트에 [확인 필요]처럼 대괄호가
// 들어가도 놓치지 않도록 정규식 대신 마크다운 파서로 찾는다. 퍼센트 인코딩은 푼다.
export function listImageSources(markdown: string): string[] {
  const tree = unified().use(remarkParse).use(remarkGfm, { singleTilde: false }).parse(markdown) as Root;
  const sources: string[] = [];

  visit(tree, "image", (node: Image) => {
    if (node.url.startsWith("/")) {
      sources.push(decodePath(node.url));
    }
  });

  return [...new Set(sources)];
}

// 본문의 사이트 안 그림마다 크기를 담는다. 키는 퍼센트 인코딩을 푼 경로다.
export function collectImageSizes(markdown: string, publicDir: string): ImageSizes {
  const entries = listImageSources(markdown).flatMap((src) => {
    try {
      const size = readImageSize(join(publicDir, src));
      return size ? [[src, size] as const] : [];
    } catch (error) {
      throw new Error(`본문 그림의 크기를 읽지 못했습니다: ${src}`, { cause: error });
    }
  });

  return Object.fromEntries(entries);
}

export function sizeFor(sizes: ImageSizes, src: string): ImageSize | undefined {
  return sizes[src] ?? sizes[decodePath(src)];
}
