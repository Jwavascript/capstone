# ex02 심사: Hono 구현 · Next.js 중계(BFF) · 화면 API 호출

- 심사일: 2026-10-07 (KST 어제 2026-10-06 · 오늘 2026-10-07 · 내일 2026-10-08, 데이터 없는 날 2000-01-01)
- 대상: `ex02/` (출발점 `ex01/`). 기준: SPEC.md · PLAN.md(5절 · 6절) · plan/PLAN_backend_ex02.md · plan/PLAN_backend_ex01.md · CLAUDE.md
- 코드는 고치지 않음. git 커밋 안 함. 브라우저 도구가 없어 화면 동작은 `public/index.html` 코드 읽기와, 화면이 보내는 요청 순서를 node fetch로 재현하는 방식으로 판단함

## 최종 판정: PASS
- PLAN 항목 모두 done · `npm.cmd run build` 성공 · 검증 28/28 OK · 위반 없음

## 1. PLAN 항목별 판정
| PLAN 항목 | 판정 | 근거 |
|---|---|---|
| 1. `ex01/` → `ex02/` 복사, `index.html` → `public/index.html`, `openapi.yaml` 그대로 | done | `ex02/public/index.html` 있음, 루트 `index.html` 없음. `openapi.yaml` SHA-256이 ex01과 같음 |
| 2. 스크립트 `api`(tsx) · `dev`(next dev) · `build`(`next build` + `tsc --noEmit`) | done | `package.json`. `tsc --listFilesOnly`에 `server/**` · `app/**` 모두 포함 |
| 2. `.env.example`(`API_PORT` · `API_URL` 이름만), `.env` 없어도 기본값 | done | 값 없이 이름만. `.env` 없이 8787 · 3000으로 정상 기동 |
| 2. 루트 `.gitignore`에 `.next/` | done | 마지막 줄 추가, `git check-ignore`로 확인 |
| API 서버 `server/index.ts`(+ `routes/`), `API_PORT` 기본 8787, 메모리 | done | `routes/rankings.ts` · `bookmarks.ts` · `folders.ts`. 재시작하면 샘플(북마크 10 · 폴더 4/3/3)로 돌아감을 확인 |
| 계약 6개 경로 · 상태 코드 · 실패 메시지 그대로 | done | 200/404, 200, 201/404/404/409, 204/404, 200, 201 실제 응답 확인(400은 ex03 범위) |
| BFF `app/api/[...path]/route.ts`: GET·POST·DELETE, 경로·쿼리·메서드·본문·헤더(쿠키) 전달, 상태·본문·헤더 그대로, 연결 실패 502 | done | 임시 에코 서버로 쿠키 · Content-Type · 사용자 헤더 · 한글 본문 · 쿼리 전달, 418 · Set-Cookie · 사용자 헤더 반환 확인. Hono 끄면 502 |
| 화면 `public/index.html` + `next.config.mjs` rewrite `/` → `/index.html`, fetch는 `/api/...`만 | done | 3000의 `/` 본문이 `public/index.html`과 바이트 단위로 같음. `api()`는 `'/api' + path`만, `8787` 0건 |
| 샘플 랭킹 `server/sample.ts`(POOL · rng 옮김), 최근 45일, 섹션마다 5개, `articleCount` 14~184 내림차순, rank 1~5, `updatedAt` = `{date}T06:00:00+09:00`, date 생략 = KST 오늘 | done | 44일 전 200 · 45일 전 404 · 내일 404 · 2000-01-01 404. 같은 날 두 번 호출 본문 같음 |
| 이슈 id `{date}-{section}-{풀 번호}` | done | 오늘 30개 모두 `2026-10-07-{key}-[0-6]` |
| 섹션 key · name 짝, 순서 pol→it | done | `SECTIONS` 한 목록에서 꺼냄 |
| 요약 null `soc-6`, 매일 soc Top 5 | done | 빠지면 5번째 자리를 6번으로 바꿈. 오늘 `2026-10-07-soc-6` |
| 샘플 폴더 f1·f2·f3, 북마크 10개(4·3·3), 어제~14일 전 실제 랭킹 이슈(오늘 없음), savedAt 서로 다름, 새 폴더 f4부터 | done | 북마크 날짜 10-06~09-27(1~10일 전), 실제 랭킹과 8칸이 같음, savedAt 10개 모두 다름 |
| 북마크 저장: id 날짜 랭킹에서 찾고 카드 칸 그대로, 폴더 count = 북마크 수 | done | `findIssue` · `withCount`. 저장 응답 8칸이 랭킹 이슈와 같음 |
| 화면 변경: 가짜 데이터 제거 → `/api/rankings`(첫 진입 date 없이, 받은 date로 시작) · `/api/bookmarks` · `/api/folders`, 칸 이름 계약대로 | done | `loadRanking()` · `loadBookmarks()`, `section` · `articleCount` · `folderId` · ISO `savedAt` · `sections` 배열 사용 |
| 저장 · 해제 · 폴더 만들기 뒤 목록 다시 받기, 새 폴더 = 폴더 POST 뒤 북마크 POST, 되돌리기 = 같은 issueId · folderId로 POST, 실패 시 `message` 토스트 | done | `save` · `unsave` · submit 핸들러 · `api()`가 `data.message`로 Error |
| 문구 · 레이아웃 그대로, 갱신 시각 줄 = `updatedAt` + 받은 이슈 수 | done | CSS · HTML 마크업 변경 없음(차이는 script 안만). "10.7 오전 6:00 수집 · 이슈 30개" 모양 |
| 마지막. `npm run build` | done | 아래 4절 |

## 2. SPEC 근거 AC 충족
| AC | 판정 | 근거 |
|---|---|---|
| AC-03-1 | 충족 | 오늘 랭킹: 6섹션 × 5, `articleCount` 내림차순 |
| AC-05-1 | 충족(화면은 코드 읽기) | `/` 200, 6섹션 렌더 코드 · 갱신 시각 줄 `fmtUpdated(updatedAt)` |
| AC-07-1 | 충족 | 저장 201 → 목록 맨 앞, 재시작 뒤 흐름에서 다시 GET해도 활성 |
| AC-07-2 | 충족 | DELETE 204 → 목록에서 빠짐, 두 번째 404 |
| AC-08-1 | 충족 | 북마크 10개 savedAt 내림차순, 이슈 8칸 + folderId · savedAt |
| AC-08-2 | 충족 | 모두 해제 뒤 `[]`, 화면 문구 "북마크한 기사가 없습니다" 그대로 |
| AC-09-1 | 충족 | 어제 200, id 모두 `2026-10-06-`, 오늘 id와 겹침 없음 |
| AC-10-1 | 충족 | 폴더 f1 반도체·AI 4 · f2 부동산·금리 3 · f3 나중에 읽기 3, 팝업에 `f.count` 표시 |
| AC-10-2 | 충족(이번 단계 범위) | 폴더 POST 201 `{f4, 테스트, 0}` → 그 폴더로 저장, f4 count 1. 이름 규칙 서버 검사는 ex03 |
| AC-10-3 | 충족(코드 읽기 + 요청 재현) | 칩 개수 = 폴더 `count` = 실제 북마크 수, "전체" = 전체 수, 필터 `folderId` |
| AC-10-4 | 충족 | 같은 이슈를 f2로 POST하면 409, f2 count 그대로, 목록에 1건 |

- "로그인한 사용자" 조건은 PLAN대로 데모 로그인 토글 그대로(ex10 · ex11)

## 3. 범위 · 변경 점검
PLAN에 없는데 추가된 것(모두 작고 필요한 수준, 위반 아님)
- `api` 스크립트의 `--env-file-if-exists=.env`(CLAUDE.md 4절 ".env에서만 읽음"에 맞춤)
- BFF의 `redirect: 'manual'` · `cache: 'no-store'`, 요청 헤더에서 `host`만 지움
- 화면 보조 함수 `secIssues` · `fmtUpdated` · `folderName` · `postBookmark` · `loadRanking` · `loadBookmarks`, 상태 `state.bookmarks`
- `tsconfig.json`(TypeScript 실행에 필요)

ex01에서 불필요하게 바뀐 것: 없음. `index.html`의 차이는 Data · State · 북마크 · Init 부분과 칸 이름 바꿈뿐이고 CSS · 마크업 · 문구는 같음. 지운 `DATA_DAYS` · `items` 구조 · `'f' + Date.now()`는 PLAN 변경의 직접 결과

출발점 폴더: `frontend/` · `ex01/` 변경 없음(`git status` 비어 있음, 심사 전후 파일 해시 같음)

화면에 이미 있던 동작(PLAN.md 6절, 코드 읽기로 판단)
- 04-2 새 탭: `target="_blank" rel="noopener"` 그대로 → 유지
- 05-2 모바일: CSS 변경 없음 → 유지
- 09-2 날짜 표시 · 오늘 버튼: `renderContext`의 날짜 · `todayBtn` 로직 그대로 → 유지
- 09-4 미래 날짜 막기: `dateInput.max = 오늘`, `setDate`가 오늘로 자름, `nextDay` 비활성, → 키 조건 그대로 → 유지
- 10-3 폴더 칩: `f.count`로 바꿔 그대로 동작 → 유지

## 4. `npm.cmd run build`
- 성공(종료 코드 0). Next.js 16.4.0(Turbopack) 컴파일 · TypeScript 통과, 라우트 `ƒ /api/[...path]`, 이어서 `tsc --noEmit` 오류 없음
- 빌드 전후 `tsconfig.json` · `next-env.d.ts` · `tsconfig.tsbuildinfo` 해시 변화 없음

## 5. 검증 방법 실행 (두 서버를 띄우고 node fetch로 3000에)
| # | 확인 | 결과 | 비고 |
|---|---|---|---|
| 1 | OpenAPI 형식 | [OK] | redocly lint 오류 0, 경고 4(ex01과 같음) |
| 2 | 엔드포인트 | [OK] | 6개만 |
| 3 | 상태 코드 | [OK] | 표와 같음 |
| 4 | 실패 메시지 | [OK] | 6개 각 1건 |
| 5 | 이슈 칸 | [OK] | 8칸 required, summary `[array, null]` 3개 |
| 6 | 섹션 키 | [OK] | enum 6개 |
| 7 | 폴더 이름 | [OK] | minLength 1 · maxLength 16 |
| 8 | 계약 그대로 | [OK] | SHA-256 같음 `649f078b…` |
| 9 | 출발점 그대로 | [OK] | `git status frontend/ ex01/` 변경 없음 |
| 10 | 빌드 | [OK] | 4절 |
| 11 | 화면 주소 | [OK] | `/` 200, 본문 = `public/index.html`. 6섹션 · 갱신 시각 줄은 코드 읽기 |
| 12 | 오늘 랭킹 | [OK] | date 2026-10-07, 6×5, 내림차순, rank 1~5, `2026-10-07T06:00:00+09:00` |
| 13 | 섹션 짝 | [OK] | pol 정치 · eco 경제 · soc 사회 · cul 생활·문화 · wor 세계 · it IT·과학 |
| 14 | 요약 null | [OK] | `2026-10-07-soc-6` 1개, `summaryHTML(null)` → "요약을 준비 중입니다"(코드 읽기) |
| 15 | 지난 날짜 | [OK] | 2026-10-06, 30개 id 모두 `2026-10-06-`, 오늘과 겹침 없음 |
| 16 | 데이터 없는 날 | [OK] | 404 "해당 날짜의 랭킹 데이터가 없습니다", 화면 `emptyNoData` 같은 문구(코드 읽기) |
| 17 | 북마크 목록 | [OK] | 200, 10개, 내림차순, 10칸, ISO savedAt |
| 18 | 폴더 목록 | [OK] | f1 4 · f2 3 · f3 3, 이름 그대로 |
| 19 | 저장 | [OK] | 201, 맨 앞 `2026-10-07-pol-0` · f1, f1 count 5 |
| 20 | 폴더 하나만 | [OK] | 409 "이미 북마크한 이슈입니다", f2 3→3 |
| 21 | 없는 이슈 · 폴더 | [OK] | 404 "이슈를 찾을 수 없습니다" · "폴더를 찾을 수 없습니다" |
| 22 | 해제 | [OK] | 204(빈 본문) · 목록에서 빠짐, 두 번째 404 "북마크를 찾을 수 없습니다" |
| 23 | 새 폴더 | [OK] | 201 `{"id":"f4","name":"테스트","count":0}` → f4 count 1 |
| 24 | 없을 때 | [OK] | `[]`, 화면 문구 그대로(코드 읽기) |
| 25 | 화면 흐름 | [OK] | api 재시작 뒤 초기값 복귀 확인 → 화면 요청 순서대로 재현: 저장 201 → 다시 GET 활성 · 맨 앞 → 해제 204 → 되돌리기 POST 201 → 다시 보임, 칩 개수 = 실제 수. 클릭 · 렌더는 코드 읽기(브라우저 미사용) |
| 26 | 중계 그대로 | [OK] | 8787과 3000의 어제 랭킹 상태 · 본문 같음(재시작 전후 두 번), 404도 같음 |
| 27 | Hono 꺼짐 | [OK] | 502 `{"message":"API 서버에 연결할 수 없습니다"}` |
| 28 | 가짜 데이터 제거 | [OK] | `POOL` 0 · `rankingFor` 0 · `seedBookmarks` 0 · `8787` 0 · `it.count` 0. `it.sec`는 단순 문자열 검색으로 7건이지만 모두 PLAN이 요구한 `it.section`의 일부이고, 낱말 경계 검색(`it\.sec\b`)은 0건 |

합계: 28/28 OK

## 6. 지켜야 할 것 위반 점검
- 기사 본문 저장 · 표시: 없음(제목 · 3줄 요약 · 링크 · 연관기사 수만)
- 코드에 들어간 키 · 접속 정보: 없음(`server` · `app` · `public` · 설정 파일 검색)
- `.env` git 제외: `.gitignore`의 `.env` · `.env.*`(단 `!.env.example`)로 제외됨
- PLAN에 없는 패키지: 없음. `package.json` 의존성 9개 = PLAN "새 패키지" 9개
- D0 밖 출처 수집: 없음. 서버 밖으로 나가는 fetch는 BFF → `API_URL` 하나뿐
- CLAUDE.md 규칙: 위반 없음(3000 · 8787, 커밋 없음, 섹션 키 · 문구 그대로)

## 참고 (판정에 넣지 않음)
- 자동 생성 파일: 심사 전 상태 = `next-env.d.ts` · `tsconfig.tsbuildinfo` 있음, `AGENTS.md` 없음. `next dev`가 `ex02/AGENTS.md`를 새로 만들고 `next-env.d.ts`의 import를 `.next/types/...` → `.next/dev/types/...`로 고침. 심사 뒤 `AGENTS.md`는 지우고 `next-env.d.ts`는 백업으로 되돌려 심사 전 해시와 같게 맞춤. `next build`는 세 파일을 바꾸지 않음. `.next/`는 원래 있었고 git 제외 대상
- `tsconfig.tsbuildinfo` · `next-env.d.ts` · `AGENTS.md`는 `.gitignore`에 없어 커밋하면 함께 들어감. 넣을지 다음 PLAN에서 정할 일
- 새로 저장한 북마크의 `savedAt`은 UTC `Z`(예 `2026-10-07T06:40:30.889Z`), 샘플은 `+09:00`. 둘 다 ISO라 계약 · 정렬엔 문제 없음
- 경계 입력(PLAN 밖): 내일 날짜는 404(400 거절은 ex03), JSON 아닌 본문 · 빈 폴더 이름 처리는 ex03
- 화면의 `TODAY`는 브라우저 지역 시간, 서버는 KST. 한국 밖 시간대 · 자정 근처에선 첫 진입 날짜와 "오늘" 표시가 어긋날 수 있음(제작 보고에도 적힘)
- 되돌리기는 PLAN대로 다시 POST라서 원래 자리가 아니라 목록 맨 앞으로 감(ex01은 원래 자리 복원)
- PLAN 검증표의 `it.sec` 검색은 `it.section`과 겹치므로 다음 PLAN에서는 낱말 경계 검색으로 적는 것이 좋음

## 정리
- 3000 · 8787 모두 끔. 남은 node 프로세스와 LISTEN 포트 없음 확인
- 임시 스크립트 · 백업은 scratchpad에만 둠. ex02 파일(node_modules · .next 제외) 해시가 심사 전과 같음
