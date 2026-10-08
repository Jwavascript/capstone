# PLAN_backend_ex06 — newsdata.io 수집

> 이유: 랭킹 · 카드가 seed 샘플뿐이고 실제 뉴스를 가져오는 길이 없음. 그래서 명령 한 번(`npm run collect`)으로 newsdata.io에서 섹션 6개의 최신 기사를 `articles`에, 섹션마다 결과를 `collect_runs`에 저장함(한 섹션이 실패해도 나머지는 저장, 테스트는 저장한 응답으로 네트워크 없이).
> 코드 폴더: `ex06/` (`ex05/` 복사)
> SPEC 근거: US-01 · AC-01-1(손으로 실행, 스케줄러는 ex09) · AC-01-2

## 이번 범위
- 수집 명령 · 수집 규칙 · 새 테이블 2개(마이그레이션 `0001`)를 만듦. API · 계약 · 화면 · seed는 그대로(랭킹은 아직 seed 샘플 이슈)
- 새 패키지: 없음(Node 내장 fetch)
- 하지 않음: 이슈 묶기 · `articles.issue_id` · 연관기사 수 검색(D13) · 랭킹 `updatedAt` 실제 수집 시각 · 실패 섹션을 직전 날짜 결과로 보여 주기(D8 조회)(ex07) · AI 요약(ex08) · 자동 실행(ex09) · 로그인 · `user_id`(ex10 · ex11) · 기사 본문(`content`) 저장(범위 밖) · `timeframe`(유료) · 수집 결과 API · 화면 · 섹션 골라 수집 · 재시도 · 테스트용 DB · RLS 정책(켜기만 함) · `Section` oneOf 경고 정리

## 수집 규칙
| 항목 | 규칙 |
|---|---|
| 명령 | `npm run collect`(= `tsx --env-file-if-exists=.env server/collect.ts`), `-- --pages N`(1~3, 기본 3) = 섹션당 최대 페이지(한 번 실행에 최대 18요청). 시작 전 검사(옵션 → 키 → DB에서 그날 행 읽기)를 통과해야 요청. 섹션 순서 pol→eco→soc→cul→wor→it, 요청은 하나씩 · 사이 1초 |
| 요청 | `GET https://newsdata.io/api/1/latest`, 헤더 `X-ACCESS-KEY: <NEWSDATA_API_KEY>`(URL에 키 없음). 쿼리 `country=kr` · `language=ko` · `prioritydomain=top` · `removeduplicate=1` · `category`(D12: pol `politics` · eco `business` · soc `domestic,crime,education` · cul `lifestyle,entertainment,health,food,tourism` · wor `world` · it `technology,science`). 2페이지부터 앞 응답의 `nextPage`를 `page`로, `nextPage`가 없거나 `results`가 비면 멈춤 |
| `articles` | 기사 1건 = 1행: `id` integer 자동 증가 PK · `date` date(수집 시작 때 KST 오늘, D3) · `section` text(요청한 섹션) · `title` · `description` · `link` · `source_id` text · `published_at` timestamptz(`pubDate`를 UTC로 읽음: `2026-10-06 20:49:42` → `2026-10-06T20:49:42Z`). `description`만 null 가능(없거나 빈 문자열이면 null), 앞뒤 공백을 지우고 300자(코드 포인트)를 넘으면 앞 300자만 저장(본문 저장 금지), `(date, link)` unique, RLS 켬(정책 없음). 제목 · 링크 · source_id · pubDate 중 하나라도 없는 기사는 건너뜀. 그 밖의 칸(`content` · `keywords` · `image_url` · `ai_*` 등)은 저장하지 않음 |
| `collect_runs` | 실행마다 섹션 6행을 더함(지우지 않는 기록): `id` integer 자동 증가 PK · `date` date · `section` text · `status` text `ok`/`failed` · `message` text(ok면 null) · `article_count` integer(그 섹션에 넣은 행 수, failed면 0) · `finished_at` timestamptz(저장한 시각, 한 실행의 6행이 같음). RLS 켬 |
| 실패 | 섹션 요청 중 하나라도 네트워크 오류 · HTTP 200 아님 · 본문 `status`가 `success` 아님이면 남은 페이지는 요청하지 않고 그 섹션은 `failed`(받은 페이지도 저장 안 함). 받은 기사가 0건이어도 `failed`. `message`는 응답이 있으면 `{n}페이지: HTTP {코드} {응답의 results.message(있으면)}`, 네트워크 오류면 `{n}페이지: {오류 문구}`, 0건이면 `기사 0건`. 키 값이 섞이면 `***`로 바꿈(URL · 헤더 · 오류 객체는 넣지 않음). 나머지 섹션은 계속 |
| 저장 | 6섹션을 다 받은 뒤 한 트랜잭션: ok 섹션의 그날 행을 지움 → ok 섹션 행을 순서대로 넣음(같은 링크는 섹션 안 · 섹션 사이 모두 먼저 받은 하나만(D12), 그날 failed 섹션에 남은 행과 같은 링크는 건너뜀) → `collect_runs` 6행. failed 섹션의 그날 행 · 다른 날짜 행은 그대로(AC-01-2, D8: 행 복사 없음) |
| 출력 · 종료 코드 | 검사를 통과하면 `수집 {date} · 섹션당 최대 {N}페이지`, 섹션마다 `pol ok 10건` / `wor failed {message}`, 끝 줄 `ok {a} · failed {b} · 기사 {n}건 · 요청 {r}번 · 남은 크레딧 {마지막으로 받은 x-api-limit-remaining, 없으면 ?}`. 종료 코드 0 모두 ok · 1 일부 failed · 2 모두 failed 또는 검사 · 저장 오류(`--pages는 1~3입니다` · `NEWSDATA_API_KEY가 없습니다` · `DB 오류: {err.message}` 한 줄, 메시지 안의 `DATABASE_URL` 값 · 그 비밀번호 · 키는 `***`로 바꿈). 오류는 문구만 찍음(오류 객체 · 환경 변수 금지) |

- 코드: `server/newsdata.ts` = 요청 · 변환 · 페이지 · 실패 · 저장 규칙(무엇을 지우고 넣을지 정하는 한 곳. `process.env` · DB를 직접 읽지 않고 fetch · 저장소 · 키 · 페이지 수 · 대기 ms를 받음) / `server/collect.ts` = 명령(옵션 · 키 확인 · `connectDb()`를 try 안에서 · 출력 · 종료 코드) / `server/db/store.ts`에 DB 구현 `collectStore(db)`: 그날 행의 `link` · `section` 목록, 저장(지울 섹션 · 넣을 행 · `collect_runs` 행을 한 트랜잭션에). 테스트는 같은 두 함수의 메모리 구현
- 마이그레이션: `server/db/schema.ts`에 두 테이블 → `npm.cmd run db:generate` → `drizzle/0001_*.sql`(0000은 그대로) → `npm.cmd run db:migrate`(6543 그대로, ex05와 같음)
- seed: 그대로(`issues` · `folders` · `bookmarks`만 지우고 넣음, `articles` · `collect_runs`는 건드리지 않음)
- 새 테스트 `test/collect.test.ts`(시각 고정 · 네트워크 없음): fixture는 `test/fixtures/newsdata/latest_kr_ko_*.json`(research/newsdata 5개 그대로). 가짜 fetch는 요청(URL · 헤더)을 기록하고 섹션별로 응답(pol `politics_top` · eco `politics` · soc `soc_top` · cul `cul_top` · it `q_nuri` · wor HTTP 500, 본문 `results.message`에 테스트 키를 넣음), 메모리 저장소, 대기 0, 키 `test-key-123`
  - ① 요청: 섹션 순서 · 주소 · 쿼리 5개 · category 6묶음 · 헤더 키, 첫 요청엔 `page` 없음, URL에 키 없음
  - ② 변환: pages 1 · 빈 저장소 → pol 10행 · 7칸(date · section · title · description · link · source_id · published_at)만 · description null 2 · 첫 행 `published_at` `2026-10-06T20:49:42.000Z` · `date` `2026-10-07`. 첫 기사 title이 null인 응답이면 pol 9행
  - ③ 페이지: pages 3이면 요청 16번(wor 1 · 나머지 3, 2 · 3번째 `page=NEXT_PAGE_TOKEN`), pages 1이면 6번, `nextPage`가 null이면 pages 3이어도 6번
  - ④ 한 번 수집: 그날 pol 옛 행 1 · wor 옛 행 2(하나는 링크가 politics_top 첫 기사와 같음) · 어제 행 1을 넣고 pages 3 → 그날 pol 9 · eco 10 · soc 10 · cul 10 · it 9(eco와 같은 링크 1건) · wor 옛 2행, eco 1건 · it 2건의 description이 300자로 잘림(나머지 행은 원문 그대로), pol 옛 행 없음 · 어제 행 그대로 / `collect_runs` 6행: wor failed · message에 `HTTP 500` · `***` · 키 없음, 나머지 ok · `article_count` = 행 수 / 종료 코드 1
  - ⑤ 같은 날 다시: ④ 뒤 한 번 더 → articles 행 수 같음(중복 없음) · `collect_runs` 12행
  - ⑥ 전부 실패: 모든 응답 HTTP 401 / fetch가 던짐 / `results: []` → 6섹션 failed(`HTTP 401` · 던진 문구 · `기사 0건`) · 요청 6번 · 넣어 둔 행 그대로 · 종료 코드 2

## 화면 변경
- 없음

## 구현 순서
1. `ex05/` → `ex06/` 복사(`node_modules` · `.next` · 자동 생성 파일 `AGENTS.md` · `next-env.d.ts` · `tsconfig.tsbuildinfo` 제외, `.env`는 `ex06/.env`가 없을 때만 `ex05/.env`를 복사), `package.json` name을 `issuerank-ex06`로, `npm.cmd install`, scripts에 `collect`, `.env.example`에 `NEWSDATA_API_KEY=`. `ex06/`에서 `node --env-file=.env -e "console.log(!!process.env.NEWSDATA_API_KEY)"`가 false면 사람에게 키를 넣어 달라고 알림(값은 열지 않음)
2. `research/newsdata/*.json` 5개를 `ex06/test/fixtures/newsdata/`로 그대로 복사(`nextPage`는 이미 `"NEXT_PAGE_TOKEN"`)
3. `server/db/schema.ts`에 `articles` · `collect_runs` → `npm.cmd run db:generate` → `npm.cmd run db:migrate`
4. `server/newsdata.ts` · `server/db/store.ts`의 `collectStore` · `server/collect.ts` → `test/collect.test.ts`(①~⑥)
마지막. `npm run build` · `npm test` · 실제 newsdata.io 호출은 검증표 `수집(실제)` · `잘못된 키` 두 줄만(합 7크레딧) · 확인 행은 `원상복구` 줄로 지움

## 검증 방법
- 테스트 · 계약 줄은 서버 · DB 없이. DB 줄은 `ex06/`에서 `npm.cmd run db:migrate` · `npm.cmd run seed` 뒤 표 순서대로, 화면 · 중계 · DB 줄은 두 터미널에서 `ex06/`의 `npm.cmd run api` · `npm.cmd run dev`를 띄운 상태로, 요청은 node fetch로 `http://localhost:3000`에. SQL은 `ex06/`에서 `node --env-file=.env`로 `postgres`(`prepare: false`)를 불러 실행하고 접속 주소는 출력하지 않음. 날짜(<오늘> · <어제> 등)는 KST 기준. 표 마지막 줄(원상복구)은 꼭 마지막에
- 실제 newsdata.io 호출은 제작 · 심사 각각 7번(7크레딧) 이하: `수집(실제)`의 수집 1번(섹션 6 × 1페이지 = 6) + `잘못된 키`의 크레딧 확인 1번. 실패해도 다시 돌리지 않고 보고. 나머지 줄은 fixture · 가짜 키 · 키 없음으로만
- 안전 실행 = `ex06/`에서 `node --env-file=.env -e`로 `child_process.spawnSync(명령, { shell: true, encoding: 'utf8', env })`(env는 `process.env`에서 그 줄에 적은 값만 바꿈)를 돌려, 종료 코드와 "출력(stdout + stderr)에 `.env`의 `NEWSDATA_API_KEY` · `DATABASE_URL` 값이나 그 줄의 가짜 값이 있는가"(누출 true/false)를 먼저 찍고, 모두 false일 때만 출력을 찍음. 크레딧 확인 = `node --env-file=.env -e`로 `https://newsdata.io/api/1/latest?country=kr&language=ko&category=politics&prioritydomain=top`을 헤더 `X-ACCESS-KEY`만 붙여 fetch하고 상태 코드와 `x-api-limit-remaining`만 찍음

| 확인 | 방법 | 기대 결과 |
|---|---|---|
| 계약 그대로 | `git diff --no-index ex05/openapi.yaml ex06/openapi.yaml` · `npx @redocly/cli lint ex06/openapi.yaml`(설치 없이 npx) | 차이 없음(ex05에서 확인한 엔드포인트 · 상태 코드 · 실패 메시지 · 이슈 칸 · 섹션 키 · 폴더 이름 · 이슈 id 규칙 그대로) · 오류 0개(경고는 참고) |
| 출발점 · fixture 그대로 | `git status frontend/ ex01/ ex02/ ex03/ ex04/ ex05/` · `git diff --no-index research/newsdata ex06/test/fixtures/newsdata` | 변경 없음 · 차이 없음(5개 파일) |
| 빌드 | `npm.cmd run build` | 성공 |
| 테스트 | `npm.cmd test` | 테스트 파일 4개 모두 통과, 실패 0 |
| 테스트 범위 | 테스트 이름 · 내용을 `plan/PLAN_backend_ex04.md` 테스트 표 + `plan/PLAN_backend_ex05.md` "새 테스트" 줄 + 위 "새 테스트" ①~⑥과 비교 | 15개 묶음 + 3개 + 6개가 각각 테스트로 있음(AC-03-1 · 03-2 · 07-1 · 07-2 · 08-1 · 08-2 · 09-1 · 09-3 · 09-4 · 10-1 · 10-2 · 10-4 · D3 · AC-01-1 · AC-01-2) |
| 서버 · DB 없이 | api · dev 서버를 모두 끄고 PowerShell `$env:DATABASE_URL='postgres://u:p@127.0.0.1:9/x'; npm.cmd test`, `test/`에서 `\bfetch\(` · `localhost` · `8787` · `NEWSDATA_API_KEY` 검색 | 통과, 0건 |
| 시계 고정 | PowerShell `$env:TZ='America/Los_Angeles'; npm.cmd test`, `test/`에서 `new Date\(\)` · `Date\.now\(` 검색 | 통과, 0건 |
| 순서 무관 | `npx vitest run --sequence.shuffle` | 통과 |
| 테스트가 잡는가 | `server/ranking.ts`의 발행 시각 비교 방향을 뒤집고 `npm.cmd test` → 되돌림. `server/newsdata.ts`에서 failed 섹션의 그날 행도 지우게 바꾸고 `npm.cmd test` → 되돌리고 다시 | 동점 테스트 실패 · ④ ⑥ 실패 → 모두 통과 |
| 화면 주소 | 브라우저로 `http://localhost:3000/` | 이슈맵이 뜨고 6개 섹션 · 갱신 시각 줄이 보임(AC-05-1) |
| 화면 오늘(KST) | 브라우저 DevTools › Sensors › Location을 San Francisco(시간대 America/Los_Angeles)로 두고 새로고침 | 날짜 표시가 `GET /api/rankings`의 `date`와 같고 "· 오늘"이 붙음, 다음 날 버튼 비활성, 달력에서 KST 오늘 다음 날은 고를 수 없음(AC-09-4) |
| 화면 흐름 | `npm.cmd run api` 재시작 뒤 브라우저: 카드 북마크 → 폴더 고르기 → 새로고침 → 해제 → "되돌리기" → 북마크 화면 폴더 칩 | 새로고침해도 활성 그대로, 되돌리기 후 다시 보임, 칩을 누르면 그 폴더만 · "전체"는 모두 · 칩마다 개수(AC-07-1 · AC-10-3) |
| 중계 그대로 | `GET http://localhost:8787/api/rankings?date=<어제>`와 3000의 같은 요청 비교 | 상태 코드 · 본문 같음 |
| Hono 꺼짐 | api 서버를 끄고 `GET /api/rankings` | 502 "API 서버에 연결할 수 없습니다" |
| 화면 파일 그대로 | `git diff --no-index ex05/public/index.html ex06/public/index.html` | 차이 없음(ex05의 가짜 데이터 제거 · 지역 시간 제거 검색 결과 그대로) |
| 테이블만 | `git diff --no-index ex05/drizzle/0000_fluffy_mordo.sql ex06/drizzle/0000_fluffy_mordo.sql`, 새 `ex06/drizzle/0001_*.sql`에서 `CREATE TABLE` · `ENABLE ROW LEVEL SECURITY` · `UNIQUE` · 낱말 경계 `\bissue_id\b` · `\buser_id\b` · `\bcontent\b` 검색, `git status ex06/drizzle` | 차이 없음, `CREATE TABLE` · `ENABLE ROW LEVEL SECURITY`가 각각 `articles` · `collect_runs` 2개 · `UNIQUE`는 `articles`의 (`date`, `link`) 하나, 나머지 0건, 커밋 대상으로 보임(무시 안 됨) |
| 마이그레이션 | `npm.cmd run db:migrate` 한 번 더 → SQL로 public 테이블 · `drizzle.__drizzle_migrations` 행 수 | 성공(바뀐 것 없음), `issues` · `folders` · `bookmarks` · `articles` · `collect_runs` 5개, 기록 2행 |
| 연결 설정 | `server/db/`에서 `prepare:\s*false`, `server/`에서 `\bapikey\b`(대소문자 구분) · `x-access-key`(대소문자 무시) 검색, `ex06/.env.example`, `git check-ignore ex06/.env` | 1건 이상 · 0건 · 1건 이상, `DATABASE_URL=` · `NEWSDATA_API_KEY=` 이름만(값 없음), `.env`는 무시됨 |
| 저장소 나눔 | `server/app.ts` · `server/routes/` · `server/newsdata.ts` · `test/`에서 `\bpostgres\b` · `drizzle-orm` · `db/client` · `process\.env` 검색 | 0건(DB 연결은 `index.ts` · `server/db/seed.ts` · `server/collect.ts`만) |
| seed 두 번 | `npm.cmd run seed` 두 번 → SQL로 세 테이블 행 수 · `date` = <오늘> issues의 섹션별 수 | 두 번 다 `issues 1350 · folders 3 · bookmarks 10` 출력 · SQL 행 수 같음(중복 없음), <오늘> 6개 섹션 × 5행(AC-01-1 저장) |
| 오늘 랭킹(DB) | `GET /api/rankings` | 200, `date` <오늘>, `updatedAt` `<오늘>T06:00:00+09:00`, 섹션 6개 × 5개 · `articleCount` 내림차순 · `rank` 1~5, soc에 `summary: null` 1개(AC-03-1) |
| 최근 수집일(D3) | SQL로 `issue_id`가 `<오늘>-`로 시작하는 bookmarks 행 → `date` = <오늘> issues 행을 지움 → `GET /api/rankings` · `?date=<오늘>` → `npm.cmd run seed` → `GET /api/rankings`(api 재시작 없이) | 200 `date` <어제> · 404 "해당 날짜의 랭킹 데이터가 없습니다"(AC-09-3) → 200 `date` <오늘> |
| 지난 날짜(DB) | `?date=<어제>` · `<44일 전>` · `<45일 전>` · `2000-01-01` | 200(id 모두 `<어제>-`로 시작) · 200 · 404 · 404 "해당 날짜의 랭킹 데이터가 없습니다"(AC-09-1 · AC-09-3) |
| 목록(DB) | `GET /api/bookmarks` · `GET /api/folders` | 10개 `savedAt` 내림차순 · 항목마다 8칸 + `folderId` · `savedAt`, 맨 앞 `savedAt`이 `<어제>T21:10:00+09:00`과 같은 시각 · 그 `id` · `rank`가 `?date=<어제>` it 섹션 1위와 같음 / f1 반도체·AI 4 · f2 부동산·금리 3 · f3 나중에 읽기 3 이 순서(AC-08-1 · AC-10-1) |
| 다시 켜도 유지 | `POST /api/folders` `{ name: "유지확인" }` → 그 id로 `<어제>` pol 1위 POST → api 서버를 끄고 다시 `npm.cmd run api` → 두 목록 | 201 `{ id: "f4", name: "유지확인", count: 0 }` → 201 → 재시작 뒤 북마크 11개 · 맨 앞이 그 이슈 · `folderId` f4, 폴더 4개 · f4 count 1(US-09 · US-10 · AC-09-5 · AC-10-2) |
| 폴더 하나 · 해제(DB) | 같은 이슈로 `folderId: "f1"` POST → `{ issueId: "2000-01-01-pol-0", folderId: "f1" }` · `{ 같은 이슈, folderId: "f999" }` POST → 그 이슈 DELETE 두 번 → 폴더 목록 | 409 "이미 북마크한 이슈입니다" · f1 4 그대로 → 404 "이슈를 찾을 수 없습니다" · "폴더를 찾을 수 없습니다" → 204 · 404 "북마크를 찾을 수 없습니다" → f4 count 0(AC-10-4 · AC-07-2) |
| 화면 지난 날짜 | 브라우저: 이전 날 버튼 → "오늘" 버튼 | 날짜 표시가 <어제>로 바뀌고 카드가 보이며 "오늘" 버튼이 보임 → 누르면 <오늘> · "· 오늘" 표시 · 버튼 숨김(AC-09-2) |
| 수집 전 거절 | `ex06/`의 PowerShell에서 `Remove-Item Env:NEWSDATA_API_KEY -ErrorAction SilentlyContinue` 뒤 `npx.cmd tsx server/collect.ts --pages 0` · `--pages 4` · `--pages 1`(`.env`를 안 읽어 키 없음), 각각 `$LASTEXITCODE` | 2 · 2 · 2, 출력은 `--pages는 1~3입니다` · 같음 · `NEWSDATA_API_KEY가 없습니다` 한 줄씩(섹션 줄 없음 = 요청 0번) |
| DB 오류 | 안전 실행으로 `npm.cmd run collect -- --pages 1` 두 번: 자식 env `NEWSDATA_API_KEY=wrong-key-0000`, `DATABASE_URL`은 `postgres://u:SECRETPW@[bad/x` 한 번 · `postgres://u:SECRETPW@127.0.0.1:9/x` 한 번 | 둘 다 누출 false(`SECRETPW` · `wrong-key-0000` 포함) · 종료 코드 2 · `DB 오류: `로 시작하는 줄이 있고 섹션 줄(`pol ok` · `pol failed` 등) 없음(요청 전에 멈춤). 첫 번째 오류 객체에는 주소가 통째로 들어 있음 |
| 수집(실제) | SQL로 확인 행 2개(section pol, 링크 · date는 `https://example.com/ex06-today` · <오늘>과 `https://example.com/ex06-yesterday` · <어제>, 나머지 칸은 아무 값)를 넣고 → 안전 실행 `npm.cmd run collect -- --pages 1`(실제 호출 6번) | 누출 false · 종료 코드 0 · `수집 <오늘> · 섹션당 최대 1페이지` 뒤 pol→eco→soc→cul→wor→it 6줄 `ok` · 끝 줄 `ok 6 · failed 0 · 기사 {n}건 · 요청 6번 · 남은 크레딧 {숫자}`(이 숫자를 R1로 적음). 실제 응답 탓 failed 줄이 있으면 종료 코드 1 · 메시지가 실패 규칙 형식(원인을 보고) |
| 수집 결과(DB) | SQL: <오늘> `collect_runs` 마지막 6행 · <오늘> `articles` 섹션별 행 수 · `(date, link)` 중복 수 · `published_at` > `finished_at`인 행 수 · 확인 행 2개 | 6행 `finished_at` 같음 · ok 섹션마다 `message` null · `article_count` = 그 섹션 행 수(1~10), 중복 0 · 0행, `ex06-today` 없음(pol ok일 때) · `ex06-yesterday` 그대로(AC-01-1) |
| 잘못된 키 | SQL로 `collect_runs` 최대 id를 M으로 적음 → 안전 실행(자식 env `NEWSDATA_API_KEY=wrong-key-0000`) `npm.cmd run collect -- --pages 1` → SQL: `id > M` 행 · <오늘> `articles` 섹션별 행 수 · `message`에 실제 키나 `wrong-key-0000`이 든 행 수 → 크레딧 확인(실제 호출 1번) | 누출 false · 종료 코드 2 · 6줄 모두 `failed`(메시지에 `HTTP {코드}`, 보통 401) · 끝 줄에 `요청 6번` → 6행 모두 failed · `article_count` 0, 섹션별 행 수는 `수집 결과(DB)`와 같음(AC-01-2: 실패 섹션은 그날 기사 유지), 0행 → 상태 200 · `x-api-limit-remaining` = R1 − 1(잘못된 키는 크레딧이 안 듦. 다르면 차이를 숫자로 적음) |
| 원상복구(마지막) | SQL로 `id > M`인 `collect_runs` · 링크가 `https://example.com/ex06-`로 시작하는 `articles`를 지우고 두 테이블 행 수를 적음 → `npm.cmd run seed` → 두 목록 · SQL 다섯 테이블 행 수 | `issues 1350 · folders 3 · bookmarks 10`, 폴더는 f1~f3만("유지확인" 없음) · 북마크 10개, `articles` · `collect_runs` 행 수는 seed 전과 같음(seed가 안 지움 · 실제 수집 행은 남김) |
