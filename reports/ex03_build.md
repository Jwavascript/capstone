# ex03 제작 보고 — Zod 입력 검사(날짜 · 섹션 · 폴더 이름)

자동 실습이라 사용자에게 묻지 못함. CLAUDE.md의 확인 지점은 모두 "예"로 보고 진행함. git 커밋은 하지 않음.

## 1. 확인받았을 목록 (모두 "예"로 보고 진행)
1. `ex03/`이 없음 → `ex02/`를 `ex03/`으로 복사해도 되는지(`node_modules` · `.next` · `AGENTS.md` · `next-env.d.ts` · `*.tsbuildinfo` 제외. `ex02/`에 `.env` · `dist` · `.data`는 원래 없음)
2. 고칠 파일
   - 새 파일: `server/schemas.ts`
   - 수정: `server/routes/rankings.ts` · `server/routes/bookmarks.ts` · `server/routes/folders.ts` · `openapi.yaml` · `public/index.html` · `package.json`(name)
   - 수정(PLAN에 위치가 없는 세부): `server/index.ts`에 `app.onError`를 더해 깨진 JSON을 400 `{ message }`로 바꿈. 검사기(@hono/zod-validator)가 깨진 JSON에서 Zod 검사 전에 예외(HTTPException 400, 글자 본문)를 던져서, 훅으로는 잡을 수 없기 때문
3. 지울 항목: 없음(아래 3절)
4. 설치 패키지: `zod` · `@hono/zod-validator`(PLAN "새 패키지" 줄 그대로)
5. 필요한 키: 없음

## 2. PLAN 항목별 반영 위치
| PLAN 항목 | 반영 위치 |
|---|---|
| 1. `ex02/` → `ex03/` 복사, name `issuerank-ex03`, `npm.cmd install` 뒤 `npm.cmd install zod @hono/zod-validator` | `ex03/` 전체, `ex03/package.json`(name · dependencies에 `zod ^4.6.5` · `@hono/zod-validator ^0.9.1`) |
| 2. 입력 규칙을 `server/schemas.ts` 한곳에 | `ex03/server/schemas.ts`: 메시지 4개, `rankingsQuery`(`z.iso.date` 형식 + 달력 → `kstToday()` 이하 순서, 생략 가능), `bookmarkCreate`(`issueId` = `{날짜}-{섹션 키}-{숫자}`, 날짜는 형식 · 달력만 · 섹션 키는 `sample.ts`의 `SECTIONS`, `folderId`는 빈 문자열이 아닌 문자열), `folderCreate`(`trim()` 뒤 length 1~16, 공백 뺀 값을 결과로), 본문이 객체가 아니면(배열 · 문자열 · null) "요청 형식이 올바르지 않습니다", 표에 없는 칸은 Zod 기본값대로 버림. 공용 `validate()`가 첫 위반의 메시지로 400 `{ message }` |
| 3. 세 라우트에 검사 연결 · 깨진 본문 400 · 폴더는 공백 뺀 이름 저장 | `routes/rankings.ts`(`validate('query', rankingsQuery)`, 생략 시 `kstToday()` 그대로), `routes/bookmarks.ts`(`validate('json', bookmarkCreate)` → 404 · 409 판단은 그 뒤), `routes/folders.ts`(`validate('json', folderCreate)`, `c.req.valid('json').name` 저장 · 같은 이름 허용), `server/index.ts`(`app.onError`: 400 HTTPException → `{ message: "요청 형식이 올바르지 않습니다" }`, 그 밖은 Hono 기본 처리와 같음) |
| 4. 계약 400 추가 | `openapi.yaml`: `GET /api/rankings` date 설명 끝에 "오늘(KST) 이후면 400." · 400 응답(예시 `badFormat` · `future`), `POST /api/bookmarks` 400 응답(예시 "요청 형식이 올바르지 않습니다"), `POST /api/folders` 400의 `example`을 `examples`(`badName` · `badBody`)로 바꿔 깨진 본문 예시 추가 |
| 5. 화면 `TODAY`를 KST로 | `public/index.html` 481줄: `const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);`(서버 `kstToday`와 같은 식), `iso(TODAY)` 7곳을 `TODAY`로(상태 첫 날짜 · "· 오늘" · 날짜 입력 `max` · 다음 날 비활성 · 미래 날짜 막기 · "오늘" 버튼 · → 키). 400 토스트 · 문구 · 레이아웃은 그대로 |
| 마지막. `npm run build` | 성공(4절) |

## 3. 지운 것
- 없음. `ex02` 코드 중 이번 PLAN에 없는 것은 찾지 못함
- 바뀐 줄(지운 것이 아니라 PLAN대로 바꾼 것): 화면의 `TODAY.setHours(0, 0, 0, 0)` 지역 시간 정의, 라우트 2곳의 `await c.req.json<...>()`(검사 결과 `c.req.valid('json')`으로 바꿈), 계약 `POST /api/folders` 400의 `example:` 두 줄(예시를 2개로 늘리려면 `examples:`로 바꿔야 함)

## 4. 필요했지만 없던 키 / 계정
- 없음. 이번 단계는 외부 서비스를 쓰지 않음. `ex03/.env`가 없어도 `API_PORT` · `API_URL` 기본값으로 동작함. 키가 없어 멈춘 부분은 없음

## 5. `npm run build` 결과
- 성공. `next build`(Next.js 16.4.0, Turbopack) "Compiled successfully", 라우트 `/_not-found` · `ƒ /api/[...path]`, 이어서 `tsc --noEmit` 오류 0개

## 6. 검증 (서버 두 개를 띄워 node fetch로 확인 후 3000 · 8787 모두 끔)
- 확인한 API 줄: 오늘 랭킹 · 섹션 짝 · 요약 null · 지난 날짜 · 데이터 없는 날 · 북마크 목록 · 폴더 목록 · 저장 · 폴더 하나만 · 없는 이슈/폴더 · 해제 · 새 폴더 · 없을 때 · 날짜 형식 · 미래 날짜 · 지난 날 경계(44일 전 200 · 45일 전 404) · 깨진 본문 · 북마크 칸 · 폴더 이름 길이 · 앞뒤 공백 · 같은 이름 · 중계 그대로 · Hono 꺼짐(502) → 모두 기대 결과대로. 추가로 배열 · 문자열 · null 본문과 `?date=`를 두 번 준 요청도 500이 아닌 400
- `npx @redocly/cli lint ex03/openapi.yaml`: 오류 0개, 경고 4개(info-license · no-server-example.com · GET `/api/bookmarks`와 `/api/folders`에 4XX 없음. 이번 변경과 무관)
- 엔드포인트 6개 그대로, 실패 메시지 9개 모두 계약에 글자 그대로, `git diff --no-index ex02/openapi.yaml ex03/openapi.yaml`은 400 응답 · 예시 · date 설명만(위 3절의 `example`→`examples` 포함)
- `public/index.html`에서 `\bPOOL\b` · `\brankingFor\b` · `\bseedBookmarks\b` · `\b8787\b` · `\bit\.sec\b` · `\bit\.count\b` · `\bsetHours\b` 0건
- `git status frontend/ ex01/ ex02/`: 변경 없음
- 끝낸 뒤 3000 · 8787 리슨 없음, node 프로세스 남은 것 없음 확인. dev 실행이 만든 `ex03/AGENTS.md` · `next-env.d.ts` · `tsconfig.tsbuildinfo`는 .gitignore 대상이라 둠

브라우저로 확인할 항목(직접 확인 필요)
- `http://localhost:3000/`: 이슈맵 · 6개 섹션 · 갱신 시각 줄, soc 카드 "요약을 준비 중입니다"
- 화면 오늘(KST): DevTools › Sensors › Location을 San Francisco(America/Los_Angeles)로 두고 새로고침 → 날짜 표시가 `GET /api/rankings`의 `date`와 같고 "· 오늘", 다음 날 버튼 비활성, 달력에서 KST 오늘 다음 날 선택 불가
- 화면 흐름: `npm.cmd run api` 재시작 뒤 카드 북마크 → 폴더 고르기 → 새로고침 → 해제 → "되돌리기" → 북마크 화면 폴더 칩 · "전체" · 칩 개수
- 데이터 없는 날(2000-01-01) 안내, 폴더 17자 이상은 입력란 `maxlength=16`이라 화면에서는 서버 400까지 가지 않음

## 7. 추가로 보인 점
- `POST`에 `Content-Type: application/json`이 없으면 검사기가 본문을 읽지 않고 `{}`로 검사함 → 북마크는 400 "요청 형식이 올바르지 않습니다", 폴더는 400 "폴더 이름은 1~16자로 입력해 주세요". PLAN 표에 없는 경우라 그대로 둠(500은 아님)
- `server/index.ts`의 `onError`는 400 HTTPException을 모두 "요청 형식이 올바르지 않습니다"로 바꿈. 지금 400 예외를 던지는 곳은 검사기의 JSON 읽기뿐이지만, 뒤 단계에서 다른 400 예외가 생기면 문구가 겹칠 수 있음
- 계약의 `POST /api/folders` 400 `description`은 "폴더 이름 규칙 위반" 그대로(PLAN "나머지 줄 그대로"). 깨진 본문 예시가 같이 있어 설명과 조금 어긋남 → ex04 계약 정리 때 볼 만함
- 계약의 `BookmarkCreate`에는 `issueId` 패턴 · `folderId` minLength가 없고, 예시 id도 `it-1`이라 이번 400 규칙(`{날짜}-{섹션}-{숫자}`)과 맞지 않음 → ex04 정리 범위(PLAN "하지 않음"에 있음)
- 화면의 `TODAY`는 페이지를 연 시각에 한 번 계산함. 창을 연 채 KST 자정을 넘기면 새로고침 전까지 어제가 "오늘"로 보임(ex02도 같았음)
- `npm.cmd install` 때 "esbuild postinstall이 allowScripts에 없다"는 경고가 나왔지만 `npm run api`(tsx)는 정상 동작함
- 서버의 `?date=`는 `z.iso.date()` 정규식으로 윤년까지 확인함(`2024-02-29` 통과, `2025-02-29`는 형식 400)
