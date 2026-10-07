# PLAN — 이슈랭크 전체 청사진

> `SPEC.md` = 무엇을 · 왜 / `PLAN.md` = 전체 그림 · 결정 · 진행 상태 / `plan/PLAN_backend_exXX.md` = 단계별 어떻게
> 만드는 범위는 단계 PLAN만큼. 이 파일은 단계끼리 방향 · 이름 · 결정을 맞추는 용도
> 진행 상태(2절) · 결정(5절) · 단계 메모(10절)는 이 파일에만 적고, 단계가 끝날 때마다 고침

## 1. 최종 모습 (ex11 끝)

```
[GitHub Actions · 매일 06:00 KST]
  └ npm run daily
      1) 수집: 네이버 검색 API → 섹션 6개의 그날 기사 저장
      2) 묶기: 같은 사건 기사 → 이슈
      3) 요약: 요약 없는 Top 5만 → Claude API → 3줄 저장
              │
              ▼
      [Supabase Postgres] ← Drizzle
              ▲
              │
[Hono 서버 :3000] /api/rankings · /api/bookmarks · /api/folders · /api/auth/*(Better Auth)
  │ 같은 주소에서 public/index.html도 줌
  ▼
[브라우저 index.html] fetch로 /api 호출
```

| 영역 | 선택 | 들어오는 단계 |
|---|---|---|
| 화면 | `frontend/index.html`을 끝까지 씀. 번들러 없음 | ex02 |
| API 계약 | OpenAPI(`openapi.yaml`) | ex01 |
| 서버 | Hono + Node, TypeScript | ex02 |
| 입력 검사 | Zod | ex03 |
| 테스트 | Vitest | ex04 |
| DB | Supabase Postgres + Drizzle | ex05 |
| 수집 | 네이버 검색 API(뉴스) | ex06 |
| 이슈 묶기 | 제목 유사도 규칙(D11) | ex07 |
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
- 기사 본문은 저장 · 표시하지 않음(검색 API의 짧은 설명문까지만)
- 비밀값은 `.env`에만, 이름은 7절 표 그대로

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
   ├ public/index.html
   ├ src/      server.ts · routes/ · sample.ts · schemas.ts · db/ · collect.ts · group.ts · summarize.ts · daily.ts · auth.ts
   ├ drizzle/  마이그레이션 (ex05)
   └ test/     *.test.ts · fixtures/ (ex04)
```

## 2. 단계 로드맵

| 단계 | 주제 | 끝나면 되는 것 | 계정 · 키 | 상태 |
|---|---|---|---|---|
| 0 | 준비 | 첫 커밋, 결정 D0 · D2 확정, 검색 API 응답 확인 | GitHub · 네이버 개발자센터 | 진행 중 |
| ex01 | OpenAPI 계약 | 화면이 바라는 API(폴더 포함)가 `openapi.yaml`로 고정 | — | 대기 |
| ex02 | Hono 구현 · 화면 연결 | 화면이 가짜 데이터 대신 서버(메모리 샘플)로 동작 | — | 대기 |
| ex03 | Zod 입력 검사 | 잘못된 · 미래 날짜, 잘못된 북마크 · 폴더 요청을 거절 | — | 대기 |
| ex04 | Vitest | 랭킹 규칙과 API 동작이 테스트로 고정 (M1) | — | 대기 |
| ex05 | Supabase + Drizzle | 서버를 다시 켜도 랭킹 · 북마크 · 폴더 유지 | Supabase | 대기 |
| ex06 | 네이버 검색 API 수집 | 명령 한 번으로 섹션별 그날 기사가 DB에 | 네이버 검색 API 키 | 대기 |
| ex07 | 이슈 묶기 | 그날 기사가 이슈로 묶이고 연관기사 수가 생김 | — | 대기 |
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
| ex02 | hono · @hono/node-server · typescript · tsx | 화면 mock의 `POOL` · `rng` · `seedBookmarks`를 `src/sample.ts`로 옮겨 **실행일 기준** 샘플을 만듦(고정 날짜 JSON 금지). 요약 null 샘플 하나 유지(AC-04-3). 북마크 · 폴더는 메모리, 사용자 구분 없음. 해제 후 "되돌리기"는 다시 저장 요청으로 |
| ex03 | zod · @hono/zod-validator | 미래 날짜 판정은 KST 기준. 폴더 이름은 앞뒤 공백을 뺀 1~16자. 같은 이름 폴더를 허용할지는 PLAN에서 정함. 오류 메시지는 화면에 보일 문구 |
| ex04 | vitest | 테스트는 고정 날짜 · 샘플로(실행일에 따라 결과가 바뀌지 않게). 네트워크 · 외부 API 호출 없음 |
| ex05 | drizzle-orm · postgres · drizzle-kit | 샘플은 seed 명령으로 DB에. `DATABASE_URL`은 Supabase 연결 풀러 주소. 마이그레이션 파일도 커밋 |
| ex06 | 없음(Node 내장 fetch) | 섹션별 검색어 표와 섹션 판정 규칙을 PLAN에 직접 적음(0단계 확인 결과 반영). 제목 · 설명문의 `<b>` 태그와 HTML 엔티티는 저장 전에 지움. KST 그날 기사만, 같은 링크는 한 번만. 섹션당 호출 수 상한. 응답 샘플을 fixture로 저장해 테스트 |
| ex07 | 없음 | 묶기 기준(D11)과 기준값을 PLAN 표로. 같은 날 다시 묶어도 대표 기사가 같은 이슈는 id 유지. 대표 기사 = 묶음에서 가장 먼저 · 가장 많이 나온 기준을 PLAN에서 정함. fixture로 테스트 |
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
| D0 | 뉴스 출처 | 네이버 검색 API(뉴스). 페이지 크롤링은 하지 않음(SPEC #18). 약관에서 결과 저장 · AI 요약 사용 허용 여부는 0단계에서 확인 | 2026-10-07 | 확정 |
| D1 | 화면 연결 | Hono가 `public/index.html`과 `/api/*`를 같은 주소(3000)에서 줌. Next.js 안 씀 | ex01 전 | 제안 |
| D2 | 북마크 폴더 | MVP에 넣음. 지금 화면 동작 그대로(SPEC US-10). 이름 변경 · 삭제 · 이동은 범위 밖 | 2026-10-07 | 확정 |
| D3 | 날짜 기준 | KST. 수집은 매일 06:00. date 없이 부르면 가장 최근 수집일을 돌려주고, 화면 첫 진입은 그 날짜 | ex01 전 | 제안 |
| D4 | 언어 · 런타임 | TypeScript, Node 20 이상(현재 PC는 24), `npm run build` = `tsc` | ex02 전 | 제안 |
| D5 | 자동 실행 | GitHub Actions 예약 실행. 서버가 꺼져 있어도 돎 | ex09 PLAN 전 | 제안 |
| D6 | AI 요약 | 모델은 `claude-opus-5-5`(기본값. 더 싼 모델로 바꿀지는 사용자 결정). 입력은 묶인 기사의 제목 · 설명문만 | ex08 PLAN 전 | 제안 |
| D7 | 북마크 대상 | 날짜별 이슈 한 건(issueId) + 폴더(folderId). 카드 정보는 이슈에서 가져옴 | ex01 전 | 제안 |
| D8 | 수집 실패 섹션(AC-01-2) | 행을 복사하지 않고, 조회 때 그 섹션만 직전 성공 날짜의 결과를 돌려줌 | ex06 PLAN 전 | 제안 |
| D9 | 로그인 방식 | 이메일 + 비밀번호. Google 로그인은 SPEC 밖 | ex10 PLAN 전 | 제안 |
| D10 | 배포 | 기본은 로컬 시연. AC-08-3은 다른 브라우저(일반 + 시크릿 창)로 보임. 폰 시연을 원하면 ex12 | M3 전 | 제안 |
| D11 | 이슈 묶기 기준 | AI 없이 제목 유사도 규칙으로 묶음(결과가 매번 같고 테스트 가능, 비용 없음). 기준값은 fixture로 맞춰 ex07 PLAN에 적음 | ex07 PLAN 전 | 제안 |
| D12 | 섹션 판정 | 검색 결과 링크가 네이버 뉴스 주소면 `sid` 값(100 정치 · 101 경제 · 102 사회 · 103 생활·문화 · 104 세계 · 105 IT·과학)으로 판정. 없으면 그 기사는 버림. 0단계에서 실제 응답으로 확인 | ex06 PLAN 전 | 제안 · 확인 필요 |

## 6. AC 커버리지

| US | AC | 처음 동작 | 완성 |
|---|---|---|---|
| US-01 일일 수집 | 01-1 · 01-2 | ex06(손으로 실행) | ex09(매일 자동) |
| US-02 이슈 묶음 | 02-1 · 02-2 | ex07 | ex07 |
| US-03 섹션별 랭킹 | 03-1 · 03-2 | ex02(메모리) | ex04(테스트) · ex05(DB) |
| US-04 AI 요약 카드 | 04-1 · 04-2 · 04-3 | ex02(샘플 요약 · null) | ex08 |
| US-05 대시보드 | 05-1 · 05-2 | ex02(갱신 시각 API) | ex06(실제 수집 시각) |
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
| `articles` | id · date · section · title · description · link · original_link · published_at · issue_id | ex06(issue_id는 ex07) |
| `collect_runs` | date · section · status(ok/failed) · message · finished_at | ex06 |
| `folders` | id · name · created_at · user_id | ex05(user_id는 ex11) |
| `bookmarks` | id · issue_id · folder_id · created_at · user_id | ex05(user_id는 ex11) |
| Better Auth | user · session · account · verification | ex10 |

환경 변수 (이름 고정, 값은 `.env`에만, `.env.example`에는 이름만)

| 이름 | 쓰는 곳 | 단계 |
|---|---|---|
| `PORT` | 서버 포트(기본 3000) | ex02 |
| `DATABASE_URL` | Supabase 접속(연결 풀러 주소) | ex05 |
| `NAVER_CLIENT_ID` · `NAVER_CLIENT_SECRET` | 네이버 검색 API | ex06 |
| `ANTHROPIC_API_KEY` | AI 요약 | ex08 |
| `BETTER_AUTH_SECRET` · `BETTER_AUTH_URL` | 로그인 | ex10 |

## 8. 위험과 대비

| # | 위험 | 대비 |
|---|---|---|
| R1 | 출처 정책 | news.naver.com의 robots.txt가 모든 봇과 AI 목적 접근을 막음(2026-10-07 확인) → D0로 검색 API 사용. 남은 일: 검색 API 약관에서 결과 저장 · AI 요약 사용 허용 여부 확인, 필요하면 지도교수와 합의 |
| R2 | "많이 보도된" 판단이 검색어에 좌우됨 | 검색 API는 검색어가 있어야 결과를 줌 → 섹션마다 넓은 검색어 여러 개 + 최신순으로 모음. 검색어 표는 ex06 PLAN에 적고, 결과를 보며 고침 |
| R3 | 섹션 판정 실패(D12) | 0단계에서 실제 응답의 링크에 `sid`가 있는지 확인. 없거나 적으면 검색어 기준 섹션으로 바꿈 |
| R4 | 시연 당일 수집 · AI 장애 | 시연은 이미 저장된 데이터로 함. 라이브 수집 · 요약에 기대지 않음 |
| R5 | 과거 날짜 데이터 부족(US-09) | M2를 발표 2주 전까지 끝냄. ex07이 되면 ex09 전까지 매일 한 번 손으로 실행 |
| R6 | API 호출 한도 · 비용 | 검색 API는 하루 호출 한도가 있음 → 섹션당 호출 수 상한. AI 요약은 하루 Top 5 × 6섹션 = 30건만, 이미 요약한 이슈는 다시 하지 않음 |
| R7 | Supabase 접속 · 정지 | 연결 풀러 주소 사용(직접 연결 주소는 IPv6 전용이라 GitHub Actions에서 실패할 수 있음). 무료 프로젝트는 약 1주 안 쓰면 일시 정지 → 매일 자동 실행으로 깨워 둠 |

## 9. 0단계 준비 (ex01 전)

- [x] 첫 커밋: `0e061b4` (2026-10-07)
- [x] `node -v` 20 이상: v24.21.0
- [x] D0 · D2 결정 (2026-10-07)
- [ ] GitHub 저장소 만들기(ex09 자동 실행에 필요, private 가능)
- [ ] 네이버 개발자센터에서 애플리케이션 등록(검색 API) → Client ID · Secret 받기
- [ ] 검색 API 약관 확인: 결과 저장 · AI 요약에 사용해도 되는지, 하루 호출 한도
- [ ] 검색 API 응답 확인: 섹션별 검색어 몇 개로 호출해 링크의 `sid` 유무와 하루 기사 양 확인(D12 · R2·R3). 응답 몇 개는 ex06 fixture용으로 보관
- [ ] D1 · D3 · D7 제안 확인(ex01 계약에 들어감)
- [ ] 계정 미리 만들기: Supabase(ex05) · Anthropic Console API 키와 결제 수단(ex08)
- [ ] 발표일 확인 → 2절 M2 날짜 적기

## 10. 단계 메모 (다음 PLAN에 넘길 것)

- 아직 없음. 심사 · 실습에서 실제로 문제가 된 것만 `exXX: 한 줄`로 적음

## 11. 시연 점검표 (M3 뒤, 발표 전날 다시)

- [ ] 메인: 6개 섹션 Top 5 · 마지막 갱신 시각 · 카드(요약 3줄 · 연관기사 수 · 원문 새 탭)
- [ ] 요약 실패 카드: "요약을 준비 중입니다"
- [ ] 날짜: 어제로 이동 · 데이터 없는 날 안내 · "오늘" 버튼 · 미래 날짜 선택 불가
- [ ] 계정: 가입 → 로그인 → 북마크(새 폴더 만들어 저장 · 기존 폴더에 저장) · 해제 → 북마크 화면(최근 저장 순 · 폴더 칩) · 없을 때 안내
- [ ] 다른 브라우저(또는 기기)에서 같은 계정 → 같은 북마크 · 폴더
- [ ] 비로그인으로 북마크 → 로그인 안내
- [ ] 모바일 폭: 가로 스크롤 없이 세로로 쌓임
- [ ] 최근 7일 이상 데이터가 있고, 자동 실행 기록이 정상이고, 라이브 수집 없이 시연 가능
