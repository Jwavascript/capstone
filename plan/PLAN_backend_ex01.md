# PLAN_backend_ex01 — OpenAPI 계약

> 이유: 화면이 가짜 데이터로만 돌아서, 서버가 무엇을 주고받아야 하는지 정해진 곳이 없음. 그래서 화면이 서버에 바랄 일을 `openapi.yaml`로 먼저 씀.
> 코드 폴더: `ex01/` (`frontend/` 복사)
> SPEC 근거: US-03 · US-05 · US-07 · US-08 · US-09 · US-10

## 이번 범위
- `ex01/openapi.yaml`(OpenAPI 3.1)에 엔드포인트 6개와 주고받는 칸을 적음
- 새 패키지: 없음
- 하지 않음: 서버 구현(ex02) · 날짜 형식 · 미래 날짜 · 이름 규칙 검사(ex03) · 로그인과 401(ex10 · ex11) · 같은 이름 폴더 허용 여부(ex03)

## API 계약
| 메서드 · 경로 | 보내는 것 | 성공 | 실패 (본문 `{ message }`) |
|---|---|---|---|
| `GET /api/rankings` | 쿼리 `date`(`YYYY-MM-DD`, 생략 가능) | 200 랭킹 | 404 "해당 날짜의 랭킹 데이터가 없습니다" |
| `GET /api/bookmarks` | — | 200 북마크 배열(최근 저장 순) | — |
| `POST /api/bookmarks` | `{ issueId, folderId }` | 201 북마크 | 404 "이슈를 찾을 수 없습니다" · "폴더를 찾을 수 없습니다" · 409 "이미 북마크한 이슈입니다" |
| `DELETE /api/bookmarks/{issueId}` | — | 204 | 404 "북마크를 찾을 수 없습니다" |
| `GET /api/folders` | — | 200 폴더 배열(만든 순) | — |
| `POST /api/folders` | `{ name }` | 201 폴더 | 400 "폴더 이름은 1~16자로 입력해 주세요" |

- 랭킹: `date` · `updatedAt`(ISO 8601, `+09:00`) · `sections`(6개, `key` · `name` · `issues`)
- 이슈: `id`(문자열) · `date` · `section` · `rank`(1~5) · `title` · `summary`(문자열 3개 배열 또는 null) · `articleCount`(1 이상) · `url`
- 북마크: 이슈 칸 전부 + `folderId` · `savedAt`(ISO 8601)
- 폴더: `id`(문자열) · `name`(1~16자) · `count`(0 이상)
- `section` · `key`는 `pol · eco · soc · cul · wor · it` 중 하나. `name`은 정치 · 경제 · 사회 · 생활·문화 · 세계 · IT·과학
- `date` 생략 시 가장 최근 수집일을 줌(PLAN.md D3). 북마크는 이슈 한 건 + 폴더 하나(D7)

## 화면 변경
- 없음(`index.html`은 복사만)

## 구현 순서
1. `frontend/` → `ex01/` 복사
2. `ex01/openapi.yaml`에 위 표의 경로 · 요청 · 응답 · 실패 메시지를 적음
3. 랭킹 · 이슈 · 북마크 · 폴더 · 오류를 `components/schemas`에 한 번씩 정의하고 경로에서 가리킴
4. 응답마다 화면 샘플과 같은 모양의 `example`을 하나씩 붙임

## 검증 방법
| 확인 | 방법 | 기대 결과 |
|---|---|---|
| OpenAPI 형식 | `npx @redocly/cli lint ex01/openapi.yaml`(설치 없이 npx) | 오류 0개(경고는 참고) |
| 엔드포인트 | `paths`의 경로 · 메서드를 표와 비교 | 표의 6개만 있음 |
| 상태 코드 | 경로마다 응답 코드를 표와 비교 | 성공 · 실패 코드가 표와 같음 |
| 실패 메시지 | 표의 메시지 6개를 파일에서 검색 | 6개 모두 글자 그대로 있음 |
| 이슈 칸 | 이슈 스키마의 `required`와 속성 | 8개 칸 모두 required, `summary`는 3개 배열 또는 null |
| 섹션 키 | `section` · `key`의 enum | 정확히 6개 키 |
| 폴더 이름 | 폴더 만들기 요청의 `name` | minLength 1 · maxLength 16 |
| 화면 그대로 | `ex01/index.html`과 `frontend/index.html` 해시 비교 | 같음 |
| 출발점 그대로 | `git status frontend/` | 변경 없음 |
