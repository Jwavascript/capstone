# ex04 심사 보고 — Vitest 테스트, openapi.yaml 정리

- 대상: `ex04/` (출발점 `ex03/`), 기준: SPEC.md · PLAN.md(5절 · 6절) · `plan/PLAN_backend_ex04.md` · 앞 PLAN(ex01~ex03) · CLAUDE.md
- 실행일: 2026-10-07 (KST 어제 2026-10-06 · 오늘 2026-10-07 · 내일 2026-10-08, 데이터 없는 날 2000-01-01)
- 코드는 고치지 않음. 일시 변경 실험은 모두 해시 기록 → scratchpad 백업 → 되돌린 뒤 해시 같음 확인. git 커밋 안 함
- 브라우저 도구가 없어 화면 줄은 `public/index.html` 코드 읽기 + HTTP 요청으로 판단함(아래 표에 표시)

## 최종 판정: **PASS**
- PLAN 항목 모두 done · 빌드 성공 · 검증 24/24 OK · 위반 없음

## 1. PLAN 항목별
| PLAN 항목 | 판정 | 근거 |
|---|---|---|
| `ex03/` → `ex04/` 복사(`node_modules` · `.next` 제외) | done | 소스 파일 목록이 ex03 + 새 파일과 같음. `.next`는 이번 build/dev가 다시 만듦(gitignore 대상) |
| `package.json` name `issuerank-ex04` · `npm install -D vitest` · `"test": "vitest run"` | done | devDependencies `vitest ^5.0.3`만 추가. lock 파일의 기존 패키지 버전 변경 0, 지운 것 0 |
| `server/app.ts`가 Hono 앱(라우트 3개 · `onError`) export, `index.ts`는 `serve`만 | done | `export const app`, `index.ts`는 import + `serve`만. `onError` 내용은 ex03과 같음 |
| `sample.ts`의 `resetSample()`(f1~f3 · 북마크 10개 · 다음 폴더 번호 4), 모듈 읽을 때 한 번 | done | 같은 배열을 비우고 채움(라우트 참조 유지), 파일 끝 `resetSample()` |
| `server/ranking.ts` `rankIssues`: 연관기사 수 ↓ → `latestPublishedAt`(시각 비교) ↓ → id ↑, 앞 5개 rank 1~5 | done | `Date.parse` 비교. 일부러 뒤집기에서 테스트가 잡음 |
| `rankingFor`가 rng로 연관기사 수 · 그날 KST 00:00~05:59 발행 시각을 붙여 `rankIssues`로, 응답은 8칸 | done | `minutes = floor(r()*360)` → `${date}T hh:mm:00+09:00`, 응답 map에서 발행 시각 뺌. soc-6 포함 유지 |
| `vitest.config.ts` `setupFiles: ['test/setup.ts']` | done | |
| `test/setup.ts`: 테스트마다 `useFakeTimers({ toFake: ['Date'] })` + `setSystemTime('2026-10-07T12:00:00+09:00')` + `resetSample()`, 끝나면 `useRealTimers()` | done | |
| 기대 날짜는 문자열 상수, `new Date()` · `Date.now()` 없음 | done | `test/`에서 0건 |
| 테스트 표 15묶음(ranking 2 + api 13), fixture는 테스트 파일 안 상수 | done | 묶음마다 테스트 1개, 입력 · 기대 결과가 표와 같음(아래 3절 참조) |
| 계약 정리: 예시 id `{date}-{섹션}-{번호}`(DELETE 예시 `2026-10-07-it-1`) | done | 예시 id 11개 모두 `IssueId` pattern 통과 |
| `IssueId`(pattern · 설명) → `Issue.id` · `BookmarkCreate.issueId` 참조, DELETE 경로 파라미터는 string | done | |
| `BookmarkCreate.folderId` minLength 1 | done | |
| `Section`(required key · name · issues) + `oneOf` 6개 key/name const 짝 | done | `Ranking.sections.items`가 `$ref: Section` |
| `POST /api/folders` 400 description · `FolderCreate.name` 설명(글자 수 기준) | done | "폴더 이름 규칙 위반(앞뒤 공백을 뺀 1~16자) 또는 깨진 본문" / "글자 수는 앞뒤 공백을 뺀 뒤 코드 포인트로 셈(😀 1개 = 1자)" |
| 서버 검사 코드는 안 바뀜 | done | `schemas.ts` · `routes/*` ex03과 같음 |
| 화면 변경 없음 | done | `public/index.html` ex03과 바이트 동일 |
| 마지막 `npm run build` · `npm test` | done | 둘 다 성공 |

## 2. SPEC 근거 AC
| AC | 판정 | 근거 |
|---|---|---|
| AC-03-2 (연관기사 수 동점이면 최신 발행 시각이 늦은 이슈가 위) | 충족 | `ranking.test.ts` 동점 테스트(UTC 표기 c4 = KST 06:00이 1등 다음으로 옴, 거꾸로 넣어도 같음) 통과. 발행 시각 비교 방향을 뒤집으면 실패, `localeCompare` 문자열 비교로 바꿔도 실패(참고 실험). `rankingFor`도 같은 함수 사용 |
| (참고) AC-03-1 · 07-1 · 07-2 · 08-1 · 08-2 · 09-1 · 09-3 · 09-4 · 10-1 · 10-2 · 10-4 | 테스트로 고정됨 | `api.test.ts` 해당 묶음 통과. 서버 띄운 실행일 기준 요청도 같은 결과(오늘 200 · 어제 200 id 접두 일치 · 내일 400 · 2000-01-01 404) |

## 3. 범위 밖 추가 · 불필요한 변경 · 출발점 · 화면 동작
- PLAN에 없는데 추가된 것: 없음(`Candidate` 타입 export는 `rankIssues` 시그니처용 작은 세부)
- ex03에서 불필요하게 바뀐 것: 없음. 바뀐 파일은 `package.json` · `package-lock.json` · `server/index.ts` · `server/sample.ts` · `openapi.yaml`뿐이고 모두 PLAN 항목. 새 파일은 PLAN에 적힌 6개(`server/app.ts` · `server/ranking.ts` · `vitest.config.ts` · `test/setup.ts` · `test/ranking.test.ts` · `test/api.test.ts`)
- 출발점 폴더: `git status frontend/ ex01/ ex02/ ex03/` 변경 없음. 심사 전후 ex03 · ex04 소스 해시도 같음
- 화면에 이미 있던 동작(PLAN.md 6절: 04-2 새 탭 · 05-2 모바일 · 09-2 날짜 표시와 오늘 버튼 · 09-4 미래 날짜 막기 · 10-3 폴더 칩): `index.html`이 ex03과 같고 API 응답 모양도 같아 깨지지 않음(코드 읽기로 판단)

## 4. 빌드
- `npm.cmd run build` (`next build && tsc --noEmit`): 성공, 종료 코드 0

## 5. 검증 방법 (PLAN 표 순서)
| # | 확인 | 결과 | 내용 |
|---|---|---|---|
| 1 | OpenAPI 형식 | [OK] | `npx @redocly/cli lint ex04/openapi.yaml` 오류 0, 경고 19(참고) |
| 2 | 엔드포인트 | [OK] | 경로 · 메서드 6개만 |
| 3 | 상태 코드 | [OK] | ex01 대비 `GET /api/rankings` 400 · `POST /api/bookmarks` 400만 더해짐 |
| 4 | 실패 메시지 | [OK] | 9개 모두 글자 그대로 있음 |
| 5 | 이슈 칸 | [OK] | required 8개, `summary` `[array, null]` minItems/maxItems 3 |
| 6 | 섹션 키 | [OK] | enum 6개, `oneOf` const 짝 pol 정치 · eco 경제 · soc 사회 · cul 생활·문화 · wor 세계 · it IT·과학 |
| 7 | 폴더 이름 | [OK] | minLength 1 · maxLength 16, 설명에 앞뒤 공백 · 코드 포인트 기준 |
| 8 | 이슈 id 규칙 | [OK] | pattern 일치, `Issue.id` · `issueId` 참조, folderId minLength 1, 정규식 `(id\|issueId\|example): '?(pol\|…\|it)-` 검색 0건 |
| 9 | 계약 변경 범위 | [OK] | `git diff --no-index` 결과가 예시 id · `IssueId` · `Section` · folderId minLength · folders 400 description · name 설명뿐 |
| 10 | 출발점 그대로 | [OK] | `git status frontend/ ex01/ ex02/ ex03/` 변경 없음 |
| 11 | 빌드 | [OK] | 성공 |
| 12 | 테스트 | [OK] | `npm.cmd test` Test Files 2 passed · Tests 15 passed, 실패 0 |
| 13 | 테스트 범위 | [OK] | 표의 15묶음이 테스트 15개로 1:1, 이름에 AC 12개 모두 나옴 |
| 14 | 서버 없이 | [OK] | 3000 · 8787 LISTEN 없고 node 프로세스 없는 상태에서 통과, `test/`에서 `\bfetch\(` · `localhost` · `8787` 0건 |
| 15 | 시계 고정 | [OK] | PowerShell `$env:TZ='America/Los_Angeles'; npm.cmd test` 통과(참고: `Pacific/Kiritimati`도 통과), `new Date\(\)` · `Date\.now\(` 0건 |
| 16 | 순서 무관 | [OK] | `npx vitest run --sequence.shuffle` 통과(실제로 순서 바뀜 확인), seed 1 · 42 · 777도 통과 |
| 17 | 테스트가 잡는가 | [OK] | 발행 시각 비교 방향을 뒤집자 동점 테스트 1개 실패 → 되돌린 뒤 15개 통과, 해시 실험 전과 같음 |
| 18 | 화면 주소 | [OK] (HTTP + 코드 읽기) | 3000 `/` 200(HTML 49,900바이트, index.html), 6개 섹션 렌더 · 갱신 시각 줄(`updatedAt` "… 수집 · 이슈 n개") 코드 그대로 |
| 19 | 화면 오늘(KST) | [OK] (코드 읽기) | `TODAY`는 `Date.now() + 9h`의 `YYYY-MM-DD`, 날짜 표시는 API `date` + "· 오늘", `nextDay.disabled = isToday`, `dateInput.max = TODAY`, `setDate`가 TODAY 넘는 값 막음 |
| 20 | 화면 흐름 | [OK] (코드 읽기 + API) | 저장 = POST 후 목록 재조회, 해제 = DELETE 후 "되돌리기"가 같은 issueId · folderId로 재POST, 칩은 folderId로 거름 · "전체" · 칩마다 개수. API로 POST 201 · DELETE 204/404, 해제 후 재POST 201 확인 |
| 21 | 중계 그대로 | [OK] | `?date=2026-10-06`(KST 어제) 8787 · 3000 모두 200, 본문 같음 |
| 22 | Hono 꺼짐 | [OK] | api만 끈 뒤 3000 `GET /api/rankings` → 502 `{"message":"API 서버에 연결할 수 없습니다"}` |
| 23 | 가짜 데이터 제거 | [OK] | `\bPOOL\b` · `\brankingFor\b` · `\bseedBookmarks\b` · `\b8787\b` · `\bit\.sec\b` · `\bit\.count\b` 0건 |
| 24 | 지역 시간 제거 | [OK] | `\bsetHours\b` 0건, `const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);` |

**합계 24/24 OK**

- 정리: 3000 · 8787 서버 모두 끔, 두 포트 LISTEN 0 · node 프로세스 0 확인. 일시 변경한 `server/ranking.ts` · `test/setup.ts`는 백업에서 되돌렸고 해시가 실험 전과 같음. 심사 전후 ex03 · ex04 소스 해시 전체가 같음. 남은 `AGENTS.md` · `next-env.d.ts` · `*.tsbuildinfo` · `.next`는 .gitignore 대상

## 6. 지켜야 할 것
| 항목 | 결과 |
|---|---|
| 기사 본문 저장 · 표시 | 없음(카드 8칸: 제목 · 요약 · 링크 등만) |
| 코드에 들어간 키 · 접속 정보 | 없음(키 · 비밀값 패턴 검색 0건, `.env` 파일 자체가 없음, `.env.example`은 이름만) |
| `.env` git 제외 | 루트 `.gitignore`의 `.env` 규칙이 `ex04/.env`를 잡음(`git check-ignore` 확인) |
| PLAN에 없는 패키지 | 없음(새 직접 의존성은 vitest 하나) |
| D0 밖 출처 수집 | 없음(서버 · 테스트에 외부 요청 없음) |
| CLAUDE.md 규칙 | 위반 없음(범위 · 출발점 보존 · 화면 그대로 · 이번 PLAN만큼) |

## 참고 (판정에 넣지 않음)
- 일부러 뒤집기 추가 실험: id 정렬을 내림차순으로 바꾸면 동점 테스트 실패, 발행 시각을 문자열 비교로 바꿔도 실패, setup의 `resetSample()`을 빼면 2개 실패 → 테스트가 규칙 · 상태 초기화를 실제로 잡음. 모두 되돌린 뒤 해시 같음
- Redocly 경고 19개: `no-illogical-composition-keywords` 15(Section `oneOf` 가지에 `required`가 없어서), `info-license` 1 · `no-server-example` 1 · `operation-4xx-response` 2는 ex03부터 있던 것(ex03은 4개)
- `vitest run` 때 "ESM syntax in a file loaded as CommonJS (vitest.config.ts)" 경고(`"type": "module"` 없음). 동작에는 문제없음
- `rankingFor`의 rng 뽑는 순서가 바뀌어 같은 날짜라도 ex03과 샘플 순위 · 연관기사 수 · 샘플 북마크 이슈가 다름(PLAN이 발행 시각 추가와 `rankIssues` 연결을 지시했으므로 허용)
- `rankIssues`의 id ↑는 문자열 비교라 번호가 두 자리가 되면 `…-10`이 `…-9`보다 앞. 지금 풀은 0~6이라 영향 없음(제작 보고에도 적힘)
- `openapi.yaml`의 date 설명 "생략하면 가장 최근 수집일"은 지금 동작(KST 오늘)과 다르지만 "나머지 줄 그대로" 지시에 맞음
