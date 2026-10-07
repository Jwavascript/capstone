# PLAN_backend_ex04 — Vitest 테스트, openapi.yaml 정리

> 이유: 랭킹 · 입력 규칙을 매번 서버를 띄워 손으로 확인하고, 연관기사 수가 같을 때의 순서(AC-03-2)는 정해져 있지 않으며, 계약이 실제 이슈 id · 입력 규칙과 어긋남. 그래서 순위 규칙을 함수로 빼고, 랭킹 · API 동작을 고정 시각 · 샘플로 Vitest 테스트에 고정하고, `openapi.yaml`을 실제 규칙에 맞춤.
> 코드 폴더: `ex04/` (`ex03/` 복사)
> SPEC 근거: AC-03-2

## 이번 범위
- 순위 규칙을 `server/ranking.ts`로 빼고, Hono 앱을 서버 없이 부르는 테스트와 `npm test`를 더함. 계약은 아래 "계약 정리" 줄만 고침
- 새 패키지: vitest
- 하지 않음: DB 저장(ex05) · 수집 fixture 테스트(ex06) · 로그인 · 401(ex10 · ex11) · `DELETE /api/bookmarks/{issueId}`의 id 검사(지금처럼 404) · 계약과 실제 응답의 자동 대조 · 화면 자동 테스트 · 이모지 합성(ZWJ · 국기)을 1자로 세기 · 화면 `maxlength` 변경 · CI

## 테스트
- 실행: `npm test` = `vitest run`. `server/app.ts`가 Hono 앱(라우트 3개 · `onError`)을 내보내고 `server/index.ts`는 그 앱을 `serve`만 함. 테스트는 `app.request(경로, { method, headers, body })`로 부름 → 포트 · 네트워크 · 외부 API 없음
- 시간: `vitest.config.ts`의 `setupFiles: ['test/setup.ts']`에서 테스트마다 `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime('2026-10-07T12:00:00+09:00')`, 끝나면 `vi.useRealTimers()`. 기대 날짜는 문자열 상수(오늘 2026-10-07 · 어제 10-06 · 내일 10-08 · 44일 전 08-24 · 45일 전 08-23)로 쓰고 `new Date()` · `Date.now()`로 만들지 않음
- 상태: `sample.ts`의 `resetSample()`이 폴더 f1~f3 · 샘플 북마크 10개 · 다음 폴더 번호 4로 되돌림. 모듈을 읽을 때 한 번, setup에서 시간을 고정한 뒤 테스트마다 한 번 → 테스트 순서와 무관
- 순위: `rankIssues(후보[])` = 연관기사 수 ↓ → `latestPublishedAt`(ISO, 문자열이 아니라 시각으로 비교) ↓ → id ↑, 앞 5개에 `rank` 1~5. `rankingFor`는 지금처럼 날짜별로 뽑은 5개(soc-6 포함)에 rng로 연관기사 수와 그날 KST 00:00~05:59 발행 시각을 붙여 이 함수로 줄 세움. 응답 카드에 발행 시각은 넣지 않음(8칸 그대로)

| 파일 · 묶음 | 입력(시각 2026-10-07 12:00 KST) | 기대 결과 |
|---|---|---|
| `ranking.test.ts` 동점(AC-03-2) | 후보 7개: c1 120건 · c2 80건 `2026-10-07T05:10:00+09:00` · c3 80건 `…05:40:00+09:00` · c4 80건 `2026-10-06T21:00:00Z`(=KST 06:00) · c5 30건 · c6 30건 · c7 10건(c1 · c5 · c6 · c7은 `2026-10-07T03:00:00+09:00`) | c1 · c4 · c3 · c2 · c5, `rank` 1~5, c6 · c7 빠짐. 거꾸로 넣어도 같음 |
| 〃 적은 후보 | 후보 3개 | 3개, `rank` 1~3 |
| `api.test.ts` 오늘 랭킹(AC-03-1) | `GET /api/rankings` 두 번 | 200, `date` 2026-10-07, `updatedAt` `2026-10-07T06:00:00+09:00`, 섹션 6개 key · name 짝 · 순서(ex02), 섹션마다 5개 · `articleCount` 내림차순 · `rank` 1~5, 카드마다 8칸만, soc에 `summary: null` 1개. 두 본문 같음 |
| 지난 날짜(AC-09-1 · 09-3) | `?date=2026-10-06` · `2026-08-24` · `2026-08-23` · `2000-01-01` | 200(id 모두 `2026-10-06-`로 시작) · 200 · 404 · 404 "해당 날짜의 랭킹 데이터가 없습니다" |
| 날짜 형식 | `?date=2026-10-7` · `2026-02-30` · 빈 값 · `abc` | 400 "날짜는 YYYY-MM-DD 형식으로 입력해 주세요" |
| 미래 날짜(AC-09-4) | `?date=2026-10-08` · `2999-01-01` | 400 "오늘 이후 날짜는 조회할 수 없습니다" |
| KST 자정 | 시각 `2026-10-07T23:59:59+09:00`에서 date 생략 · `?date=2026-10-08`, `2026-10-08T00:00:00+09:00`에서 같은 두 요청 | `date` 10-07 · 400, `date` 10-08 · 200 |
| 목록(AC-08-1 · 10-1) | `GET /api/bookmarks` · `GET /api/folders` | 10개 `savedAt` 내림차순 · 맨 앞 `2026-10-06T21:10:00+09:00` · 항목마다 8칸 + `folderId` · `savedAt` / f1 반도체·AI 4 · f2 부동산·금리 3 · f3 나중에 읽기 3 |
| 저장 · 폴더 하나(AC-07-1 · 10-4) | 오늘 pol 1위 id로 POST `{ issueId, folderId: "f1" }` → 같은 id로 `"f2"` | 201 · `savedAt` `2026-10-07T03:00:00.000Z` · 목록 맨 앞 · f1 5 → 409 "이미 북마크한 이슈입니다" · f2 3 |
| 없는 이슈 · 폴더 | `issueId: "2000-01-01-pol-0"` · `folderId: "f999"` | 404 "이슈를 찾을 수 없습니다" · "폴더를 찾을 수 없습니다" |
| 해제 · 없을 때(AC-07-2 · 08-2) | 샘플 맨 앞 id로 DELETE 두 번 → 나머지 9개 DELETE 뒤 GET | 204 · 404 "북마크를 찾을 수 없습니다" → `[]` |
| 새 폴더(AC-10-2) | `POST /api/folders` `{ name: "테스트" }` → 그 id로 북마크 POST | 201 `{ id: "f4", name: "테스트", count: 0 }` → f4 count 1 |
| 깨진 본문 · 북마크 칸 | 두 POST에 본문 `{`, 북마크에 `{}` · `issueId: "abc"` · `"2026-10-06-xyz-0"` · `folderId: ""` | 모두 400 "요청 형식이 올바르지 않습니다", 북마크 10개 그대로 |
| 폴더 이름 길이 | `"가".repeat(16)` · `"😀".repeat(16)` / `"가".repeat(17)` · `"😀".repeat(17)` · `"   "` · `{}` · `{ name: 3 }` | 201 / 400 "폴더 이름은 1~16자로 입력해 주세요" |
| 앞뒤 공백 · 같은 이름 | `"  여행  "` · `" " + "나".repeat(16) + " "` · `"여행"` 한 번 더 | 모두 201, `name` "여행" · "나" 16자, "여행" 2개는 id만 다름 |

- 글자 수 = 앞뒤 공백을 뺀 뒤 코드 포인트(`[...name].length`, 😀 1개 = 1자). 지금 zod 동작 그대로라 서버 코드는 안 바뀜
- 계약 정리: 예시 이슈 id를 `{예시 date}-{섹션}-{번호}`로(`pol-0` → `2026-10-07-pol-0`, DELETE 예시 `2026-10-07-it-1`). `components.schemas.IssueId`(string, pattern `^\d{4}-\d{2}-\d{2}-(pol|eco|soc|cul|wor|it)-\d+$`, 설명 "날짜는 달력에 있는 날짜")를 `Issue.id` · `BookmarkCreate.issueId`가 참조, DELETE 경로 파라미터는 string 그대로. `BookmarkCreate.folderId` minLength 1. 랭킹 섹션 항목은 `Section` 스키마(required key · name · issues)에 `oneOf` 6개, 가지마다 `key` · `name`을 `const` 짝으로. `POST /api/folders` 400 description "폴더 이름 규칙 위반(앞뒤 공백을 뺀 1~16자) 또는 깨진 본문", `FolderCreate.name` 설명에 위 글자 수 기준. 나머지 줄 그대로

## 화면 변경
- 없음

## 구현 순서
1. `ex03/` → `ex04/` 복사(`node_modules` · `.next` 제외), `package.json` name을 `issuerank-ex04`로, `npm.cmd install` 뒤 `npm.cmd install -D vitest`, scripts에 `"test": "vitest run"`
2. `server/app.ts`로 앱을 옮기고 `index.ts`는 `serve`만. `sample.ts`에 `resetSample()`, `server/ranking.ts`의 `rankIssues`를 `rankingFor`에 연결
3. `vitest.config.ts` · `test/setup.ts` · `test/ranking.test.ts` · `test/api.test.ts`를 위 표대로(fixture는 테스트 파일 안 상수)
4. `openapi.yaml`을 "계약 정리"대로
마지막. `npm run build` · `npm test`

## 검증 방법
- 테스트 · 계약 줄은 서버 없이. 화면 · 중계 줄은 두 터미널에서 `ex04/`의 `npm.cmd run api` · `npm.cmd run dev`를 막 띄운 상태로, 요청은 node fetch로 `http://localhost:3000`에. 날짜(<어제>)는 KST 기준

| 확인 | 방법 | 기대 결과 |
|---|---|---|
| OpenAPI 형식 | `npx @redocly/cli lint ex04/openapi.yaml`(설치 없이 npx) | 오류 0개(경고는 참고) |
| 엔드포인트 | `paths`의 경로 · 메서드를 표와 비교 | 표의 6개만 있음 |
| 상태 코드 | 경로마다 응답 코드를 ex01 표 + 이번 표와 비교 | ex01 코드에 `GET /api/rankings` · `POST /api/bookmarks`의 400만 더해짐 |
| 실패 메시지 | ex01 표의 메시지 6개 + 이번 표의 새 메시지 3개를 파일에서 검색 | 9개 모두 글자 그대로 있음 |
| 이슈 칸 | 이슈 스키마의 `required`와 속성 | 8개 칸 모두 required, `summary`는 3개 배열 또는 null |
| 섹션 키 | `SectionKey` enum · `Section`의 `oneOf` | enum 정확히 6개 키, `oneOf` 6가지의 `key` · `name` const가 pol 정치 · eco 경제 · soc 사회 · cul 생활·문화 · wor 세계 · it IT·과학 |
| 폴더 이름 | 폴더 만들기 요청의 `name` | minLength 1 · maxLength 16, 설명에 앞뒤 공백 · 코드 포인트 기준 |
| 이슈 id 규칙 | `IssueId` · `BookmarkCreate`, 파일에서 정규식 `(id\|issueId\|example): '?(pol\|eco\|soc\|cul\|wor\|it)-` 검색 | pattern이 위 값, `Issue.id` · `issueId`가 참조, folderId minLength 1, 검색 0건 |
| 계약 변경 범위 | `git diff --no-index ex03/openapi.yaml ex04/openapi.yaml` | 예시 id · `IssueId` · `Section` · folderId minLength · folders 400 description · name 설명만 바뀜 |
| 출발점 그대로 | `git status frontend/ ex01/ ex02/ ex03/` | 변경 없음 |
| 빌드 | `npm.cmd run build` | 성공 |
| 테스트 | `npm.cmd test` | 테스트 파일 2개 모두 통과, 실패 0 |
| 테스트 범위 | 테스트 이름 · 내용을 위 표와 비교 | 표의 15개 묶음이 각각 테스트로 있음(AC-03-1 · 03-2 · 07-1 · 07-2 · 08-1 · 08-2 · 09-1 · 09-3 · 09-4 · 10-1 · 10-2 · 10-4) |
| 서버 없이 | api · dev 서버를 모두 끄고 `npm.cmd test`, `test/`에서 `\bfetch\(` · `localhost` · `8787` 검색 | 통과, 0건 |
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
