# PLAN — 이슈랭크 전체 청사진

> `SPEC.md` = 무엇을 · 왜 / `PLAN.md` = 전체 그림 · 결정 · 진행 상태 / `plan/PLAN_backend_exXX.md` = 단계별 어떻게
> 만드는 범위는 단계 PLAN만큼. 이 파일은 단계끼리 방향 · 이름 · 결정을 맞추는 용도
> 진행 상태(2절) · 결정(5절) · 단계 메모(10절)는 이 파일에만 적고, 단계가 끝날 때마다 고침

## 1. 최종 모습 (ex10 끝)

```
[GitHub Actions · 매일 06:00 KST]
  └ npm run daily
      1) 수집: 출처(D0) → 섹션 6개 → 같은 사건 기사 묶기 → 이슈 저장
      2) 요약: 요약 없는 Top 5만 → Claude API → 3줄 저장
              │
              ▼
      [Supabase Postgres] ← Drizzle
              ▲
              │
[Hono 서버 :3000] /api/rankings · /api/bookmarks · /api/auth/*(Better Auth)
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
| 수집 | 출처는 D0에서 정함 | ex06 |
| AI 요약 | Claude API(`@anthropic-ai/sdk`) | ex07 |
| 자동 실행 | GitHub Actions 예약 실행 | ex08 |
| 로그인 | Better Auth(이메일 + 비밀번호) | ex09 |

모든 단계 공통 원칙
- 날짜는 한국 시간(KST) `YYYY-MM-DD`
- 섹션 키 `pol · eco · soc · cul · wor · it`, 화면 문구, 카드 칸은 지금 화면 그대로
- 수집과 요약은 따로 돎. 요약은 "요약이 없는 Top 5"만 채움 → 다시 돌려도 안전하고, 실패분은 다음 실행에서 재시도
- 같은 날 다시 수집하면 덮어씀(중복 없음). 이슈 id는 유지(북마크가 가리킴)
- 랭킹은 저장하지 않고 조회 때 계산: 연관기사 수 ↓ → 최신 발행 시각 ↓ → 섹션별 5개
- 기사 본문은 저장 · 표시하지 않음
- 비밀값은 `.env`에만, 이름은 7절 표 그대로

폴더 (ex10 기준. 단계 PLAN이 다르게 정하면 그쪽을 따름)
```
capstone/
├ SPEC.md · PLAN.md · CLAUDE.md · plan_helper.md · .gitignore
├ agent_prompts/   계획 · 제작 · 심사 프롬프트
├ plan/            PLAN_backend_ex01.md … ex10.md
├ reports/         exXX_build.md · exXX_judge.md
├ frontend/        원본 화면 (고치지 않음)
├ .github/workflows/daily.yml   ex08부터, 최신 exXX를 가리킴
└ exXX/            단계별 전체 복사본
   ├ openapi.yaml · package.json · tsconfig.json · .env.example
   ├ public/index.html
   ├ src/      server.ts · routes/ · sample.ts · schemas.ts · db/ · collect/ · summarize.ts · daily.ts · auth.ts
   ├ drizzle/  마이그레이션 (ex05)
   └ test/     *.test.ts · fixtures/ (ex04)
```

## 2. 단계 로드맵

| 단계 | 주제 | 끝나면 되는 것 | 계정 · 키 | 상태 |
|---|---|---|---|---|
| 0 | 준비 | 첫 커밋, D0 · D1 · D2 · D3 · D7 확정 | GitHub | 진행 중 |
| ex01 | OpenAPI 계약 | 화면이 바라는 API가 `openapi.yaml`로 고정 | — | 대기 |
| ex02 | Hono 구현 · 화면 연결 | 화면이 가짜 데이터 대신 서버(메모리 샘플)로 동작 | — | 대기 |
| ex03 | Zod 입력 검사 | 잘못된 · 미래 날짜, 잘못된 북마크 요청을 거절 | — | 대기 |
| ex04 | Vitest | 랭킹 규칙과 API 동작이 테스트로 고정 (M1) | — | 대기 |
| ex05 | Supabase + Drizzle | 서버를 다시 켜도 랭킹 · 북마크 유지 | Supabase | 대기 |
| ex06 | 뉴스 수집 · 이슈 묶기 | 명령 한 번으로 오늘 이슈가 DB에 | D0 출처 | 대기 |
| ex07 | AI 3줄 요약 | Top 5 카드에 실제 요약 | Anthropic API 키 | 대기 |
| ex08 | 하루 1회 자동 실행 | 매일 저절로 수집 · 요약, 날짜별 데이터가 쌓임 (M2) | GitHub Secrets | 대기 |
| ex09 | Better Auth 로그인 | 가입 · 로그인 · 로그아웃 | — | 대기 |
| ex10 | 북마크 계정별 저장 | 내 북마크만 보이고 비로그인은 막힘 (M3) | — | 대기 |
| ex11 | 배포 (선택, D10) | 폰 등 다른 기기에서 접속 | 호스팅 | — |

마일스톤
- M1 ex04: 화면 전체가 서버 API로 동작 + 테스트. 데이터는 샘플
- M2 ex08: 실제 데이터가 매일 쌓이기 시작. **발표일 2주 전까지**(지난 날짜는 나중에 수집할 수 없어, US-09 시연에 쌓인 날짜가 필요)
- M3 ex10: SPEC 9개 스토리 완료 → 11절 시연 점검표
- 발표일: (미정) → 정해지면 M2 날짜를 역산해 적음

## 3. 단계별 미리 알 것

- 예상 새 패키지는 참고용. 실제 설치 목록은 단계 PLAN의 "새 패키지" 줄이 정함

| 단계 | 예상 새 패키지 | 미리 알 것 (AI가 추측하기 쉬운 곳) |
|---|---|---|
| ex01 | 없음 | 실패 메시지는 SPEC 문구 그대로. 로그인 관련 응답(401)은 ex10에서 계약에 더함 |
| ex02 | hono · @hono/node-server · typescript · tsx | 화면 mock의 `POOL` · `rng`를 `src/sample.ts`로 옮겨 **실행일 기준** 샘플을 만듦(고정 날짜 JSON 금지). 요약 null 샘플 하나 유지(AC-04-3). 북마크는 메모리, 사용자 구분 없음. 폴더 UI는 D2대로 |
| ex03 | zod · @hono/zod-validator | 미래 날짜 판정은 KST 기준. 오류 메시지는 화면에 보일 문구 |
| ex04 | vitest | 테스트는 고정 날짜 · 샘플로(실행일에 따라 결과가 바뀌지 않게). 네트워크 · 외부 API 호출 없음 |
| ex05 | drizzle-orm · postgres · drizzle-kit | 샘플은 seed 명령으로 DB에. `DATABASE_URL`은 Supabase 연결 풀러 주소. 마이그레이션 파일도 커밋 |
| ex06 | 출처에 따라 | D0 확정 전에는 PLAN을 쓰지 않음. 파서 테스트는 저장한 샘플(fixture)로. 재수집은 출처의 묶음 id 기준 덮어쓰기. 직접 묶어야 하는 출처면 '수집'과 '묶기'를 두 단계로 나눔 |
| ex07 | @anthropic-ai/sdk | 요약 없는 Top 5만. 실패 · 거절(refusal)은 null. 3줄은 구조화 출력으로 받음. PLAN · 제작 때 Claude Code `claude-api` 스킬로 최신 사용법 확인 |
| ex08 | 없음 | cron은 UTC: `0 21 * * *` = 06:00 KST. 키는 GitHub Secrets. 이후 단계마다 워크플로의 폴더를 최신 exXX로 바꿈 |
| ex09 | better-auth | 화면에 번들러가 없으니 fetch로 `/api/auth/*` 호출. Better Auth 테이블은 CLI로 Drizzle 스키마에 더함 |
| ex10 | 없음 | 계약에 401 추가. 사용자 없이 저장된 기존 북마크 처리는 확인받음. 과거 날짜 카드도 같은 북마크(AC-09-5) |

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
| D0 | 뉴스 출처 · 수집 방식 | 정책상 허용되는 출처로 정함(8절 R1). 정해지면 SPEC 문구부터 고침 | 지금, 늦어도 ex05 PLAN 전 | **대기 · 최우선** |
| D1 | 화면 연결 | Hono가 `public/index.html`과 `/api/*`를 같은 주소(3000)에서 줌. Next.js 안 씀 | ex01 전 | 제안 |
| D2 | 북마크 폴더 | 화면에는 있고 SPEC에는 없음. 제안: MVP는 폴더 없이, 화면의 폴더 UI는 ex02에서 숨김 | ex01 전 | 대기 |
| D3 | 날짜 기준 | KST. 수집은 매일 06:00. date 없이 부르면 가장 최근 수집일을 돌려주고, 화면 첫 진입은 그 날짜 | ex01 전 | 제안 |
| D4 | 언어 · 런타임 | TypeScript, Node 20 이상, `npm run build` = `tsc` | ex02 전 | 제안 |
| D5 | 자동 실행 | GitHub Actions 예약 실행. 서버가 꺼져 있어도 돎 | ex08 PLAN 전 | 제안 |
| D6 | AI 요약 | 모델은 `claude-opus-5-5`(기본값. 더 싼 모델로 바꿀지는 사용자 결정). 입력은 묶음 기사의 제목 · 짧은 설명만(D0 출처의 이용 조건 안에서) | ex07 PLAN 전 | 제안 |
| D7 | 북마크 대상 | 날짜별 이슈 한 건(issueId). 카드 정보는 이슈에서 가져옴 | ex01 전 | 제안 |
| D8 | 수집 실패 섹션(AC-01-2) | 행을 복사하지 않고, 조회 때 그 섹션만 직전 성공 날짜의 결과를 돌려줌 | ex06 PLAN 전 | 제안 |
| D9 | 로그인 방식 | 이메일 + 비밀번호. Google 로그인은 SPEC 밖 | ex09 PLAN 전 | 제안 |
| D10 | 배포 | 기본은 로컬 시연. AC-08-3은 다른 브라우저(일반 + 시크릿 창)로 보임. 폰 시연을 원하면 ex11 | M3 전 | 제안 |

## 6. AC 커버리지

| US | AC | 처음 동작 | 완성 |
|---|---|---|---|
| US-01 일일 수집 | 01-1 · 01-2 | ex06(손으로 실행) | ex08(매일 자동) |
| US-02 이슈 묶음 | 02-1 · 02-2 | ex06 | ex06 |
| US-03 섹션별 랭킹 | 03-1 · 03-2 | ex02(메모리) | ex04(테스트) · ex05(DB) |
| US-04 AI 요약 카드 | 04-1 · 04-2 · 04-3 | ex02(샘플 요약 · null) | ex07 |
| US-05 대시보드 | 05-1 · 05-2 | ex02(갱신 시각 API) | ex06(실제 수집 시각) |
| US-06 가입 · 로그인 | 06-1 · 06-2 | ex09 | ex09 |
| US-07 북마크 | 07-1 · 07-2 · 07-3 | ex02(메모리, 사용자 구분 없음) | ex10(계정별 · 비로그인 차단) |
| US-08 북마크 대시보드 | 08-1 · 08-2 · 08-3 | ex02 | ex10 |
| US-09 과거 날짜 | 09-1 ~ 09-5 | ex02 · ex03(미래 날짜 거절) | ex05(날짜별 저장) · ex10(09-5) |

- 화면에 이미 있는 동작(04-2 새 탭 · 05-2 모바일 · 09-2 날짜 표시와 오늘 버튼 · 09-4 미래 날짜 막기)은 단계마다 깨지지 않았는지만 확인

## 7. API · 데이터 · 환경 변수 밑그림 (세부는 단계 PLAN에서 확정)

API (ex01에서 확정)

| 메서드 · 경로 | 하는 일 | 주요 응답 |
|---|---|---|
| `GET /api/rankings?date=YYYY-MM-DD` | 그날 섹션별 Top 5. date가 없으면 가장 최근 수집일 | 200 · 404 "해당 날짜의 랭킹 데이터가 없습니다" · 400 잘못된 · 미래 날짜(ex03) |
| `GET /api/bookmarks` | 북마크 목록, 최근 저장 순 | 200 · 401(ex10) |
| `POST /api/bookmarks` | `{ issueId }` 저장 | 201 · 404 없는 이슈 · 401(ex10) |
| `DELETE /api/bookmarks/{issueId}` | 북마크 해제 | 204 · 401(ex10) |
| `/api/auth/*` | 가입 · 로그인 · 로그아웃 · 세션(Better Auth) | ex09 |

- 랭킹 응답: `date` · `updatedAt`(마지막 갱신 시각) · `sections[]`(`key` · `name` · `issues[]`)
- 이슈 카드: `id` · `date` · `section` · `rank` · `title` · `summary`(3줄 배열 또는 null) · `articleCount` · `url`
- 북마크 항목: 이슈 카드 + `savedAt`

테이블 (ex05에서 확정)

| 테이블 | 주요 칸 | 단계 |
|---|---|---|
| `issues` | id · date · section · title · url · press · article_count · latest_published_at · summary(null 가능) · source_key(출처의 묶음 id) | ex05(source_key는 ex06) |
| `collect_runs` | date · section · status(ok/failed) · message · finished_at | ex06 |
| `bookmarks` | id · issue_id · created_at · user_id | ex05(user_id는 ex10) |
| Better Auth | user · session · account · verification | ex09 |

환경 변수 (이름 고정, 값은 `.env`에만, `.env.example`에는 이름만)

| 이름 | 쓰는 곳 | 단계 |
|---|---|---|
| `PORT` | 서버 포트(기본 3000) | ex02 |
| `DATABASE_URL` | Supabase 접속(연결 풀러 주소) | ex05 |
| 출처 키(이름은 D0 뒤에) | 수집 | ex06 |
| `ANTHROPIC_API_KEY` | AI 요약 | ex07 |
| `BETTER_AUTH_SECRET` · `BETTER_AUTH_URL` | 로그인 | ex09 |

## 8. 위험과 대비

R1 출처 정책 (최우선)
- 2026-10-07 확인: `news.naver.com/robots.txt`가 모든 봇을 막고(`User-agent: *` · `Disallow: /`), AI 학습 · RAG 목적의 봇 접근을 명시적으로 금지함
- 정치 섹션 페이지에는 헤드라인 묶음 10개(묶음 id · 기사 수)가 있어 SPEC 방식이 기술적으로는 가능함. 하지만 그대로 자동 수집하고 AI로 요약하면 이 정책을 어기게 됨
- 대비: D0에서 출처를 정하고 지도교수와 합의함. ex01~ex05는 출처와 상관없이 먼저 진행
  - 후보 ① 빅카인즈(한국언론진흥재단): 이슈 랭킹 기능이 있음. API는 이용 신청 · 승인이 필요하고 제공 범위는 확인 필요
  - 후보 ② 네이버 검색 API: 공식 경로. 섹션 · 묶음 정보가 없어 직접 묶어야 함
  - 후보 ③ 언론사 RSS: 섹션별 피드. 직접 묶어야 함
  - 어느 후보든 약관에서 "자동 수집"과 "AI 요약에 사용"이 허용되는지 확인

그 밖의 위험

| # | 위험 | 대비 |
|---|---|---|
| R2 | 시연 당일 수집 · AI 장애 | 시연은 이미 저장된 데이터로 함. 라이브 수집 · 요약에 기대지 않음 |
| R3 | 과거 날짜 데이터 부족(US-09) | M2를 발표 2주 전까지 끝냄. ex06이 되면 ex08 전까지 매일 한 번 손으로 실행 |
| R4 | 출처 구조 변경 · 차단 | 파서 테스트는 저장한 샘플로. 실패하면 D8대로 직전 결과 유지 |
| R5 | AI 비용 · 실패 | 하루 Top 5 × 6섹션 = 30건만 요약. 이미 요약한 이슈는 다시 하지 않음. 실패는 null로 두고 재시도 |
| R6 | Supabase 접속 · 정지 | 연결 풀러 주소 사용(직접 연결 주소는 IPv6 전용이라 GitHub Actions에서 실패할 수 있음). 무료 프로젝트는 약 1주 안 쓰면 일시 정지 → 매일 자동 실행으로 깨워 둠 |

## 9. 0단계 준비 (ex01 전)

- [ ] 첫 커밋: 지금 파일 전부(아직 커밋이 하나도 없음). `.gitignore`가 `.env` · `node_modules`를 빼는지 확인
- [ ] GitHub 저장소 만들기(ex08 자동 실행에 필요, private 가능)
- [ ] `node -v`가 20 이상인지 확인
- [ ] D0 출처 조사: 후보마다 약관 확인, 승인이 필요하면 바로 신청
- [ ] D2 결정, D1 · D3 · D7 제안 확인(ex01 계약에 들어감)
- [ ] 계정 미리 만들기: Supabase(ex05) · Anthropic Console API 키와 결제 수단(ex07)
- [ ] 발표일 확인 → 2절 M2 날짜 적기

## 10. 단계 메모 (다음 PLAN에 넘길 것)

- 아직 없음. 심사 · 실습에서 실제로 문제가 된 것만 `exXX: 한 줄`로 적음

## 11. 시연 점검표 (M3 뒤, 발표 전날 다시)

- [ ] 메인: 6개 섹션 Top 5 · 마지막 갱신 시각 · 카드(요약 3줄 · 연관기사 수 · 원문 새 탭)
- [ ] 요약 실패 카드: "요약을 준비 중입니다"
- [ ] 날짜: 어제로 이동 · 데이터 없는 날 안내 · "오늘" 버튼 · 미래 날짜 선택 불가
- [ ] 계정: 가입 → 로그인 → 북마크 저장 · 해제 → 북마크 화면(최근 저장 순) · 없을 때 안내
- [ ] 다른 브라우저(또는 기기)에서 같은 계정 → 같은 북마크
- [ ] 비로그인으로 북마크 → 로그인 안내
- [ ] 모바일 폭: 가로 스크롤 없이 세로로 쌓임
- [ ] 최근 7일 이상 데이터가 있고, 자동 실행 기록이 정상이고, 라이브 수집 없이 시연 가능
