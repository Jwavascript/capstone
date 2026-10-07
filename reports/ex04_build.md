# ex04 빌드 보고 — Vitest 테스트, openapi.yaml 정리

작업 폴더: `ex04/`(`ex03/` 복사). `ex03/` 등 출발점 폴더는 건드리지 않음(`git status frontend/ ex01/ ex02/ ex03/` 변경 없음). git 커밋 안 함.

## 1. 확인받았을 목록 (자동 실습이라 "예"로 보고 진행)
1. `ex04/`가 없으니 `ex03/`을 복사해도 되는지. 빼는 것: `node_modules` · `.next` · `AGENTS.md` · `next-env.d.ts` · `*.tsbuildinfo`
2. 바뀌는 항목: 순위 규칙을 `server/ranking.ts`(`rankIssues`)로 빼기, `rankingFor`가 후보에 연관기사 수 · 발행 시각(KST 00:00~05:59)을 붙여 `rankIssues`로 줄 세우기(응답 카드는 8칸 그대로), Hono 앱을 `server/app.ts`로 옮기기(`index.ts`는 `serve`만), `sample.ts`에 `resetSample()`, Vitest 테스트 · `npm test`, `openapi.yaml` "계약 정리"
3. 지울 항목: 없음(PLAN에 없는 기존 코드를 찾지 못함. 앱 구성은 지우지 않고 `app.ts`로 옮김)
4. 고칠 파일: `package.json` · `server/index.ts` · `server/sample.ts` · `openapi.yaml`. 새 파일: `server/app.ts` · `server/ranking.ts` · `vitest.config.ts` · `test/setup.ts` · `test/ranking.test.ts` · `test/api.test.ts`
5. 설치 패키지: `npm.cmd install`(기존 의존성) 뒤 `npm.cmd install -D vitest`만
6. 필요한 키: 없음(이번 단계는 외부 서비스 없음)

## 2. PLAN 항목별 반영 위치
| PLAN 항목 | 반영 위치 |
|---|---|
| 복사 · name `issuerank-ex04` · vitest · `"test": "vitest run"` | `ex04/package.json`(devDependencies `vitest ^5.0.3`) |
| `server/app.ts`가 앱(라우트 3개 · `onError`) export | `ex04/server/app.ts`(`export const app`) |
| `index.ts`는 `serve`만 | `ex04/server/index.ts` |
| `rankIssues`: 연관기사 수 ↓ → `latestPublishedAt`(`Date.parse`로 시각 비교) ↓ → id ↑, 앞 5개 `rank` 1~5 | `ex04/server/ranking.ts` |
| `rankingFor`: 날짜별 5개(soc-6 포함) + rng 연관기사 수 · 그날 KST 00:00~05:59 발행 시각 → `rankIssues`, 카드 8칸 | `ex04/server/sample.ts` `rankingFor` |
| `resetSample()`: f1~f3 · 샘플 북마크 10개 · 다음 폴더 번호 4, 모듈 읽을 때 한 번 | `ex04/server/sample.ts` `resetSample()` + 파일 끝 호출. 같은 배열을 비우고 다시 채워 라우트가 가진 참조 유지 |
| `setupFiles: ['test/setup.ts']` | `ex04/vitest.config.ts` |
| 테스트마다 `useFakeTimers({ toFake: ['Date'] })` · `setSystemTime('2026-10-07T12:00:00+09:00')` · `resetSample()`, 끝나면 `useRealTimers()` | `ex04/test/setup.ts` |
| 표: 동점(AC-03-2) · 적은 후보 | `ex04/test/ranking.test.ts` 2개 |
| 표: 오늘 랭킹 · 지난 날짜 · 날짜 형식 · 미래 날짜 · KST 자정 · 목록 · 저장 · 폴더 하나 · 없는 이슈 · 폴더 · 해제 · 없을 때 · 새 폴더 · 깨진 본문 · 북마크 칸 · 폴더 이름 길이 · 앞뒤 공백 · 같은 이름 | `ex04/test/api.test.ts` 13개(`app.request`만 사용, 기대 날짜는 문자열 상수, fixture는 파일 안 상수) |
| 계약: 예시 id `{예시 date}-{섹션}-{번호}` | `ex04/openapi.yaml` 랭킹 예시 6개 · 북마크 목록(`2026-10-07-it-1` · `2026-10-06-eco-0`) · POST 요청/201 · DELETE 예시 `2026-10-07-it-1` |
| 계약: `IssueId`(pattern · 설명) → `Issue.id` · `BookmarkCreate.issueId` 참조, DELETE 경로 파라미터는 string 그대로 | `components.schemas.IssueId` |
| 계약: `BookmarkCreate.folderId` minLength 1 | `components.schemas.BookmarkCreate` |
| 계약: `Section`(required key · name · issues) + `oneOf` 6개 key/name `const` 짝 | `components.schemas.Section`, `Ranking.sections.items`가 참조 |
| 계약: `POST /api/folders` 400 description, `FolderCreate.name` 설명 | 해당 위치 |
| 서버 검사 코드 | 바뀌지 않음(zod 4.6.5 `max`가 코드 포인트로 셈을 확인: 😀×16 통과, ×17 거절) |

## 3. 지운 것
- 지운 기능 없음
- 옮기거나 바꾼 것: `index.ts`의 앱 구성 · `onError` → `app.ts`로 이동. `sample.ts`의 "연관기사 수를 내림차순 정렬한 뒤 순서대로 rank" 방식 → `rankIssues`로 대체(PLAN 지시). 모듈 끝에서 바로 채우던 폴더 · 샘플 북마크 → `resetSample()` 안으로 이동

## 4. 필요했지만 없던 키 / 계정
- 없음. 이번 단계는 Supabase · 네이버 · Anthropic 키가 필요 없고, `ex04/.env`도 없이 기본값(8787 · `http://localhost:8787`)으로 동작. 멈춘 부분 없음

## 5. 결과
- `npm.cmd run build`: 성공(`next build` Compiled successfully · TypeScript 통과, 이어서 `tsc --noEmit` 오류 0)
- `npm.cmd test`: Test Files 2 passed · Tests 15 passed, 실패 0
- 검증 표 중 확인한 것
  - `npx @redocly/cli lint ex04/openapi.yaml`: 오류 0 · 경고 19(아래 "추가로 보인 점")
  - 이슈 id 정규식 `(id|issueId|example): '?(pol|eco|soc|cul|wor|it)-` 검색: 0건
  - `git diff --no-index ex03/openapi.yaml ex04/openapi.yaml`: 예시 id · `IssueId` · `Section` · folderId minLength · folders 400 description · name 설명만 바뀜
  - `$env:TZ='America/Los_Angeles'; npm.cmd test`: 통과 / `npx vitest run --sequence.shuffle`: 통과
  - `test/`에서 `\bfetch\(` · `localhost` · `8787` · `new Date\(\)` · `Date\.now\(` 검색: 0건. 서버를 모두 끈 상태로 `npm.cmd test` 통과
  - `server/ranking.ts` 발행 시각 비교 방향을 뒤집으면 동점 테스트 1개 실패 → 되돌리면 15개 모두 통과
  - 서버를 띄워 node fetch로: 3000 `/` 200, 8787과 3000의 `GET /api/rankings?date=2026-10-06` 상태 · 본문 같음, Hono를 끈 뒤 3000 `GET /api/rankings` → 502 "API 서버에 연결할 수 없습니다"
  - 3000 · 8787 서버 둘 다 끔. 두 포트 LISTEN 없음, 관련 node 프로세스 남지 않음 확인
  - `public/index.html`은 ex03과 같음(가짜 데이터 · `setHours` 검색 0건, `TODAY`는 KST 계산)
- 브라우저로 직접 확인할 항목(하지 않음)
  1. `http://localhost:3000/` 이슈맵 · 6개 섹션 · 갱신 시각 줄(AC-05-1)
  2. DevTools › Sensors › Location을 San Francisco로 두고 새로고침: 날짜 표시 = API `date` · "· 오늘", 다음 날 버튼 비활성, 달력에서 KST 내일 선택 불가(AC-09-4)
  3. `npm.cmd run api` 재시작 뒤: 카드 북마크 → 폴더 고르기 → 새로고침 → 해제 → "되돌리기" → 북마크 화면 폴더 칩(AC-07-1 · AC-10-3)

## 6. 추가로 보인 점
- Redocly 경고 19개 중 15개는 `Section.oneOf` 가지들이 서로 겹친다는 경고(가지마다 `required: [key, name]`이 없어서). 바깥 `required`가 이미 있어 의미는 같지만, 가지마다 `required`를 넣으면 경고가 사라짐. PLAN에 없어 넣지 않음. 나머지 4개(license 없음 · localhost 서버 · GET 두 곳 4xx 없음)는 ex03부터 있던 것
- `vitest run` 때 "ESM syntax in a file loaded as CommonJS (vitest.config.ts)" 경고가 나옴(`package.json`에 `"type": "module"`이 없어서). 지금은 동작에 문제없음. `vitest.config.mts`로 바꾸거나 `"type": "module"`을 넣으면 사라지지만 PLAN의 파일 이름과 구조를 그대로 둠
- `npm install` 때 "esbuild postinstall이 allowScripts에 없음" 경고. tsx · vitest는 정상 동작
- `rankingFor`가 rng를 뽑는 순서가 바뀌고(발행 시각 추가) 연관기사 수를 미리 정렬하지 않아, 같은 날짜라도 샘플의 순위 · 연관기사 수가 ex03과 다르고, 그에 따라 샘플 북마크 10개의 이슈도 달라짐. 테스트는 특정 제목에 기대지 않아 영향 없음
- `rankIssues`의 id ↑는 문자열 비교라서 번호가 두 자리가 되면 `…-10`이 `…-9`보다 앞에 옴. 지금 풀은 0~6이라 문제없으나, 실제 이슈 id를 정하는 단계(ex05 · ex07)에서 규칙을 확인하면 좋음
- `tsconfig.json`의 include(`**/*.ts`)에 `test/` · `vitest.config.ts`도 들어가 `npm run build`의 `tsc --noEmit`이 테스트 파일까지 타입 검사함(통과)
- `openapi.yaml`의 date 설명 "생략하면 가장 최근 수집일"은 실제로는 KST 오늘(샘플 단계 동작). "나머지 줄 그대로"라 두었음
