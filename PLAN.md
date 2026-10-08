# PLAN — 이슈랭크 전체 청사진

> `SPEC.md` = 무엇을 · 왜 / `PLAN.md` = 전체 그림 · 결정 · 진행 상태 / `plan/PLAN_backend_exXX.md` = 단계별 어떻게
> 만드는 범위는 단계 PLAN만큼. 이 파일은 단계끼리 방향 · 이름 · 결정을 맞추는 용도
> 진행 상태(2절) · 결정(5절) · 단계 메모(10절)는 이 파일에만 적고, 단계가 끝날 때마다 고침

## 1. 최종 모습 (ex11 끝)

```
[GitHub Actions · 매일 06:00 KST]
  └ npm run daily
      1) 수집: newsdata.io → 섹션 6개의 최신 기사 표본 저장
      2) 묶기: 같은 사건 기사 → 이슈, 대표 키워드로 newsdata.io를 검색해 연관기사 수
      3) 요약: 요약 없는 Top 5만 → Claude API → 3줄 저장
              │
              ▼
      [Supabase Postgres] ← Drizzle
              ▲
              │
[Hono API 서버 :8787] /api/rankings · /api/bookmarks · /api/folders · /api/auth/*(Better Auth)
              ▲ 그대로 중계(메서드 · 본문 · 상태 코드 · 쿠키)
[Next.js :3000] BFF: /api/* → Hono · 화면(public/index.html)도 줌
              ▲
[브라우저 index.html] fetch로 같은 주소의 /api 호출
```

| 영역 | 선택 | 들어오는 단계 |
|---|---|---|
| 화면 | `frontend/index.html`을 끝까지 씀. 번들러 없음 | ex02 |
| API 계약 | OpenAPI(`openapi.yaml`) | ex01 |
| API 서버 | Hono + Node, TypeScript | ex02 |
| BFF | Next.js(App Router) 라우트 핸들러가 `/api/*`를 Hono로 중계 | ex02 |
| 입력 검사 | Zod | ex03 |
| 테스트 | Vitest | ex04 |
| DB | Supabase Postgres + Drizzle | ex05 |
| 수집 | newsdata.io 뉴스 API(무료 플랜, D0 · D12) | ex06 |
| 이슈 묶기 · 연관기사 수 | 제목 유사도 규칙(D11) · 키워드 검색 `totalResults`(D13) | ex07 |
| AI 요약 | Claude API(`@anthropic-ai/sdk`) | ex08 |
| 자동 실행 | GitHub Actions 예약 실행 | ex09 |
| 로그인 | Better Auth(이메일 + 비밀번호) | ex10 |

모든 단계 공통 원칙
- 날짜는 한국 시간(KST) `YYYY-MM-DD`
- 섹션 키 `pol · eco · soc · cul · wor · it`, 화면 문구, 카드 칸, 폴더 동작은 지금 화면 그대로
- 수집 · 묶기 · 요약은 따로 돎. 요약은 "요약이 없는 Top 5"만 채움 → 다시 돌려도 안전하고, 실패분은 다음 실행에서 재시도
- 같은 날 다시 돌리면 덮어씀(중복 없음). 이슈 id는 유지(북마크가 가리킴)
- 랭킹은 저장하지 않고 조회 때 계산: 연관기사 수 ↓ → 최신 발행 시각 ↓ → 섹션별 5개
- 북마크 하나는 폴더 하나에 속함
- 기사 본문은 저장 · 표시하지 않음(API의 짧은 설명문까지만)
- 비밀값은 `.env`에만, 이름은 7절 표 그대로
- newsdata.io 크레딧은 하루 200: 테스트는 저장한 응답(fixture)으로, 실제 호출은 PLAN이 정한 횟수만, 키는 헤더로 보내고 URL · 로그 · 보고에 남기지 않음

폴더 (ex11 기준. 단계 PLAN이 다르게 정하면 그쪽을 따름)
```
capstone/
├ SPEC.md · PLAN.md · CLAUDE.md · plan_helper.md · .gitignore
├ agent_prompts/   계획 · 제작 · 심사 프롬프트
├ plan/            PLAN_backend_ex01.md … ex11.md
├ reports/         exXX_build.md · exXX_judge.md
├ frontend/        원본 화면 (고치지 않음)
├ .github/workflows/daily.yml   ex09부터, 최신 exXX를 가리킴
└ exXX/            단계별 전체 복사본
   ├ openapi.yaml · package.json · tsconfig.json · .env.example
   ├ public/index.html              화면 (Next.js가 줌)
   ├ app/api/[...path]/route.ts     BFF: /api/* → Hono 중계
   ├ server/   index.ts · routes/ · sample.ts · schemas.ts · db/ · collect.ts · group.ts · summarize.ts · daily.ts · auth.ts
   ├ drizzle/  마이그레이션 (ex05)
   └ test/     *.test.ts · fixtures/ (ex04)
```

## 2. 단계 로드맵

| 단계 | 주제 | 끝나면 되는 것 | 계정 · 키 | 상태 |
|---|---|---|---|---|
| 0 | 준비 | 첫 커밋, 결정 D0 · D2 확정, newsdata.io 응답 확인 | GitHub · newsdata.io | 진행 중(GitHub · 발표일 남음) |
| ex01 | OpenAPI 계약 | 화면이 바라는 API(폴더 포함)가 `openapi.yaml`로 고정 | — | 완료 (PASS 9/9, 2026-10-07) |
| ex02 | Hono 구현 · Next.js 중계(BFF) | 화면이 가짜 데이터 대신 Next.js → Hono(메모리 샘플)로 동작 | — | 완료 (PASS 28/28, 2026-10-07) |
| ex03 | Zod 입력 검사 | 잘못된 · 미래 날짜, 잘못된 북마크 · 폴더 요청을 거절 | — | 완료 (PASS 38/38, 2026-10-07) |
| ex04 | Vitest | 랭킹 규칙과 API 동작이 테스트로 고정 (M1) | — | 완료 (PASS 24/24, 2026-10-07) · M1 달성 |
| ex05 | Supabase + Drizzle | 서버를 다시 켜도 랭킹 · 북마크 · 폴더 유지 | Supabase | 완료 (PASS 37/37, 2026-10-07) |
| ex06 | newsdata.io 수집 | 명령 한 번으로 섹션별 최신 기사가 DB에(실패 섹션은 기록하고 나머지는 저장) | newsdata.io 키 | 완료 (PASS 33/33, 2026-10-07) |
| ex07 | 이슈 묶기 · 연관기사 수 | 수집한 기사가 이슈로 묶이고, 키워드 검색으로 연관기사 수가 생겨 화면이 실제 이슈로 바뀜 | newsdata.io 키 | 대기 |
| ex08 | AI 3줄 요약 | Top 5 카드에 실제 요약 | Anthropic API 키 | 대기 |
| ex09 | 하루 1회 자동 실행 | 매일 저절로 수집 · 묶기 · 요약, 날짜별 데이터가 쌓임 (M2) | GitHub Secrets | 대기 |
| ex10 | Better Auth 로그인 | 가입 · 로그인 · 로그아웃 | — | 대기 |
| ex11 | 북마크 · 폴더 계정별 저장 | 내 북마크 · 폴더만 보이고 비로그인은 막힘 (M3) | — | 대기 |
| ex12 | 배포 (선택, D10) | 폰 등 다른 기기에서 접속 | 호스팅 | — |

마일스톤
- M1 ex04: 화면 전체가 서버 API로 동작 + 테스트. 데이터는 샘플
- M2 ex09: 실제 데이터가 매일 쌓이기 시작. **발표일 2주 전까지**(지난 날짜는 나중에 수집할 수 없어, US-09 시연에 쌓인 날짜가 필요)
- M3 ex11: SPEC 10개 스토리 완료 → 11절 시연 점검표
- 발표일: (미정) → 정해지면 M2 날짜를 역산해 적음

## 3. 단계별 미리 알 것

- 예상 새 패키지는 참고용. 실제 설치 목록은 단계 PLAN의 "새 패키지" 줄이 정함

| 단계 | 예상 새 패키지 | 미리 알 것 (AI가 추측하기 쉬운 곳) |
|---|---|---|
| ex01 | 없음 | 실패 메시지는 SPEC 문구 그대로. 폴더 이름 규칙은 AC-10-2. 로그인 관련 응답(401)은 ex11에서 계약에 더함 |
| ex02 | hono · @hono/node-server · next · react · react-dom · typescript · tsx · @types/node · @types/react | Next.js는 3000, Hono는 8787. BFF는 `/api/*`의 메서드 · 쿼리 · 본문 · 상태 코드 · 헤더(쿠키 포함)를 그대로 넘기고, Hono가 꺼져 있으면 502. 화면은 `public/index.html` 그대로 두고 `/`에서 보이게 함. 두 서버를 띄우는 방법을 PLAN에 적음. 화면 mock의 `POOL` · `rng` · `seedBookmarks`를 `server/sample.ts`로 옮겨 **실행일 기준** 샘플을 만듦(고정 날짜 JSON 금지). 요약 null 샘플 하나 유지(AC-04-3). 북마크 · 폴더는 메모리, 사용자 구분 없음. 해제 후 "되돌리기"는 다시 저장 요청으로 |
| ex03 | zod · @hono/zod-validator | 미래 날짜 판정은 KST 기준. 폴더 이름은 앞뒤 공백을 뺀 1~16자. 같은 이름 폴더를 허용할지는 PLAN에서 정함. 오류 메시지는 화면에 보일 문구 |
| ex04 | vitest | 테스트는 고정 날짜 · 샘플로(실행일에 따라 결과가 바뀌지 않게). 네트워크 · 외부 API 호출 없음 |
| ex05 | drizzle-orm · postgres · drizzle-kit | 샘플은 seed 명령으로 DB에. `DATABASE_URL`은 Supabase 연결 풀러 주소. 마이그레이션 파일도 커밋 |
| ex06 | 없음(Node 내장 fetch) | 요청 규칙은 D12와 10절 "0단계 newsdata.io" 메모 그대로. 응답 fixture는 `research/newsdata/*.json`을 `test/fixtures/`로 복사해 씀(테스트는 네트워크 없이). 섹션당 최대 페이지(기본 3)를 명령 옵션으로 줄일 수 있게(확인용 1). 기사 날짜 칸은 수집한 날(KST, D3), 발행 시각은 UTC를 바꿔 저장. 같은 날 다시 수집하면 성공한 섹션만 그날 기사를 바꾸고, 실패한 섹션은 이전 기사를 그대로 둠(AC-01-2). seed는 `articles` · `collect_runs`를 지우지 않음. 랭킹 화면은 아직 샘플 이슈(묶기는 ex07) |
| ex07 | 없음 | 묶기 기준(D11)과 기준값을 PLAN 표로. 연관기사 수는 D13(섹션당 후보 6개만 키워드 검색, 실패면 묶음 크기). 키워드 뽑는 규칙(예: 묶음 제목들에 함께 나온 2글자 이상 낱말)을 PLAN 표로, `q`는 URL 인코딩. 같은 날 다시 묶어도 대표 기사가 같은 이슈는 id 유지. 대표 기사 기준을 PLAN에서 정함. 랭킹 `updatedAt`을 실제 수집 시각으로. seed와 실제 이슈가 섞이지 않게 정함. 검색 응답 fixture(`research/newsdata/latest_kr_ko_q_nuri.json`)로 테스트 |
| ex08 | @anthropic-ai/sdk | 요약 없는 Top 5만. 입력은 묶인 기사의 제목 · 설명문. 실패 · 거절(refusal)은 null. 3줄은 구조화 출력으로 받음. PLAN · 제작 때 Claude Code `claude-api` 스킬로 최신 사용법 확인 |
| ex09 | 없음 | cron은 UTC: `0 21 * * *` = 06:00 KST. 키는 GitHub Secrets. 이후 단계마다 워크플로의 폴더를 최신 exXX로 바꿈 |
| ex10 | better-auth | 화면에 번들러가 없으니 fetch로 `/api/auth/*` 호출. Better Auth 테이블은 CLI로 Drizzle 스키마에 더함 |
| ex11 | 없음 | 계약에 401 추가. 사용자 없이 저장된 기존 북마크 · 폴더 처리는 확인받음. 과거 날짜 카드도 같은 북마크(AC-09-5) |

## 4. 한 단계를 도는 순서

| 순서 | 누가 | 할 일 | 남는 파일 |
|---|---|---|---|
| ① 계획 | 계획 에이전트(새 세션) | `agent_prompts/1_plan_agent.md`의 exXX · 주제를 채워 실행 | `plan/PLAN_backend_exXX.md` |
| ② 검토 | 사람 | 질문에 답하고 5절 결정 갱신. PLAN이 50줄 안인지, 검증 줄마다 기대 결과가 있는지 | PLAN 수정 |
| ③ 제작 | 제작 에이전트(새 세션) | `2_build_agent.md` 실행. 직접 할 때는 "plan/PLAN_backend_exXX.md대로 exXX 만들기" | `exXX/` · `reports/exXX_build.md` |
| ④ 심사 | 심사 에이전트(새 세션) | `3_judge_agent.md` 실행 | `reports/exXX_judge.md` |
| ⑤ 고침 | 사람 | FAIL 원인이 PLAN의 모호함이면 PLAN을 고쳐 ③부터, 코드 실수면 실패 줄만 고치게 한 뒤 ④ | — |
| ⑥ 닫기 | 사람 | PASS면 커밋 `exXX: 주제` · 2절 상태 갱신 · 실제로 문제 된 것을 10절에 한 줄 | — |

- 역할마다 새 세션: 심사가 제작 과정이 아니라 결과만 보게
- PASS 전에는 다음 PLAN을 쓰지 않음(다음 단계가 이 폴더를 복사함)
- 사람이 바뀐 것만 볼 때: `git diff --no-index ex(XX-1)/src exXX/src`처럼 폴더를 좁혀서

## 5. 결정 기록

- 상태: 대기(정해야 함) → 제안(아래 값으로 진행, 바꾸려면 말하기) → 확정

| # | 항목 | 내용 | 정할 때 | 상태 |
|---|---|---|---|---|
| D0 | 뉴스 출처 | newsdata.io 뉴스 API(무료 플랜). 네이버 뉴스 페이지 크롤링(robots.txt)과 네이버 검색 API(약관상 결과의 AI 가공 금지, 기사 수 미제공)는 쓰지 않음. 빅카인즈는 유료라 제외(SPEC #18 · #20) | 2026-10-07 | 확정 |
| D1 | 화면 연결 | Next.js(3000)가 화면과 `/api/*`를 주고, `/api/*`는 Hono API 서버(8787)로 중계(BFF). 브라우저는 Hono를 직접 부르지 않음 | 2026-10-07 | 확정 |
| D2 | 북마크 폴더 | MVP에 넣음. 지금 화면 동작 그대로(SPEC US-10). 이름 변경 · 삭제 · 이동은 범위 밖 | 2026-10-07 | 확정 |
| D3 | 날짜 기준 | KST. 수집은 매일 06:00. 랭킹 날짜 = 수집한 날(KST). newsdata.io 무료 플랜은 약 12시간 늦어서 06:00 수집분은 주로 전날 오후~저녁 기사. date 없이 부르면 가장 최근 수집일을 돌려주고, 화면 첫 진입은 그 날짜 | ex01 전(12시간 지연은 2026-10-07 추가) | 제안 |
| D4 | 언어 · 런타임 | TypeScript, Node 20 이상(현재 PC는 24), `npm run build` = `next build` + Hono 서버 타입 검사(`tsc --noEmit`) | ex02 전 | 제안 |
| D5 | 자동 실행 | GitHub Actions 예약 실행. 서버가 꺼져 있어도 돎 | ex09 PLAN 전 | 제안 |
| D6 | AI 요약 | 모델은 `claude-opus-5-5`(기본값. 더 싼 모델로 바꿀지는 사용자 결정). 입력은 묶인 기사의 제목 · 설명문만 | ex08 PLAN 전 | 제안 |
| D7 | 북마크 대상 | 날짜별 이슈 한 건(issueId) + 폴더(folderId). 카드 정보는 이슈에서 가져옴 | ex01 전 | 제안 |
| D8 | 수집 실패 섹션(AC-01-2) | 행을 복사하지 않고, 조회 때 그 섹션만 직전 성공 날짜의 결과를 돌려줌 | ex06 PLAN 전 | 제안 |
| D9 | 로그인 방식 | 이메일 + 비밀번호. Google 로그인은 SPEC 밖 | ex10 PLAN 전 | 제안 |
| D10 | 배포 | 기본은 로컬 시연. AC-08-3은 다른 브라우저(일반 + 시크릿 창)로 보임. 폰 시연을 원하면 ex12 | M3 전 | 제안 |
| D11 | 이슈 묶기 기준 | AI 없이 제목 유사도 규칙으로 묶음(결과가 매번 같고 테스트 가능, 비용 없음). 기준값은 fixture로 맞춰 ex07 PLAN에 적음 | ex07 PLAN 전 | 제안 |
| D12 | 섹션 판정 | 섹션마다 newsdata.io `category`를 묶어 요청하고(`country=kr` · `language=ko` · `prioritydomain=top` · `removeduplicate=1`), 요청한 섹션을 그 기사의 섹션으로 씀. pol=politics · eco=business · soc=domestic,crime,education · cul=lifestyle,entertainment,health,food,tourism · wor=world · it=technology,science. 같은 링크가 두 섹션에 오면 pol→eco→soc→cul→wor→it 순서에서 먼저 받은 섹션 하나만. **출처 섞기(2026-10-08 확정)**: top만 받으면 출처가 조선일보 계열 · investing_kr뿐이라(ex06 실제 60건), 섹션마다 `prioritydomain=top` 1페이지 + prioritydomain 없는 전체 출처 페이지를 함께 받음(하루 크레딧은 지금과 비슷하게). ex07에서 수집 보완으로 반영 | ex06 PLAN 전 · 출처 섞기는 ex07 | 제안 · 출처 섞기 확정 |
| D13 | 연관기사 수 | 이슈의 대표 키워드로 newsdata.io를 검색한 `totalResults`(최근 48시간, `country=kr` · `language=ko`, prioritydomain 없이 전체 출처). 크레딧 때문에 섹션마다 묶음 크기 상위 6개 후보만 검색하고 그중 Top 5. 검색 실패 · 크레딧 부족이면 묶음 크기로 대신함. 키워드 규칙은 ex07 PLAN | ex07 PLAN 전 | 제안(`q=누리호` → 249건, 2026-10-07 확인) |
| D14 | seed와 실제 데이터 | 실제 DB에는 샘플을 넣지 않음(운영 환경에 가짜 이슈가 있으면 안 됨). ex07에서 실제 DB의 샘플 issues · 샘플 폴더(f1~f3) · 샘플 북마크를 한 번 지우고, `npm run seed`는 실제 DB에 못 쓰게 함(없애거나 막음). 샘플(`seedRows` · 메모리 저장소)은 테스트에만 씀. 지난 날짜 조회(US-09)는 실제로 쌓인 날짜만 | 2026-10-08 | 확정 |

## 6. AC 커버리지

| US | AC | 처음 동작 | 완성 |
|---|---|---|---|
| US-01 일일 수집 | 01-1 · 01-2 | ex06(손으로 실행) | ex09(매일 자동) |
| US-02 이슈 묶음 | 02-1 · 02-2 | ex07 | ex07 |
| US-03 섹션별 랭킹 | 03-1 · 03-2 | ex02(메모리) | ex04(테스트) · ex05(DB) |
| US-04 AI 요약 카드 | 04-1 · 04-2 · 04-3 | ex02(샘플 요약 · null) | ex08 |
| US-05 대시보드 | 05-1 · 05-2 | ex02(갱신 시각 API) | ex07(실제 수집 시각) |
| US-06 가입 · 로그인 | 06-1 · 06-2 | ex10 | ex10 |
| US-07 북마크 | 07-1 · 07-2 · 07-3 | ex02(메모리, 사용자 구분 없음) | ex11(계정별 · 비로그인 차단) |
| US-08 북마크 대시보드 | 08-1 · 08-2 · 08-3 | ex02 | ex11 |
| US-09 과거 날짜 | 09-1 ~ 09-5 | ex02 · ex03(미래 날짜 거절) | ex05(날짜별 저장) · ex11(09-5) |
| US-10 북마크 폴더 | 10-1 ~ 10-4 | ex02(메모리) · ex03(이름 규칙) | ex05(DB) · ex11(계정별) |

- 화면에 이미 있는 동작(04-2 새 탭 · 05-2 모바일 · 09-2 날짜 표시와 오늘 버튼 · 09-4 미래 날짜 막기 · 10-3 폴더 칩)은 단계마다 깨지지 않았는지만 확인

## 7. API · 데이터 · 환경 변수 밑그림 (세부는 단계 PLAN에서 확정)

API (ex01에서 확정)

| 메서드 · 경로 | 하는 일 | 주요 응답 |
|---|---|---|
| `GET /api/rankings?date=YYYY-MM-DD` | 그날 섹션별 Top 5. date가 없으면 가장 최근 수집일 | 200 · 404 "해당 날짜의 랭킹 데이터가 없습니다" · 400 잘못된 · 미래 날짜(ex03) |
| `GET /api/bookmarks` | 북마크 목록, 최근 저장 순 | 200 · 401(ex11) |
| `POST /api/bookmarks` | `{ issueId, folderId }` 저장 | 201 · 404 없는 이슈 · 폴더 · 401(ex11) |
| `DELETE /api/bookmarks/{issueId}` | 북마크 해제 | 204 · 401(ex11) |
| `GET /api/folders` | 폴더 목록 + 폴더별 개수 | 200 · 401(ex11) |
| `POST /api/folders` | `{ name }` 폴더 만들기 | 201 · 400 이름 규칙(ex03) · 401(ex11) |
| `/api/auth/*` | 가입 · 로그인 · 로그아웃 · 세션(Better Auth) | ex10 |

- 랭킹 응답: `date` · `updatedAt`(마지막 갱신 시각) · `sections[]`(`key` · `name` · `issues[]`)
- 이슈 카드: `id` · `date` · `section` · `rank` · `title` · `summary`(3줄 배열 또는 null) · `articleCount` · `url`
- 북마크 항목: 이슈 카드 + `folderId` · `savedAt`
- 폴더: `id` · `name` · `count`

테이블 (ex05에서 확정, 뒤 단계에서 칸 추가)

| 테이블 | 주요 칸 | 단계 |
|---|---|---|
| `issues` | id · date · section · title · url · article_count · latest_published_at · summary(null 가능) | ex05 |
| `articles` | id · date(수집한 날 KST) · section · title · description(null 가능) · link · source_id · published_at · issue_id | ex06(issue_id는 ex07) |
| `collect_runs` | date · section · status(ok/failed) · message · article_count · finished_at | ex06 |
| `folders` | id · name · created_at · user_id | ex05(user_id는 ex11) |
| `bookmarks` | id · issue_id · folder_id · created_at · user_id | ex05(user_id는 ex11) |
| Better Auth | user · session · account · verification | ex10 |

환경 변수 (이름 고정, 값은 `.env`에만, `.env.example`에는 이름만)

| 이름 | 쓰는 곳 | 단계 |
|---|---|---|
| `API_PORT` | Hono API 서버 포트(기본 8787). Next.js는 3000 | ex02 |
| `API_URL` | BFF가 중계할 Hono 주소(기본 `http://localhost:8787`) | ex02 |
| `DATABASE_URL` | Supabase 접속(연결 풀러 주소) | ex05 |
| `NEWSDATA_API_KEY` | newsdata.io 수집 · 연관기사 수 검색(헤더 `X-ACCESS-KEY`로 보냄) | ex06 |
| `ANTHROPIC_API_KEY` | AI 요약 | ex08 |
| `BETTER_AUTH_SECRET` · `BETTER_AUTH_URL` | 로그인 | ex10 |

## 8. 위험과 대비

| # | 위험 | 대비 |
|---|---|---|
| R1 | 출처 정책 | news.naver.com의 robots.txt가 자동 수집 · AI 목적 접근을 막고(2026-10-07 확인), 네이버 검색 API 약관은 결과의 AI 가공을 금지하며 기사 수도 주지 않음 → D0를 newsdata.io로 변경. newsdata.io의 AI 가공 가능 여부는 사용자가 확인함. 발표에서 출처 선택 이유로 설명 |
| R2 | 무료 플랜 표본 한계 · 12시간 지연 | 하루 수천 건(정치만 48시간 4,197건) 중 섹션당 30건 정도만 받고, 가장 최근 기사도 약 12시간 전 → 후보 이슈가 전날 오후~저녁에 치우침. 연관기사 수는 전체 출처 48시간 키워드 검색(D13)으로 보정. 발표에서 무료 플랜 한계로 설명 |
| R3 | 카테고리 태그 부정확 | 전체 출처로 받으면 politics에 사회 · 생활 기사가 섞임 → `prioritydomain=top`으로 줄임(확인됨). 대신 표본 출처가 조선일보 계열 위주로 좁아짐 → 표본만 그렇고, 연관기사 수는 전체 출처로 셈 |
| R4 | 시연 당일 수집 · AI 장애 | 시연은 이미 저장된 데이터로 함. 라이브 수집 · 요약에 기대지 않음 |
| R5 | 과거 날짜 데이터 부족(US-09) | 샘플로 채우지 않으므로(D14) 실제로 쌓인 날짜만 조회됨 → M2를 발표 2주 전까지 끝냄. ex07이 되면 ex09 전까지 매일 한 번 손으로 수집 · 묶기 실행 |
| R6 | API 호출 한도 · 비용 | newsdata.io 무료 플랜: 하루 200크레딧(요청 1번 = 1크레딧 · 최대 10건), 15분에 60회. 하루 예산: 수집 6섹션 × 3페이지 = 18 + 연관기사 수 6섹션 × 6 = 36 → 54회(15분 한도 안). 남은 크레딧은 응답 헤더 `x-api-limit-remaining`. 개발 · 심사는 fixture 위주, 실제 호출은 PLAN이 정한 횟수만. AI 요약은 하루 Top 5 × 6섹션 = 30건만, 이미 요약한 이슈는 다시 하지 않음 |
| R7 | Supabase 접속 · 정지 | 연결 풀러 주소 사용(직접 연결 주소는 IPv6 전용이라 GitHub Actions에서 실패할 수 있음). 무료 프로젝트는 약 1주 안 쓰면 일시 정지 → 매일 자동 실행으로 깨워 둠 |

## 9. 0단계 준비 (ex01 전)

- [x] 첫 커밋: `0e061b4` (2026-10-07)
- [x] `node -v` 20 이상: v24.21.0
- [x] D0 · D2 결정 (2026-10-07)
- [ ] GitHub 저장소 만들기(ex09 자동 실행에 필요, private 가능)
- [x] 네이버 검색 API 검토: 약관상 결과의 AI 가공 금지 · 기사 수 미제공 → 쓰지 않음(D0, 2026-10-07)
- [x] newsdata.io 키(`NEWSDATA_API_KEY`) · 응답 확인(2026-10-07, 크레딧 5개 사용): 10절 "0단계 newsdata.io" 메모. 응답 샘플은 `research/newsdata/`(본문 칸 뺌)
- [x] D1 확정 · D3 · D7은 제안대로 ex01~ex05에 반영
- [x] Supabase 프로젝트 · `DATABASE_URL`(ex05, 비밀번호 교체 완료)
- [ ] Anthropic Console API 키와 결제 수단(ex08)
- [ ] 발표일 확인 → 2절 M2 날짜 적기

## 10. 단계 메모 (다음 PLAN에 넘길 것)

- 심사 · 실습에서 실제로 문제가 된 것만 `exXX: 한 줄`로 적음
- ex01: 화면 샘플의 이슈 id(`eco-0` 등)에 날짜가 없어 날짜별 이슈(D7)와 `DELETE /api/bookmarks/{issueId}`가 구분되지 않음 → ex02에서 날짜를 넣은 id 규칙을 정함
- ex01: 화면 데이터와 계약의 칸 이름 · 모양이 다름(`sec`·`count`·`folder` 객체·숫자 `savedAt`·섹션 객체 ↔ `section`·`articleCount`·`folderId`·ISO `savedAt`·`sections` 배열) → ex02에서 화면 코드를 계약에 맞춰 고침
- ex01: 스키마가 섹션 `key`와 `name`의 짝을 묶지 않음(`pol`+"경제"도 통과) → ex02 응답은 짝을 맞추고, 스키마 정리는 ex04
- ex02: 입력 검사가 없어 깨진 JSON · 빠진 칸은 500, 17자 이상 폴더 이름도 201, `2026-10-7` 같은 날짜도 받음, 내일 날짜는 400이 아니라 404 → ex03
- ex02: 화면의 "오늘"은 브라우저 지역 시간, 서버는 KST → 한국 밖 · 자정 근처에서 어긋날 수 있음. ex03에서 화면도 KST 기준으로 맞출지 정함
- ex02: openapi.yaml 예시의 이슈 id(`pol-0`)가 실제 id 규칙(`{date}-{section}-{번호}`)과 다름 → ex04 정리 때 고침
- ex02: `next dev`가 `AGENTS.md` · `next-env.d.ts`를, `next build`가 `tsconfig.tsbuildinfo`를 만듦 → 루트 `.gitignore`에 넣음. 검증표의 `it.sec` 검색은 `it.section`과 겹치니 낱말 경계로 씀
- ex03: 같은 이름 폴더는 허용, 화면 "오늘"은 KST로 확정(PLAN 기본값)
- ex03: zod `.max()`는 이모지 같은 서로게이트 쌍을 코드 포인트로 세서 `😀`×9(length 18)도 201. 화면 maxlength는 UTF-16 단위 → ex04에서 기준을 정해 테스트로 고정
- ex03: `app.onError`가 400 예외를 모두 "요청 형식이 올바르지 않습니다"로 바꿈 → 뒤 단계에서 다른 400 예외가 생기면 문구 겹침 주의
- ex03: 계약 `BookmarkCreate`에 issueId 패턴 · folderId minLength 없음, 예시 id(`it-1`)와 folders 400 description이 새 규칙과 어긋남 → ex04 계약 정리
- ex04: 위 ex01~ex03 계약 메모(예시 id · IssueId · 섹션 짝 · folderId · folders 400)는 처리됨. 폴더 이름 글자 수는 코드 포인트 기준으로 확정(😀×16 통과 · ×17 거절), 순위 3번째 기준은 id 오름차순(PLAN 기본값)
- ex04: `rankIssues`의 id 오름차순은 문자열 비교라 번호가 두 자리면 `-10`이 `-9`보다 앞 → 실제 이슈 id를 정하는 ex05 · ex07에서 확인
- ex04: openapi의 date 설명("생략하면 가장 최근 수집일")과 지금 동작(KST 오늘)이 다름. 샘플에선 같지만 ex05에서 DB 기준으로 맞춤
- ex04: Redocly 경고 15개는 `Section` oneOf 가지에 `required`가 없어서 남(가지마다 넣으면 사라짐, 지금 버전 기준 전체 경고는 19개). vitest는 `"type": "module"`이 없다는 경고만 남(동작 문제 없음)
- ex05: D3(date 생략 = DB의 KST 오늘 이하 가장 최근 날짜) · D7(issue_id unique, ex11에서 (user_id, issue_id)) 적용. id 정렬은 자연 순서로 고침. 테스트는 저장소를 나눠 메모리 구현으로 유지(DB 구현은 검증표 서버 줄로만 확인)
- ex05: `DATABASE_URL`은 Transaction pooler(6543) + `prepare: false`, drizzle-kit migrate도 6543에서 됨. Supabase 연결 문자열의 `[YOUR-PASSWORD]` 괄호가 남으면 인증 실패(28P01)이고 drizzle-kit은 메시지 없이 exit 1만 냄
- ex05: `npm run seed`는 세 테이블을 모두 지우고 45일치를 다시 넣음 → ex06에서 실제 수집 데이터가 생기면 seed를 언제 쓸지(또는 범위) 정함
- ex05: 날짜 · 섹션마다 후보가 딱 5개라 지금은 모두 Top 5. 후보가 5개를 넘으면(ex07) Top 5 밖 이슈의 북마크 저장(404) · 목록 카드(빈 칸)를 어떻게 할지 정함
- ex05: 폴더를 동시에 두 번 만들면 id 충돌(500), 저장 시각이 같은 북마크는 순서 미정 → 지금은 영향 작음, ex11 계정별 저장 때 함께 봄
- ex05: Next.js도 `ex05/.env`를 읽음 → 비밀값을 `NEXT_PUBLIC_` 이름으로 두지 않음
- ex05: 심사 중 `DATABASE_URL`이 에이전트 명령 출력에 한 번 노출됨(파일엔 없음) → 사용자가 Supabase DB 비밀번호 교체함(2026-10-07). 비밀번호를 바꾼 직후 몇 분은 풀러가 28P01을 낼 수 있음. 에이전트는 `.env`를 읽는 스크립트에서 값이 오류 메시지로 새지 않게 주의
- 0단계 newsdata.io(2026-10-07 실제 응답): 엔드포인트 `https://newsdata.io/api/1/latest`, 키는 헤더 `X-ACCESS-KEY`(URL에 넣지 않음). 한 번에 최대 10건, 다음 페이지는 응답의 `nextPage` 값을 `page` 파라미터로. `pubDate`는 `YYYY-MM-DD HH:mm:ss`이고 `pubDateTZ`=UTC. `category`는 배열(여러 개). `link`는 언론사 주소, `source_id` · `source_name` 있음. `description`은 없을 수 있음(평균 80~330자). `content` · `ai_*` · `sentiment` 칸은 "ONLY AVAILABLE IN …" 문구라 저장하지 않음. 남은 크레딧은 응답 헤더 `x-api-limit-remaining`, 15분 한도는 `x-ratelimit-remaining`. `timeframe`은 유료(422, 크레딧 안 빠짐). `prioritydomain=top` · 여러 카테고리 쉼표 묶음 · `removeduplicate=1` · `q`는 무료로 됨
- ex06: D12 카테고리 묶음 6개 모두 실제 수집에서 10건씩 받음(eco · wor · it 포함). `prioritydomain=top`이라 출처가 chosun · biz_chosun · sports_chosun · it_chosun · investing_kr 5곳뿐(R3), 발행 시각은 수집보다 약 12시간 전(R2)
- ex06: 설명문 null이 많음(실제 60건 중 25건, eco는 10건 중 9건) → ex08 요약 입력이 제목 위주가 될 수 있음. 설명문은 300자(코드 포인트)에서 잘라 저장(사람 검토로 PLAN에 추가)
- ex06: 같은 날 다시 수집하면 성공한 섹션의 `articles` 행이 새로 들어가 id가 바뀜 → ex07은 기사를 `link`로 이음. `collect_runs`는 실행마다 6행이 쌓임 → ex07의 `updatedAt`은 그날 마지막 ok 실행의 `finished_at`으로
- ex06: `DB 오류:`는 Drizzle이 감싼 원래 오류(cause) 문구 한 줄로 찍고 비밀값은 `***`(심사 허용). seed · api 서버(`index.ts` · `seed.ts`)는 아직 오류를 그대로 던져 `DATABASE_URL` 형식이 깨지면 주소가 출력될 수 있음 → ex09(GitHub Actions 로그) 전에 같은 처리 필요
- ex06: collect 출력은 저장이 끝난 뒤 한꺼번에 나옴(3페이지면 약 20초 무출력). `--pages=2`(등호)는 인식 안 돼 기본 3페이지로 돎 → `--pages 2`로 씀. pubDate 형식이 이상하면 실행 전체가 `DB 오류: Invalid time value`로 끝남(실제로는 아직 없음)
- 2026-10-08: D12 출처 섞기 확정(top 1페이지 + 전체 출처 페이지) · D14 확정(실제 DB에 샘플 없음) → ex07 PLAN은 seed에 기대던 검증 줄(seed 두 번 · 1350행 · 샘플 폴더 f1~f3 · 원상복구의 seed)을 실제 데이터 · 확인 행 기준으로 바꿔야 함
- ex06: 크레딧 사용(2026-10-07): 0단계 확인 5 · 제작 7 · 심사 7 → 남은 181. 잘못된 키(401) 요청은 크레딧이 안 듦. 실제 수집 기사 60행은 다음 단계용으로 DB에 남김

## 11. 시연 점검표 (M3 뒤, 발표 전날 다시)

- [ ] 메인: 6개 섹션 Top 5 · 마지막 갱신 시각 · 카드(요약 3줄 · 연관기사 수 · 원문 새 탭)
- [ ] 요약 실패 카드: "요약을 준비 중입니다"
- [ ] 날짜: 어제로 이동 · 데이터 없는 날 안내 · "오늘" 버튼 · 미래 날짜 선택 불가
- [ ] 계정: 가입 → 로그인 → 북마크(새 폴더 만들어 저장 · 기존 폴더에 저장) · 해제 → 북마크 화면(최근 저장 순 · 폴더 칩) · 없을 때 안내
- [ ] 다른 브라우저(또는 기기)에서 같은 계정 → 같은 북마크 · 폴더
- [ ] 비로그인으로 북마크 → 로그인 안내
- [ ] 모바일 폭: 가로 스크롤 없이 세로로 쌓임
- [ ] 최근 7일 이상 데이터가 있고, 자동 실행 기록이 정상이고, 라이브 수집 없이 시연 가능
