# ex03 심사 결과 — Zod 입력 검사(날짜 · 섹션 · 폴더 이름)

- 대상: `ex03/`(출발점 `ex02/`). 기준: SPEC.md · PLAN.md(5절 · 6절) · plan/PLAN_backend_ex03.md · ex01 · ex02 PLAN · CLAUDE.md. 제작 보고: reports/ex03_build.md
- 실행일: 2026-10-07(KST). 쓴 날짜: 오늘 2026-10-07 · 어제 2026-10-06 · 내일 2026-10-08 · 44일 전 2026-08-24 · 45일 전 2026-08-23 · 데이터 없는 고정 날짜 2000-01-01
- 코드는 고치지 않음. 실험 전후로 `frontend/` · `ex01/` · `ex02/` · `ex03/` 소스 파일(node_modules · .next · 빌드 산출물 제외, 30개)의 sha256이 같음. git 커밋 안 함
- 브라우저 도구가 없음. 화면 줄(화면 주소 · 요약 null 카드 · 데이터 없는 날 안내 · 없을 때 안내 · 화면 오늘(KST) · 화면 흐름)은 `public/index.html` 코드 읽기, 받은 HTML 확인, API 순서 재현, 시간대를 바꾼 node 실행으로 판단함

## 최종 판정: **PASS**
- PLAN 항목 6/6 done · `npm.cmd run build` 성공 · 검증 38/38 OK · 위반 없음
- 참고 1건(판정 제외, PLAN 검증표에 없는 경계 입력): 이모지처럼 서로게이트 쌍인 글자는 폴더 이름 길이를 "문자열 length"가 아니라 코드 포인트로 셈(아래 6절)

## 1. PLAN 항목별
| PLAN 항목 | 판정 | 근거 |
|---|---|---|
| 1. `ex02/` → `ex03/` 복사(`node_modules` · `.next` 제외), name `issuerank-ex03`, `npm.cmd install` 뒤 `zod` · `@hono/zod-validator` 설치 | done | `diff -rq ex02 ex03`에서 다른 파일은 PLAN 대상 파일 + package(-lock).json + gitignore 대상 산출물뿐. `package.json` name `issuerank-ex03`, 의존성 추가는 `zod ^4.6.5` · `@hono/zod-validator ^0.9.1` 두 개뿐(lock도 이 두 패키지만 늘어남) |
| 2. `server/schemas.ts`에 입력 규칙 | done | 메시지 4개 · `rankingsQuery`(`z.iso.date` 형식 + 달력 → `refine(d <= kstToday())`, optional) · `bookmarkCreate`(`{날짜}-{섹션 키}-{숫자}`, 섹션은 `SECTIONS`, 미래 여부 안 봄 · `folderId` min 1) · `folderCreate`(`trim().min(1).max(16)`, 객체가 아니면 "요청 형식이 올바르지 않습니다") · 공용 `validate()`가 첫 issue의 메시지로 400 `{ message }`. `SECTIONS` · `kstToday()`를 `sample.ts`에서 그대로 가져옴 |
| 3. 라우트 3곳 검사 연결 · 깨진 본문 400 · 공백 뺀 이름 저장 | done | `rankings.ts` `validate('query', …)`(생략 시 `kstToday()` 그대로), `bookmarks.ts` `validate('json', …)` 뒤에 404 · 409 판단, `folders.ts` `c.req.valid('json').name` 저장. 깨진 JSON은 `server/index.ts`의 `app.onError`가 400 `{ message }`로 바꿈(3절 참고) |
| 4. `openapi.yaml` 400 추가 | done | `GET /api/rankings` date 설명 끝에 "오늘(KST) 이후면 400." + 400(예시 `badFormat` · `future`), `POST /api/bookmarks` 400, `POST /api/folders` 400에 깨진 본문 예시(`example` → `examples` 두 개). 지운 줄 3줄은 모두 이 변경에 딸린 것(설명 한 줄 덧붙임 · `example:` → `examples:`) |
| 5. 화면 `TODAY`를 KST로 | done | 481줄 `const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);`(서버 `kstToday`와 같은 식). `iso(TODAY)` 7곳을 `TODAY`로(첫 상태 · "· 오늘" · `max` · 다음 날 비활성 · 미래 날짜 막기 · "오늘" 버튼 · → 키). 400 토스트(`e.message`) · 문구 · 레이아웃 그대로 |
| 마지막. `npm run build` | done | 성공(4절) |

## 2. SPEC 근거 AC
| AC | 판정 | 근거 |
|---|---|---|
| AC-09-3 데이터 없는 날 안내 | 충족 | `?date=2000-01-01` · 45일 전 → 404 "해당 날짜의 랭킹 데이터가 없습니다"(400 아님), 44일 전 200. 화면은 404일 때 토스트 없이 `emptyNoData` 같은 문구(코드 읽기) |
| AC-09-4 오늘 이후 선택 불가 | 충족 | 서버: 내일 · 2999-01-01 → 400 "오늘 이후 날짜는 조회할 수 없습니다". 화면: `max = TODAY`(KST), `setDate`가 TODAY 넘는 날을 TODAY로 막음, 다음 날 버튼 · → 키도 TODAY 기준. America/Los_Angeles에서 실행해도 TODAY = API `date`(코드 실행으로 확인) |
| AC-10-2 새 폴더 1~16자(앞뒤 공백 제외) · 바로 저장 | 충족 | 16자 201 · 17자 · 공백만 · 빈 칸 · 숫자 → 400 "폴더 이름은 1~16자로 입력해 주세요", 앞뒤 공백 뺀 값으로 저장, 만든 폴더로 북마크 POST 201 · count 1. 화면은 폴더 POST 뒤 그 id로 `save`(ex02 그대로). 서로게이트 쌍 글자는 6절 참고 |

## 3. PLAN 밖 추가 · 불필요한 변경 · 출발점 · 기존 화면 동작
- PLAN에 없는데 추가된 것: `server/index.ts`의 `app.onError` 한 곳. PLAN이 위치를 정하지 않은 세부지만 "깨진 본문 400"을 하려면 필요함(@hono/zod-validator가 깨진 JSON에서 Zod 검사 전에 HTTPException 400과 글자 본문을 던짐). 400 외 예외는 Hono 기본 처리(`getResponse()` · 500 `Internal Server Error`)와 같음. 제작 보고 1절에 적혀 있음 → 허용 범위로 봄
- ex02에서 불필요하게 바뀐 것: 없음. `app/` · `sample.ts` · `next.config.mjs` · `tsconfig.json` · `.env.example`은 ex02와 같음. `index.html`은 날짜 줄 8곳만 바뀜
- 출발점: `git status frontend/ ex01/ ex02/` 변경 없음, 실험 전후 해시도 같음
- 화면에 이미 있던 동작(PLAN.md 6절, 코드 읽기): 04-2 새 탭 · 05-2 모바일 레이아웃 · 10-3 폴더 칩 코드는 ex02와 같음. 09-2 날짜 표시 · "오늘" 버튼, 09-4 미래 날짜 막기는 기준만 KST로 바뀌고 동작은 그대로 → 깨진 것 없음

## 4. 빌드
- `npm.cmd run build`(ex03) 성공: `next build`(Next.js 16.4.0 Turbopack) "Compiled successfully", 라우트 `/_not-found` · `ƒ /api/[...path]`, 이어서 `tsc --noEmit` 오류 없음
- 서버를 띄우기 전에 실행함(dev와 `.next`가 겹치지 않게)

## 5. 검증 방법 (PLAN 표 순서, 요청은 node fetch로 3000에)
| # | 확인 | 결과 | 실제 |
|---|---|---|---|
| 1 | OpenAPI 형식 | [OK] | `npx @redocly/cli lint` 오류 0, 경고 4(info-license · localhost server · GET 북마크 · 폴더 4XX 없음, 이번 변경과 무관) |
| 2 | 엔드포인트 | [OK] | 6개만: rankings GET · bookmarks GET/POST · bookmarks/{issueId} DELETE · folders GET/POST |
| 3 | 상태 코드 | [OK] | rankings 200·400·404 / bookmarks GET 200, POST 201·400·404·409 / DELETE 204·404 / folders GET 200, POST 201·400 → ex01에 400 두 개만 더해짐 |
| 4 | 실패 메시지 | [OK] | 9개 모두 글자 그대로 있음 |
| 5 | 이슈 칸 | [OK] | required 8개, `summary` `type: [array, 'null']` · min/maxItems 3 |
| 6 | 섹션 키 | [OK] | `SectionKey` enum `[pol, eco, soc, cul, wor, it]` |
| 7 | 폴더 이름 | [OK] | `FolderCreate.name` minLength 1 · maxLength 16 |
| 8 | 계약 변경 범위 | [OK] | `git diff --no-index` +33/−3. 400 응답 · 예시 · date 설명만. −3줄은 설명 덧붙임 1줄과 `example:` → `examples:` 2줄(예시를 2개로 늘리는 데 필요, 원래 메시지 값은 `badName`으로 남음) |
| 9 | 출발점 그대로 | [OK] | `git status frontend/ ex01/ ex02/` 출력 없음 |
| 10 | 빌드 | [OK] | 4절 |
| 11 | 화면 주소 | [OK] | `GET /` 200 HTML(49,900B, `dateText` · `fetch('/api'` 포함). 이슈맵 · 6개 섹션 · 갱신 시각 줄 렌더 코드는 ex02와 같음(브라우저 없음 → 코드 읽기) |
| 12 | 오늘 랭킹 | [OK] | 200, date 2026-10-07, sections 6 · 각 5, articleCount 내림차순 · rank 1~5, updatedAt `2026-10-07T06:00:00+09:00` |
| 13 | 섹션 짝 | [OK] | pol 정치 · eco 경제 · soc 사회 · cul 생활·문화 · wor 세계 · it IT·과학 |
| 14 | 요약 null | [OK] | soc에 null 1개(전체 1개). 화면 `summaryHTML`이 null이면 "요약을 준비 중입니다"(코드 읽기) |
| 15 | 지난 날짜 | [OK] | 200, date 2026-10-06, id 30개 모두 `2026-10-06-`로 시작 · 오늘 id와 안 겹침 |
| 16 | 데이터 없는 날 | [OK] | 404 "해당 날짜의 랭킹 데이터가 없습니다". 화면 `emptyNoData` 같은 문구(코드 읽기) |
| 17 | 북마크 목록 | [OK] | 200, 10개, savedAt 내림차순, 이슈 8칸 + folderId · ISO savedAt |
| 18 | 폴더 목록 | [OK] | f1 반도체·AI 4 · f2 부동산·금리 3 · f3 나중에 읽기 3 |
| 19 | 저장 | [OK] | 201, 목록 맨 앞 `2026-10-07-pol-0` · f1, f1 count 5 |
| 20 | 폴더 하나만 | [OK] | 409 "이미 북마크한 이슈입니다", f2 3 → 3 |
| 21 | 없는 이슈 · 폴더 | [OK] | 404 "이슈를 찾을 수 없습니다" · 404 "폴더를 찾을 수 없습니다" |
| 22 | 해제 | [OK] | 204 · 목록에서 빠짐, 두 번째 404 "북마크를 찾을 수 없습니다" |
| 23 | 새 폴더 | [OK] | 201 `{"id":"f4","name":"테스트","count":0}` → 북마크 POST 201 → f4 count 1 |
| 24 | 없을 때 | [OK] | `[]`. 화면 "북마크한 기사가 없습니다"(코드 읽기) |
| 25 | 날짜 형식 | [OK] | `2026-10-7` · `2026-02-30` · `?date=` · `abc` 모두 400 "날짜는 YYYY-MM-DD 형식으로 입력해 주세요", 본문 칸은 `message` 하나 |
| 26 | 미래 날짜 | [OK] | 2026-10-08 · 2999-01-01 모두 400 "오늘 이후 날짜는 조회할 수 없습니다" |
| 27 | 지난 날 경계 | [OK] | 2026-08-24 200 · 2026-08-23 404 "해당 날짜의 랭킹 데이터가 없습니다" |
| 28 | 깨진 본문 | [OK] | 북마크 · 폴더 둘 다 400 "요청 형식이 올바르지 않습니다" |
| 29 | 북마크 칸 | [OK] | `{}` · `abc` · `<어제>-xyz-0` · `folderId: ""` 모두 400 "요청 형식이 올바르지 않습니다", 목록 `[]` 그대로 |
| 30 | 폴더 이름 길이 | [OK] | "가"×16 201, ×17 · `"   "` · `{}` · `{name:3}` 모두 400 "폴더 이름은 1~16자로 입력해 주세요" |
| 31 | 앞뒤 공백 | [OK] | 201 "여행" · 201 "나"×16, 폴더 목록도 같음 |
| 32 | 같은 이름 | [OK] | 201(f8), 폴더 목록에 "여행" 2개(f6 · f8) |
| 33 | 화면 오늘(KST) | [OK] | 브라우저 없음 → `index.html`의 `TODAY` · `iso` · `parse` · `addDays` 줄을 그대로 뽑아 `TZ=America/Los_Angeles` node로 실행: TODAY 2026-10-07 = API `date`, 다음 날 2026-10-08 > max라 막힘. UTC 2026-10-07T15:30(KST 10-08 00:30, LA는 10-07)으로 고정하면 TODAY 2026-10-08(KST). "· 오늘" · 다음 날 비활성 · `max`는 모두 이 `TODAY`와 비교(코드 읽기) |
| 34 | 화면 흐름 | [OK] | api 재시작 뒤 API 순서 재현: 재시작 직후 북마크 10 · 폴더 4/3/3 → 저장 201 → 다시 받은 목록에 활성 → 해제 204 · 빠짐 → 되돌리기(같은 issueId · folderId 재POST) 201 · 다시 보임 → 폴더별 개수 = count, 전체 = 합계. 칩 필터 · "전체" · 개수 렌더 코드는 ex02와 같음(코드 읽기) |
| 35 | 중계 그대로 | [OK] | 8787 · 3000의 `?date=2026-10-06` 둘 다 200, 본문 글자까지 같음(7,589B). 참고로 400 응답도 같음 |
| 36 | Hono 꺼짐 | [OK] | 502 `{"message":"API 서버에 연결할 수 없습니다"}` |
| 37 | 가짜 데이터 제거 | [OK] | `\bPOOL\b` · `\brankingFor\b` · `\bseedBookmarks\b` · `\b8787\b` · `\bit\.sec\b` · `\bit\.count\b` 0건 |
| 38 | 지역 시간 제거 | [OK] | `\bsetHours\b` 0건, `TODAY`는 +9시간 계산의 `YYYY-MM-DD` 문자열 |

**합계 38/38 OK**

- 끝난 뒤: 3000 · 8787 둘 다 끔, 리슨 없음 · node 프로세스 없음 확인. 메모리 데이터라 임시로 넣은 북마크 · 폴더는 서버 종료로 사라짐. 실험용 스크립트 · 해시는 scratchpad에만 둠. dev · build가 만든 `AGENTS.md` · `next-env.d.ts` · `tsconfig.tsbuildinfo` · `.next/`는 .gitignore 대상이라 둠

## 6. 지켜야 할 것
| 항목 | 결과 |
|---|---|
| 기사 본문 저장 · 표시 | 위반 없음(샘플은 제목 · 요약 · 개수 · 링크만, 이번 변경은 검사뿐) |
| 코드에 들어간 키 · 접속 정보 | 없음. `ex03/.env` 없음, `.env.example`은 `API_PORT=` · `API_URL=` 이름만 |
| `.env` git 제외 | `git check-ignore`로 `ex03/.env`가 루트 `.gitignore`의 `.env`에 걸림 |
| PLAN에 없는 패키지 | 없음(zod · @hono/zod-validator만) |
| D0 밖의 출처 수집 | 없음(외부 fetch는 BFF → `API_URL`뿐) |
| CLAUDE.md 규칙 | 위반 못 찾음. 지운 것 없음, 구조 변경 · 리팩터링 없음, 커밋 없음, 빌드 결과 · 브라우저 확인 목록 · "추가로 보인 점"을 보고에 적음 |

참고(PLAN 검증표에 없는 경계 입력, 판정에서 뺌)
- **폴더 이름 길이를 세는 방법**: PLAN 입력 규칙은 "앞뒤 공백을 뺀 길이(문자열 length) 1~16"인데, zod 4.6.5의 `.max()`는 UTF-16 길이가 최대를 넘으면 코드 포인트로 다시 셈(`node_modules/zod/v4/core/checks.js` 273줄). 그래서 `"😀".repeat(9)`(length 18)가 201(f11)로 만들어짐. 한글 · 영문 · 결합 문자(`é`×9, length 18 → 400)는 PLAN대로임. 화면 입력란 `maxlength=16`은 UTF-16 단위라 화면에서는 이런 이름이 나오지 않음. 계약 `maxLength: 16`(JSON Schema는 글자 수로 셈)과는 맞음. PLAN 글자 그대로 맞추려면 길이 검사를 `refine(s => s.length <= 16)`처럼 바꾸거나, PLAN의 "(문자열 length)"를 고치는 쪽을 사람이 정하면 됨
- 미래 날짜가 든 issueId(`2026-10-08-pol-0`)는 형식 통과 → 404 "이슈를 찾을 수 없습니다"(PLAN "미래 여부는 안 봄"대로)
- 500 없음: 배열 · 문자열 · `null` · 숫자 본문, 빈 본문, `issueId`/`folderId` 숫자 → 모두 400 "요청 형식이 올바르지 않습니다". `?date=a&date=b` · 같은 날짜 두 번 · `2026-10-07T00:00` · `%20` → 400 형식 메시지. `2024-02-29` 형식 통과(데이터 없어 404), `2025-02-29` 400
- 표에 없는 칸(`extra`)은 무시되고 201
- `Content-Type` 없이 보낸 POST: 북마크 400 "요청 형식이 올바르지 않습니다", 폴더 400 "폴더 이름은 1~16자로 입력해 주세요"(본문을 안 읽고 `{}`로 검사. 제작 보고 7절과 같음)

## 7. 다음 단계에 넘길 만한 것
- ex03: zod 4의 문자열 `max`는 이모지 같은 글자를 코드 포인트로 셈 → 폴더 이름 "문자열 length" 규칙과 어긋남. ex04 테스트에서 어느 쪽으로 할지 정하고 고정
- ex03: `onError`가 모든 400 HTTPException을 "요청 형식이 올바르지 않습니다"로 바꿈 → 뒤 단계에서 다른 400 예외를 던지면 문구가 겹칠 수 있음(제작 보고 7절)
- ex03: 계약 `BookmarkCreate`에 issueId 패턴 · folderId minLength가 없고 `POST /api/folders` 400 description이 깨진 본문 예시와 조금 어긋남 → ex04 계약 정리 범위
