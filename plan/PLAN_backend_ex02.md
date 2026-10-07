# PLAN_backend_ex02 — Hono 구현, Next.js가 중계(BFF), 화면이 가짜 데이터 대신 API 호출

> 이유: 계약(`openapi.yaml`)은 있지만 화면은 아직 자기 안의 가짜 데이터로만 돌아서, 새로고침하면 북마크가 사라짐. 그래서 계약대로 도는 Hono 서버(메모리 샘플)를 만들고, Next.js가 `/api/*`를 중계하며, 화면이 그 API를 부르게 함.
> 코드 폴더: `ex02/` (`ex01/` 복사)
> SPEC 근거: AC-03-1 · AC-05-1 · AC-07-1·2 · AC-08-1·2 · AC-09-1 · AC-10-1~4

## 이번 범위
- Hono API 서버(8787)에 ex01 계약 6개를 메모리 샘플로 구현하고, Next.js(3000)가 화면과 `/api/*` 중계를 맡음. 화면의 가짜 데이터를 fetch로 바꿈
- 새 패키지: hono · @hono/node-server · next · react · react-dom · typescript · tsx · @types/node · @types/react
- 하지 않음: 날짜 형식 · 미래 날짜 · 폴더 이름 검사와 400 · 같은 이름 폴더 허용 여부(ex03) · 테스트와 `openapi.yaml` 정리(id 예시 · key/name 짝 스키마, ex04) · DB 저장(ex05) · 로그인 · 401 · 사용자 구분(ex10 · ex11, 화면의 로그인 토글은 데모 그대로) · 두 서버를 한 명령으로 띄우는 패키지

## 구성과 샘플
| 부분 | 위치 · 실행 | 정한 것 |
|---|---|---|
| API 서버 | `server/index.ts`(+ `server/routes/`) · `npm run api`(tsx) · `API_PORT` 기본 8787 | ex01 계약 6개의 경로 · 상태 코드 · 실패 메시지 그대로. 저장은 메모리(재시작하면 샘플로 돌아감) |
| BFF | `app/api/[...path]/route.ts` · `npm run dev`(next dev) · 3000 | GET · POST · DELETE를 `API_URL`(기본 `http://localhost:8787`) + 같은 경로 · 쿼리로 넘김. 메서드 · 본문 · 헤더(쿠키 포함)를 보내고, 받은 상태 코드 · 본문 · 헤더를 그대로 돌려줌. 연결 실패 시 502 `{ message: "API 서버에 연결할 수 없습니다" }` |
| 화면 | `public/index.html` · `next.config.mjs` rewrite로 `/` → `/index.html` | fetch는 같은 주소의 `/api/...`만(8787 직접 호출 없음) |
| 샘플 랭킹 | `server/sample.ts` (화면의 `POOL` · `rng` 옮김) | 실행일 KST 오늘 포함 최근 45일만 있음(그 밖은 404). 날짜 시드로 섹션마다 5개, `articleCount`(14~184) 내림차순, `rank` 1~5. `updatedAt` = `{date}T06:00:00+09:00`. date 생략 = KST 오늘 |
| 이슈 id | — | `{date}-{section}-{풀 번호}` 예: `2026-10-06-eco-0` |
| 섹션 | — | 고정 목록 하나에서 `key`와 `name`을 짝으로 꺼냄. 순서 pol · eco · soc · cul · wor · it |
| 요약 null | — | soc 풀 7번째 이슈(`soc-6`)는 `summary: null`이고 매일 soc Top 5에 들어감 |
| 샘플 폴더 · 북마크 | — | `f1` 반도체·AI · `f2` 부동산·금리 · `f3` 나중에 읽기. 북마크 10개(4 · 3 · 3개), 어제~14일 전 랭킹에 실제로 있는 이슈(오늘 이슈는 없음), `savedAt`은 서로 다르게. 새 폴더 id는 `f4`부터 차례로 |
| 북마크 저장 | — | 이슈는 id의 날짜 랭킹에서 찾고 카드 칸은 그 값 그대로. 폴더 `count` = 그 폴더 북마크 수 |

## 화면 변경
- `POOL` · `ISSUES` · `rng` · `rankingFor` · `seedBookmarks`를 지우고 `GET /api/rankings`(첫 진입은 date 없이, 받은 `date`로 시작 · D3) · `/api/bookmarks` · `/api/folders` 호출로 바꿈. 칸 이름은 계약대로(`sec`→`section`, `count`→`articleCount`, `folder` 객체→`folderId`, 숫자→ISO `savedAt`, 섹션 객체→`sections` 배열)
- 저장 · 해제 · 폴더 만들기는 POST · DELETE 뒤 북마크 · 폴더 목록을 다시 받음. 새 폴더 = 폴더 POST 뒤 그 폴더로 북마크 POST. 해제 뒤 "되돌리기" = 같은 `issueId` · `folderId`로 다시 POST. 실패하면 응답 `message`를 토스트로
- 문구 · 레이아웃 그대로. 갱신 시각 줄은 `updatedAt`과 받은 이슈 수로("10.6 오전 6:00 수집 · 이슈 30개" 모양 그대로)

## 구현 순서
1. `ex01/` → `ex02/` 복사, `index.html`은 `ex02/public/index.html`로 옮김(`openapi.yaml`은 그대로)
2. `package.json` 스크립트 `api` · `dev` · `build`(`next build` + `tsc --noEmit`, D4), `.env.example`(`API_PORT` · `API_URL` 이름만, `.env` 없어도 기본값으로 돎), 루트 `.gitignore`에 `.next/`
3. `server/sample.ts` · `server/routes/` · `server/index.ts`로 위 표대로 API 서버
4. `app/api/[...path]/route.ts` BFF와 `next.config.mjs` rewrite
5. `public/index.html`의 Data · State · 북마크 부분을 위 "화면 변경"대로
마지막. `npm run build`

## 검증 방법
- 두 터미널에서 `ex02/`의 `npm.cmd run api` · `npm.cmd run dev`를 막 띄운 상태에서 위에서 아래 순서로. 요청은 node fetch로 `http://localhost:3000`에

| 확인 | 방법 | 기대 결과 |
|---|---|---|
| OpenAPI 형식 | `npx @redocly/cli lint ex02/openapi.yaml`(설치 없이 npx) | 오류 0개(경고는 참고) |
| 엔드포인트 | `paths`의 경로 · 메서드를 표와 비교 | 표의 6개만 있음 |
| 상태 코드 | 경로마다 응답 코드를 표와 비교 | 성공 · 실패 코드가 표와 같음 |
| 실패 메시지 | 표의 메시지 6개를 파일에서 검색 | 6개 모두 글자 그대로 있음 |
| 이슈 칸 | 이슈 스키마의 `required`와 속성 | 8개 칸 모두 required, `summary`는 3개 배열 또는 null |
| 섹션 키 | `section` · `key`의 enum | 정확히 6개 키 |
| 폴더 이름 | 폴더 만들기 요청의 `name` | minLength 1 · maxLength 16 |
| 계약 그대로 | `ex02/openapi.yaml`과 `ex01/openapi.yaml` 해시 비교 | 같음 |
| 출발점 그대로 | `git status frontend/ ex01/` | 변경 없음 |
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
| 화면 흐름 | `npm.cmd run api` 재시작 뒤 브라우저: 카드 북마크 → 폴더 고르기 → 새로고침 → 해제 → "되돌리기" → 북마크 화면 폴더 칩 | 새로고침해도 활성 그대로, 되돌리기 후 다시 보임, 칩을 누르면 그 폴더만 · "전체"는 모두 · 칩마다 개수(AC-07-1 · AC-10-3) |
| 중계 그대로 | `GET http://localhost:8787/api/rankings?date=<어제>`와 3000의 같은 요청 비교 | 상태 코드 · 본문 같음 |
| Hono 꺼짐 | api 서버를 끄고 `GET /api/rankings` | 502 "API 서버에 연결할 수 없습니다" |
| 가짜 데이터 제거 | `public/index.html`에서 `POOL` · `rankingFor` · `seedBookmarks` · `8787` · `it.sec` · `it.count` 검색 | 0건 |
