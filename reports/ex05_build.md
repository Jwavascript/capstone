# ex05 제작 보고 — Supabase + Drizzle (랭킹 · 북마크 · 폴더 저장)

- 지시: "plan/PLAN_backend_ex05.md대로 ex05 만들기" (자동 실습, 확인 지점은 "예"로 보고 진행)
- 출발점 `ex04/`는 고치지 않음(`git status frontend/ ex01/ ex02/ ex03/ ex04/` 변경 0건). git 커밋 없음
- 접속 주소 · 비밀번호는 출력 · 로그 · 코드 · 이 보고 어디에도 쓰지 않음(DB 명령 출력은 모두 비밀 조각을 `***`로 가리는 래퍼를 거쳐 봄)

## 1. 확인받았을 목록 (모두 "예"로 보고 진행)
1. `ex05/` 복사: `ex04/` → `ex05/` (`node_modules` · `.next` · `AGENTS.md` · `next-env.d.ts` · `*.tsbuildinfo` 제외, 이미 있는 `ex05/.env`는 그대로)
2. 고칠 파일: `package.json`(name `issuerank-ex05` · scripts `db:generate` · `db:migrate` · `seed`), `.env.example`, `server/ranking.ts` · `app.ts` · `index.ts` · `sample.ts` · `schemas.ts` · `routes/` 3개, `test/api.test.ts` · `test/ranking.test.ts`, `openapi.yaml` 1줄
3. 새 파일: `server/db/schema.ts` · `client.ts` · `store.ts` · `seed.ts`, `drizzle.config.ts`, `drizzle/`(generate 결과), `test/seed.test.ts`
4. 바뀌면서 없어질 것: 아래 3절 목록(`rankingFor` · `findIssue` · 내보낸 메모리 배열 · `app` 단일 객체 · id 문자열 비교)
5. 설치: `npm.cmd install` 뒤 `drizzle-orm` · `postgres`, `-D drizzle-kit`만
6. 필요한 키: `DATABASE_URL`(`.env`에 있음)
7. 실제 Supabase DB에 마이그레이션 · seed 실행, 검증하며 행을 넣고 지운 뒤 마지막에 `npm run seed`로 되돌림
8. (진행 중 생김) `.env`의 비밀번호가 Supabase 템플릿 대괄호 `[ ]`에 싸여 있어 그대로는 인증 실패 → `.env`는 고치지 않고, DB 명령을 돌릴 때만 괄호를 뺀 주소를 자식 프로세스 환경 변수로 넘겨도 되는지 (6절 1번)

## 2. PLAN 항목별 반영 위치
| PLAN 항목 | 반영 위치 |
|---|---|
| 새 패키지 drizzle-orm · postgres · drizzle-kit(-D) | `ex05/package.json` (drizzle-orm 0.45.3 · postgres 3.4.9 · drizzle-kit 0.31.11) |
| scripts · name | `package.json`: `db:generate`=`drizzle-kit generate`, `db:migrate`=`drizzle-kit migrate`, `seed`=`tsx --env-file-if-exists=.env server/db/seed.ts`, name `issuerank-ex05` |
| `.env.example`에 `DATABASE_URL=` | `ex05/.env.example` (이름만) |
| 테이블 3개(타입 · NOT NULL · PK · unique · FK · 기본값) | `server/db/schema.ts` (`issues` · `folders` · `bookmarks`, `bookmarks.id`는 integer identity, `issue_id` unique, FK 2개, `created_at` 기본 now(), `date`는 `mode: 'string'`) |
| RLS 켜기(정책 없음) | `schema.ts`의 `.enableRLS()` → `drizzle/0000_fluffy_mordo.sql`에 `ENABLE ROW LEVEL SECURITY` 3개. DB `relrowsecurity` 3개 모두 true |
| 연결 `postgres(url, { prepare: false })` + Drizzle | `server/db/client.ts`의 `connectDb()`. 부르는 곳은 `server/index.ts` · `server/db/seed.ts`뿐 |
| 마이그레이션 · `drizzle.config.ts`(`.env` 있으면 `process.loadEnvFile`) | `drizzle.config.ts`, `drizzle/0000_fluffy_mordo.sql` · `drizzle/meta/` (git에서 커밋 대상으로 보임) |
| 6543 → 안 되면 5432 | **6543 그대로 성공**. `drizzle.config.ts`는 바꾸지 않음(5432 안 씀) |
| 저장소 함수만 부르는 라우트 | `server/app.ts`의 `Store` 타입(최근 수집일 `latestDate` · 날짜의 이슈 `ranking` · 이슈 하나 `issue` · 북마크 목록/저장/해제 `bookmarks`/`saveBookmark`/`deleteBookmark` · 폴더 목록/만들기 `folders`/`createFolder`), `server/routes/*.ts`는 `(store) => Hono` |
| `createApp(저장소)` | `server/app.ts` `createApp(store)` |
| `index.ts`는 DB 구현 | `server/index.ts` → `createApp(dbStore(connectDb().db))`, DB 구현은 `server/db/store.ts` `dbStore(db)` |
| 테스트는 메모리 구현(`resetSample()` · 응답 값 ex04 그대로) | `server/sample.ts` `memoryStore` · `resetSample()`. ex04 앱과 같은 시각에 랭킹(오늘 · 1 · 5 · 10 · 44 · 45일 전) · 북마크 · 폴더 9개 요청 본문이 **글자 그대로 같음**(9/9) |
| 랭킹 조립 한 곳(섹션 6개 · rankIssues · 카드 8칸 · updatedAt) | `server/ranking.ts` `buildRanking(date, rows)` · `findCard(id, rows)`. 두 저장소가 같이 씀 |
| date 생략(D3) · `date`는 문자열 | 라우트 `routes/rankings.ts`가 `store.latestDate()`, DB는 `max(date) where date <= KST 오늘`(`store.ts`), 메모리는 KST 오늘. 없으면 404 같은 문구 |
| 북마크 항목 rank · `savedAt = created_at.toISOString()` | `store.ts` `bookmarks` · `saveBookmark` (rank는 `findCard`로 그 날짜 랭킹에서) |
| 순위 3번째 기준 id 자연 순서 | `server/ranking.ts` `rankIssues`: `a.id.localeCompare(b.id, 'en', { numeric: true })` |
| 폴더 id `f{가장 큰 번호 + 1}` · 목록 `created_at` ↑ · 북마크 목록 `created_at` ↓ | `store.ts` `createFolder` · `folders` · `bookmarks` |
| seed(45일 × 6 × 5 = 1350 · f1~f3 · 북마크 10 · 한 트랜잭션 지우고 넣기 · 출력 · 연결 닫기) | `server/db/seed.ts`, 행은 `server/sample.ts`의 순수 함수 `seedRows(오늘)` |
| 새 테스트 3묶음 | `test/ranking.test.ts` "두 자리 번호", `test/api.test.ts` "date 생략(D3)", `test/seed.test.ts`(2개 it) |
| `api.test.ts`는 `createApp(메모리 구현)` | `test/api.test.ts` 맨 위 `createApp(memoryStore)` |
| 계약 줄 | `openapi.yaml` `GET /api/rankings` 404 description 한 줄만 (`git diff --no-index` 확인) |

PLAN에 없어 정한 세부(가장 단순하게)
- `SectionKey` · `Issue` · `Ranking` · `SECTIONS`를 `sample.ts` → `ranking.ts`로 옮김: 공통 조립(`buildRanking`)이 `SECTIONS`를 쓰는데 `sample.ts`가 `ranking.ts`를 읽으므로 그대로 두면 서로 읽는 순환이 생김. `Bookmark` · `Folder`(개수 포함) 타입은 `Store`와 함께 `app.ts`
- seed 폴더 `created_at`: 실행일 11일 전 09:00 · 09:01 · 09:02 KST(북마크 1~10일 전보다 앞)
- `kstToday`는 그대로 `sample.ts`(DB 저장소 · seed도 거기서 가져옴)

## 3. 지운 것
- PLAN에 없어서 지운 것: **없음**
- PLAN 변경(저장소 · `createApp` · 자연 순서) 때문에 바뀌면서 없어진 것
  - `sample.ts`의 `rankingFor` → 후보 행 `rowsFor` + 공통 `buildRanking`으로 나눔(결과 같음)
  - `sample.ts`의 `findIssue` → `ranking.ts` `findCard` + 저장소 `issue()`
  - `sample.ts`에서 내보내던 `folders` · `bookmarks` 배열 · `newFolderId` → 모듈 안으로 숨기고 `memoryStore`로만 접근
  - `app.ts`의 `export const app` → `createApp(store)`, 라우트의 모듈 단위 Hono 객체 → `(store) => Hono` 함수
  - `rankIssues`의 id 문자열 비교(`a.id < b.id`) → 자연 순서

## 4. 필요했지만 없던 키 · 계정
- 없음. `DATABASE_URL`은 있었음(형식: Supabase pooler · 포트 6543 · 사용자 `postgres.<ref>` 확인)
- 다만 값 그대로는 인증 실패(28P01) — 6절 1번. 사용자가 `.env`를 고쳐야 함

## 5. 실행 결과
- `npm run build`(= `next build && tsc --noEmit`): **성공**(Compiled successfully, TypeScript 통과). 마지막 상태로 한 번 더 돌려도 성공
- `npm test`: **3 파일 · 19 테스트 모두 통과, 실패 0** (ex04 15개 묶음 15 it + 새 3묶음 4 it)
  - 서버 · DB 없이(`$env:DATABASE_URL='postgres://u:p@127.0.0.1:9/x'`): 19/19 통과
  - `$env:TZ='America/Los_Angeles'`: 19/19 통과
  - `npx vitest run --sequence.shuffle`: 19/19 통과
  - 테스트가 잡는가: `ranking.ts` 발행 시각 비교를 뒤집으면 동점 테스트 1개 실패 → 되돌리고(원본과 같음 확인) 19/19 통과
- `npm run db:generate`: `drizzle/0000_fluffy_mordo.sql`(CREATE TABLE 3 · ENABLE RLS 3 · FK 2)
- `npm run db:migrate`: **6543에서 성공**(prepared statement 오류 없음). 한 번 더: 성공(바뀐 것 없음, NOTICE만), public 테이블 `bookmarks` · `folders` · `issues`만, `drizzle.__drizzle_migrations` 1행
- `npm run seed`: 두 번 연속 모두 `issues 1350 · folders 3 · bookmarks 10`, SQL 행 수 같음(id 중복 없음), 오늘(KST) 6개 섹션 × 5행

검증표 (두 서버를 띄우고 node fetch로 `http://localhost:3000`, SQL은 `node --env-file=.env` + `postgres(prepare: false)`)
| 확인 | 결과 |
|---|---|
| OpenAPI 형식 | 오류 0, 경고 19(ex04와 같은 종류 · 개수) |
| 엔드포인트 · 상태 코드 | 6개 그대로, rankings 200/400/404 · bookmarks POST 201/400/404/409 · DELETE 204/404 · folders POST 201/400 |
| 실패 메시지 9개 · 이슈 id 규칙 검색 | 9개 모두 있음, 옛 예시 id 검색 0건 |
| 계약 변경 범위 | 404 description 한 줄만 |
| 출발점 그대로 | 변경 0건 |
| 테스트 · 시계 · 서버 없이 검색 | `test/`에서 `fetch(` · `localhost` · `8787` · `new Date()` · `Date.now(` 0건 |
| 테이블만 | `CREATE TABLE` · `ENABLE ROW LEVEL SECURITY` 각 3개, `articles` · `collect_runs` · `user_id` 0건, `drizzle/` 커밋 대상(무시 안 됨) |
| 연결 설정 | `server/db/`에 `prepare: false` 1건(+주석), `.env.example`은 이름만, `git check-ignore ex05/.env` 무시됨 |
| 저장소 나눔 | `server/app.ts` · `server/routes/` · `test/`에서 `postgres` · `drizzle-orm` · `db/client` 0건 |
| 오늘 랭킹(DB) | 200 · date 2026-10-07 · updatedAt `2026-10-07T06:00:00+09:00` · 6섹션 × 5 · 내림차순 · rank 1~5 · 8칸 · soc null 1개 |
| 최근 수집일(D3) | 오늘 issues 30행 삭제 → `/api/rankings` 200 date 2026-10-06, `?date=2026-10-07` 404 문구 → seed → (api 재시작 없이) 200 date 2026-10-07 |
| 지난 날짜(DB) | 어제 200(id 모두 어제-) · 44일 전 200 · 45일 전 404 · 2000-01-01 404 문구 |
| 목록(DB) | 북마크 10개 savedAt ↓ · 8칸 + folderId · savedAt · 맨 앞 `2026-10-06T12:10:00.000Z`(= 어제 21:10 KST) · 그 id · rank = 어제 it 1위, 10개 카드 모두 그 날짜 랭킹 카드와 같음 / 폴더 f1 4 · f2 3 · f3 3 순서 |
| 다시 켜도 유지 | `{ id: "f4", name: "유지확인", count: 0 }` 201 → 어제 pol 1위 f4 저장 201 → api 재시작 → 북마크 11개 · 맨 앞 그 이슈 · f4, 폴더 4개 · f4 count 1 |
| 폴더 하나 · 해제(DB) | f1로 다시 409 · f1 4 그대로 → 없는 이슈 404 · 없는 폴더 404 → DELETE 204 · 404 → f4 count 0 |
| 중계 그대로 | 8787과 3000의 `?date=어제` 상태 · 본문 같음 |
| Hono 꺼짐 | 502 "API 서버에 연결할 수 없습니다" |
| 화면 주소(fetch만) | `GET /` 200, `<title>이슈랭크</title>` |
| 가짜 데이터 · 지역 시간 제거 | `public/index.html` 검색 0건, `TODAY`는 KST(+9시간) 문자열(ex04 그대로) |
| 원상복구(마지막 DB 작업) | seed → `issues 1350 · folders 3 · bookmarks 10`, 폴더 f1~f3만("유지확인" 없음) · 북마크 10개 |

- 서버: 3000 · 8787 둘 다 끔. 두 포트 LISTEN 0개, 남은 node 프로세스 0개 확인
- 브라우저로 직접 볼 항목(이번엔 브라우저를 쓰지 않음): ① `http://localhost:3000/` 이슈맵 · 6섹션 · 갱신 시각 ② DevTools Sensors로 America/Los_Angeles에서 "· 오늘" · 다음 날 버튼 비활성 · 달력 KST 내일 막힘 ③ `npm run api` 재시작 뒤 카드 북마크 → 폴더 고르기 → 새로고침해도 활성 → 해제 → "되돌리기" → 북마크 화면 폴더 칩 · 개수 ④ 이전 날 버튼 → 어제 카드 · "오늘" 버튼 → 오늘로 · 버튼 숨김. 이 확인으로 바뀐 행은 끝나고 `npm.cmd run seed`로 되돌림

## 6. 추가로 보인 점
1. **`.env`의 `DATABASE_URL` 비밀번호가 `[ ]`에 싸여 있음**(Supabase 연결 문자열 템플릿 `[YOUR-PASSWORD]`의 괄호가 남은 것으로 보임). 그대로는 `password authentication failed`(28P01)이고, drizzle-kit migrate는 메시지 없이 exit 1만 냄. 괄호를 뺀 값으로는 접속됨. 이번엔 `.env`를 고치지 않고 DB 명령(`db:migrate` · `seed` · `api` · 확인 SQL)을 돌릴 때만 괄호 뺀 주소를 자식 프로세스 환경 변수로 넘겼음(Node `--env-file` · `process.loadEnvFile`은 이미 있는 환경 변수를 덮어쓰지 않음). **사용자가 `ex05/.env`에서 비밀번호 앞뒤 `[` `]`를 지워야** `npm run api` · `seed` · `db:migrate`가 그대로 동작함(지우지 않으면 api는 DB를 읽는 첫 요청부터 500)
2. 지금은 날짜 · 섹션마다 후보가 정확히 5개라 모든 이슈가 Top 5 안임. ex07에서 후보가 5개를 넘으면 6위 밖 이슈를 북마크 저장(지금은 "이슈를 찾을 수 없습니다")과 북마크 목록(지금은 카드 칸이 비게 됨)에서 어떻게 다룰지 정해야 함
3. `npm run seed`는 bookmarks · folders · issues를 모두 지우고 넣음 → 화면에서 만든 북마크 · 폴더도 사라지고, ex06 뒤에는 수집한 issues까지 지워짐. ex06 PLAN에서 seed를 언제 쓸지 정해야 함
4. `createFolder`는 "가장 큰 번호 + 1"을 읽은 뒤 넣으므로 동시에 두 번 만들면 같은 id로 PK 충돌(500). 로컬 · 사용자 하나라 지금은 영향 적음, ex11 계정별 폴더 때 다시 볼 것
5. 북마크 목록은 `created_at`만으로 정렬해서 같은 시각이면 순서가 정해지지 않음(지금 seed는 시각이 모두 다름)
6. `next dev` · `next build`도 `ex05/.env`를 읽음("Environments: .env"). Next 쪽은 `DATABASE_URL`을 쓰지 않지만, 뒤 단계에서 `NEXT_PUBLIC_` 이름으로 비밀값을 두지 않도록 주의
7. `server/db/store.ts` · `seed.ts`가 `kstToday`를 `sample.ts`에서 가져와 api 서버도 메모리 샘플 모듈을 읽음(시작 때 `resetSample` 한 번 계산, 동작 영향 없음. ex04도 `schemas.ts`가 같은 모듈을 읽었음)
8. PLAN.md 10절 메모는 Redocly 경고 15개라고 했지만 지금 Redocly로는 ex04 · ex05 모두 19개(`no-illogical-composition-keywords` 15 · `operation-4xx-response` 2 · `info-license` 1 · `no-server-example.com` 1). 오류는 0
9. vitest의 `"type": "module"` 경고, npm의 esbuild install script(allowScripts) 경고는 ex04와 같고 동작 문제 없음
10. 두 번째 `db:migrate` 때 NOTICE(`schema "drizzle" already exists`)가 객체 모양으로 길게 출력됨. 정상
