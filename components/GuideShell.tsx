"use client";

// Ported from claude-education-site/components/GuideShell.tsx and extended
// for a multi-chapter site.
//
// Changes from the reference (single-document shell):
// - Props switch from a single `guide: ParsedGuide` to `chapters` (every
//   chapter's metadata), `current` (the chapter being viewed, or null on
//   the home page) and `globalSearchIndex` (search entries spanning every
//   chapter). A new `children` prop was added — the reference embedded its
//   one document's `MarkdownContent` directly in the shell; a multi-page
//   site needs the shell to wrap whatever page-specific body Server
//   Components hand it (chapter markdown + prev/next nav, or the home
//   page's intro + track lists) instead.
// - The flat "toc" sidebar nav is replaced by `ChapterNav`: chapters
//   grouped by track (안내/1교시/2교시/3교시/참고), each chapter a link,
//   and the *current* chapter's h2 headings nested underneath with the
//   same scroll-spy active highlight the reference used for its TOC.
// - Search now runs over the global search index (every chapter) instead
//   of one document's section index, and each result carries a
//   chapterTitle. Clicking a result scrolls in place if it belongs to the
//   current chapter, otherwise navigates to `/guide/{slug}#{id}` via the
//   router.
// - The global search index (~230KB of JSON covering every chapter) is no
//   longer passed in as a prop — that would inline it into every page's
//   RSC payload whether or not the visitor ever opens search. Instead
//   GuideShell fetches it lazily, once, from the pre-rendered
//   `/api/search-index` static route the first time the search UI is
//   opened or used, and caches the result for the life of the component.
// - Lecture mode, reading progress, and the mobile menu (including its
//   focus trap) are unchanged from the reference.
import { Menu, PanelLeft, Presentation, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { groupChaptersBySession } from "@/lib/chapter-groups";
import type { ChapterMeta, GlobalSearchEntry, GuideHeading, ParsedChapter } from "@/lib/chapters";
import { captureScrollAnchor, hashTargetId, restoreScrollAnchor } from "@/lib/scroll-anchor";

// 셸이 쓰는 것은 현재 장의 slug와 제목 목록뿐이다. 마크다운 본문까지 넘기면 RSC 데이터로
// 페이지에 그대로 실려, 화면에서는 잠근 미공개 장 링크가 데이터에 남는다.
export type CurrentChapter = Pick<ParsedChapter, "slug" | "headings">;

type SearchIndexStatus = "idle" | "loading" | "loaded" | "error";

type GuideShellProps = {
  chapters: ChapterMeta[];
  current: CurrentChapter | null;
  children: ReactNode;
};

type NavigationPanelProps = {
  activeId: string;
  chapters: ChapterMeta[];
  currentSlug: string | null;
  inputId: string;
  label: string;
  onNavigateHeading: (id: string) => void;
  onNavigateResult: (result: GlobalSearchEntry) => void;
  onRequestSearchIndex: () => void;
  query: string;
  results: GlobalSearchEntry[];
  searchIndexStatus: SearchIndexStatus;
  setQuery: (query: string) => void;
  tocHeadings: GuideHeading[];
};

const SEARCH_INDEX_URL = "/api/search-index";

type ActiveHeadingCandidate = {
  id: string;
  top: number;
};

type LectureModeReadStorage = Pick<Storage, "getItem">;
type LectureModeWriteStorage = Pick<Storage, "setItem">;

const LECTURE_MODE_STORAGE_KEY = "claude-guide-lecture-mode";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

export function GuideShell({ chapters, current, children }: GuideShellProps) {
  const router = useRouter();
  const tocHeadings = useMemo(() => current?.headings.filter((heading) => heading.depth === 2) ?? [], [current]);
  const [activeId, setActiveId] = useState(tocHeadings[0]?.id ?? "");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLectureMode, setIsLectureMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [query, setQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState<GlobalSearchEntry[] | null>(null);
  const [searchIndexStatus, setSearchIndexStatus] = useState<SearchIndexStatus>("idle");
  const activeFrameRef = useRef<number | null>(null);
  const guideLayoutRef = useRef<HTMLDivElement | null>(null);
  const hasLoadedLectureModeRef = useRef(false);
  // 강의 모드가 바뀐 배치에서 실행할 위치 되돌리기. changeLectureMode가 채우고 레이아웃 효과가 비운다.
  const restoreScrollRef = useRef<(() => void) | null>(null);
  const mobileTopbarRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobilePanelRef = useRef<HTMLElement | null>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchIndexRequestRef = useRef<Promise<void> | null>(null);

  // Fetches the pre-rendered /api/search-index route (force-static, so it
  // costs one cached network round trip) the first time search is opened
  // or used, instead of every page shipping every chapter's search text in
  // its own RSC payload. Safe to call repeatedly — a request already in
  // flight or already resolved is reused rather than re-fetched.
  const ensureSearchIndexLoaded = useCallback(() => {
    if (searchIndexRequestRef.current) {
      return searchIndexRequestRef.current;
    }

    setSearchIndexStatus("loading");

    const request = fetch(SEARCH_INDEX_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`검색 인덱스 요청이 실패했습니다 (status ${response.status}).`);
        }

        return response.json() as Promise<GlobalSearchEntry[]>;
      })
      .then((data) => {
        setSearchIndex(data);
        setSearchIndexStatus("loaded");
      })
      .catch((error: unknown) => {
        console.error("검색 인덱스를 불러오지 못했습니다.", error);
        setSearchIndexStatus("error");
        // Allow a retry on the next interaction instead of getting stuck.
        searchIndexRequestRef.current = null;
      });

    searchIndexRequestRef.current = request;
    return request;
  }, []);

  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery || !searchIndex) {
      return [];
    }

    return searchIndex
      .filter((entry) => {
        const title = entry.title.toLocaleLowerCase();
        const text = entry.text.toLocaleLowerCase();
        return title.includes(normalizedQuery) || text.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [searchIndex, query]);

  // Clears any in-progress search when the visitor navigates to a
  // different chapter (or back to the home page), so the results panel
  // from the previous chapter doesn't linger over the new page's content.
  // GuideShell isn't remounted between pages (Next.js reuses the same
  // component instance across navigations here), so this can't be left to
  // useState's initializer — it has to react to `current` changing. Doing
  // that adjustment during render (React's documented pattern for
  // resetting state when a prop changes) avoids the extra commit a
  // setState-in-effect would cause.
  const previousChapterSlugRef = useRef(current?.slug ?? null);
  if (previousChapterSlugRef.current !== (current?.slug ?? null)) {
    previousChapterSlugRef.current = current?.slug ?? null;
    if (query !== "") {
      setQuery("");
    }
  }

  // 강의 모드를 바꾸면 본문 폭과 글자 크기가 달라진다. 보던 블록을 기억했다가 바뀐 배치에서 같은 자리로 되돌린다.
  const changeLectureMode = useCallback((next: boolean | ((currentMode: boolean) => boolean)) => {
    const anchor = captureScrollAnchor(document.querySelector(".guide-article"));
    restoreScrollRef.current = () => restoreScrollAnchor(anchor, scrollByInstantly);
    setIsLectureMode(next);
  }, []);

  useLayoutEffect(() => {
    const restore = restoreScrollRef.current;
    restoreScrollRef.current = null;
    restore?.();
  }, [isLectureMode]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      hasLoadedLectureModeRef.current = true;
      const storedMode = readStoredLectureMode(window.localStorage);
      const hashTarget = document.getElementById(hashTargetId(window.location.hash) ?? "");

      if (storedMode && hashTarget) {
        // 절 주소(#)로 들어왔다면 강의 모드 배치에서 그 절로 다시 이동한다.
        restoreScrollRef.current = () => hashTarget.scrollIntoView({ behavior: "instant", block: "start" });
        setIsLectureMode(true);
        return;
      }

      changeLectureMode(storedMode);
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [changeLectureMode]);

  useEffect(() => {
    if (!hasLoadedLectureModeRef.current) {
      return;
    }

    writeStoredLectureMode(window.localStorage, isLectureMode);
  }, [isLectureMode]);

  useEffect(() => {
    if (!isLectureMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        changeLectureMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeLectureMode, isLectureMode]);

  useEffect(() => {
    const updateProgress = () => {
      const documentElement = document.documentElement;
      const scrollableHeight = documentElement.scrollHeight - window.innerHeight;

      if (scrollableHeight <= 0) {
        setProgress(100);
        return;
      }

      setProgress(Math.min(100, Math.max(0, (window.scrollY / scrollableHeight) * 100)));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const updateActiveSection = useCallback(() => {
    const headingPositions = tocHeadings
      .map((heading) => {
        const element = document.getElementById(heading.id);

        if (!element) {
          return null;
        }

        return {
          id: heading.id,
          top: element.getBoundingClientRect().top
        };
      })
      .filter((heading): heading is ActiveHeadingCandidate => heading !== null);

    const nextActiveId = selectActiveHeadingId(headingPositions, getActiveHeadingOffset());

    if (nextActiveId) {
      setActiveId(nextActiveId);
    }
  }, [tocHeadings]);

  const scheduleActiveUpdate = useCallback(() => {
    if (activeFrameRef.current !== null) {
      return;
    }

    activeFrameRef.current = window.requestAnimationFrame(() => {
      activeFrameRef.current = null;
      updateActiveSection();
    });
  }, [updateActiveSection]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    window.requestAnimationFrame(() => {
      menuButtonRef.current?.focus();
    });
  }, []);

  const focusMobilePanel = useCallback(() => {
    const firstFocusableElement = mobileCloseButtonRef.current ?? getFocusableElements(mobilePanelRef.current)[0];
    firstFocusableElement?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    scheduleActiveUpdate();
    window.addEventListener("scroll", scheduleActiveUpdate, { passive: true });
    window.addEventListener("resize", scheduleActiveUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleActiveUpdate);
      window.removeEventListener("resize", scheduleActiveUpdate);

      if (activeFrameRef.current !== null) {
        window.cancelAnimationFrame(activeFrameRef.current);
        activeFrameRef.current = null;
      }
    };
  }, [scheduleActiveUpdate]);

  useEffect(() => {
    const observer = new IntersectionObserver(() => scheduleActiveUpdate(), {
      rootMargin: "0px 0px -72% 0px",
      threshold: 0
    });

    for (const heading of tocHeadings) {
      const element = document.getElementById(heading.id);

      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [scheduleActiveUpdate, tocHeadings]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const backgroundElements = [guideLayoutRef.current, mobileTopbarRef.current].filter(
      (element): element is HTMLElement => element !== null
    );

    document.body.style.overflow = "hidden";
    for (const element of backgroundElements) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      for (const element of backgroundElements) {
        element.removeAttribute("inert");
        element.removeAttribute("aria-hidden");
      }
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    focusMobilePanel();
    const focusTimer = window.setTimeout(focusMobilePanel, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileMenu();
        return;
      }

      if (event.key !== "Tab" || !mobilePanelRef.current) {
        return;
      }

      const focusableElements = getFocusableElements(mobilePanelRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMobileMenu, focusMobilePanel, isMobileMenuOpen]);

  function openMobileMenu() {
    setIsMobileMenuOpen(true);
    ensureSearchIndexLoaded();
  }

  function toggleLectureMode() {
    setIsMobileMenuOpen(false);
    changeLectureMode((currentMode) => !currentMode);
  }

  function scrollToElement(id: string, options: { closeMenu?: boolean; updateHash?: boolean } = {}) {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" });
    if (options.updateHash !== false) {
      window.history.replaceState(null, "", `#${id}`);
    }
    if (options.closeMenu) {
      closeMobileMenu();
    }
  }

  function scrollToSection(id: string) {
    scrollToElement(id, { closeMenu: true });
    setActiveId(id);
  }

  function navigateToSearchResult(result: GlobalSearchEntry) {
    if (current && result.slug === current.slug) {
      scrollToSection(result.id);
      return;
    }

    setIsMobileMenuOpen(false);
    router.push(`/guide/${result.slug}#${result.id}`);
  }

  return (
    <div className={getGuidePageClassName(isLectureMode)}>
      <div className="reading-progress" aria-hidden="true">
        <div className="reading-progress__bar" style={{ transform: `scaleX(${progress / 100})` }} />
      </div>

      <button
        type="button"
        className="lecture-mode-toggle"
        aria-pressed={isLectureMode}
        onClick={toggleLectureMode}
      >
        {isLectureMode ? <PanelLeft aria-hidden="true" size={17} /> : <Presentation aria-hidden="true" size={17} />}
        <span>{isLectureMode ? "자료 보기" : "강의 모드"}</span>
      </button>

      <header className="mobile-topbar" ref={mobileTopbarRef}>
        <Link className="mobile-topbar__title" href="/" onClick={() => setIsMobileMenuOpen(false)}>
          AI와 일하는 HR 5기
        </Link>
        <div className="mobile-topbar__actions">
          {/* 좁은 화면에서는 강의 모드 버튼을 상단 바에 둔다. 떠 있는 버튼이 본문을 가리지 않게 하려는 것이다. */}
          <button type="button" className="mobile-lecture-button" aria-pressed={isLectureMode} onClick={toggleLectureMode}>
            <Presentation aria-hidden="true" size={16} />
            <span>강의 모드</span>
          </button>
          <button
            type="button"
            className="mobile-menu-button"
            ref={menuButtonRef}
            aria-label="목차 열기"
            aria-controls="mobile-guide-panel"
            aria-expanded={isMobileMenuOpen}
            onClick={openMobileMenu}
          >
            <Menu aria-hidden="true" size={21} />
          </button>
        </div>
      </header>

      <div className="guide-layout" ref={guideLayoutRef}>
        <aside className="guide-sidebar" aria-label="문서 내비게이션">
          <NavigationPanel
            activeId={activeId}
            chapters={chapters}
            currentSlug={current?.slug ?? null}
            inputId="guide-search-desktop"
            label="문서 검색"
            onNavigateHeading={scrollToSection}
            onNavigateResult={navigateToSearchResult}
            onRequestSearchIndex={ensureSearchIndexLoaded}
            query={query}
            results={searchResults}
            searchIndexStatus={searchIndexStatus}
            setQuery={setQuery}
            tocHeadings={tocHeadings}
          />
        </aside>

        <main className="guide-main" id="top">
          {children}
        </main>
      </div>

      <div
        className={`mobile-backdrop${isMobileMenuOpen ? " is-open" : ""}`}
        aria-hidden="true"
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside
        id="mobile-guide-panel"
        className={`mobile-panel${isMobileMenuOpen ? " is-open" : ""}`}
        ref={mobilePanelRef}
        aria-hidden={!isMobileMenuOpen}
        aria-labelledby="mobile-guide-panel-title"
        aria-modal="true"
        role="dialog"
        tabIndex={-1}
      >
        <div className="mobile-panel__header">
          <span id="mobile-guide-panel-title">목차</span>
          <button
            type="button"
            className="mobile-panel__close"
            ref={mobileCloseButtonRef}
            aria-label="목차 닫기"
            onClick={closeMobileMenu}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        <NavigationPanel
          activeId={activeId}
          chapters={chapters}
          currentSlug={current?.slug ?? null}
          inputId="guide-search-mobile"
          label="모바일 문서 검색"
          onNavigateHeading={scrollToSection}
          onNavigateResult={navigateToSearchResult}
          onRequestSearchIndex={ensureSearchIndexLoaded}
          query={query}
          results={searchResults}
          searchIndexStatus={searchIndexStatus}
          setQuery={setQuery}
          tocHeadings={tocHeadings}
        />
      </aside>
    </div>
  );
}

export function getGuidePageClassName(isLectureMode: boolean): string {
  return isLectureMode ? "guide-page guide-page--lecture" : "guide-page";
}

// 위치 되돌리기는 부드러운 스크롤 없이 한 번에 한다(html의 scroll-behavior: smooth를 덮어씀).
function scrollByInstantly(delta: number): void {
  window.scrollBy({ top: delta, behavior: "instant" });
}

export function readStoredLectureMode(storage: LectureModeReadStorage | null): boolean {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(LECTURE_MODE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeStoredLectureMode(storage: LectureModeWriteStorage | null, isLectureMode: boolean): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(LECTURE_MODE_STORAGE_KEY, isLectureMode ? "true" : "false");
  } catch {
    // Storage can be blocked by browser privacy settings. The UI still works for the current session.
  }
}

export function selectActiveHeadingId(headings: ActiveHeadingCandidate[], headerOffset: number): string {
  if (headings.length === 0) {
    return "";
  }

  let activeId = headings[0].id;

  for (const heading of headings) {
    if (heading.top <= headerOffset) {
      activeId = heading.id;
    } else {
      break;
    }
  }

  return activeId;
}

export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    const isDisabled = element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
    const isHidden = element.hidden || element.closest("[hidden], [aria-hidden='true']") !== null;
    return !isDisabled && !isHidden;
  });
}

function getActiveHeadingOffset(): number {
  const mobileTopbar = document.querySelector<HTMLElement>(".mobile-topbar");

  if (mobileTopbar && window.getComputedStyle(mobileTopbar).display !== "none") {
    return mobileTopbar.getBoundingClientRect().height + 28;
  }

  return 96;
}

function NavigationPanel({
  activeId,
  chapters,
  currentSlug,
  inputId,
  label,
  onNavigateHeading,
  onNavigateResult,
  onRequestSearchIndex,
  query,
  results,
  searchIndexStatus,
  setQuery,
  tocHeadings
}: NavigationPanelProps) {
  return (
    <div className="navigation-panel">
      <Link className="guide-brand" href="/">
        <p className="guide-brand__eyebrow">원티드랩 Claude 심화 부트캠프</p>
        <p className="guide-brand__title">AI와 일하는 HR 5기</p>
      </Link>

      <div className="guide-search">
        <div className="guide-search__field">
          <Search aria-hidden="true" size={16} />
          <input
            id={inputId}
            type="search"
            aria-label={label}
            value={query}
            placeholder="교안 전체 검색"
            autoComplete="off"
            onFocus={onRequestSearchIndex}
            onChange={(event) => {
              onRequestSearchIndex();
              setQuery(event.target.value);
            }}
          />
        </div>
      </div>

      {query.trim() ? (
        <div className="search-results" aria-live="polite">
          <p className="search-results__label">검색 결과</p>
          {searchIndexStatus === "error" ? (
            <p className="search-results__empty">검색 인덱스를 불러오지 못했어요.</p>
          ) : searchIndexStatus === "loading" || searchIndexStatus === "idle" ? (
            <p className="search-results__empty">검색 인덱스를 불러오는 중입니다...</p>
          ) : results.length > 0 ? (
            <ol>
              {results.map((result) => (
                <li key={`${result.slug}-${result.id}`}>
                  <button type="button" onClick={() => onNavigateResult(result)}>
                    <span className="search-results__chapter">{result.chapterTitle}</span>
                    <span>{result.title}</span>
                    <small>{result.text}</small>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="search-results__empty">검색 결과가 없습니다.</p>
          )}
        </div>
      ) : null}

      <nav className="chapter-nav" aria-label="교안 목차">
        {/* 장이 17개라 회차 단위로 묶는다. 공개 전 회차는 chapters에 이미
            빠져 있어 그룹째 나타나지 않는다. 각 장의 절은 항상 펼쳐 둔다
            (강사 결정, 2026-08-15). */}
        {groupChaptersBySession(chapters).map((group) => (
          <div key={group.id} className="chapter-nav__track">
            <p className="chapter-nav__track-label">
              {group.label} {group.title}
            </p>
            <ol className="chapter-nav__list">
              {group.items.map((chapter) => {
                const isCurrentChapter = chapter.slug === currentSlug;
                const chapterHref = `/guide/${chapter.slug}`;
                // The current chapter keeps in-page scroll behavior and
                // active tracking; other chapters link out. "개요" is
                // omitted — clicking the chapter title lands on it.
                const headings = (isCurrentChapter ? tocHeadings : chapter.headings).filter(
                  (heading) => heading.text !== "개요"
                );

                return (
                  <li key={chapter.slug} className="chapter-nav__item">
                    <Link
                      href={chapterHref}
                      className={`chapter-nav__link${isCurrentChapter ? " is-active" : ""}`}
                      aria-current={isCurrentChapter ? "page" : undefined}
                    >
                      <span className="chapter-nav__number">{chapter.number}</span>
                      <span className="chapter-nav__title">{chapter.title}</span>
                    </Link>

                    {headings.length > 0 ? (
                      <ol className="chapter-nav__headings">
                        {headings.map((heading) => (
                          <li key={heading.id}>
                            {isCurrentChapter ? (
                              <a
                                href={`#${heading.id}`}
                                className={heading.id === activeId ? "is-active" : undefined}
                                aria-current={heading.id === activeId ? "location" : undefined}
                                onClick={(event) => {
                                  event.preventDefault();
                                  onNavigateHeading(heading.id);
                                }}
                              >
                                {heading.text}
                              </a>
                            ) : (
                              <Link href={`${chapterHref}#${heading.id}`}>{heading.text}</Link>
                            )}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </nav>
    </div>
  );
}
