# ex01 심사 결과 — OpenAPI 계약

- 대상: `ex01/` (출발점 `frontend/`)
- 기준: `SPEC.md`, `PLAN.md`(5절 결정 · 6절 AC), `plan/PLAN_backend_ex01.md`, `CLAUDE.md` (앞 PLAN 없음)
- 심사일: 2026-10-07 · 코드 수정 없음 · git 커밋 없음

## 최종 판정: **PASS**

PLAN 항목 모두 done · OpenAPI 형식 검사 통과(오류 0) · 검증 9/9 OK · 위반 없음

---

## 1. PLAN 항목별 판정

| PLAN 항목 | 판정 | 근거 |
|---|---|---|
| 구현 1: `frontend/` → `ex01/` 복사 | done | `ex01/index.html` SHA-256 = `frontend/index.html` (`f6d9fd64…798e`) |
| 구현 2: `GET /api/rankings` · 쿼리 `date`(생략 가능) · 200 · 404 | done | `required: false`, 200 `Ranking`, 404 메시지 그대로 |
| `GET /api/bookmarks` · 200 배열(최근 저장 순) | done | 200 `Bookmark[]`, 설명 "savedAt 내림차순" |
| `POST /api/bookmarks` `{ issueId, folderId }` · 201 · 404(2개) · 409 | done | `BookmarkCreate` 두 칸 required, 404 `examples`에 두 메시지, 409 |
| `DELETE /api/bookmarks/{issueId}` · 204 · 404 | done | 204 본문 없음, 404 메시지 |
| `GET /api/folders` · 200 배열(만든 순) | done | 200 `Folder[]`, 설명 "만든 순" |
| `POST /api/folders` `{ name }` · 201 · 400 | done | `FolderCreate.name` minLength 1 · maxLength 16, 400 메시지 |
| 실패 본문 `{ message }` | done | 모든 4xx가 `Error`(message required)를 가리킴 |
| 랭킹: `date` · `updatedAt`(+09:00) · `sections` 6개(`key` · `name` · `issues`) | done | 셋 다 required, sections min/maxItems 6, 예시 `+09:00` |
| 이슈 8칸 · `rank` 1~5 · `summary` 3개 배열 또는 null · `articleCount` ≥ 1 | done | 8칸 required, `type: [array, null]` min/maxItems 3 |
| 북마크: 이슈 칸 전부 + `folderId` · `savedAt` | done | `allOf: [Issue, {folderId, savedAt}]` 둘 다 required |
| 폴더: `id` · `name`(1~16자) · `count`(≥ 0) | done | `Folder` |
| `section` · `key` enum 6개, `name` 6개 | done | `SectionKey` enum 6개를 둘이 공유, `name` enum 6개 |
| `date` 생략 시 가장 최근 수집일(D3) | done | 경로 · 파라미터 설명 |
| 북마크 = 이슈 한 건 + 폴더 하나(D7) | done | `folderId` 단일 문자열 |
| 구현 3: 스키마를 `components/schemas`에 한 번씩 정의하고 경로에서 참조 | done | Ranking · Issue · Bookmark · Folder · Error(+ SectionKey · BookmarkCreate · FolderCreate) |
| 구현 4: 응답마다 화면 샘플 모양 `example` | done | 본문 있는 응답 11개 모두 example(s). 제목 · 요약 24줄 · 폴더 이름이 `frontend/index.html`의 `POOL` · `seedBookmarks` 문구와 글자 그대로 일치, 요약 null 예시는 화면과 같은 `soc-6` |
| 새 패키지: 없음 | done | `ex01/`에 `package.json` · `node_modules` 없음 |
| 화면 변경: 없음 | done | 해시 같음 |
| 하지 않음(서버 · 날짜 형식 검사 · 401 · 같은 이름 폴더) | done | 해당 내용 없음(`format`은 표기만, 아래 3절) |

## 2. SPEC 근거 AC별 충족 여부 (ex01 = 계약 단계 기준)

| AC | 판정 | 비고 |
|---|---|---|
| AC-03-1 섹션별 최대 5개 | 충족 | `issues` maxItems 5, `rank` 1~5 (검증: 엔드포인트 · 이슈 칸) |
| AC-03-2 동점 시 최신 발행 우선 | 참고 | 계약으로 표현할 대상 아님, PLAN 검증 줄 없음(ex02 · ex04) |
| AC-05-1 6개 섹션 + 마지막 갱신 시각 | 충족 | sections 6개 고정, `updatedAt` required (검증: 섹션 키) |
| AC-05-2 모바일 세로 쌓임 | 참고 | 화면 동작, `index.html` 변경 없음 |
| AC-07-1 폴더 골라 북마크 저장 | 충족 | `POST /api/bookmarks` `{issueId, folderId}` 201 (검증: 엔드포인트 · 상태 코드) |
| AC-07-2 북마크 해제 | 충족 | `DELETE /api/bookmarks/{issueId}` 204 (검증: 상태 코드) |
| AC-07-3 비로그인 안내 | 참고 | 401은 ex10 · ex11 (PLAN "하지 않음") |
| AC-08-1 최근 저장 순 카드 | 충족 | `GET /api/bookmarks` Bookmark = 이슈 칸(요약 · 기사 수 · 링크) + savedAt (검증: 이슈 칸) |
| AC-08-2 북마크 없을 때 안내 | 참고 | 빈 배열 → 화면 문구, PLAN 검증 줄 없음 |
| AC-08-3 다른 기기 같은 목록 | 참고 | ex11 |
| AC-09-1 지난 날짜 조회 | 충족 | 쿼리 `date` (검증: 엔드포인트) |
| AC-09-2 날짜 표시 · 오늘 버튼 | 참고 | 화면 동작, 변경 없음 |
| AC-09-3 데이터 없는 날짜 안내 | 충족 | 404 "해당 날짜의 랭킹 데이터가 없습니다" 글자 그대로 (검증: 실패 메시지) |
| AC-09-4 미래 날짜 선택 불가 | 참고 | 화면 동작 · 서버 400은 ex03 |
| AC-09-5 과거 날짜 카드 북마크 | 참고 | 같은 `POST /api/bookmarks`로 가능, 계정별은 ex11 |
| AC-10-1 폴더 + 저장 개수 | 충족 | `GET /api/folders` `count` (검증: 엔드포인트) |
| AC-10-2 새 폴더 1~16자 → 바로 저장 | 충족(계약 범위) | minLength 1 · maxLength 16, 400 메시지 (검증: 폴더 이름 · 실패 메시지). 앞뒤 공백 제외는 ex03 |
| AC-10-3 폴더 칩 · 개수 | 참고 | 북마크 `folderId` · 폴더 `count`로 가능, PLAN 검증 줄 없음. 화면 동작 변경 없음 |
| AC-10-4 북마크는 폴더 하나 | 참고 | `folderId` 단일 문자열로 표현됨, 별도 검증 줄 없음 |

## 3. 추가 · 변경 · 출발점 · 기존 동작

### PLAN에 없는데 추가된 것 (모두 위반 아님, 참고)
- `servers: http://localhost:3000`, 루트 `security: []` — 심사에서 둘을 뺀 사본(scratchpad)으로 lint해 보니 **오류 7개**(no-empty-servers 1 · security-defined 6)가 나옴. PLAN 검증 "오류 0개"를 맞추려면 필요했고, 값도 D1(3000) · "인증 없음"과 맞음. 제작 보고 3절에 이유가 적혀 있음
- `operationId` 6개, 요청 스키마 `BookmarkCreate` · `FolderCreate`, 공용 `SectionKey` — 참조용 최소 정의
- `format: date` · `format: date-time` · `url`의 `format: uri` — 표기용. `format: uri`는 제작 보고 3절 목록에 빠져 있음(참고)
- `info.description`, 파라미터 `example`, 주석 한 줄
- POST 북마크 404는 메시지가 두 개라 `example` 대신 `examples` 2개 — PLAN 의도에 맞음

### 출발점에서 불필요하게 바뀐 것
- 없음. `ex01/index.html`은 복사본 그대로(해시 같음)

### 출발점 폴더가 바뀌었는지
- 아님. `git status frontend/` 변경 없음, `frontend/`에는 `index.html` 하나뿐(수정 시각 10:11, ex01 작업 전)

### 화면에 이미 있던 동작(PLAN.md 6절: 04-2 · 05-2 · 09-2 · 09-4 · 10-3)
- 깨지지 않음. `index.html`이 바이트 단위로 같음

## 4. 빌드 / OpenAPI 형식

- `npm run build`: ex01은 생략(CLAUDE.md 5절, `package.json` 없음)
- 대신 `npx @redocly/cli lint ex01/openapi.yaml` → **"Your API description is valid"**, 오류 0 · 경고 4, 종료 코드 0
  - 경고(참고): info-license 1, no-server-example.com(localhost) 1, operation-4xx-response 2(`GET /api/bookmarks` · `GET /api/folders` — 표에 실패가 없어 표대로임, 401이 들어오는 ex11에서 해소)
- `redocly bundle --ext json`으로 JSON 변환도 문제없음 → `openapi: 3.1.0`으로 읽힘

## 5. PLAN "검증 방법" 실행

| # | 확인 | 실행 | 결과 | 판정 |
|---|---|---|---|---|
| 1 | OpenAPI 형식 | `npx @redocly/cli lint ex01/openapi.yaml` | 오류 0, 경고 4 | [OK] |
| 2 | 엔드포인트 | bundle JSON의 `paths` 나열 | GET /api/rankings · GET/POST /api/bookmarks · DELETE /api/bookmarks/{issueId} · GET/POST /api/folders — 표의 6개만 | [OK] |
| 3 | 상태 코드 | 경로별 응답 코드 | 200·404 / 200 / 201·404·409 / 204·404 / 200 / 201·400 — 표와 같음 | [OK] |
| 4 | 실패 메시지 | node로 6개 문구 검색 | 6개 모두 글자 그대로 있음 | [OK] |
| 5 | 이슈 칸 | `Issue.required` · `summary` | 8칸 모두 required, `summary` = `[array, null]`, min/maxItems 3, items string | [OK] |
| 6 | 섹션 키 | `SectionKey.enum` | `[pol, eco, soc, cul, wor, it]` 정확히 6개, `section` · `key` 둘 다 참조 | [OK] |
| 7 | 폴더 이름 | `FolderCreate.name` | minLength 1 · maxLength 16 | [OK] |
| 8 | 화면 그대로 | `sha256sum` 두 파일 | 둘 다 `f6d9fd64…798e` | [OK] |
| 9 | 출발점 그대로 | `git status frontend/` | 변경 없음 | [OK] |

**합계 9/9 OK** (3000 포트 기동은 서버가 없어 해당 없음)

- 임시 파일: bundle JSON · 점검 스크립트 · servers 뺀 사본은 모두 scratchpad에 만들고 지움. lint/bundle은 scratchpad에서 실행해 저장소에 새 파일 없음
- 저장소 파일은 바꾸지 않음. 심사 전후 해시 같음: `ex01/openapi.yaml` `649f078b…637f`, `ex01/index.html` · `frontend/index.html` `f6d9fd64…798e`

## 6. 지켜야 할 것 위반 점검

| 항목 | 결과 |
|---|---|
| 기사 본문 저장 · 표시 | 없음. 계약 칸은 제목 · 요약 · 기사 수 · 링크뿐 |
| 코드에 들어간 키 · 접속 정보 | 없음(`openapi.yaml`에 키 · 비밀값 없음. `servers`의 localhost는 접속 비밀값 아님) |
| `.env`가 git 제외 대상인지 | 제외됨: `git check-ignore -v ex01/.env` → `.gitignore:4:.env` (`.env` 파일 자체는 이번 단계에 없음) |
| PLAN에 없는 패키지 | 없음(설치 없음, redocly는 npx 일회 실행 — PLAN이 지정한 방법) |
| D0 밖의 출처 수집 | 없음(수집 코드 없음) |
| CLAUDE.md 규칙 | 위반 없음. 범위 밖 기능 · 401 · 검사 미추가, 화면 문구 · 섹션 키 그대로, PLAN 밖 세부는 보고 "PLAN에 없지만 넣은 세부"에 공개, 커밋 없음 |

## 참고 (PASS에 영향 없음)
- `Ranking.sections[].name` enum이 `key`와 짝지어 묶이지는 않음(`pol`+`경제` 조합도 스키마상 통과). PLAN 요구는 아님
- 랭킹 `issues`에 minItems 없음 → 빈 섹션 허용. PLAN에 정해진 바 없음
- 제작 보고 8절의 지적(화면 칸 이름 `sec`/`count`/`folder` 객체 vs 계약 `section`/`articleCount`/`folderId`, 날짜 없는 이슈 id `eco-0`의 중복 가능성)은 ex02 PLAN에서 정할 사항으로 타당함
- 예시의 `rank`/`articleCount`가 화면 `rng` 값과 같지는 않음(형태만 맞춤, PLAN 요구는 "같은 모양")
