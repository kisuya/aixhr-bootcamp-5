# AI와 일하는 HR 5기 교안

원티드랩 Claude 심화 부트캠프 「AI와 일하는 HR」 5기(2026년 10~11월)의 교안 사이트입니다. HR 담당자가 Claude에게 일을 맡기고, 반복시키고, 직접 업무 도구를 만들어 보는 과정의 본문과 가상 실습 데이터가 들어 있습니다.

- 교안 보기: https://aixhr-bootcamp-5.vercel.app
- 위 주소는 과정이 끝나면 내려갈 수 있습니다. 계속 쓰려면 이 저장소를 가져가 내 Vercel에 배포합니다.

AI 지식을 설명하는 데서 끝내지 않고, 수강생이 손으로 만들어 본 경험을 남기는 것을 목표로 만들었습니다. 더 많은 분이 자기 업무 도구를 만들어 볼 수 있도록 교안을 공개합니다.

## 들어 있는 것

| 회차 | 내용 |
|---|---|
| 1회차 Claude 시작하기 | Claude 세팅과 커넥터 연결, 내 업무 문제 정의와 첫 실행 |
| 2회차 Claude와 함께 일하기 | 스킬과 예약 작업, Cowork, 브라우저와 화면 제어, Apps Script와 Claude API |
| 3회차 Claude Code | HR 미니앱 만들기, 공공 API 연동, 사내망과 폐쇄망에서 쓰기, 로그인과 배포 |
| 부록 | HR 사례 카드, 데이터 보안 기준, 설치와 용어, 막힐 때 보는 치트시트 |

4회차는 각자 3회차에서 시작한 도구를 이어서 만드는 시간이라 교안 장이 없습니다.

- 실습 데이터는 가상 회사 '한결커머스'의 합성 데이터입니다. 실제 회사나 사람과 관계가 없습니다.
- Claude의 화면, 요금, 기능 이름은 2026년 10월 기준입니다. 쓰기 전에 지금 화면과 다른 곳이 있는지 확인합니다.

## 내 Vercel에 배포하기

GitHub 계정과 Vercel 계정이 필요합니다. 환경변수는 넣지 않아도 됩니다.

> Vercel의 무료 플랜(Hobby)은 비상업 개인용입니다. 유료 강의나 회사 업무에 쓰려면 Pro 같은 상업용 플랜을 씁니다.

### 방법 1. 버튼으로 한 번에

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkisuya%2Faixhr-bootcamp-5&project-name=aixhr-bootcamp-5&repository-name=aixhr-bootcamp-5)

1. 위 버튼을 누르고 GitHub 계정으로 Vercel에 로그인합니다.
2. 저장소 이름을 정하고 "Create"를 누릅니다. 내 GitHub에 이 저장소의 사본이 생깁니다. 비공개로 두려면 이 화면에서 Private를 고릅니다.
3. 배포가 끝나면 프로젝트 화면의 Domains에 나온 주소(`○○.vercel.app`)로 엽니다.

### 방법 2. Fork한 뒤 Vercel에서 가져오기

1. 이 저장소 오른쪽 위의 "Fork"를 눌러 내 계정에 사본을 만듭니다. 공개 저장소의 Fork는 공개로만 만들어집니다.
2. [Vercel 대시보드](https://vercel.com/dashboard)에서 "Add New..." > "Project"를 누릅니다.
3. 목록에서 Fork한 저장소의 "Import"를 누릅니다. 목록에 없으면 Vercel이 그 저장소를 읽도록 GitHub에서 허용합니다.
4. Framework Preset이 Next.js인지 보고, 나머지는 그대로 둔 채 "Deploy"를 누릅니다.

원본이 고쳐지면 내 Fork의 GitHub 화면에서 "Sync fork"로 받아 옵니다.

### 방법 3. 터미널에서

```bash
git clone https://github.com/kisuya/aixhr-bootcamp-5.git
cd aixhr-bootcamp-5
npm install
npx vercel --prod
```

처음 실행하면 Vercel 로그인과 프로젝트 이름을 묻습니다.

### 배포한 뒤

- 방법 1, 2로 만든 프로젝트는 내 저장소의 `main`에 올린 변경을 Vercel이 자동으로 다시 배포합니다.
- 수강생에게는 Domains에 나온 주소를 알려 줍니다. 배포마다 생기는 긴 주소(`○○-해시-계정.vercel.app`)는 Vercel에 로그인한 본인만 엽니다.
- 기본으로는 Domains의 주소를 아는 누구나 엽니다. 수강생만 보게 하려면 Vercel 프로젝트의 Settings > Deployment Protection에서 보호를 켭니다. 방법과 플랜별 차이는 교안 3-3의 "로그인으로 볼 사람 정하기"에 있습니다.

## 내 PC에서 보기

Node.js 20.9 이상이 필요합니다(22나 24 LTS 권장).

```bash
npm install
npm run dev
```

http://localhost:3000 으로 엽니다. 잠긴 회차까지 미리 보려면 `PREVIEW_ALL_SESSIONS=1 npm run dev`로 켭니다.

강의장 인터넷이 불안하면 정적 사본을 만들어 둡니다.

```bash
npm run build                      # out/ 폴더에 사이트 전체가 생깁니다
python3 -m http.server 8000 -d out # http://localhost:8000 으로 엽니다
```

`out/`의 HTML 파일을 더블클릭해 열면 장 페이지가 깨집니다. 위처럼 로컬 서버로 엽니다.

## 내 과정에 맞게 고치기

| 고칠 것 | 위치 | 방법 |
|---|---|---|
| 본문 | `content/` | `회차-번호_제목.md` 이름의 파일이 장 하나입니다(예: `3-1_Claude_Code가_필요한_일.md`). 부록은 `9-번호`입니다. 장 제목은 파일 첫 줄의 `# 제목`에서 가져옵니다. |
| 회차 이름, 날짜, 공개 | `lib/sessions.json` | `open: true`면 공개, `false`면 날짜만 보이고 잠깁니다. `hidden: true`면 홈과 메뉴에서도 숨깁니다. `tentative: true`면 "바뀔 수 있습니다" 안내가 붙습니다. |
| 그림 | `public/figures/` | 본문에서 `![설명](/figures/파일이름.png)`으로 넣습니다. |
| 실습 파일 | `public/practice-files/` | 본문의 내려받기 링크가 이 폴더의 파일을 가리킵니다. 파일을 바꾸면 본문의 정답 숫자도 함께 고칩니다. |
| 과정 이름 | `app/layout.tsx`, `app/page.tsx`, `app/not-found.tsx`, `app/guide/[slug]/page.tsx`, `components/GuideShell.tsx` | "원티드랩 Claude 심화 부트캠프"와 "AI와 일하는 HR 5기" 문구를 내 과정 이름으로 바꿉니다. |

Claude Code로 이 폴더를 열고 "1회차만 공개하고 나머지 회차는 잠가 줘"처럼 요청해도 됩니다.

고친 뒤에는 빌드를 돌려 봅니다. 빌드가 끝나면 잠긴 회차가 사이트에 새지 않았는지 함께 검사합니다. 사이트 코드를 고쳤다면 `npm test`도 돌립니다.

```bash
npm run build
```

## 폴더 구성

```text
content/                교안 본문
lib/sessions.json       회차 이름, 날짜, 공개 여부
public/figures/         본문 그림
public/practice-files/  가상 실습 파일
scripts/verify-out.mjs  빌드 뒤 공개 범위 검사
app/ components/ lib/   사이트 코드(Next.js 16, 정적 내보내기)
```

## 라이선스

- 코드: [MIT](LICENSE)
- 교안과 실습 자료: [CC BY 4.0](LICENSE-CONTENT.md). 출처를 밝히면 고쳐 쓰고 배포할 수 있습니다.
