# PLAN_backend_ex03 — Zod 입력 검사(날짜 · 섹션 · 폴더 이름)

> 이유: 입력 검사가 없어 깨진 JSON · 빠진 칸은 500, 17자 폴더 이름도 만들어지고, `2026-10-7` · 내일 날짜도 받아 404로 답함. 그래서 Zod로 날짜 · 섹션(이슈 id) · 폴더 이름을 검사해 400과 화면에 보일 문구로 거절하고, 화면의 "오늘"도 KST로 맞춤.
> 코드 폴더: `ex03/` (`ex02/` 복사)
> SPEC 근거: AC-09-3 · AC-09-4 · AC-10-2

## 이번 범위
- Hono 라우트 3곳(랭킹 조회 · 북마크 저장 · 폴더 만들기)에 Zod 검사를 붙이고, 계약(`openapi.yaml`)에 새 400을 더함. 화면의 "오늘"을 KST 날짜로 바꿈
- 새 패키지: zod · @hono/zod-validator
- 하지 않음: 테스트와 `openapi.yaml` 정리(id 예시 `it-1` · key/name 짝 스키마, ex04) · DB 저장(ex05) · 로그인 · 401 · 사용자 구분(ex10 · ex11) · `DELETE /api/bookmarks/{issueId}`의 id 검사(지금처럼 404) · 같은 이름 폴더 막기 · 화면 전용 오류 문구(서버 `message` 토스트 그대로)

## 입력 규칙
| 요청 | 칸 | 규칙 | 어기면 400 메시지 |
|---|---|---|---|
| `GET /api/rankings` | `date`(쿼리, 생략 가능) | `YYYY-MM-DD`(월 · 일 두 자리), 달력에 있는 날짜. 빈 값(`?date=`)도 위반 | "날짜는 YYYY-MM-DD 형식으로 입력해 주세요" |
| 〃 | 〃 | KST 오늘 이하. 생략하면 KST 오늘(지금 그대로) | "오늘 이후 날짜는 조회할 수 없습니다" |
| `POST /api/bookmarks` | `issueId` | 문자열 `{날짜}-{섹션 키}-{숫자}`. 날짜는 위 형식 규칙(미래 여부는 안 봄), 섹션 키는 6개 중 하나 | "요청 형식이 올바르지 않습니다" |
| 〃 | `folderId` | 빈 문자열이 아닌 문자열 | 〃 |
| `POST /api/folders` | `name` | 문자열. 앞뒤 공백을 뺀 길이(문자열 length) 1~16, 뺀 값으로 저장. 같은 이름 허용(화면 그대로) | "폴더 이름은 1~16자로 입력해 주세요" |
| POST 둘 다 | 본문 전체 | JSON 객체로 읽혀야 함(깨진 JSON · 배열 · 문자열은 위반). 표에 없는 칸은 무시 | "요청 형식이 올바르지 않습니다" |

- 400 본문은 `{ message }` 하나. 검사는 404 · 409 판단보다 먼저, 날짜는 형식 → 미래 순서. 이 표의 어떤 입력도 500이 되지 않음
- 규칙은 `server/schemas.ts` 한곳에. 섹션 키는 `sample.ts`의 `SECTIONS`, 오늘은 `kstToday()`를 그대로 씀
- 계약: `GET /api/rankings`에 400(날짜 메시지 2개 예시)과 date 설명 "오늘(KST) 이후면 400", `POST /api/bookmarks`에 400, `POST /api/folders`의 400에 깨진 본문 예시를 더함. 나머지 줄 그대로

## 화면 변경
- `TODAY`를 브라우저 지역 시간 대신 KST `YYYY-MM-DD`(서버 `kstToday`와 같은 계산)로 바꿈 → 날짜 입력 `max` · "· 오늘" 표시 · 다음 날 버튼 · "오늘" 버튼 · → 키가 모두 KST 기준
- 400은 지금처럼 응답 `message`를 토스트로. 문구 · 레이아웃 그대로

## 구현 순서
1. `ex02/` → `ex03/` 복사(`node_modules` · `.next` 제외), `package.json` name을 `issuerank-ex03`으로, `npm.cmd install` 뒤 `npm.cmd install zod @hono/zod-validator`
2. `server/schemas.ts`에 위 표의 규칙
3. `server/routes/` 세 라우트에 검사 연결 · 깨진 본문 400 · 폴더는 공백 뺀 이름 저장
4. `openapi.yaml`에 위 "계약" 줄대로 400 추가
5. `public/index.html`의 Date 부분을 위 "화면 변경"대로
마지막. `npm run build`

## 검증 방법
- 두 터미널에서 `ex03/`의 `npm.cmd run api` · `npm.cmd run dev`를 막 띄운 상태에서 위에서 아래 순서로. 요청은 node fetch로 `http://localhost:3000`에. 날짜(<어제> · <내일> 등)는 KST 기준

| 확인 | 방법 | 기대 결과 |
|---|---|---|
| OpenAPI 형식 | `npx @redocly/cli lint ex03/openapi.yaml`(설치 없이 npx) | 오류 0개(경고는 참고) |
| 엔드포인트 | `paths`의 경로 · 메서드를 표와 비교 | 표의 6개만 있음 |
| 상태 코드 | 경로마다 응답 코드를 ex01 표 + 이번 표와 비교 | ex01 코드에 `GET /api/rankings` · `POST /api/bookmarks`의 400만 더해짐 |
| 실패 메시지 | ex01 표의 메시지 6개 + 이번 표의 새 메시지 3개를 파일에서 검색 | 9개 모두 글자 그대로 있음 |
| 이슈 칸 | 이슈 스키마의 `required`와 속성 | 8개 칸 모두 required, `summary`는 3개 배열 또는 null |
| 섹션 키 | `section` · `key`의 enum | 정확히 6개 키 |
| 폴더 이름 | 폴더 만들기 요청의 `name` | minLength 1 · maxLength 16 |
| 계약 변경 범위 | `git diff --no-index ex02/openapi.yaml ex03/openapi.yaml` | 400 응답 · 예시 · date 설명만 더해지고 다른 줄 그대로 |
| 출발점 그대로 | `git status frontend/ ex01/ ex02/` | 변경 없음 |
| 빌드 | `npm.cmd run build` | 성공 |
| 화면 주소 | 브라우저로 `http://localhost:3000/` | 이슈맵이 뜨고 6개 섹션 · 갱신 시각 줄이 보임(AC-05-1) |
| 오늘 랭킹 | `GET /api/rankings` | 200, `date` = KST 오늘, `sections` 6개 · 섹션마다 5개, `articleCount` 내림차순 · `rank` 1~5, `updatedAt`이 `+09:00`로 끝남(AC-03-1) |
| 섹션 짝 | 같은 응답의 `key` · `name` | pol 정치 · eco 경제 · soc 사회 · cul 생활·문화 · wor 세계 · it IT·과학 순서 그대로 |
| 요약 null | 같은 응답의 soc 섹션 | `summary: null` 이슈 1개, 화면 카드에 "요약을 준비 중입니다" |
| 지난 날짜 | `GET /api/rankings?date=<어제>` | 200, `date` = 어제, 모든 이슈 id가 `<어제>-`로 시작해 오늘 id와 겹치지 않음(AC-09-1) |
| 데이터 없는 날 | `GET /api/rankings?date=2000-01-01` | 404 "해당 날짜의 랭킹 데이터가 없습니다", 화면은 같은 안내 |
| 북마크 목록 | `GET /api/bookmarks` | 200, 10개, `savedAt` 내림차순, 항목마다 이슈 8칸 + `folderId` · ISO `savedAt`(AC-08-1) |
| 폴더 목록 | `GET /api/folders` | 200, `f1` · `f2` · `f3` 이름 그대로, `count` 4 · 3 · 3(AC-10-1) |
| 저장 | 오늘 랭킹 1번 이슈로 `POST /api/bookmarks` `{ issueId, folderId: "f1" }` | 201, 이어서 북마크 목록 맨 앞이 그 이슈 · `folderId` f1, `f1` count 5(AC-07-1) |
| 폴더 하나만 | 같은 issueId로 `folderId: "f2"` POST | 409 "이미 북마크한 이슈입니다", f2 count 그대로(AC-10-4) |
| 없는 이슈 · 폴더 | `issueId: "2000-01-01-pol-0"` · `folderId: "f999"`로 각각 POST | 404 "이슈를 찾을 수 없습니다" · "폴더를 찾을 수 없습니다" |
| 해제 | 같은 issueId로 `DELETE /api/bookmarks/{issueId}` 두 번 | 처음 204 · 목록에서 빠짐, 두 번째 404 "북마크를 찾을 수 없습니다"(AC-07-2) |
| 새 폴더 | `POST /api/folders` `{ name: "테스트" }` → 그 id로 북마크 POST | 201 `{ id: "f4", name: "테스트", count: 0 }` → 폴더 목록에서 f4 count 1(AC-10-2) |
| 없을 때 | 북마크를 모두 DELETE 뒤 `GET /api/bookmarks` · 북마크 화면 | `[]`, "북마크한 기사가 없습니다"(AC-08-2) |
| 날짜 형식 | `GET /api/rankings?date=2026-10-7` · `?date=2026-02-30` · `?date=` · `?date=abc` | 모두 400 "날짜는 YYYY-MM-DD 형식으로 입력해 주세요" |
| 미래 날짜 | `GET /api/rankings?date=<내일>` · `?date=2999-01-01` | 모두 400 "오늘 이후 날짜는 조회할 수 없습니다"(AC-09-4) |
| 지난 날 경계 | `GET /api/rankings?date=<44일 전>` · `?date=<45일 전>` | 200 · 404 "해당 날짜의 랭킹 데이터가 없습니다"(400 아님, AC-09-3) |
| 깨진 본문 | `POST /api/bookmarks` · `POST /api/folders`에 `Content-Type: application/json`, 본문 `{` | 둘 다 400 "요청 형식이 올바르지 않습니다"(500 아님) |
| 북마크 칸 | `POST /api/bookmarks`에 `{}` · `{ issueId: "abc", folderId: "f1" }` · `{ issueId: "<어제>-xyz-0", folderId: "f1" }` · `{ issueId: "<어제>-pol-0", folderId: "" }` | 모두 400 "요청 형식이 올바르지 않습니다", 북마크 목록 `[]` 그대로 |
| 폴더 이름 길이 | `POST /api/folders`에 `{ name: "가".repeat(16) }` · `"가".repeat(17)` · `"   "` · `{}` · `{ name: 3 }` | 16자는 201, 나머지 모두 400 "폴더 이름은 1~16자로 입력해 주세요"(AC-10-2) |
| 앞뒤 공백 | `{ name: "  여행  " }` · `{ name: " " + "나".repeat(16) + " " }` | 둘 다 201, `name`은 "여행" · "나" 16자(공백 빠짐), 폴더 목록도 같음 |
| 같은 이름 | `{ name: "여행" }` 한 번 더 | 201, id만 다르고 폴더 목록에 "여행" 2개 |
| 화면 오늘(KST) | 브라우저 DevTools › Sensors › Location을 San Francisco(시간대 America/Los_Angeles)로 두고 새로고침 | 날짜 표시가 `GET /api/rankings`의 `date`와 같고 "· 오늘"이 붙음, 다음 날 버튼 비활성, 달력에서 KST 오늘 다음 날은 고를 수 없음(AC-09-4) |
| 화면 흐름 | `npm.cmd run api` 재시작 뒤 브라우저: 카드 북마크 → 폴더 고르기 → 새로고침 → 해제 → "되돌리기" → 북마크 화면 폴더 칩 | 새로고침해도 활성 그대로, 되돌리기 후 다시 보임, 칩을 누르면 그 폴더만 · "전체"는 모두 · 칩마다 개수(AC-07-1 · AC-10-3) |
| 중계 그대로 | `GET http://localhost:8787/api/rankings?date=<어제>`와 3000의 같은 요청 비교 | 상태 코드 · 본문 같음 |
| Hono 꺼짐 | api 서버를 끄고 `GET /api/rankings` | 502 "API 서버에 연결할 수 없습니다" |
| 가짜 데이터 제거 | `public/index.html`에서 낱말 경계 정규식 `\bPOOL\b` · `\brankingFor\b` · `\bseedBookmarks\b` · `\b8787\b` · `\bit\.sec\b` · `\bit\.count\b` 검색 | 0건 |
| 지역 시간 제거 | `public/index.html`에서 `\bsetHours\b` 검색 · `TODAY` 정의 줄 | 0건, `TODAY`는 KST(+9시간) 계산의 `YYYY-MM-DD` 문자열 |
