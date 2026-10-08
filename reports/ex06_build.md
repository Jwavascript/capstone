# ex06 제작 보고: newsdata.io 수집

- 지시: "plan/PLAN_backend_ex06.md대로 ex06 만들기" (자동 실습이라 확인 지점은 "예"로 보고 진행)
- 결과: `ex06/`(ex05 복사)에 수집 명령 · 수집 규칙 · 테이블 2개(마이그레이션 0001)를 넣었습니다.
  - `npm run build` 성공 · `npm test` 4파일 27개 통과
  - 실제 수집 결과: 6섹션 모두 ok, 기사 60건
  - 실제 newsdata.io 호출 7번, 남은 크레딧 188
- `ex05/` 등 출발점 폴더는 그대로입니다. `web/` · `plan/PLAN_web.md`는 열지 않았고, git 커밋도 하지 않았습니다.
- 비밀값(`NEWSDATA_API_KEY` · `DATABASE_URL`)은 출력 · 보고 · 코드 · 커밋 대상 파일 어디에도 없습니다.
  - `.env`를 읽는 명령은 모두 "안전 실행"(누출 true/false부터 확인)으로 돌렸고, 결과는 전부 false였습니다.
  - 커밋 대상 파일 49개를 검사해 비밀값이 든 파일은 0개였습니다.

## 1. 확인받았을 목록 (모두 "예"로 진행)
1. 복사: `ex06/`가 없으니 `ex05/`를 복사함
   - 제외: `node_modules` · `.next` · `AGENTS.md` · `next-env.d.ts` · `tsconfig.tsbuildinfo`
   - `ex06/.env`가 없어서 `ex05/.env`를 그대로 복사함(값은 열지 않음)
2. 고칠 파일
   - `package.json`: name을 `issuerank-ex06`로, scripts에 `collect` 추가
   - `.env.example`: `NEWSDATA_API_KEY=` 추가
   - `server/db/schema.ts`: 테이블 2개 추가
   - `server/db/store.ts`: `collectStore` 추가
   - `server/db/client.ts`: 연결 위치를 적은 주석 한 줄만 바꿈
3. 새 파일
   - `server/newsdata.ts` · `server/collect.ts` · `test/collect.test.ts`
   - `test/fixtures/newsdata/*.json` 5개
   - `drizzle/0001_*.sql` · `meta/0001_snapshot.json` (생성)
4. 지울 항목: 없음. 코드에 있는데 이번 PLAN에 없는 것은 찾지 못했습니다. API · 계약 · 화면 · seed는 PLAN이 "그대로"라 유지했습니다.
5. 설치 패키지: 없음(`npm.cmd install`만)
6. 필요한 키: `NEWSDATA_API_KEY` · `DATABASE_URL` (확인 결과 둘 다 true)
7. 실제 Supabase DB에 마이그레이션 0001과 seed를 실행함
8. 실제 newsdata.io 호출 7번: 수집 6번 + 크레딧 확인 1번
9. PLAN 밖이라 물었을 두 가지
   - (a) 실제 수집 전에 크레딧 없이 DB 저장 경로를 확인하는 dry run
     - 가짜 요청 함수로 example.com 행을 실제 DB에 넣었다가 바로 지움
   - (b) `DB 오류:` 뒤에 Drizzle이 감싼 원래 오류(`cause`)의 문구를 찍음
     - 10절 1번 참고

## 2. PLAN 항목별 반영 위치 (모두 `ex06/` 기준)

| PLAN 항목 | 반영 위치 |
|---|---|
| 명령 `npm run collect` | `package.json` scripts.collect = `tsx --env-file-if-exists=.env server/collect.ts` |
| `--pages N`(1~3, 기본 3) · 옵션 → 키 검사 | `server/collect.ts` 20~32행 |
| DB에서 그날 행 읽기(요청 전 검사) | `server/newsdata.ts` 59~60행 `store.dayArticles(date)`. 실패하면 `collect.ts`가 `DB 오류:`를 찍고 종료 코드 2 |
| 섹션 순서 pol→it · 하나씩 · 사이 1초 | `newsdata.ts` 100행(`SECTIONS` 순서) · 73행(대기). `collect.ts`가 `waitMs: 1000`을 줌 |
| 요청 주소 · 쿼리 5개 · category(D12) · 헤더 키(URL에 키 없음) | `newsdata.ts` 6행 `LATEST` · 9~16행 `CATEGORIES` · 74~78행 |
| 페이지(`nextPage` → `page`, 없거나 results가 비면 멈춤) | `newsdata.ts` 93~94행 |
| `articles` 테이블(7칸 + id, `(date, link)` unique, RLS) | `server/db/schema.ts` 34~44행 → `drizzle/0001_ambiguous_landau.sql` |
| 변환 규칙 | `newsdata.ts` 44~54행 `toRow`: 필수 칸이 없으면 건너뜀, description은 trim · 빈 값 null · 300 코드 포인트까지, pubDate는 UTC로 읽음 |
| `collect_runs` 테이블 | `schema.ts` 46~54행 → 0001 SQL |
| 실패 규칙 · message 형식 · 키 `***` | `newsdata.ts` 79~89행 · 96행(`기사 0건`) · 65행(`hide`) |
| 저장 규칙(한 트랜잭션) | `newsdata.ts` 102~119행이 무엇을 지우고 넣을지 정함: ok 섹션만 지움, 링크 중복 · failed 섹션에 남은 링크는 건너뜀, runs 6행. 실제 실행은 `server/db/store.ts` 69~84행 `collectStore(db).save` |
| 출력 · 종료 코드 · 비밀값 `***` | `collect.ts` 39~49행(출력) · 9~17행(`hide`) · 55행. 종료 코드 계산은 `newsdata.ts` 122행 |
| 코드 나눔 | `newsdata.ts`는 환경 변수 · DB를 읽지 않고 fetch · 저장소 · 키 · 페이지 · 대기 ms를 받음 / `collect.ts`는 `connectDb()`를 try 안에서 / `store.ts`는 `collectStore`(dayArticles · save) |
| 마이그레이션 | `npm.cmd run db:generate` → `drizzle/0001_ambiguous_landau.sql` · `meta/0001_snapshot.json` · `_journal.json`(0000은 그대로) → `npm.cmd run db:migrate`가 6543에서 성공(5432로 바꿀 필요 없었음) |
| seed 그대로 | `server/db/seed.ts` 변경 없음(articles · collect_runs를 건드리지 않음, 검증으로 확인) |
| 새 테스트 ①~⑥ | `test/collect.test.ts` 82 · 97 · 124 · 146 · 189 · 205행(⑥은 `it.each` 3가지). fixture는 `test/fixtures/newsdata/` 5개(research 그대로, diff 없음) |
| `.env.example` | `NEWSDATA_API_KEY=` 추가(이름만) |

## 3. 지운 것
- 코드에서 지운 것: 없음
- 복사 때 뺀 것(PLAN 1번 그대로): `node_modules` · `.next` · `AGENTS.md` · `next-env.d.ts` · `tsconfig.tsbuildinfo`. 모두 자동 생성 파일이고 루트 `.gitignore` 대상입니다.
- DB 확인 행(원상복구 줄대로 정리)
  - 지움: `collect_runs` id > 18(잘못된 키 실패 기록 6행), 링크가 `https://example.com/ex06-`로 시작하는 `articles`(`ex06-yesterday` 1행. `ex06-today`는 pol ok 수집 때 이미 지워짐)
  - seed로 되돌림: 유지확인 폴더(f4) · 그 북마크, D3 확인 때 지운 오늘 이슈
  - dry run 행(example.com/ex06-dry-* 6행 × 2번, collect_runs 12행)은 넣은 직후 지움
- 남긴 것(다음 단계용): 실제 수집 기사 60행, 실제 수집의 collect_runs 6행

## 4. 필요했지만 없던 키 · 계정
- 없음. `ex06/.env`의 `NEWSDATA_API_KEY` · `DATABASE_URL`이 모두 있었고(true), 멈춘 부분은 없습니다.

## 5. `npm run build` 결과
- 성공(종료 코드 0). `next build` 후 `tsc --noEmit` 통과
- 마지막 코드 수정 뒤 다시 돌려도 성공했습니다.
- Next.js 16.4.0 라우트: `○ /_not-found` · `ƒ /api/[...path]`

## 6. `npm test` 결과
- `Test Files 4 passed (4)` · `Tests 27 passed (27)`, 실패 0. 새 수집 테스트 8개(①~⑤ + ⑥×3)가 늘었습니다.
- 변형 실행도 모두 통과했습니다.
  - `$env:DATABASE_URL='postgres://u:p@127.0.0.1:9/x'`
  - `$env:TZ='America/Los_Angeles'`
  - `npx vitest run --sequence.shuffle`

## 7. 검증표 실행 결과
DB 줄은 실제 Supabase에서, 서버 줄은 3000 · 8787을 띄워 node fetch로 확인했습니다. 날짜는 KST 기준(오늘 2026-10-07, 어제 2026-10-06)입니다.

| 확인 | 결과 |
|---|---|
| 계약 그대로 | `git diff --no-index ex05/openapi.yaml ex06/openapi.yaml` 차이 없음 · Redocly 오류 0(경고 19, 알려진 `Section` oneOf) |
| 출발점 · fixture 그대로 | `git status frontend/ ex01/ … ex05/` 변경 없음 · `research/newsdata` ↔ fixture 5개 차이 없음 |
| 빌드 · 테스트 | 위 5 · 6절 |
| 테스트 범위 | ①~⑥이 각각 테스트로 있음. ex04 · ex05 테스트 파일(api · ranking · seed · setup)은 ex05와 같음(차이 없음) |
| 서버 · DB 없이 | 통과. `test/`에서 `\bfetch\(` · `localhost` · `8787` · `NEWSDATA_API_KEY` 검색 0건 |
| 시계 고정 | 통과. `new Date\(\)` · `Date\.now\(` 검색 0건 |
| 순서 무관 | 통과 |
| 테스트가 잡는가 | 발행 시각 방향을 뒤집으면 동점 테스트만 실패. failed 섹션도 지우게 바꾸면 ④ · ⑤ · ⑥(3개) 실패. 둘 다 되돌린 뒤(백업과 바이트 비교 일치) 27개 통과 |
| 중계 그대로 | `?date=2026-10-06`에서 8787과 3000의 상태 200 · 본문이 같음 |
| Hono 꺼짐 | 502 `{"message":"API 서버에 연결할 수 없습니다"}` |
| 화면 파일 그대로 | `public/index.html` 차이 없음 |
| 테이블만 | 0000 SQL 차이 없음. 0001: `CREATE TABLE` 2 · `ENABLE ROW LEVEL SECURITY` 2 · `UNIQUE` 1(`articles_date_link_unique (date, link)`) · `issue_id` · `user_id` · `content` 0. `git status`에서 `??`(커밋 대상, 무시 안 됨) |
| 마이그레이션 | 다시 실행해도 성공. public 테이블 5개, `drizzle.__drizzle_migrations` 2행, 두 새 테이블 RLS true |
| 연결 설정 | `prepare: false` 있음(`client.ts`) · `\bapikey\b` 0건 · `x-access-key` 1건(`newsdata.ts`) · `.env.example`은 이름만 · `git check-ignore ex06/.env` 무시됨 |
| 저장소 나눔 | 0건. `connectDb()` 호출은 `index.ts` · `seed.ts` · `collect.ts`뿐 |
| seed 두 번 | 두 번 다 `issues 1350 · folders 3 · bookmarks 10`, SQL 행 수도 같음. 오늘 6섹션 × 5. articles 61 · collect_runs 12는 그대로 |
| 오늘 랭킹(DB) | 200, date 2026-10-07, updatedAt `2026-10-07T06:00:00+09:00`, 6 × 5, articleCount 내림차순, rank 1~5, soc summary null 1 |
| 최근 수집일(D3) | 오늘 행을 지우면 200 date 2026-10-06 · `?date=2026-10-07` 404 문구 그대로. seed 뒤 200 date 2026-10-07(api 재시작 없음) |
| 지난 날짜(DB) | 어제 200(id 30개 모두 `2026-10-06-`) · 2026-08-24 200 · 2026-08-23 404 · 2000-01-01 404 |
| 목록(DB) | 북마크 10개 · savedAt 내림차순 · 칸 맞음. 맨 앞 `2026-10-06-it-4` rank 1 = 어제 it 1위, savedAt = 어제 21:10 KST. 폴더 f1 4 · f2 3 · f3 3 |
| 다시 켜도 유지 | f4 "유지확인" 201 → `2026-10-06-pol-4` 저장 201 → api 재시작 뒤 북마크 11개(맨 앞 그 이슈 · f4), 폴더 4개(f4 count 1) |
| 폴더 하나 · 해제(DB) | 409 · 404 · 404 · 204 → 404, 문구 모두 그대로. f1 4 유지, f4 count 0 |
| 수집 전 거절 | `--pages 0` · `4` · `1`(키 없음): 종료 코드 2 · 2 · 2. 출력은 `--pages는 1~3입니다` · 같음 · `NEWSDATA_API_KEY가 없습니다` 한 줄씩 |
| DB 오류 | 두 번 다 누출 false · 종료 코드 2 · 섹션 줄 없음. 출력은 `DB 오류: Invalid URL` / `DB 오류: connect ECONNREFUSED 127.0.0.1:9`. 첫 번째 오류 객체의 `input` 칸에는 주소가 통째로 있음(가짜 비밀번호 포함 true) |
| 수집(실제) | 확인 행 2개를 넣은 뒤 실행. 누출 false · 종료 코드 0. 출력은 아래 표 |
| 수집 결과(DB) | collect_runs 6행(id 13~18) `finished_at` 같음 · message null · article_count 10 = 섹션 행 수. `(date, link)` 중복 0 · `published_at > finished_at` 0행. `ex06-today` 없음 · `ex06-yesterday` 그대로 |
| 잘못된 키 | M = 18. 누출 false · 종료 코드 2 · 6줄 모두 `failed 1페이지: HTTP 401 The provided API key is not valid.` · 끝 줄 `요청 6번 · 남은 크레딧 ?`. id > 18은 6행 모두 failed · article_count 0. 섹션별 행 수는 그대로(각 10, AC-01-2). 키가 든 message 0행. 크레딧 확인은 상태 200 · `x-api-limit-remaining` 188 = R1(189) − 1 |
| 원상복구(마지막) | 지운 뒤 articles 60 · collect_runs 6 → seed `issues 1350 · folders 3 · bookmarks 10` → 북마크 10개 · 폴더 f1~f3("유지확인" 없음) → 다섯 테이블 1350 · 3 · 10 · 60 · 6(seed 전후 같음) |
| 화면 4줄(주소 · 오늘(KST) · 흐름 · 지난 날짜) | 브라우저가 필요해 하지 못함 → 9절 |

수집(실제) 출력:

```
수집 2026-10-07 · 섹션당 최대 1페이지
pol ok 10건
eco ok 10건
soc ok 10건
cul ok 10건
wor ok 10건
it ok 10건
ok 6 · failed 0 · 기사 60건 · 요청 6번 · 남은 크레딧 189
```

- 서버: 3000 · 8787은 확인 뒤 모두 껐습니다. 리스너가 없고 ex06 node/cmd 프로세스도 남지 않은 것을 확인했습니다. 서버 로그에도 비밀값 · 오류가 없었습니다.

## 8. 실제 newsdata.io 호출 · 남은 크레딧
- 크레딧을 쓴 호출은 7번입니다: 수집(실제) 6번 + 크레딧 확인 1번. 다시 돌린 것은 없습니다.
- 잘못된 키로 보낸 6요청(401)은 크레딧이 들지 않았습니다(189 → 188은 크레딧 확인 1번 몫).
- 남은 크레딧: **188** (2026-10-07 19:13 KST 기준). 오늘 사용 12 = 0단계 5 + 이번 7
- 테스트 · dry run · DB 오류 · 수집 전 거절은 실제 호출 없이 했습니다.

## 9. 브라우저로 확인할 항목 (사람)
`ex06/`에서 두 터미널로 `npm.cmd run api` · `npm.cmd run dev`를 띄우고 `http://localhost:3000/`을 엽니다.
1. 화면 주소: 이슈맵, 6개 섹션, 갱신 시각 줄이 보이는지 (AC-05-1)
2. 화면 오늘(KST): DevTools › Sensors › Location을 San Francisco로 두고 새로고침
   - 날짜 표시가 `/api/rankings`의 date와 같고 "· 오늘"이 붙는지
   - 다음 날 버튼이 비활성인지, KST 오늘 다음 날을 고를 수 없는지 (AC-09-4)
3. 화면 흐름: 카드 북마크 → 폴더 고르기 → 새로고침 → 해제 → "되돌리기" → 북마크 화면 폴더 칩 (AC-07-1 · AC-10-3)
4. 화면 지난 날짜: 이전 날 버튼 → "오늘" 버튼 (AC-09-2)

확인 뒤 `npm.cmd run seed`로 되돌리면 됩니다. seed는 articles · collect_runs를 건드리지 않습니다.

## 10. 추가로 보인 점
1. **DB 오류 문구**
   - Drizzle 0.45는 드라이버 오류를 감싸 `err.message`를 `Failed query: <SQL>` + 줄바꿈 + `params: <값>`으로 바꿉니다. 그래서 처음 구현(`err.message` 그대로)에서는 127.0.0.1:9 줄이 2줄로 나왔습니다. 저장 실패라면 기사 값이 전부 찍혔을 것입니다.
   - 그래서 `collect.ts`는 감싼 원래 오류(`cause`)가 있으면 그 문구를 찍습니다. PLAN의 `DB 오류: {err.message}` 한 줄을 이렇게 해석했습니다. 계속 쓸지 확인 바랍니다.
2. **출력 시점**
   - 섹션 줄의 건수는 저장 규칙(섹션 사이 링크 중복 · failed 섹션에 남은 링크는 건너뜀)을 거친 `article_count`입니다. 그래서 머리줄 · 섹션 줄 · 끝 줄을 저장이 끝난 뒤 한꺼번에 찍습니다.
   - 기본 3페이지면 약 20초 동안 아무것도 안 보입니다.
   - 저장 오류 때는 `DB 오류:` 한 줄만 나옵니다(머리줄 없음).
3. **pubDate 형식**
   - pubDate가 `YYYY-MM-DD HH:mm:ss` 형식이 아니면 `toISOString`이 던져 실행 전체가 `DB 오류: Invalid time value`(종료 코드 2)로 끝납니다.
   - PLAN은 "없으면 건너뜀"만 정해서 형식 검사는 넣지 않았습니다. 지금 응답은 모두 정상 형식입니다.
4. **설명문 null**
   - 실제 수집에서 eco(business)의 description이 10건 모두 null이었습니다.
   - 전체로는 60건 중 null 25건, 300자로 잘린 것 4건(pol 1 · it 3)입니다.
   - ex08 요약 입력(제목 · 설명문)에서 eco는 제목만 남을 수 있습니다.
5. **표본 출처 · 시각**
   - 출처: chosun 27 · investing_kr 12 · biz_chosun 9 · sports_chosun 8 · it_chosun 4 (R3: 조선일보 계열 위주)
   - 발행 시각: 2026-10-06 20:51 ~ 10-07 07:11 KST. 수집은 19:12 KST라 가장 최근 기사도 약 12시간 전입니다(R2).
6. **잘못된 키 응답**: HTTP 401 "The provided API key is not valid."이고 `x-api-limit-remaining` 헤더가 없습니다. 그래서 끝 줄이 `남은 크레딧 ?`로 나옵니다.
7. **"테스트가 잡는가" 2번째 변경**: ④ · ⑥뿐 아니라 ⑤도 실패합니다. ⑤가 ④와 같은 옛 행으로 시작하기 때문이고, PLAN 기대와 어긋나지는 않습니다.
8. **id 번호가 비어 있음**: dry run · 확인 행 때문에 identity 번호가 비어 있습니다. 지금 articles는 15~74, collect_runs는 13~18입니다. 동작에는 영향이 없습니다.
9. **articles id는 매번 바뀜**: 같은 날 다시 수집하면 ok 섹션 행을 지우고 다시 넣습니다. ex07에서 기사와 이슈를 이을 때 articles.id를 기준으로 삼으면 안 되고, link 기준이 안전합니다.
10. **⑥ `results: []` 경우**: 응답의 `nextPage`를 `"NEXT_PAGE_TOKEN"`으로 두어 "results가 비면 멈춤"까지 확인합니다(요청 6번).
11. **그대로 남은 경고**
    - `npm.cmd install` 때 esbuild install script가 allowScripts 미승인으로 돌지 않았다는 경고가 나왔지만 tsx · vitest · build는 정상입니다.
    - vitest의 `"type": "module"` 경고와 Redocly 경고 19개는 이전 단계 메모와 같습니다.
12. **PowerShell 출력**: 모든 출력(오류 문구 포함)을 stdout으로 찍습니다. PowerShell 5.1에서 stderr가 NativeCommandError로 감싸지는 일 없이 "한 줄"로 보입니다.
