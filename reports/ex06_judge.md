# ex06 심사 보고: newsdata.io 수집

- 대상: `ex06/`(출발점 `ex05/`)
- 기준: `SPEC.md` · `PLAN.md`(5절 결정 · 6절 AC) · `plan/PLAN_backend_ex06.md` · 앞 PLAN(ex01~ex05) · `CLAUDE.md`
- 제작 보고: `reports/ex06_build.md`
- 심사일: 2026-10-07 19:24~19:45 KST
  - 쓴 날짜: 오늘 2026-10-07 · 어제 10-06 · 내일 10-08 · 44일 전 08-24 · 45일 전 08-23 · 데이터 없는 날 2000-01-01
- 심사 방식
  - 코드는 고치지 않았고 git 커밋도 하지 않았습니다.
  - 브라우저 도구가 없어서 화면 4줄은 다른 방법으로 판단했습니다(아래 표에 `*` 표시). `public/index.html` 코드를 읽고, 화면이 부르는 순서대로 API를 node fetch로 다시 불렀습니다. 날짜 함수는 index.html에서 그대로 떼어 실행했습니다.
- 비밀값
  - `.env`를 읽는 명령(build · test · migrate · seed · collect · SQL · 크레딧 확인)은 모두 "안전 실행"으로 돌렸습니다. 자식 출력에 실제 키 · `DATABASE_URL` · 그 비밀번호 · 사용자 · 호스트 · 그 줄의 가짜 값이 있는지(누출 true/false)를 먼저 찍고, 모두 false일 때만 출력을 봤습니다.
  - 결과는 전부 false였고, 값은 어디에도 찍지 않았습니다.

## 최종 판정: **PASS**
- PLAN 항목은 모두 done이고 `npm.cmd run build`가 성공했습니다.
- 검증표는 **33/33 OK**이고, 지켜야 할 것 위반은 없습니다.
- 실제 newsdata.io 호출은 **7번**입니다: `수집(실제)` 6번 + 크레딧 확인 1번. 다시 돌린 것은 없습니다.
  - 남은 크레딧은 제작 뒤 188 → R1 182 → **181**입니다.
- 단서: 화면 4줄(화면 주소 · 화면 오늘(KST) · 화면 흐름 · 화면 지난 날짜)은 실제 브라우저가 아니라 코드 읽기와 API 재현으로 판단했습니다. `public/index.html`은 ex05와 바이트 단위로 같습니다.

## 1. PLAN 항목별 판정
| PLAN 항목 | 판정 | 근거 |
|---|---|---|
| 범위: 수집 명령 · 수집 규칙 · 새 테이블 2개(0001). API · 계약 · 화면 · seed는 그대로 | done | `openapi.yaml` · `public/index.html` · `server/db/seed.ts` · `routes/` · `app.ts`가 ex05와 같음 |
| 새 패키지 없음 | done | `package.json`은 name · `collect` script만 다름. lock은 name 2줄만 다름. `npm ls --depth=0`이 ex05와 같음(15개) |
| 하지 않음 목록(issue_id · 본문 · timeframe · 결과 API · 섹션 골라 수집 · 재시도 · RLS 정책 등) | done | 넣은 것 없음. `articles`에 `issue_id` · `content` 없음, `pg_policies` 0, 옵션은 `--pages`뿐 |
| 명령 `npm run collect`(= `tsx --env-file-if-exists=.env server/collect.ts`) · `--pages N`(1~3, 기본 3) | done | `package.json` · `collect.ts` 20~27행 |
| 검사 순서: 옵션 → 키 → DB에서 그날 행 읽기, 통과해야 요청 | done | `collect.ts` 24~36행 → `newsdata.ts` 62행 `dayArticles` 뒤에 요청. `수집 전 거절` · `DB 오류` 줄에서 섹션 줄 없음 |
| 섹션 순서 pol→it · 하나씩 · 사이 1초 | done | `SECTIONS` 순서 · `newsdata.ts` 73행(첫 요청 말고 매번 `waitMs`) · `waitMs: 1000`. 실제 실행 6요청에 약 10초 |
| 요청: 주소 · 헤더 `X-ACCESS-KEY` · 쿼리 5개 · category(D12) · `nextPage`→`page` · 없거나 results가 비면 멈춤 | done | `newsdata.ts` 6 · 9~16 · 74~78 · 93~94행, 테스트 ① ③ |
| `articles`: 7칸 + identity PK · `description`만 null · `(date, link)` unique · RLS | done | `schema.ts`, DB `information_schema` · `pg_constraint`(`articles_date_link_unique UNIQUE (date, link)`) · `rowsecurity` true |
| 변환: date = 수집 시작 때 KST 오늘, pubDate를 UTC로, description은 trim · 빈 값 null · 300 코드 포인트, 필수 4칸이 없으면 건너뜀, 다른 칸은 저장 안 함 | done | `newsdata.ts` 44~54 · 61행, 테스트 ② ④. 실제 DB의 description 최대 `char_length`는 300 |
| `collect_runs`: 실행마다 6행 · ok면 message null · failed면 count 0 · 같은 `finished_at` · RLS | done | `schema.ts` · `newsdata.ts` 106~118행. 실제 DB id 25~30 · 31~36 |
| 실패: 네트워크 · HTTP≠200 · status≠success면 남은 페이지 중단 · 받은 페이지 버림 · 0건도 failed · message 형식 · 키 `***` | done | `newsdata.ts` 77~96행, 테스트 ④ ⑥. 오프라인 확인(참고): 2페이지 실패면 1페이지 버림 · 12요청, 200+status error면 `1페이지: HTTP 200 …` |
| 저장: 한 트랜잭션, ok 섹션 그날 행 지움 → 순서대로 넣음(섹션 안 · 사이 링크 중복, failed 섹션에 남은 링크 건너뜀) → runs 6행, failed · 다른 날짜 행 그대로 | done | `newsdata.ts` 102~119행이 규칙을 정함, `store.ts` 77~81행 `db.transaction`. 테스트 ④ ⑤ ⑥, `잘못된 키` 줄 |
| 출력 · 종료 코드(머리줄 · 섹션 줄 · 끝 줄 · 0/1/2 · 오류 한 줄 · 비밀값 `***` · 오류 객체 · 환경 변수 금지) | done | `collect.ts` 9~17 · 39~49행, 실제 출력이 PLAN 형식과 같음. 출력 시점 · `cause`는 3절과 참고 1 · 2 |
| 코드 나눔: `newsdata.ts`(env · DB 안 읽음) / `collect.ts`(try 안 `connectDb()`) / `store.ts` `collectStore`(dayArticles · save) / 테스트는 메모리 구현 | done | `저장소 나눔` 줄 0건, `connectDb()`를 부르는 곳은 index · seed · collect뿐 |
| 마이그레이션: schema → generate → `0001_*.sql`(0000 그대로) → migrate(6543) | done | `0001_ambiguous_landau.sql` · `meta/0001_snapshot.json` · `_journal.json` 1항목 추가, 0000 diff 없음, DB 기록 2행 |
| seed 그대로(articles · collect_runs 안 건드림) | done | `seed.ts` 변경 없음. 심사 중 seed를 5번 돌렸는데, 확인한 때(2 · 3번째 뒤, 5번째 전후) 모두 articles · collect_runs 행 수가 그대로 |
| 새 테스트 ①~⑥ · fixture 5개(research 그대로) · 가짜 fetch(기록 · 섹션별 응답 · wor 500에 테스트 키) · 메모리 저장소 · 대기 0 · 키 `test-key-123` | done | `test/collect.test.ts` 82~215행(⑥은 `it.each` 3가지), fixture diff 없음 |
| 화면 변경 없음 | done | `public/index.html` diff 없음 |
| 구현 순서 1~4 · 마지막 | done | name · scripts · `.env.example` · fixture · 0001 · 4개 파일 있음. 심사 시작 때 DB에 확인 행 없음(articles 60 · collect_runs 6 = 실제 수집분), 서버 · node 프로세스 0개 |

## 2. SPEC 근거(US-01 · AC-01-1 · AC-01-2) 충족
| AC | 판정 | 근거(검증 줄) |
|---|---|---|
| US-01 일일 수집(ex06은 손으로 실행) | 충족 | `npm run collect` 한 번으로 6섹션 60건이 DB에 들어감(`수집(실제)` · `수집 결과(DB)`). 자동 실행은 ex09(참고) |
| AC-01-1 6섹션 최신 기사 수집 · 저장 | 충족(손으로 실행 범위) | 실제 실행: 6섹션 ok · 섹션마다 10행 · 중복 0 · `published_at > finished_at` 0 · 그날 옛 행(`ex06-today`)은 바뀌고 어제 행은 그대로. 테스트 ② ④. "스케줄러 · 매일 지정 시각"은 ex09(참고) |
| AC-01-2 실패 섹션 기록 · 나머지 저장 · 직전 결과 유지 | 충족(저장 단계) | 테스트 ④: wor 실패 → `collect_runs` failed + message, 나머지 저장, wor 그날 옛 행 유지. 테스트 ⑥: 전부 실패 → 행 그대로, 종료 코드 2. 실제 `잘못된 키`: 6행 failed(`HTTP 401`) · 섹션별 10행 그대로. 다른 날짜에서 직전 날짜 결과로 보여 주기(D8 조회)는 ex07(참고) |

- 회귀로 다시 확인한 AC(ex05까지 완료분)도 모두 OK입니다: AC-03-1 · 05-1 · 07-1 · 07-2 · 08-1 · 09-1~09-5 · 10-1~10-4 · D3

## 3. 추가 · 변경 · 출발점 · 기존 화면 동작
- ex05 → ex06 차이(자동 생성 파일 빼고)
  - 바뀐 파일: `.env.example`(+`NEWSDATA_API_KEY=`) · `package.json` · `package-lock.json`(name) · `server/db/schema.ts` · `server/db/store.ts` · `server/db/client.ts` · `drizzle/meta/_journal.json`
  - 새 파일: `server/newsdata.ts` · `server/collect.ts` · `test/collect.test.ts` · fixture 5개 · `0001` SQL · snapshot
  - `.env`는 ex05와 같은 내용입니다(diff -q만 확인, 값은 열지 않음).
- PLAN에 없는데 바뀐 것
  1. `server/db/client.ts` 주석 한 줄: "연결을 만드는 곳"에 `collect.ts`를 더함
     - 동작 영향은 없고, PLAN이 정한 새 연결 위치에 맞춘 것이라 허용합니다.
  2. `newsdata.ts`의 `CATEGORIES`를 export했지만 다른 곳에서 쓰지 않습니다. 사소합니다.
  3. `DB 오류:` 뒤에 Drizzle이 감싼 원래 오류(`cause`)의 문구를 찍음(제작 보고 1절 9-(b) · 10절 1번. 지시문의 "9절 1번"은 이 항목). **허용으로 판단합니다.**
     - 근거 1: 가짜 주소로 같은 경로(`connectDb` → `collectStore.dayArticles`)를 따로 돌려 봤습니다. 127.0.0.1:9 경우 `err.message` 그대로는 `Failed query: select … where "articles"."date" = $1` + 줄바꿈 + `params: 2026-10-07`, 이렇게 2줄입니다. PLAN의 "한 줄"과 어긋납니다. `cause`는 `connect ECONNREFUSED 127.0.0.1:9` 1줄입니다.
     - 근거 2: 저장 중 오류였다면 `err.message`의 params에 넣을 기사 값이 통째로 찍혔을 것입니다. `cause`를 쓰면 이런 일이 없습니다.
     - 근거 3: `hide()`는 `cause` 문구에도 걸립니다. 심사의 `DB 오류` 두 번 모두 누출 false이고 한 줄이었습니다.
     - 남는 위험(참고): `cause` 문구가 여러 줄이거나 빈 문자열인 드라이버 오류라면 그대로 나옵니다. 지금 확인한 경우에는 없었습니다.
- ex05에서 불필요하게 바뀐 것: 없음
- 출발점 폴더: `git status frontend/ ex01/ … ex05/` 변경 없음
  - ex05의 git 제외 파일(`.env` 18:15 · `.next` · `tsconfig.tsbuildinfo` 17:35)도 ex06 작업 전 시각 그대로입니다.
- 화면에 이미 있던 동작(PLAN.md 6절): 깨지지 않음
  - index.html이 ex05와 같고, 아래 API 동작도 확인했습니다.
  - 04-2 새 탭: 카드 링크에 `target="_blank" rel="noopener"`
  - 05-2 모바일: `@media (max-width: 640px)` 그대로
  - 09-2 날짜 표시 · 오늘 버튼: `화면 지난 날짜*`
  - 09-4 미래 날짜 막기: `화면 오늘*`, API 내일 400
  - 10-3 폴더 칩: `화면 흐름*`

## 4. 빌드
- `npm.cmd run build`(= `next build && tsc --noEmit`)가 종료 코드 0으로 끝났습니다.
  - Next.js 16.4.0, 라우트는 `○ /_not-found` · `ƒ /api/[...path]`
- `tsc` 대상에 `server/collect.ts` · `server/newsdata.ts` · `test/collect.test.ts`가 포함된 것을 `--listFilesOnly`로 확인했습니다.

## 5. 검증표
- 두 서버를 띄우고 요청은 node fetch로 `http://localhost:3000`에 보냈습니다.
- SQL은 `ex06/`에서 안전 실행 안에 `postgres(prepare: false)`로 돌렸고, 접속 주소는 출력하지 않았습니다.

| # | 확인 | 결과 | 근거 |
|---|---|---|---|
| 1 | 계약 그대로 | [OK] | `git diff --no-index ex05/openapi.yaml ex06/openapi.yaml` 차이 없음 · Redocly "valid", 오류 0 · 경고 19(참고) |
| 2 | 출발점 · fixture 그대로 | [OK] | 출발점 `git status` 빈 출력 · `research/newsdata` ↔ fixture 차이 없음(5개) |
| 3 | 빌드 | [OK] | 4절 |
| 4 | 테스트 | [OK] | `npm.cmd test`: Test Files 4 passed · Tests 27 passed, 실패 0 |
| 5 | 테스트 범위 | [OK] | ex04 15묶음(ranking 2 · api 13) + ex05 3개(두 자리 번호 · date 생략(D3) · seedRows) + ①~⑥ 모두 있음. api · ranking · seed · setup 파일은 ex05와 바이트 같음 |
| 6 | 서버 · DB 없이 | [OK] | 3000 · 8787 리스너가 없는 상태에서 PowerShell `$env:DATABASE_URL='postgres://u:p@127.0.0.1:9/x'; npm.cmd test` → 27 통과(.env 값 없는 환경). `test/`에서 `\bfetch\(` · `localhost` · `8787` · `NEWSDATA_API_KEY` 0건 |
| 7 | 시계 고정 | [OK] | PowerShell `$env:TZ='America/Los_Angeles'`(node가 이 시간대인 것 확인) → 27 통과. `new Date\(\)` · `Date\.now\(` 0건 |
| 8 | 순서 무관 | [OK] | `npx vitest run --sequence.shuffle` 27 통과 |
| 9 | 테스트가 잡는가 | [OK] | 아래 "9번 상세" |
| 10 | 화면 주소* | [OK] | `GET /` 200 text/html, 본문 = `public/index.html`(49,900자). 화면이 부르는 `/api/rankings` 200 · 섹션 6 × 5. 갱신 줄은 index.html `fmtUpdated`로 계산해 "10.7 오전 6:00 수집 · 이슈 30개" |
| 11 | 화면 오늘(KST)* | [OK] | 아래 "11번 상세" |
| 12 | 화면 흐름* | [OK] | 아래 "12번 상세" |
| 13 | 중계 그대로 | [OK] | `?date=2026-10-06`: 8787 · 3000 모두 200, 본문 같음(7,638자) |
| 14 | Hono 꺼짐 | [OK] | api를 끄면 502 `{"message":"API 서버에 연결할 수 없습니다"}` |
| 15 | 화면 파일 그대로 | [OK] | index.html diff 없음. `\bPOOL\b` 등 6개 · `\bsetHours\b` 0건, `TODAY`는 KST(+9시간) 계산 |
| 16 | 테이블만 | [OK] | 아래 "16번 상세" |
| 17 | 마이그레이션 | [OK] | 다시 실행 성공(이미 있음 NOTICE만). public 5개(모두 RLS true) · `__drizzle_migrations` 2행. 칸 · 타입 · NOT NULL · identity가 PLAN과 같음 |
| 18 | 연결 설정 | [OK] | `prepare:\s*false` 2건 · `\bapikey\b` 0 · `x-access-key` 1(`newsdata.ts`) · `.env.example`은 이름 4개만 · `git check-ignore ex06/.env` → `.gitignore:4:.env` |
| 19 | 저장소 나눔 | [OK] | 4개 패턴 0건. `connectDb()`를 부르는 곳은 `index.ts` · `seed.ts` · `collect.ts`뿐 |
| 20 | seed 두 번 | [OK] | 두 번 다 `issues 1350 · folders 3 · bookmarks 10`. SQL 1350 · 3 · 10(id 중복 0)으로 같음, 10-07 섹션 6 × 5. articles 60 · collect_runs 6 그대로 |
| 21 | 오늘 랭킹(DB) | [OK] | 200 · date 10-07 · updatedAt `2026-10-07T06:00:00+09:00` · 6 × 5 · 내림차순 · rank 1~5 · 8칸 · soc에 null 1 |
| 22 | 최근 수집일(D3) | [OK] | 오늘 북마크 0행 · 오늘 issues 30행 지움 → 200 date 10-06 · `?date=10-07` 404 문구 → seed → 200 date 10-07(api 재시작 없음) |
| 23 | 지난 날짜(DB) | [OK] | 10-06 200(id 모두 `2026-10-06-`) · 08-24 200 · 08-23 404 · 2000-01-01 404 문구. 참고: 내일 10-08은 400 "오늘 이후 날짜는 조회할 수 없습니다" |
| 24 | 목록(DB) | [OK] | 북마크 10개 · savedAt ↓ · 8칸 + 2. 맨 앞 `2026-10-06T12:10:00.000Z`(= 21:10 KST)이고, `2026-10-06-it-4` rank 1 = 어제 it 1위. 폴더 f1 4 · f2 3 · f3 3 |
| 25 | 다시 켜도 유지 | [OK] | 201 `{f4, 유지확인, 0}` → `2026-10-06-pol-4` f4 201 → api 재시작 → 북마크 11개 · 맨 앞 그 이슈(f4) · 폴더 4개(f4 count 1) |
| 26 | 폴더 하나 · 해제(DB) | [OK] | 409 문구 · f1 4 그대로 → 404 이슈 · 404 폴더 문구 → 204 · 404 문구 → f4 count 0 |
| 27 | 화면 지난 날짜* | [OK] | 아래 "27번 상세" |
| 28 | 수집 전 거절 | [OK] | 키 없는 PowerShell에서 `--pages 0` · `4` · `1` → 종료 코드 2 · 2 · 2. 출력은 한 줄씩 `--pages는 1~3입니다` · 같음 · `NEWSDATA_API_KEY가 없습니다` |
| 29 | DB 오류 | [OK] | 아래 "29번 상세" |
| 30 | 수집(실제) | [OK] | 아래 "30번 상세" |
| 31 | 수집 결과(DB) | [OK] | collect_runs id 25~30: `finished_at` 같음(10:39:31.527Z) · message null · article_count 10 = 섹션 행 수(6섹션 모두). `(date, link)` 중복 0 · `published_at > finished_at` 0행 · `ex06-today` 없음 · `ex06-yesterday` 그대로 |
| 32 | 잘못된 키 | [OK] | 아래 "32번 상세" |
| 33 | 원상복구(마지막) | [OK] | 아래 "33번 상세" |

**합계 33/33 OK** (`*` 4줄은 브라우저 대신 코드 읽기 + API 재현)

9번 상세(테스트가 잡는가)
- 실험 전에 원본 39개 파일의 해시를 기록하고 바꿀 파일을 백업했습니다.
- `ranking.ts`의 발행 시각 비교 방향을 뒤집음 → 동점 테스트 1개만 실패 → 되돌림(해시 일치)
- `newsdata.ts`의 `store.save`에 failed 섹션도 넘기게 바꿈 → ④ · ⑤ · ⑥×3 실패 → 되돌림(해시 일치)
- 다시 돌리니 27개 모두 통과했고, 39개 파일 해시도 실험 전과 같았습니다.
- ⑤까지 실패하는 것은 ⑤가 ④와 같은 옛 행으로 시작하기 때문입니다. PLAN 기대(④ ⑥ 실패)와 어긋나지 않습니다.

11번 상세(화면 오늘(KST)*)
- `TZ=America/Los_Angeles`에서 index.html의 날짜 함수(`TODAY`~`fmtUpdated`)를 그대로 실행했습니다.
- `TODAY` 2026-10-07이 API의 date와 같았습니다.
- dateText는 "10월 7일 (수) · 오늘", `nextDay.disabled`는 true, `dateInput.max`는 10-07이었습니다(KST 내일은 못 고름).
- 지역 날짜가 다른 시각에도 `TODAY`는 KST였습니다: KST 10-08 01:00(LA로는 10-07)이면 `TODAY`가 10-08입니다.

12번 상세(화면 흐름*)
- api를 재시작한 뒤 화면 코드 순서대로 API를 불렀습니다.
- `2026-10-07-pol-6`을 f2에 저장 201 → 목록에 있음(활성) → 다시 받아도 있음(새로고침)
- DELETE 204 → 목록에서 빠짐 → "되돌리기"(`hit.folderId` f2로 POST) 201 → 맨 앞에 다시 보임
- 칩은 전체 11 · 반도체·AI 4 · 부동산·금리 4 · 나중에 읽기 3이었고, 폴더별로 거른 수와 같았습니다.

16번 상세(테이블만)
- 0000 SQL은 diff가 없습니다.
- 0001: `CREATE TABLE` 2개(articles · collect_runs) · `ENABLE ROW LEVEL SECURITY` 2개 · `UNIQUE` 1개(`articles_date_link_unique ("date","link")`) · `issue_id` · `user_id` · `content` 0건
- `git status`에 `??`로 보이고 check-ignore 결과도 1이라, git이 무시하지 않습니다(커밋 대상).

27번 상세(화면 지난 날짜*)
- 이전 날 버튼: index.html `addDays(TODAY,-1)` = 10-06 → 200, 카드 30개
  - dateText "10월 6일 (화)", "오늘" 버튼 보임, 제목 "10월 6일 (화)의 주요 이슈"
- "오늘" 버튼: `setDate(TODAY)` → dateText "10월 7일 (수) · 오늘", 버튼 숨김

29번 상세(DB 오류)
- 두 번 모두 누출 false였습니다(실제 키 · URL · 비밀번호 · `SECRETPW` · `wrong-key-0000`).
- 종료 코드는 2이고, 섹션 줄 없이 한 줄씩 나왔습니다: `DB 오류: Invalid URL` / `DB 오류: connect ECONNREFUSED 127.0.0.1:9`
- 첫 번째 오류 객체(TypeError)를 따로 열어 보니 주소가 통째로 들어 있었습니다(true).

30번 상세(수집(실제))
- 확인 행 2개(id 75 · 76)를 넣고 한 번만 실행했습니다.
- 누출 false · 종료 코드 0
- 출력은 `수집 2026-10-07 · 섹션당 최대 1페이지` → pol→eco→soc→cul→wor→it 6줄 `ok 10건` → `ok 6 · failed 0 · 기사 60건 · 요청 6번 · 남은 크레딧 182`
- **R1 = 182** (= 188 − 6)

32번 상세(잘못된 키)
- M = 30
- 실행 결과: 누출 false · 종료 코드 2
  - 6줄 모두 `failed 1페이지: HTTP 401 The provided API key is not valid.`
  - 끝 줄 `ok 0 · failed 6 · 기사 0건 · 요청 6번 · 남은 크레딧 ?`
- SQL
  - id 31~36 6행 모두 failed · article_count 0
  - 섹션별 행 수는 모두 10 그대로(AC-01-2)
  - 키가 든 message 0행
- 크레딧 확인: 상태 200 · `x-api-limit-remaining` **181 = R1 − 1**

33번 상세(원상복구(마지막))
- collect_runs `id > 30` 6행과 `ex06-yesterday` 1행을 지움 → articles 60 · collect_runs 12
- seed `issues 1350 · folders 3 · bookmarks 10` → 북마크 10개 · 폴더 f1~f3("유지확인" 없음)
- 다섯 테이블: 1350 · 3 · 10 · 60 · 12(seed 전후 같음)

## 6. 지켜야 할 것 점검
| 항목 | 결과 |
|---|---|
| 기사 본문 저장 · 표시 | 위반 없음. `articles`에 `content` 칸이 없고 description은 300 코드 포인트까지입니다(DB 최대 300). 화면은 바뀌지 않았습니다 |
| 코드에 들어간 키 · 접속 정보 | 위반 없음. ex06 파일 42개(`.env` · `node_modules` · `.next` 제외), 문서 5개, `.next`의 5MB 미만 파일 201개, 서버 로그 10개에서 비밀값(키 · URL · 비밀번호 · 사용자 · 호스트) 0건 |
| `.env` git 제외 | 됨(`.gitignore:4:.env`). `git status`에도 안 보임 |
| PLAN에 없는 패키지 | 없음 |
| D0 밖의 출처 수집 | 없음. 수집 주소는 `https://newsdata.io/api/1/latest` 하나이고, 키는 헤더로만 보냄(URL에 없음, 테스트 ①) |
| CLAUDE.md 규칙 | 위반 없음 |

CLAUDE.md 규칙 세부
- 요청 사이 1초
- 실제 호출 횟수: 제작 7번(크레딧 흐름 195 → 188이 맞음) · 심사 7번
- 확인 행: 제작 쪽 확인 행은 심사 시작 때 남아 있지 않았습니다.
- 출발점 폴더는 그대로이고, 커밋은 없습니다(HEAD `e1843fb` 그대로).
- PLAN 밖 기능은 없고 주석 1줄만 바뀌었습니다(3절).

## 참고 (PLAN에 없는 경계 입력 · 추가로 보인 점, 판정에는 넣지 않음)
1. **출력 시점**: 머리줄 · 섹션 줄 · 끝 줄을 저장이 끝난 뒤 한꺼번에 찍습니다.
   - 그래서 저장 오류 때는 머리줄 없이 `DB 오류:` 한 줄만 나오고, 기본 3페이지 실행은 약 20초 동안 아무것도 안 보입니다.
   - PLAN의 "검사를 통과하면 머리줄"과 시점이 다르지만, 검증 줄의 출력은 모두 PLAN 형식과 같습니다. 제작 보고 10절 2번에 적혀 있습니다.
2. **`cause` 해석의 남는 위험**: 여러 줄이거나 빈 문구인 드라이버 오류(예: 주소 여러 개 접속 실패의 AggregateError)는 그대로 찍힙니다.
3. **pubDate 형식 이상**: 실행 전체가 `DB 오류: Invalid time value`(종료 코드 2, 저장 0번)로 끝납니다.
   - 오프라인 확인 결과입니다. DB 오류가 아닌데 그 문구로 나옵니다.
   - PLAN은 "없으면 건너뜀"만 정했습니다. 제작 보고 10절 3번에 적혀 있습니다.
4. **`--pages` 옵션 형식**: `--pages=2`(등호 형식)는 옵션으로 읽지 않고 기본 3을 씁니다(최대 18요청). 크레딧에 주의해야 합니다. `--pages 1.0`은 1로 받습니다.
5. **테스트에 없는 PLAN 규칙**: 가짜 fetch · 메모리 저장소로 오프라인 확인했고 모두 PLAN대로였습니다.
   - 2페이지 실패면 1페이지도 버림
   - HTTP 200 + status error
   - 던진 문구에 키가 섞이면 `***`
   - description이 공백뿐이거나 빈 값이면 null, 앞뒤 공백은 지움
6. **실제 표본**
   - description이 있는 기사: pol 8 · eco 1 · soc 6 · cul 10 · wor 6 · it 4
   - 출처: chosun 28 · biz_chosun 11 · investing_kr 10 · sports_chosun 6 · it_chosun 5(R3)
   - 발행 시각: 10-06 20:51 ~ 10-07 07:35 KST로, 수집 시각보다 약 12시간 늦습니다(R2).
   - 같은 날 다시 수집해서 제작 때의 60행은 심사 수집 60행으로 바뀌었습니다. 설계대로입니다.
7. **identity 번호**: collect_runs 19~24(제작의 잘못된 키 기록)와 31~36(심사)은 지워져 비어 있습니다. articles도 매 수집마다 id가 바뀝니다. ex07에서 기사를 이을 때는 `link`를 기준으로 삼는 것이 안전합니다(제작 보고 10절 9번과 같음).

## 정리 상태
- 서버: 3000 · 8787을 모두 껐습니다. 리스너가 없고 node.exe도 0개입니다.
- DB: 심사가 넣은 행은 모두 정리했습니다.
  - PLAN 원상복구 줄 · seed로 정리한 것: example.com 확인 행, 잘못된 키 기록 6행, 유지확인 폴더 · 그 북마크, 화면 흐름 북마크, D3에서 지운 오늘 이슈
  - 남긴 것: 실제 수집 기사 60행, collect_runs 12행(제작 실제 수집 6 + 심사 실제 수집 6)
  - **다섯 테이블 행 수: issues 1350 · folders 3 · bookmarks 10 · articles 60 · collect_runs 12**
- newsdata.io: 심사의 실제 호출은 7번(수집 6 + 크레딧 확인 1)입니다. 잘못된 키 6요청은 401이라 크레딧이 들지 않았습니다. **남은 크레딧 181**
- 파일
  - ex06 원본 39개 파일 해시는 심사 전과 같습니다. `.env`는 손대지 않았습니다(수정 시각 그대로).
  - dev/build가 다시 만든 `next-env.d.ts` · `tsconfig.tsbuildinfo`는 git 제외 대상이라 그대로 두었습니다.
  - scratchpad의 심사 임시 파일(`j06_*`)은 비밀값 검사(0건) 뒤 지웠습니다.
