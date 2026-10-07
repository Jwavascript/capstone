# PLAN_backend_ex05 — Supabase + Drizzle (랭킹 · 북마크 · 폴더 저장)

> 이유: 북마크 · 폴더가 메모리에 있어 API 서버를 다시 켜면 샘플로 돌아가고, 랭킹은 요청 때마다 코드가 만들어 date를 생략하면 "가장 최근 수집일"(D3)이 아니라 KST 오늘을 줌. 그래서 Supabase Postgres에 `issues` · `folders` · `bookmarks`를 Drizzle로 만들고, 샘플을 seed 명령으로 넣고, API가 DB를 읽고 쓰게 함(테스트는 메모리 구현으로 네트워크 없이 그대로).
> 코드 폴더: `ex05/` (`ex04/` 복사)
> SPEC 근거: US-09 · US-10 · AC-01-1(저장)

## 이번 범위
- Drizzle 스키마 · 마이그레이션으로 테이블 3개를 만들고, 라우트가 저장소 함수를 거쳐 DB를 읽고 씀. 샘플은 `npm run seed`로 DB에. 계약은 아래 "계약" 줄만 고침
- 새 패키지: drizzle-orm · postgres · drizzle-kit(`-D`)
- 하지 않음: 수집 · `articles` · `collect_runs` · 실제 수집 시각 `updatedAt` · 수집 실패 섹션(D8)(ex06) · 이슈 묶기(ex07) · AI 요약(ex08) · 자동 실행(ex09) · 로그인 · `user_id` · 401(ex10 · ex11) · 테스트용 DB · supabase-js · RLS 정책(켜기만 함) · DB 연결 실패 전용 문구 · 폴더 이름 변경 · 삭제 · 이동(범위 밖) · `Section` oneOf 경고 정리

## 테이블
| 테이블 | 칸(Postgres 타입, `summary` 말고 모두 NOT NULL) | 규칙 |
|---|---|---|
| `issues` | `id` text PK · `date` date · `section` text · `title` text · `url` text · `article_count` integer · `latest_published_at` timestamptz · `summary` text[](null 가능) | id `{date}-{section}-{번호}`(지금 규칙). 날짜 · 섹션마다 랭킹 후보 행. `rank`는 저장하지 않음 |
| `folders` | `id` text PK · `name` text · `created_at` timestamptz 기본 now() | id `f{번호}`, 새 폴더는 있는 번호 중 가장 큰 값 + 1. 목록은 `created_at` ↑(만든 순) |
| `bookmarks` | `id` integer 자동 증가 PK · `issue_id` text → `issues.id` · `folder_id` text → `folders.id` · `created_at` timestamptz 기본 now() | `issue_id` unique(이슈당 하나 = 폴더 하나, AC-10-4). 목록은 `created_at` ↓ |

- 세 테이블 모두 RLS를 켬(정책 없음): 서버는 테이블 주인(postgres)으로 접속해 영향 없고, Supabase Data API(anon 키)로는 못 읽음
- 연결: `server/db/client.ts`가 `DATABASE_URL`(Supabase Transaction pooler, 포트 6543)로 `postgres(url, { prepare: false })` + Drizzle. 이 모드는 prepared statement를 못 쓰므로 `prepare: false` 필수. 코드에서 연결하는 곳은 api 서버(`index.ts`) · seed뿐. 값은 `.env`에만, `.env.example`엔 `DATABASE_URL=` 이름만
- 마이그레이션: `server/db/schema.ts` → `npm run db:generate`(= `drizzle-kit generate`, DB 접속 없음) → `drizzle/`(SQL · meta, 커밋) → `npm run db:migrate`(= `drizzle-kit migrate`). drizzle-kit은 `.env`를 스스로 읽지 않으니 `drizzle.config.ts`가 `.env`가 있으면 `process.loadEnvFile('.env')`. drizzle-kit 연결엔 `prepare: false`를 줄 수 없으니 먼저 6543 그대로 → prepared statement 오류 · 멈춤이면 `drizzle.config.ts`에서만 URL 포트 `:6543` → `:5432`(같은 호스트 · 계정의 Session pooler)로 바꿔 다시. 새 환경 변수 없음, 어느 쪽인지 제작 보고에 적음
- 저장소: 라우트는 저장소 함수(최근 수집일 · 날짜의 이슈 · 이슈 하나 · 북마크 목록/저장/해제 · 폴더 목록/만들기)만 부름. `server/app.ts`는 `createApp(저장소)`를 내보내고, `index.ts`는 DB 구현(`server/db/store.ts`), 테스트는 메모리 구현(`sample.ts`, `resetSample()` · 응답 값(`savedAt` 표기 포함) ex04 그대로)으로 만듦. 랭킹 조립(섹션 6개 · `rankIssues` · 카드 8칸 · `updatedAt` = `{date}T06:00:00+09:00`)은 두 구현이 같이 쓰는 한 곳
- date 생략(D3): 저장소에서 KST 오늘 이하 가장 늦은 `date`. 없으면 404 "해당 날짜의 랭킹 데이터가 없습니다". `date` 칸은 Date로 바꾸지 않고 `YYYY-MM-DD` 문자열로 다룸
- 북마크 항목: `rank`는 그 이슈 날짜 · 섹션 랭킹에서 계산(`GET /api/rankings?date=`와 같음), `savedAt` = `created_at.toISOString()`. 칸 · 상태 코드 · 메시지는 지금 그대로
- 순위 3번째 기준(ex04 메모): id 자연 순서(숫자 부분은 수로, `…-pol-9` < `…-pol-10`)
- seed: `npm run seed`(= `tsx --env-file-if-exists=.env server/db/seed.ts`). 실행일 KST 오늘 포함 45일 × 섹션 6 × 지금 샘플 후보 5 = issues 1350, 폴더 f1~f3(`created_at` f1 < f2 < f3), 북마크 10(지금 `resetSample`과 같은 이슈 · 폴더 · 저장 시각). 한 트랜잭션에서 bookmarks → folders → issues를 모두 지우고 다시 넣음 → 몇 번 돌려도 같은 행 수, 검증 중 넣은 행도 사라짐. 끝나면 `issues 1350 · folders 3 · bookmarks 10`을 출력하고 연결을 닫음. 행은 `sample.ts`의 순수 함수 `seedRows(오늘)`이 만듦(메모리 구현과 같은 샘플)
- 새 테스트(시각 고정 · 파일 안 상수 그대로): `ranking.test.ts` 두 자리 번호 — 같은 건수 · 시각의 `2026-10-07-pol-10` · `2026-10-07-pol-9`를 어느 순서로 넣어도 `-9`가 위 / `api.test.ts` date 생략(D3) — 최근 수집일만 `2026-10-05`로 바꾼 메모리 저장소 앱에서 `GET /api/rankings` → 200 `date` 2026-10-05, null로 바꾸면 404 같은 문구 / `seed.test.ts` — `seedRows('2026-10-07')`: issues 1350 · id 중복 없음 · date 2026-08-24~2026-10-07 · 날짜마다 섹션 6 × 5 · `summary` null 날마다 1개(soc), folders f1~f3, bookmarks 10(issue_id 모두 issues 안 · created_at 서로 다름 · f1 4 · f2 3 · f3 3)
- 계약: `GET /api/rankings` 404 description을 "해당 날짜의 랭킹 데이터 없음(date를 생략했는데 저장된 랭킹이 하나도 없을 때 포함)"으로. 나머지 줄 그대로

## 화면 변경
- 없음

## 구현 순서
1. `ex04/` → `ex05/` 복사(이미 있는 `ex05/.env`는 그대로 둠, `node_modules` · `.next` · 자동 생성 파일 `AGENTS.md` · `next-env.d.ts` · `tsconfig.tsbuildinfo` 제외), `package.json` name을 `issuerank-ex05`로, `npm.cmd install` 뒤 `npm.cmd install drizzle-orm postgres` · `npm.cmd install -D drizzle-kit`, scripts에 `db:generate` · `db:migrate` · `seed`, `.env.example`에 `DATABASE_URL=`
2. `server/db/schema.ts` · `client.ts` · `drizzle.config.ts` → `npm.cmd run db:generate` → `npm.cmd run db:migrate`(6543 → 안 되면 5432)
3. 저장소: `sample.ts`에 메모리 구현 · `seedRows`, `server/db/store.ts`에 DB 구현, 라우트 · `app.ts`(`createApp`) · `index.ts` 연결, `rankIssues` 자연 순서
4. `server/db/seed.ts` → `npm.cmd run seed`. `api.test.ts`는 `createApp(메모리 구현)`으로, 새 테스트 3묶음, `openapi.yaml` 계약 줄
마지막. `npm run build` · `npm test` · 확인하며 바꾼 행은 `npm.cmd run seed`로 되돌림

## 검증 방법
- 테스트 · 계약 줄은 서버 · DB 없이. DB 줄은 `ex05/`에서 `npm.cmd run db:migrate` · `npm.cmd run seed` 뒤 표 순서대로, 화면 · 중계 · DB 줄은 두 터미널에서 `ex05/`의 `npm.cmd run api` · `npm.cmd run dev`를 띄운 상태로, 요청은 node fetch로 `http://localhost:3000`에. SQL은 `ex05/`에서 `node --env-file=.env`로 `postgres`(`prepare: false`)를 불러 실행하고 접속 주소는 출력하지 않음. 날짜(<오늘> · <어제> 등)는 KST 기준. 표 마지막 줄(원상복구)은 꼭 마지막에

| 확인 | 방법 | 기대 결과 |
|---|---|---|
| OpenAPI 형식 | `npx @redocly/cli lint ex05/openapi.yaml`(설치 없이 npx) | 오류 0개(경고는 참고) |
| 엔드포인트 | `paths`의 경로 · 메서드를 표와 비교 | 표의 6개만 있음 |
| 상태 코드 | 경로마다 응답 코드를 ex01 표 + 이번 표와 비교 | ex01 코드에 `GET /api/rankings` · `POST /api/bookmarks`의 400만 더해짐 |
| 실패 메시지 | ex01 표의 메시지 6개 + 이번 표의 새 메시지 3개를 파일에서 검색 | 9개 모두 글자 그대로 있음 |
| 이슈 칸 | 이슈 스키마의 `required`와 속성 | 8개 칸 모두 required, `summary`는 3개 배열 또는 null |
| 섹션 키 | `SectionKey` enum · `Section`의 `oneOf` | enum 정확히 6개 키, `oneOf` 6가지의 `key` · `name` const가 pol 정치 · eco 경제 · soc 사회 · cul 생활·문화 · wor 세계 · it IT·과학 |
| 폴더 이름 | 폴더 만들기 요청의 `name` | minLength 1 · maxLength 16, 설명에 앞뒤 공백 · 코드 포인트 기준 |
| 이슈 id 규칙 | `IssueId` · `BookmarkCreate`, 파일에서 정규식 `(id\|issueId\|example): '?(pol\|eco\|soc\|cul\|wor\|it)-` 검색 | pattern이 위 값, `Issue.id` · `issueId`가 참조, folderId minLength 1, 검색 0건 |
| 계약 변경 범위 | `git diff --no-index ex04/openapi.yaml ex05/openapi.yaml` | `GET /api/rankings`의 404 description 한 줄만 바뀜 |
| 출발점 그대로 | `git status frontend/ ex01/ ex02/ ex03/ ex04/` | 변경 없음 |
| 빌드 | `npm.cmd run build` | 성공 |
| 테스트 | `npm.cmd test` | 테스트 파일 3개 모두 통과, 실패 0 |
| 테스트 범위 | 테스트 이름 · 내용을 `plan/PLAN_backend_ex04.md` 테스트 표 + 위 "새 테스트" 줄과 비교 | 15개 묶음 + 3개가 각각 테스트로 있음(AC-03-1 · 03-2 · 07-1 · 07-2 · 08-1 · 08-2 · 09-1 · 09-3 · 09-4 · 10-1 · 10-2 · 10-4 · D3) |
| 서버 · DB 없이 | api · dev 서버를 모두 끄고 PowerShell `$env:DATABASE_URL='postgres://u:p@127.0.0.1:9/x'; npm.cmd test`, `test/`에서 `\bfetch\(` · `localhost` · `8787` 검색 | 통과, 0건 |
| 시계 고정 | PowerShell `$env:TZ='America/Los_Angeles'; npm.cmd test`, `test/`에서 `new Date\(\)` · `Date\.now\(` 검색 | 통과, 0건 |
| 순서 무관 | `npx vitest run --sequence.shuffle` | 통과 |
| 테스트가 잡는가 | `server/ranking.ts`의 발행 시각 비교 방향을 뒤집고 `npm.cmd test` → 되돌리고 다시 | 동점 테스트 실패 → 모두 통과 |
| 화면 주소 | 브라우저로 `http://localhost:3000/` | 이슈맵이 뜨고 6개 섹션 · 갱신 시각 줄이 보임(AC-05-1) |
| 화면 오늘(KST) | 브라우저 DevTools › Sensors › Location을 San Francisco(시간대 America/Los_Angeles)로 두고 새로고침 | 날짜 표시가 `GET /api/rankings`의 `date`와 같고 "· 오늘"이 붙음, 다음 날 버튼 비활성, 달력에서 KST 오늘 다음 날은 고를 수 없음(AC-09-4) |
| 화면 흐름 | `npm.cmd run api` 재시작 뒤 브라우저: 카드 북마크 → 폴더 고르기 → 새로고침 → 해제 → "되돌리기" → 북마크 화면 폴더 칩 | 새로고침해도 활성 그대로, 되돌리기 후 다시 보임, 칩을 누르면 그 폴더만 · "전체"는 모두 · 칩마다 개수(AC-07-1 · AC-10-3) |
| 중계 그대로 | `GET http://localhost:8787/api/rankings?date=<어제>`와 3000의 같은 요청 비교 | 상태 코드 · 본문 같음 |
| Hono 꺼짐 | api 서버를 끄고 `GET /api/rankings` | 502 "API 서버에 연결할 수 없습니다" |
| 가짜 데이터 제거 | `public/index.html`에서 낱말 경계 정규식 `\bPOOL\b` · `\brankingFor\b` · `\bseedBookmarks\b` · `\b8787\b` · `\bit\.sec\b` · `\bit\.count\b` 검색 | 0건 |
| 지역 시간 제거 | `public/index.html`에서 `\bsetHours\b` 검색 · `TODAY` 정의 줄 | 0건, `TODAY`는 KST(+9시간) 계산의 `YYYY-MM-DD` 문자열 |
| 테이블만 | `ex05/drizzle/`의 SQL에서 `CREATE TABLE` · `ENABLE ROW LEVEL SECURITY` · 낱말 경계 `\barticles\b` · `\bcollect_runs\b` · `\buser_id\b` 검색, `git status ex05/drizzle` | `CREATE TABLE` · `ENABLE ROW LEVEL SECURITY`가 각각 `issues` · `folders` · `bookmarks` 3개, 나머지 0건, 커밋 대상으로 보임(무시 안 됨) |
| 마이그레이션 | `npm.cmd run db:migrate` 한 번 더 → SQL로 public 테이블 · `drizzle.__drizzle_migrations` 행 수 | 성공(바뀐 것 없음), `issues` · `folders` · `bookmarks` 있고 `articles` · `collect_runs` 없음, 기록 1행 |
| 연결 설정 | `server/db/`에서 `prepare:\s*false` 검색, `ex05/.env.example`, `git check-ignore ex05/.env` | 1건 이상, `DATABASE_URL=` 이름만(값 없음), `.env`는 무시됨 |
| 저장소 나눔 | `server/app.ts` · `server/routes/` · `test/`에서 `\bpostgres\b` · `drizzle-orm` · `db/client` 검색 | 0건(DB 연결은 `index.ts` · `server/db/seed.ts`만) |
| seed 두 번 | `npm.cmd run seed` 두 번 → SQL로 세 테이블 행 수 · `date` = <오늘> issues의 섹션별 수 | 두 번 다 `issues 1350 · folders 3 · bookmarks 10` 출력 · SQL 행 수 같음(중복 없음), <오늘> 6개 섹션 × 5행(AC-01-1 저장) |
| 오늘 랭킹(DB) | `GET /api/rankings` | 200, `date` <오늘>, `updatedAt` `<오늘>T06:00:00+09:00`, 섹션 6개 × 5개 · `articleCount` 내림차순 · `rank` 1~5, soc에 `summary: null` 1개(AC-03-1) |
| 최근 수집일(D3) | SQL로 `issue_id`가 `<오늘>-`로 시작하는 bookmarks 행 → `date` = <오늘> issues 행을 지움 → `GET /api/rankings` · `?date=<오늘>` → `npm.cmd run seed` → `GET /api/rankings`(api 재시작 없이) | 200 `date` <어제> · 404 "해당 날짜의 랭킹 데이터가 없습니다"(AC-09-3) → 200 `date` <오늘> |
| 지난 날짜(DB) | `?date=<어제>` · `<44일 전>` · `<45일 전>` · `2000-01-01` | 200(id 모두 `<어제>-`로 시작) · 200 · 404 · 404 "해당 날짜의 랭킹 데이터가 없습니다"(AC-09-1 · AC-09-3) |
| 목록(DB) | `GET /api/bookmarks` · `GET /api/folders` | 10개 `savedAt` 내림차순 · 항목마다 8칸 + `folderId` · `savedAt`, 맨 앞 `savedAt`이 `<어제>T21:10:00+09:00`과 같은 시각 · 그 `id` · `rank`가 `?date=<어제>` it 섹션 1위와 같음 / f1 반도체·AI 4 · f2 부동산·금리 3 · f3 나중에 읽기 3 이 순서(AC-08-1 · AC-10-1) |
| 다시 켜도 유지 | `POST /api/folders` `{ name: "유지확인" }` → 그 id로 `<어제>` pol 1위 POST → api 서버를 끄고 다시 `npm.cmd run api` → 두 목록 | 201 `{ id: "f4", name: "유지확인", count: 0 }` → 201 → 재시작 뒤 북마크 11개 · 맨 앞이 그 이슈 · `folderId` f4, 폴더 4개 · f4 count 1(US-09 · US-10 · AC-09-5 · AC-10-2) |
| 폴더 하나 · 해제(DB) | 같은 이슈로 `folderId: "f1"` POST → `{ issueId: "2000-01-01-pol-0", folderId: "f1" }` · `{ 같은 이슈, folderId: "f999" }` POST → 그 이슈 DELETE 두 번 → 폴더 목록 | 409 "이미 북마크한 이슈입니다" · f1 4 그대로 → 404 "이슈를 찾을 수 없습니다" · "폴더를 찾을 수 없습니다" → 204 · 404 "북마크를 찾을 수 없습니다" → f4 count 0(AC-10-4 · AC-07-2) |
| 화면 지난 날짜 | 브라우저: 이전 날 버튼 → "오늘" 버튼 | 날짜 표시가 <어제>로 바뀌고 카드가 보이며 "오늘" 버튼이 보임 → 누르면 <오늘> · "· 오늘" 표시 · 버튼 숨김(AC-09-2) |
| 원상복구(마지막) | `npm.cmd run seed` → 두 목록 · SQL 세 테이블 행 수 | `issues 1350 · folders 3 · bookmarks 10`, 폴더는 f1~f3만("유지확인" 없음) · 북마크 10개 |
