// 장 본문 마크다운을 화면으로 그린다.
// - 인용문 맨 앞 이모지(⚠️💡💰📌📋🖼️)로 안내 상자 종류를 정한다(lib/callouts.ts).
//   📋 강사 노트는 이름표가 붙은 메모 상자로, 🖼️ 화면 확인은 일반 안내 상자로 그린다.
// - rehype-raw로 본문의 <details> 접기 블록을 HTML로 그린다. content/는 이 저장소에서
//   쓰는 글이라 외부 HTML이 들어오지 않는다.
// - 아직 열리지 않은 회차의 장을 가리키는 링크는 공개일을 붙인 글자로만 남겨,
//   부록이 뒤 회차를 가리켜도 미공개 페이지 주소가 새지 않게 한다.
import type { Heading, Root } from "mdast";
import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import { getCalloutKind } from "@/lib/callouts";
import { getLockedSession } from "@/lib/sessions";
import { createHeadingIdAssigner } from "@/lib/heading-slugs";
import { type ImageSizes, sizeFor } from "@/lib/image-sizes";
import { type PracticeKind, type PracticeLabels, practiceKindFor } from "@/lib/practice-labels";
import { CopyButton } from "./CopyButton";

type MarkdownContentProps = {
  markdown: string;
  // 장 제목 바로 아래에 붙는 회차 안내(예: 현장 상황에 따라 바뀔 수 있음).
  notice?: string | null;
  // 개요의 실습 구분표에서 읽은 실습별 구분. 실습 제목 옆에 함께 완성, 강사 시연, 선택 확장 표시를 단다.
  practiceLabels?: PracticeLabels;
  // 빌드할 때 읽은 그림 크기. <img>에 width, height로 달아 늦게 뜬 그림이 본문을 밀지 않게 한다.
  imageSizes?: ImageSizes;
};

const PRACTICE_CHIP_CLASS: Record<PracticeKind, string> = {
  "함께 완성": "practice-chip practice-chip--together",
  "강사 시연": "practice-chip practice-chip--demo",
  "선택 확장": "practice-chip practice-chip--optional"
};

function PracticeChip({ kind }: { kind: PracticeKind | null }) {
  return kind ? <span className={PRACTICE_CHIP_CLASS[kind]}>{kind}</span> : null;
}

type ElementWithChildren = {
  children?: ReactNode;
  className?: string;
};

type MarkdownNodeWithPosition = {
  position?: {
    start?: {
      line?: number;
    };
    end?: {
      line?: number;
    };
  };
};

export function MarkdownContent({ markdown, notice, practiceLabels = {}, imageSizes = {} }: MarkdownContentProps) {
  const components: Components = {
    h1({ children, id }) {
      return (
        <>
          <h1 id={id} className="guide-heading guide-heading-h1">
            {children}
          </h1>
          {notice ? <p className="guide-callout guide-callout--check session-notice">{notice}</p> : null}
        </>
      );
    },
    h2({ children, id }) {
      return (
        <h2 id={id} className="guide-heading guide-heading-h2">
          {children}
          <PracticeChip kind={practiceKindFor(nodeToPlainText(children), practiceLabels, 2)} />
        </h2>
      );
    },
    h3({ children, id }) {
      return (
        <h3 id={id} className="guide-heading guide-heading-h3">
          {children}
          <PracticeChip kind={practiceKindFor(nodeToPlainText(children), practiceLabels, 3)} />
        </h3>
      );
    },
    blockquote({ children }) {
      const kind = getCalloutKind(nodeToPlainText(children));

      if (kind === "instructor") {
        return (
          <div className="guide-callout guide-callout--instructor">
            <span className="guide-callout__label">강사 노트</span>
            <div className="guide-callout__body">{children}</div>
          </div>
        );
      }

      const className = kind ? `guide-callout guide-callout--${kind}` : "guide-callout";

      return <blockquote className={className}>{children}</blockquote>;
    },
    a({ href, children }) {
      const locked = getLockedSession(href);
      // 숨긴 회차는 공개일도 알리지 않고 글자만 남긴다.
      if (locked?.hidden) return <span>{children}</span>;
      if (locked) {
        return (
          <span className="guide-link--locked" title={`${locked.label} 수업 날 공개`}>
            {children}
            <span className="guide-link__note">({locked.dateLabel} 공개)</span>
          </span>
        );
      }
      return <a href={href} download={href?.startsWith("/practice-files/") || undefined}>{children}</a>;
    },
    img({ src, alt }) {
      const imageSrc = typeof src === "string" ? src : undefined;
      const size = imageSrc ? sizeFor(imageSizes, imageSrc) : undefined;
      // 좁은 화면에서는 그림 글자가 너무 작아지므로, 그림 폭을 유지한 채 가로로 밀어 보게 한다.
      return (
        <span className="figure-scroll">
          {/* 정적 내보내기의 SVG 그림이라 next/image로 최적화할 것이 없다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt={alt ?? ""} width={size?.width} height={size?.height} loading="lazy" />
          <span className="figure-scroll__hint">그림을 좌우로 밀어 보세요</span>
        </span>
      );
    },
    table({ children }) {
      return (
        <div className="table-scroll">
          <table>{children}</table>
        </div>
      );
    },
    pre({ children }) {
      const code = nodeToPlainText(children);
      const language = findCodeLanguage(children);

      return (
        <div className="code-block">
          <div className="code-block__toolbar">
            <span className="code-block__language">{language ?? "code"}</span>
            <CopyButton code={code.replace(/\n$/, "")} />
          </div>
          <pre>{children}</pre>
        </div>
      );
    },
    code({ children, className, node }) {
      const isBlock = className?.startsWith("language-") || isMultilineNode(node);
      const codeClassName = [className, isBlock ? "code-block__code" : "inline-code"].filter(Boolean).join(" ");

      return <code className={codeClassName}>{children}</code>;
    }
  };

  return (
    <ReactMarkdown
      remarkPlugins={[[remarkGfm, { singleTilde: false }], remarkHeadingIds]}
      rehypePlugins={[rehypeRaw]}
      components={components}
    >
      {markdown}
    </ReactMarkdown>
  );
}

function remarkHeadingIds() {
  return (tree: Root) => {
    const assignHeadingId = createHeadingIdAssigner();

    visit(tree, "heading", (node: Heading) => {
      const data = node.data ?? (node.data = {});
      const hProperties = typeof data.hProperties === "object" && data.hProperties !== null ? data.hProperties : {};

      data.hProperties = {
        ...hProperties,
        id: assignHeadingId(node)
      };
    });
  };
}

function nodeToPlainText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => nodeToPlainText(child)).join("");
  }

  if (isValidElement<ElementWithChildren>(node)) {
    return nodeToPlainText(node.props.children);
  }

  return Children.toArray(node)
    .map((child) => nodeToPlainText(child))
    .join("");
}

function findCodeLanguage(node: ReactNode): string | null {
  if (isValidElement<ElementWithChildren>(node)) {
    const match = node.props.className?.match(/language-([\w-]+)/);

    if (match?.[1]) {
      return match[1];
    }

    return findCodeLanguage(node.props.children);
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const language = findCodeLanguage(child);

      if (language) {
        return language;
      }
    }
  }

  return null;
}

function isMultilineNode(node: MarkdownNodeWithPosition | undefined): boolean {
  const startLine = node?.position?.start?.line;
  const endLine = node?.position?.end?.line;

  return typeof startLine === "number" && typeof endLine === "number" && endLine > startLine;
}
