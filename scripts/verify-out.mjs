// 빌드 결과물(out/)이 lib/sessions.json의 공개 범위와 맞는지 검사한다.
// `npm run build` 다음에 실행한다. 강사 검토용 빌드(PREVIEW_ALL_SESSIONS=1)는
// 일부러 전부 연 것이라 검사 대상이 아니다.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

if (process.env.PREVIEW_ALL_SESSIONS === "1") {
  console.log("검토용 빌드(PREVIEW_ALL_SESSIONS=1)라 공개 범위 검사를 건너뜁니다.");
  process.exit(0);
}

const root = process.cwd();
const { sessions } = JSON.parse(readFileSync(join(root, "lib/sessions.json"), "utf8"));
const openGroups = new Set(["9", ...sessions.filter((session) => session.open).map((session) => session.id)]);

const chapters = readdirSync(join(root, "content"))
  .filter((file) => file.endsWith(".md"))
  .map((file) => file.match(/^(\d)-(\d+)_/))
  .filter(Boolean)
  .map((match) => ({ slug: `${match[1]}-${match[2]}`, group: match[1] }));

const indexPath = join(root, "out/api/search-index");
const homePath = join(root, "out/index.html");
if (!existsSync(indexPath) || !existsSync(homePath)) {
  console.error("out/ 이 없습니다. 먼저 npm run build 를 실행하세요.");
  process.exit(1);
}

const searchIndex = readFileSync(indexPath, "utf8");
const home = readFileSync(homePath, "utf8");
const problems = [];

for (const { slug, group } of chapters) {
  const page = join(root, "out/guide", slug, "index.html");
  const shouldBeOpen = openGroups.has(group);

  if (shouldBeOpen && !existsSync(page)) problems.push(`공개 회차인데 페이지가 없습니다: ${slug}`);
  if (!shouldBeOpen && existsSync(page)) problems.push(`미공개 회차인데 페이지가 있습니다: ${slug}`);
  if (!shouldBeOpen && searchIndex.includes(`"slug":"${slug}"`)) problems.push(`미공개 장이 검색 색인에 있습니다: ${slug}`);
  if (!shouldBeOpen && home.includes(`/guide/${slug}`)) problems.push(`미공개 장 링크가 홈에 있습니다: ${slug}`);
}

// 공개된 페이지 어디에도 미공개 장 링크가 없어야 한다(사이드바, 이전/다음 이동).
const closedSlugs = chapters.filter(({ group }) => !openGroups.has(group)).map(({ slug }) => slug);
for (const { slug, group } of chapters) {
  if (!openGroups.has(group)) continue;
  const page = join(root, "out/guide", slug, "index.html");
  if (!existsSync(page)) continue;
  const html = readFileSync(page, "utf8");
  for (const closed of closedSlugs) {
    if (html.includes(`/guide/${closed}/`) || html.includes(`/guide/${closed}"`)) {
      problems.push(`공개된 장 ${slug}에 미공개 장 ${closed} 링크가 있습니다`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`공개 범위 확인 완료. 열린 그룹: ${[...openGroups].sort().join(", ")} / 장 ${chapters.length}개 검사`);
