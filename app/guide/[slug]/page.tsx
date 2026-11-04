import { join } from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GuideShell } from "@/components/GuideShell";
import { MarkdownContent } from "@/components/MarkdownContent";
import { getChapter, getChapters } from "@/lib/chapters";
import { collectImageSizes } from "@/lib/image-sizes";
import { parsePracticeLabels } from "@/lib/practice-labels";
import { getSessionNotice } from "@/lib/sessions";

export function generateStaticParams() {
  return getChapters().map((chapter) => ({ slug: chapter.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guide/[slug]">) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  const site = "AI와 일하는 HR 5기";
  return { title: chapter ? `${chapter.title} | ${site}` : site };
}

export default async function GuidePage({ params }: PageProps<"/guide/[slug]">) {
  const { slug } = await params;
  const chapter = getChapter(slug);
  if (!chapter) notFound();

  const chapters = getChapters();
  const currentIndex = chapters.findIndex((candidate) => candidate.slug === chapter.slug);
  const previousChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  return (
    <GuideShell chapters={chapters} current={{ slug: chapter.slug, headings: chapter.headings }}>
      <article className="guide-article">
        <MarkdownContent
          markdown={chapter.markdown}
          notice={getSessionNotice(chapter.group)}
          practiceLabels={parsePracticeLabels(chapter.markdown)}
          imageSizes={collectImageSizes(chapter.markdown, join(process.cwd(), "public"))}
        />

        {previousChapter || nextChapter ? (
          <nav className="chapter-pagination" aria-label="이전/다음 장">
            {previousChapter ? (
              <Link className="chapter-pagination__link chapter-pagination__link--prev" href={`/guide/${previousChapter.slug}`}>
                <span className="chapter-pagination__label">← 이전 장</span>
                <span className="chapter-pagination__title">
                  {previousChapter.number}. {previousChapter.title}
                </span>
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}

            {nextChapter ? (
              <Link className="chapter-pagination__link chapter-pagination__link--next" href={`/guide/${nextChapter.slug}`}>
                <span className="chapter-pagination__label">다음 장 →</span>
                <span className="chapter-pagination__title">
                  {nextChapter.number}. {nextChapter.title}
                </span>
              </Link>
            ) : (
              <span aria-hidden="true" />
            )}
          </nav>
        ) : null}
      </article>
    </GuideShell>
  );
}
