# ex05 심사 보고 — Supabase + Drizzle (랭킹 · 북마크 · 폴더 저장)

- 대상: `ex05/` (출발점 `ex04/`), 기준: `SPEC.md` · `PLAN.md`(5절 결정 · 6절 AC) · `plan/PLAN_backend_ex05.md` · 앞 PLAN(ex01~ex04) · `CLAUDE.md`, 제작 보고 `reports/ex05_build.md`
- 심사일: 2026-10-07 (KST 오늘 2026-10-07 · 어제 10-06 · 내일 10-08 · 44일 전 08-24 · 45일 전 08-23 · 데이터 없는 날 2000-01-01)
- 코드는 고치지 않음. git 커밋 없음. 브라우저 도구가 없어서 화면 4줄은 `public/index.html` 코드를 읽고, 화면이 부르는 순서대로 API를 node fetch로 재현해 판단함(아래 표에 `*` 표시)

## 최종 판정: **PASS**
- PLAN 항목 모두 done · `npm.cmd run build` 성공 · 검증표 **37/37 OK** · 지켜야 할 것 위반 없음
- 단서: 화면 4줄(화면 주소 · 화면 오늘(KST) · 화면 흐름 · 화면 지난 날짜)은 실제 브라우저가 아니라 코드 읽기와 API 재현으로 판단함. `public/index.html`은 ex04와 바이트 단위로 같고, API 응답도 ex04와 같음(참고 비교 10/10)

## 1. PLAN 항목별 판정
| PLAN 항목 | 판정 | 근거 |
|---|---|---|
| 새 패키지 drizzle-orm · postgres · drizzle-kit(-D)만 | done | `package.json` 차이는 이 3개뿐(lock 루트 비교 added 3 · removed 0), `npm ls --depth=0`에 다른 패키지 없음 |
| name `issuerank-ex05` · scripts `db:generate` · `db:migrate` · `seed`(=`tsx --env-file-if-exists=.env server/db/seed.ts`) | done | `package.json` |
| `.env.example`에 `DATABASE_URL=`(이름만) | done | 값 없는 3줄(`API_PORT=` · `API_URL=` · `DATABASE_URL=`) |
| `issues` 칸 · 타입 · NOT NULL(`summary`만 null 가능) · PK | done | `schema.ts`, 실제 DB `information_schema.columns`로 확인. `date`는 `mode: 'string'` |
| `folders` · id `f{가장 큰 번호+1}` · 목록 `created_at` ↑ | done | `store.ts` `createFolder` · `folders`. DB에서 f4 → f5 → f6 순서로 생김 |
| `bookmarks` · integer identity PK · `issue_id` unique + FK · `folder_id` FK · `created_at` 기본 now() · 목록 ↓ | done | DB 제약 `bookmarks_pkey` · `bookmarks_issue_id_unique` · FK 2개 확인 |
| RLS 켜기(정책 없음) | done | SQL에 `ENABLE ROW LEVEL SECURITY` 3개, DB `relrowsecurity` 3개 true, `pg_policies` 0 |
| 연결 `postgres(url, { prepare: false })` + Drizzle, 연결은 `index.ts` · seed만 | done | `server/db/client.ts` `connectDb()`, 부르는 곳은 `server/index.ts` · `server/db/seed.ts`(store.ts는 타입만 import) |
| 마이그레이션(generate → `drizzle/` 커밋 대상 → migrate, `drizzle.config.ts`가 `.env` 있으면 `process.loadEnvFile`) · 6543/5432 중 어느 쪽인지 보고 | done | `drizzle/0000_fluffy_mordo.sql` · `meta/`가 git 무시 대상 아님. 6543 그대로 성공(제작 보고 · 심사 재실행 모두) |
| 저장소: 라우트는 저장소 함수만, `createApp(저장소)`, `index.ts`는 DB 구현, 테스트는 메모리 구현(ex04 응답 그대로) | done | `server/app.ts` `Store` · `createApp`, `routes/*`는 `(store) => Hono`, `sample.ts` `memoryStore` · `resetSample`. ex04 앱 대 ex05 메모리 앱 응답 10/10 같음(참고) |
| 랭킹 조립 한 곳(섹션 6 · `rankIssues` · 카드 8칸 · `updatedAt`) | done | `server/ranking.ts` `buildRanking` · `findCard`를 두 저장소가 같이 씀 |
| date 생략(D3): KST 오늘 이하 가장 늦은 `date`, 없으면 404, `date`는 문자열 | done | `store.ts` `latestDate`(`max(date) where date <= kstToday()`), 라우트 `rankings.ts` |
| 북마크 항목 `rank`는 그 날짜 랭킹에서, `savedAt` = `created_at.toISOString()` | done | `store.ts` `bookmarks` · `saveBookmark`. 10개 카드 모두 그 날짜 랭킹 카드와 같음(참고) |
| 순위 3번째 기준 id 자연 순서 | done | `rankIssues`의 `localeCompare(…, 'en', { numeric: true })` |
| seed(1350 · f1~f3 · 북마크 10 · 한 트랜잭션 지우고 넣기 · 출력 · 연결 닫기 · `seedRows(오늘)` 순수 함수) | done | `server/db/seed.ts` · `sample.ts` `seedRows`. 네 번 실행 모두 같은 출력 · 같은 행 수 |
| 새 테스트 3묶음 | done | `ranking.test.ts` "두 자리 번호" · `api.test.ts` "date 생략(D3)" · `seed.test.ts`(2 it) |
| 계약: `GET /api/rankings` 404 description 한 줄 | done | `git diff --no-index`로 한 줄만 바뀜 |
| 화면 변경 없음 | done | `public/index.html` ex04와 같음(cmp) |
| 구현 순서 1~4 · 마지막(build · test · seed로 되돌림) | done | 심사 시작 때 DB가 이미 1350 · 3 · 10, 서버 · node 프로세스 0개 |

## 2. SPEC 근거(US-09 · US-10 · AC-01-1(저장)) 충족
| AC | 판정 | 근거(검증 줄) |
|---|---|---|
| AC-09-1 지난 날짜 Top 5 | 충족 | 지난 날짜(DB): 어제 · 44일 전 200, 카드 8칸 · 섹션 6 × 5 |
| AC-09-2 날짜 표시 · "오늘" 버튼 | 충족* | 화면 지난 날짜: 코드(`renderContext` · `todayBtn.hidden` · `setDate(TODAY)`) + API 재현 |
| AC-09-3 데이터 없는 날 안내 | 충족 | 45일 전 · 2000-01-01 · 오늘 행 지운 뒤 `?date=<오늘>` 모두 404 "해당 날짜의 랭킹 데이터가 없습니다" |
| AC-09-4 미래 날짜 막기 | 충족* | 화면 오늘(KST): `TODAY`가 KST 계산, `dateInput.max = TODAY`, `nextDay.disabled`. API 내일 400(참고) |
| AC-09-5 과거 날짜 북마크 | 충족(로그인 부분은 ex11) | 다시 켜도 유지: 어제 pol 1위 저장 201 · 재시작 뒤 유지 |
| AC-10-1 폴더 개수 표시 · 저장 | 충족 | 목록(DB): f1 4 · f2 3 · f3 3 순서 |
| AC-10-2 새 폴더 → 바로 저장 | 충족 | 다시 켜도 유지: f4 201 → 그 폴더로 201 → 재시작 뒤 f4 count 1 |
| AC-10-3 폴더 칩 | 충족* | 화면 흐름: `renderBookmarks` 코드 + API 재현(칩마다 걸러진 수 = `count`, 합 = 전체) |
| AC-10-4 폴더 하나 | 충족 | 같은 이슈 f1로 409, f1 4 그대로. DB `issue_id` unique |
| AC-01-1(저장) | 충족(저장 부분) | seed 두 번: 오늘 6섹션 × 5행, 행 수 같음. 수집 · 스케줄은 ex06 · ex09 |
| (검증 줄에 있는 그 밖 AC) AC-03-1 · 05-1 · 07-1 · 07-2 · 08-1 | 충족 | 오늘 랭킹(DB) · 화면 주소* · 화면 흐름* · 폴더 하나 · 해제 · 목록(DB) |

- US-09 · US-10의 AC는 모두 검증 줄이 있어 "참고"로 남는 것 없음. `*`는 브라우저 대신 코드 읽기 + API 재현

## 3. 추가 · 변경 · 출발점 · 기존 화면 동작
- PLAN에 없는데 추가된 것(모두 PLAN을 구현하는 데 필요한 작은 세부, 제작 보고 2절에 적힘): `SectionKey` · `Issue` · `Ranking` · `SECTIONS`를 `sample.ts` → `ranking.ts`로 옮김(순환 import 피함), `IssueRow` 타입 · `findCard` · `Db` 타입, seed 폴더 `created_at`(실행일 11일 전 09:00 · 09:01 · 09:02 KST). 기능 · 검사 · 라이브러리 추가 없음
- ex04에서 불필요하게 바뀐 것: 없음. 바뀐 것은 저장소 · `createApp` · 자연 순서 · D3 때문에 생긴 것(`rankingFor` → `rowsFor` + `buildRanking`, `findIssue` → `findCard`, 내보내던 메모리 배열 → `memoryStore` 안으로, `app` → `createApp`)과 그에 맞춘 주석 몇 줄. POOL · SEED 데이터 줄은 ex04와 같음. `route.ts` · `next.config.mjs` · `index.html` · `setup.ts` · `vitest.config.ts` · `tsconfig.json`은 해시가 같음
- 출발점 폴더: `git status frontend/ ex01/ ex02/ ex03/ ex04/` 변경 0건, 심사 전후 `ex04/` 파일 해시 같음
- 화면에 이미 있던 동작(PLAN.md 6절 04-2 새 탭 · 05-2 모바일 · 09-2 · 09-4 · 10-3): `index.html`이 ex04와 같고(`target="_blank" rel="noopener"` 3곳, `@media (max-width: 640px)` 그대로), API 응답이 ex04와 같아(10/10) 깨지지 않음(코드 읽기 기준)

## 4. 빌드
- `npm.cmd run build`(= `next build && tsc --noEmit`): **성공**(Compiled successfully, TypeScript 통과). `tsconfig`가 `**/*.ts`를 포함해서 `server/db/` · `drizzle.config.ts` · `test/`도 타입 검사됨. 심사 끝에 한 번 더 돌려도 성공

## 5. 검증표 (두 서버를 띄우고 node fetch로 `http://localhost:3000`, SQL은 `ex05/`에서 `node --env-file=.env` + `postgres(prepare: false)`, 접속 주소는 출력하지 않음)
| # | 확인 | 결과 | 실제 |
|---|---|---|---|
| 1 | OpenAPI 형식 | [OK] | 오류 0, 경고 19(ex04와 같은 종류) |
| 2 | 엔드포인트 | [OK] | 6개만 |
| 3 | 상태 코드 | [OK] | rankings 200/400/404 · bookmarks GET 200 · POST 201/400/404/409 · DELETE 204/404 · folders GET 200 · POST 201/400 |
| 4 | 실패 메시지 | [OK] | 9개 모두 글자 그대로 |
| 5 | 이슈 칸 | [OK] | required 8칸, `summary` `[array, null]` · min/max 3 |
| 6 | 섹션 키 | [OK] | enum 6개, `oneOf` 6가지 key · name const 짝 맞음 |
| 7 | 폴더 이름 | [OK] | minLength 1 · maxLength 16, 설명에 앞뒤 공백 · 코드 포인트 |
| 8 | 이슈 id 규칙 | [OK] | `IssueId` pattern 그대로, `Issue.id` · `issueId` 참조, folderId minLength 1, 옛 예시 검색 0건 |
| 9 | 계약 변경 범위 | [OK] | 404 description 한 줄만 |
| 10 | 출발점 그대로 | [OK] | 변경 0건 |
| 11 | 빌드 | [OK] | 성공 |
| 12 | 테스트 | [OK] | 3 파일 · 19 테스트 통과, 실패 0 |
| 13 | 테스트 범위 | [OK] | ex04 15묶음(15 it) + 새 3묶음(4 it), AC-03-1 · 03-2 · 07-1 · 07-2 · 08-1 · 08-2 · 09-1 · 09-3 · 09-4 · 10-1 · 10-2 · 10-4 · D3 |
| 14 | 서버 · DB 없이 | [OK] | 두 서버 끈 상태 · `$env:DATABASE_URL='postgres://u:p@127.0.0.1:9/x'`로 19/19, `test/`에서 `fetch(` · `localhost` · `8787` 0건 |
| 15 | 시계 고정 | [OK] | `$env:TZ='America/Los_Angeles'`로 19/19, `new Date()` · `Date.now(` 0건 |
| 16 | 순서 무관 | [OK] | `--sequence.shuffle` 네 번(시드 서로 다름) 모두 19/19 |
| 17 | 테스트가 잡는가 | [OK] | 발행 시각 비교를 뒤집으면 동점 테스트 1개 실패 → 백업에서 되돌림, 해시 실험 전과 같음 → 19/19 |
| 18 | 화면 주소 | [OK]* | `GET /` 200 · `<title>이슈랭크</title>` · 본문이 `public/index.html`과 같음. 코드: 첫 진입 `loadRanking()`(date 없이) → 6섹션 · 갱신 시각 줄(`updatedAt` · 이슈 수) |
| 19 | 화면 오늘(KST) | [OK]* | 코드: `TODAY` = KST(+9시간) 문자열, 오늘이면 " · 오늘" · `nextDay.disabled` · `dateInput.max = TODAY`. API `date` = 2026-10-07. DevTools 시간대 바꾸기는 못 함 |
| 20 | 화면 흐름 | [OK]* | api 재시작 뒤 API 재현: 저장 201 → 다시 받기에 있음 → DELETE 204 → 되돌리기(같은 폴더 POST) 201 · 목록 맨 앞 → 칩마다 걸러진 수 = `count`, 합 = 전체 |
| 21 | 중계 그대로 | [OK] | 8787 · 3000 `?date=2026-10-06` 200 · 본문 같음(7638 bytes) |
| 22 | Hono 꺼짐 | [OK] | 502 "API 서버에 연결할 수 없습니다" |
| 23 | 가짜 데이터 제거 | [OK] | 6개 정규식 0건 |
| 24 | 지역 시간 제거 | [OK] | `setHours` 0건, `TODAY`는 KST 계산 문자열 |
| 25 | 테이블만 | [OK] | `CREATE TABLE` · RLS 각 3개(issues · folders · bookmarks), `articles` · `collect_runs` · `user_id` 0건, `drizzle/` 커밋 대상 |
| 26 | 마이그레이션 | [OK] | 다시 실행 성공(NOTICE "already exists"만), public 테이블 3개만, `__drizzle_migrations` 1행 |
| 27 | 연결 설정 | [OK] | `server/db/`에 `prepare: false` 2건(코드 1 · 주석 1), `.env.example` 이름만, `ex05/.env` 무시됨 |
| 28 | 저장소 나눔 | [OK] | `server/app.ts` · `server/routes/` · `test/`에서 0건 |
| 29 | seed 두 번 | [OK] | 두 번 다 `issues 1350 · folders 3 · bookmarks 10`, SQL 행 수 같음 · id 중복 없음 · 2026-08-24~10-07, 오늘 6섹션 × 5 |
| 30 | 오늘 랭킹(DB) | [OK] | 200 · date 10-07 · updatedAt `2026-10-07T06:00:00+09:00` · 6 × 5 · 내림차순 · rank 1~5 · soc null 1개 |
| 31 | 최근 수집일(D3) | [OK] | 오늘 bookmarks 0행 · issues 30행 삭제 → 200 date 10-06 · `?date=10-07` 404 문구 → seed → 재시작 없이 200 date 10-07 |
| 32 | 지난 날짜(DB) | [OK] | 10-06 200(id 모두 `2026-10-06-`) · 08-24 200 · 08-23 404 · 2000-01-01 404 문구 |
| 33 | 목록(DB) | [OK] | 10개 savedAt ↓ · 10칸 · 맨 앞 `2026-10-06T12:10:00.000Z`(= 10-06 21:10 KST) · `2026-10-06-it-4` rank 1 = 어제 it 1위 / f1 반도체·AI 4 · f2 부동산·금리 3 · f3 나중에 읽기 3 |
| 34 | 다시 켜도 유지 | [OK] | `{ id: "f4", name: "유지확인", count: 0 }` 201 → `2026-10-06-pol-4` f4 201 → api 재시작 → 북마크 11 · 맨 앞 그 이슈 f4, 폴더 4 · f4 count 1 |
| 35 | 폴더 하나 · 해제(DB) | [OK] | 409 문구 · f1 4 그대로 → 404 "이슈를 찾을 수 없습니다" · "폴더를 찾을 수 없습니다" → 204 · 404 "북마크를 찾을 수 없습니다" → f4 count 0 |
| 36 | 화면 지난 날짜 | [OK]* | 코드: 이전 날 → `setDate(addDays(state.date, -1))` → 날짜 표시 바뀜 · `todayBtn.hidden = false`, "오늘" → `setDate(TODAY)` → " · 오늘" · 버튼 숨김. API 어제 200(카드 6 × 5) · 오늘 200 |
| 37 | 원상복구(마지막) | [OK] | seed → `issues 1350 · folders 3 · bookmarks 10`, 폴더 f1~f3만(유지확인 없음) · 북마크 10개, SQL 행 수 같음 |

**합계 37/37 OK** (`*` 4줄은 브라우저 대신 코드 읽기 + API 재현)

## 6. 지켜야 할 것 점검
| 항목 | 결과 |
|---|---|
| 기사 본문 저장 · 표시 | 위반 없음. `issues`는 제목 · 링크 · 요약 · 건수 · 시각뿐, `articles` 테이블 없음, 본문 칸 없음 |
| 코드에 들어간 키 · 접속 정보 | 위반 없음. 저장소 전체(node_modules · .next · .git 빼고 157개 파일)에서 `DATABASE_URL`의 주소 · 비밀번호 · 호스트 · 프로젝트 ref 조각 0건(값은 출력하지 않고 파일 이름만 확인) |
| `.env`가 git 제외 대상인지 | 제외됨(`.gitignore:4:.env`) |
| PLAN에 없는 패키지 | 없음 |
| D0 밖의 출처 수집 | 없음(수집 코드 자체가 없음, 서버 쪽 `fetch`는 BFF 중계뿐) |
| CLAUDE.md 규칙 | 위반 없음. 출발점 그대로, 커밋 없음, `.env` 그대로, 확인용 행은 seed로 되돌림, 서버 꺼 둠 |

## 참고 (PLAN에 없는 경계 입력 · 추가로 보인 점, 판정에는 넣지 않음)
- DB 서버에서 ex03 · ex04 입력 규칙 그대로: 날짜 형식 4종 400 · 2999-01-01 400 · 내일(10-08) 400 "오늘 이후 날짜는 조회할 수 없습니다" · 오늘 직접 지정 200 · 깨진 본문 두 POST 400 · `{}` · `…-xyz-0` 400 · `가`×17 · 공백 이름 400 · `"  여행  "` 201(공백 빠짐, f5) · 😀×16 201(f6) · 오늘 it 1위 저장 201 · `DELETE /api/bookmarks/abc` 404
- ex04 앱 대 ex05 메모리 앱: 랭킹(생략 · 오늘 · 1 · 5 · 10 · 44 · 45일 전 · 2000-01-01) · 북마크 · 폴더 10개 요청 본문 같음(10/10). 원상복구 뒤 ex05 메모리 앱 대 DB 서버도 10/10(북마크 `savedAt`은 PLAN대로 DB가 `toISOString()` 표기라 시각으로 비교)
- 제작 보고 6절의 앞으로 볼 점은 실제 코드와 맞음: 후보가 Top 5를 넘으면 `store.ts` `bookmarks()`의 `findCard(...)!`가 null이 되어 카드 칸이 빈 항목이 나올 수 있음(ex07에서 정할 것) · `createFolder` 동시 요청 시 같은 id(500) · 같은 `created_at` 북마크 순서 미정 · seed가 모든 행을 지움(ex06에서 seed 쓰임 정해야 함)
- 빈 DB(issues 0행)에서 date 생략 → 404는 메모리 저장소 대역 테스트로만 확인됨(DB 경로는 `max()`가 null → 404). PLAN 검증 줄에는 없음
- 제작 중 `.env` 비밀번호 대괄호 문제를 `.env`를 고치지 않고 자식 프로세스 환경 변수로 우회함(제작 보고 1절 8번 · 6절 1번에 적힘). CLAUDE.md 4절의 "값이 없으면 멈추고 알림"과는 다른 경우(값은 있었음)라 위반으로 보지 않음. 지금 `.env`로 `npm run api` · `seed` · `db:migrate`가 그대로 됨을 심사에서 확인
- `web/` · `plan/PLAN_web.md`(추적 안 됨)는 ex05 PLAN보다 먼저 생긴 다른 작업이라 심사하지 않음
- vitest `"type": "module"` 경고 · Redocly 경고 19개(`Section` oneOf 가지 required 15 · 4xx 2 · license 1 · example.com 1)는 ex04와 같음

## 심사 쪽에서 생긴 일 (알림)
- 심사 중 내가 만든 마이그레이션 로그 필터 스크립트가 `.env`의 따옴표 처리를 못 해 오류가 났고, Node 오류 메시지에 `DATABASE_URL` 값이 **심사 에이전트의 로컬 명령 출력에 한 번** 찍힘. 파일 · 로그 · 이 보고 어디에도 값은 남지 않음(저장소 · scratchpad · 백그라운드 작업 출력에서 0건 확인). 다만 대화 기록에는 남았으므로, 필요하면 Supabase DB 비밀번호를 바꾸는 것을 권함

## 정리 상태
- 서버: 3000 · 8787 둘 다 끔. 두 포트 LISTEN 0개, node 프로세스 0개
- DB: 마지막에 `npm.cmd run seed`로 되돌림 → **issues 1350 · folders 3 · bookmarks 10**(폴더 f1~f3만)
- 파일: 심사 전후 `ex05/` 파일 해시 모두 같음(build/dev가 다시 쓰는 `next-env.d.ts`는 마지막 build 뒤 원래 해시로 돌아옴), `ex04/` 해시 같음. 변이 실험용 `server/ranking.ts` 백업은 scratchpad `judge_ex05_ranking.ts.bak`, 되돌린 뒤 해시 같음
- 심사용 스크립트 · 해시 기록은 scratchpad에만 둠(프로젝트에 임시 파일 없음)
