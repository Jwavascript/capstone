# ex02 제작 보고: Hono 구현 · Next.js 중계(BFF) · 화면 API 호출

자동 실습이라 사용자에게 묻지 못했습니다. CLAUDE.md의 확인 지점은 모두 "예"로 보고 진행했습니다. git 커밋은 하지 않았습니다.

## 1. 확인받았을 목록 (CLAUDE.md 5-1)
- ex02/가 없으므로 ex01/을 복사함. `index.html`은 `ex02/public/index.html`로 옮기고 `openapi.yaml`은 그대로 둠. `node_modules` · `dist` · `.data`는 ex01에 원래 없었음
- 바뀌는 항목: `public/index.html`의 Data · State · 북마크 부분을 fetch 호출로 바꾸고, 칸 이름을 계약에 맞춤(`sec`→`section`, `count`→`articleCount`, `folder` 객체→`folderId`, 숫자→ISO `savedAt`, 섹션 객체→`sections` 배열)
- 지우는 항목: `POOL` · `ISSUES` · `rng` · `rankingFor` · `seedBookmarks` · `DATA_DAYS`, 폴더 안의 `items` 구조, 화면이 직접 만들던 새 폴더 id(`'f' + Date.now()`) (아래 3절)
- 새로 만들거나 고치는 파일: `ex02/package.json` · `tsconfig.json` · `next.config.mjs` · `.env.example` · `server/index.ts` · `server/sample.ts` · `server/routes/{rankings,bookmarks,folders}.ts` · `app/api/[...path]/route.ts` · `public/index.html`, 그리고 루트 `.gitignore`(`.next/` 한 줄 추가)
- 설치 패키지(PLAN의 "새 패키지" 줄에 있는 것만): hono · @hono/node-server · next · react · react-dom · typescript · tsx · @types/node · @types/react
- 필요한 키: 없음. `API_PORT` · `API_URL`은 `.env`가 없으면 기본값(8787, `http://localhost:8787`)으로 돎
- `next dev`가 저절로 만든 `ex02/AGENTS.md`를 지움(PLAN에 없는 파일이라서)

## 2. PLAN 항목별 반영 위치
| PLAN 항목 | 반영 위치 |
|---|---|
| 1. ex01 → ex02 복사, index.html 옮기기 | `ex02/public/index.html`, `ex02/openapi.yaml`(ex01과 해시가 같음) |
| 2. 스크립트 `api` · `dev` · `build` | `ex02/package.json`: `api` = `tsx --env-file-if-exists=.env server/index.ts`, `dev` = `next dev -p 3000`, `build` = `next build && tsc --noEmit` |
| 2. `.env.example` | `ex02/.env.example`(`API_PORT=` · `API_URL=` 이름만) |
| 2. 루트 `.gitignore`에 `.next/` | `capstone/.gitignore` 마지막 줄 |
| API 서버(8787, 메모리) | `server/index.ts`(`API_PORT`, 기본 8787. 경로 세 묶음을 `app.route`로 연결) |
| 계약 6개, 상태 코드 · 메시지 그대로 | `server/routes/rankings.ts`(200 · 404), `bookmarks.ts`(GET 200 / POST 201 · 404 이슈 · 404 폴더 · 409 / DELETE 204 · 404), `folders.ts`(GET 200 / POST 201) |
| 샘플 랭킹(POOL · rng 옮김, 최근 45일, 섹션마다 5개, 14~184 내림차순, rank 1~5, `updatedAt`, date 생략 = KST 오늘) | `server/sample.ts`의 `rankingFor` · `kstToday` |
| 이슈 id `{date}-{section}-{풀 번호}` | `server/sample.ts` `rankingFor` |
| 섹션 key · name 짝, pol→it 순서 | `server/sample.ts` `SECTIONS` |
| 요약 null(`soc-6`), 매일 soc Top 5에 들어감 | `server/sample.ts`: `NULL_SUMMARY`, 뽑은 5개에 6번이 없으면 5번째 자리를 6번으로 바꿈 |
| 샘플 폴더 f1 · f2 · f3, 북마크 10개(4 · 3 · 3), 어제~14일 전 실제 랭킹 이슈, savedAt 서로 다름, 새 폴더 f4부터 | `server/sample.ts`의 `folders` · `SEED` · `newFolderId`. 북마크 k번째 = (k+1)일 전(1~10일 전) 랭킹에서 그 섹션 1위 이슈 |
| 북마크 저장: id의 날짜 랭킹에서 찾고 카드 칸 그대로, 폴더 count = 북마크 수 | `sample.ts` `findIssue`, `routes/folders.ts` `withCount` |
| BFF(GET · POST · DELETE, 경로 · 쿼리 · 메서드 · 본문 · 헤더(쿠키) 전달, 상태 · 본문 · 헤더 그대로 돌려줌, 연결 실패 502) | `app/api/[...path]/route.ts`(`API_URL`, 기본 `http://localhost:8787`) |
| `/` → `/index.html` rewrite | `next.config.mjs` |
| 화면: 가짜 데이터 → `GET /api/rankings`(첫 진입은 date 없이, 받은 date로 시작) · `/api/bookmarks` · `/api/folders` | `public/index.html`: `api()` · `loadRanking()` · `loadBookmarks()` · `secIssues()`, 맨 끝 Init(async) |
| 저장 · 해제 · 폴더 만들기 뒤 목록 다시 받기, 새 폴더 = 폴더 POST 뒤 북마크 POST, 되돌리기 = 같은 issueId · folderId로 POST, 실패 시 `message` 토스트 | `public/index.html` `postBookmark` · `save` · `unsave` · `submit` 핸들러 |
| 갱신 시각 줄 = `updatedAt` + 받은 이슈 수 | `public/index.html` `fmtUpdated` · `renderContext` |
| fetch는 같은 주소의 `/api/...`만 | `api()`가 `'/api' + path`만 부름(`8787` 검색 0건) |

## 3. 지운 것과 이유
- `POOL` · `ISSUES` · `rng` · `rankingFor` · `seedBookmarks`: PLAN "화면 변경"이 지우라고 한 화면 쪽 가짜 데이터. `POOL` · `rng`는 `server/sample.ts`로 옮김
- `DATA_DAYS`(화면): `rankingFor`가 없어져 쓰는 곳이 없음. 45일 규칙은 서버의 `sample.ts`로 옮김
- 폴더 안의 `items` 배열, `{ f, it }` 모양의 `findBookmark` 결과, `it.folder` 객체: 계약대로 북마크 배열(`folderId`)과 폴더 배열(`count`)로 바꿔서
- 새 폴더 id를 화면에서 만들던 코드(`'f' + Date.now()`): 이제 서버가 `f4`부터 매김
- `ex02/AGENTS.md`: `next dev`가 저절로 만든 파일이라 지움(아래 6절 참고)

## 4. 필요했지만 없던 키/계정
- 없음. 이번 단계는 외부 서비스를 쓰지 않음. `.env` 없이 기본값으로 돌렸음

## 5. `npm run build` 결과
- 성공(종료 코드 0). `next build`(Next.js 16.4.0, Turbopack)에서 라우트 `ƒ /api/[...path]`가 나왔고, 이어서 `tsc --noEmit`도 오류 없이 끝남(server/ · app/ 파일 모두 검사 대상)
- 빌드할 때 Next가 `tsconfig.json`을 고침: `jsx`를 `react-jsx`로, `include`에 `.next/dev/types/**/*.ts` 추가, `incremental: true` 추가

검증표 확인 결과(두 서버를 띄우고 node fetch로 `http://localhost:3000`에 요청)
- PASS: 화면 `/` 200 · 오늘 랭킹(date = KST 오늘 2026-10-07, 6섹션 × 5, 내림차순, rank 1~5, `+09:00`) · 섹션 짝 순서 · 요약 null 1개(`2026-10-07-soc-6`) · 지난 날짜(id가 모두 `<어제>-`로 시작하고 오늘 id와 겹치지 않음) · 중계 그대로(8787과 3000의 상태 · 본문이 같음) · 2000-01-01은 404와 메시지 · 북마크 10개(savedAt 내림차순, 10칸, 어제~10일 전, 실제 랭킹 이슈와 칸이 같음) · 폴더 f1 4 / f2 3 / f3 3 · 저장 201 뒤 맨 앞 · f1 5 · 409와 f2 그대로 · 없는 이슈 · 폴더 404 · 해제 204 뒤 두 번째 404 · 새 폴더 `{ id: "f4", name: "테스트", count: 0 }` 뒤 f4 count 1 · 모두 해제 뒤 `[]` · Hono를 끄면 502 "API 서버에 연결할 수 없습니다"
- 중계 헤더: 8787 자리에 임시 에코 서버를 띄워 확인함. 쿠키 · Content-Type · 한글 본문 · 쿼리가 그대로 가고, 상태 418 · `Set-Cookie` · 사용자 헤더가 그대로 돌아옴
- `npx @redocly/cli lint ex02/openapi.yaml`: 오류 0, 경고 4(ex01과 같은 파일이라 경고도 같음)
- `ex01/openapi.yaml`과 `ex02/openapi.yaml`의 SHA-256이 같음. `git status frontend/ ex01/`에 변경 없음
- `public/index.html`에서 `POOL` · `rankingFor` · `seedBookmarks` · `8787` · `it.sec` · `it.count`를 검색하면 0건
- 서버 정리: 3000 · 8787 모두 껐고, 남은 node 프로세스와 LISTEN 포트가 없음을 확인함

브라우저로 확인해 주세요(브라우저 도구가 없어 직접 보지 못함)
1. `ex02/`에서 `npm.cmd run api`, 다른 터미널에서 `npm.cmd run dev`를 띄운 뒤 `http://localhost:3000/` 접속: 이슈맵, 6개 섹션, "10.7 오전 6:00 수집 · 이슈 30개" 모양의 갱신 시각 줄
2. soc 카드 하나에 "요약을 준비 중입니다"
3. 이전 날짜 · 날짜 선택 · "오늘" 버튼, 45일보다 전 날짜를 고르면 "해당 날짜의 랭킹 데이터가 없습니다"
4. 카드 북마크 → 폴더 고르기 → 새로고침해도 활성 → 해제 → "되돌리기" → 북마크 화면 폴더 칩(칩별 개수, "전체")
5. 폴더 선택 창에서 새 폴더 만들기 → 그 폴더에 바로 저장
6. 모바일 폭에서 가로 스크롤이 없는지

## 6. 추가로 보인 점 (코드에는 넣지 않음)
- `next dev`가 실행될 때마다 `ex02/AGENTS.md`를 새로 만듦(Next 16.4 기능). 지웠지만 dev를 다시 띄우면 또 생김. 막으려면 `next.config.mjs`에 `agentRules: false`를 넣거나 `.gitignore`에 추가해야 하는데, 어느 쪽인지는 PLAN에서 정해야 함
- `next build`가 `incremental: true`를 다시 넣어 `ex02/tsconfig.tsbuildinfo`가 생김. `.gitignore`에 넣을지 정해야 함. `next-env.d.ts`도 자동 생성 파일임
- 설치된 버전: next 16.4.0 · typescript 7.0.2 · hono 4.13 · @hono/node-server 2.1 · tsx 4.23. npm이 esbuild의 postinstall 스크립트를 실행하지 않았다고 경고했지만(allowScripts) tsx는 정상으로 돎
- 요청 본문이 JSON이 아니거나 `issueId` · `name`이 빠지면 Hono가 500을 돌려줌. 400 처리는 PLAN대로 ex03에 맡김. 지금은 폴더 이름 검사가 없어 빈 이름이나 17자 이상 이름도 201로 만들어짐(화면은 trim과 maxlength 16으로 막음)
- `rankingFor`는 날짜 형식을 검사하지 않음. `2026-10-7`처럼 0이 빠진 날짜도 45일 안이면 200을 주고, 그 날짜 문자열이 id에 그대로 들어감(ex03에서 다룰 부분)
- 화면의 "오늘"(`TODAY`)은 브라우저 지역 시간이고 서버는 KST임. 한국 밖 시간대나 자정 근처에서는 첫 진입 날짜와 "오늘" 표시가 어긋날 수 있음
- 날짜를 빨리 바꾸면 응답 순서가 뒤바뀔 수 있음. 화면은 받은 응답의 `date`로 `state.date`를 맞추므로 날짜와 내용이 어긋나지는 않지만, 마지막으로 누른 날짜가 아닌 날짜가 남을 수 있음
- 막대 · 타일 명도 기준값 `MAX_COUNT = 184`는 샘플 범위에 맞춘 값이라 그대로 둠. ex06 이후 실제 데이터가 184를 넘으면 맞춰야 함
- 상세 서랍의 "수집 · 오전 6:00"은 하드코딩 그대로 둠(PLAN은 갱신 시각 줄만 바꾸라고 함)
- `.env.example`의 빈 값을 그대로 복사해 `.env`를 만들어도 돌도록 기본값을 `||`로 처리함(`??`면 포트가 0이 됨)
- 처음 백그라운드로 띄울 때 한 번 EADDRINUSE가 났지만 다시 띄우니 정상이었음. 확인해 보니 포트를 잡고 있는 프로세스는 없었음
