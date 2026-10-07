# ex01 제작 보고 — OpenAPI 계약

## 1. 확인받았을 목록 (자동 실습이라 모두 "예"로 보고 진행)
- `ex01/`이 없음 → `frontend/`를 `ex01/`로 복사할지(`node_modules` · `dist` · `.data`는 원래 없음, 복사한 것은 `index.html` 하나)
- 바뀔 항목: `ex01/openapi.yaml` 새로 만듦(엔드포인트 6개, `components/schemas`, 응답마다 example)
- 지울 항목: 없음(이번 PLAN은 화면 변경이 없고, `index.html`은 복사만)
- 고칠 파일: `ex01/openapi.yaml`(새 파일) 하나. `ex01/index.html`은 손대지 않음
- 설치 패키지: 없음(PLAN "새 패키지: 없음"). lint는 설치 없이 `npx @redocly/cli`로만 실행
- 필요한 키: 없음
- 추가로 물었을 것: lint 오류 0개를 맞추려면 `servers`와 루트 `security: []`를 넣어야 하는데 넣어도 되는지(아래 3절)

## 2. PLAN 항목별 반영 위치 (`ex01/openapi.yaml`)
| PLAN 항목 | 반영 위치 |
|---|---|
| 구현 1: `frontend/` → `ex01/` 복사 | `ex01/index.html` (SHA-256 같음) |
| `GET /api/rankings` · 쿼리 `date`(생략 가능) · 200 · 404 | `paths./api/rankings.get` |
| `GET /api/bookmarks` · 200 배열(최근 저장 순) | `paths./api/bookmarks.get` |
| `POST /api/bookmarks` `{ issueId, folderId }` · 201 · 404(이슈 / 폴더 두 메시지) · 409 | `paths./api/bookmarks.post`, 요청은 `BookmarkCreate`, 404는 `examples`의 `issueNotFound` · `folderNotFound` |
| `DELETE /api/bookmarks/{issueId}` · 204 · 404 | `paths./api/bookmarks/{issueId}.delete` |
| `GET /api/folders` · 200 배열(만든 순) | `paths./api/folders.get` |
| `POST /api/folders` `{ name }` · 201 · 400 | `paths./api/folders.post`, 요청은 `FolderCreate`(minLength 1 · maxLength 16) |
| 랭킹: `date` · `updatedAt`(+09:00) · `sections` 6개(`key` · `name` · `issues`) | `components.schemas.Ranking` (sections minItems/maxItems 6, name enum 6개) |
| 이슈 8칸, `rank` 1~5, `summary` 3개 배열 또는 null, `articleCount` ≥ 1 | `components.schemas.Issue` (8칸 모두 required, `summary` type `[array, null]` · min/maxItems 3) |
| 북마크: 이슈 칸 + `folderId` · `savedAt` | `components.schemas.Bookmark` (allOf Issue + 두 칸 required) |
| 폴더: `id` · `name`(1~16자) · `count`(≥ 0) | `components.schemas.Folder` |
| 섹션 키 6개 enum | `components.schemas.SectionKey` (`section` · `key`가 함께 가리킴) |
| 오류 본문 `{ message }` | `components.schemas.Error`, 모든 4xx가 가리킴 |
| `date` 생략 시 가장 최근 수집일(D3) | `/api/rankings`의 description · 파라미터 설명 |
| 구현 4: 응답마다 화면 샘플 모양 example | 200 · 201 · 4xx 모두 example. 제목 · 요약 · 폴더 이름(반도체·AI 등)은 화면 `POOL` · `seedBookmarks` 문구 그대로. 요약 null 예시(`soc-6`) 포함 |

## 3. PLAN에 없지만 넣은 세부
- `servers: http://localhost:3000`, 루트 `security: []` — Redocly 기본 규칙에서 둘이 없으면 **오류**(no-empty-servers, security-defined 6건)가 나서 검증 "오류 0개"를 맞추려고 넣음. 주소는 D1(3000 포트), `security: []`는 "지금은 인증 없음"을 뜻함(401은 ex10 · ex11에서)
- `operationId`(경로마다), 요청 스키마 `BookmarkCreate` · `FolderCreate`, 공용 `SectionKey` — 경로에서 가리키기 위한 최소 정의
- `date` 칸에 `format: date`, 시각 칸에 `format: date-time` — 표기용. 실제 형식 검사는 ex03

## 4. 지운 것
- 없음

## 5. 필요했지만 없던 키 · 계정
- 없음(이번 단계는 외부 서비스 · `.env`를 쓰지 않음)

## 6. npm run build 결과
- 생략(CLAUDE.md 5절: ex01은 생략. `package.json`도 없음)

## 7. 검증 결과
| 확인 | 결과 |
|---|---|
| OpenAPI 형식 `npx @redocly/cli lint ex01/openapi.yaml` (v2.59.0) | **오류 0개**, 경고 4개: info-license(라이선스 없음), no-server-example.com(localhost), operation-4xx-response 2건(`GET /api/bookmarks` · `GET /api/folders`는 표에 실패가 없어 4xx 없음 — 표대로) |
| 엔드포인트 | 표의 6개만 있음 |
| 상태 코드 | rankings 200·404 / bookmarks GET 200 / POST 201·404·409 / DELETE 204·404 / folders GET 200 / POST 201·400 — 표와 같음 |
| 실패 메시지 6개 | 6개 모두 글자 그대로 있음(node로 검색) |
| 이슈 칸 | 8개 required, `summary`는 3개 배열 또는 null |
| 섹션 키 | enum 정확히 6개 |
| 폴더 이름 | 요청 `name` minLength 1 · maxLength 16 |
| 화면 그대로 | `ex01/index.html` = `frontend/index.html` SHA-256 같음 |
| 출발점 그대로 | `git status frontend/` 변경 없음 |
| example 모양 | Redocly 기본 규칙(no-invalid-media-type-examples)에서 경고 없음 → example이 스키마와 맞음 |

브라우저 확인 항목: 없음(화면 변경 없음, 서버 없음)

## 8. 추가로 보인 점
- 화면 데이터의 칸 이름이 계약과 다름: 화면은 `sec` · `count`, 계약은 `section` · `articleCount`. 화면 북마크는 `folder` 객체 · `savedAt`(밀리초 숫자), 계약은 `folderId` · `savedAt`(ISO 문자열). 랭킹도 화면은 `{ pol: [...] }` 객체, 계약은 `sections` 배열. ex02에서 화면을 서버에 붙일 때 어느 쪽을 맞출지 PLAN에 적어야 함
- 화면의 이슈 id(`eco-0` 등)는 날짜와 상관없이 같아서, 날짜별 이슈 한 건(D7)을 가리키기에는 겹침. example은 화면 모양대로 썼지만 ex02 · ex05에서 날짜를 포함한 id 규칙이 필요해 보임. `DELETE /api/bookmarks/{issueId}`도 이 id가 유일하다는 전제
- 폴더 이름 규칙은 AC-10-2가 "앞뒤 공백 제외 1~16자"인데 OpenAPI의 minLength/maxLength로는 공백 처리를 표현할 수 없음 → ex03 Zod에서 처리
- 날짜 기준 404와 별개로 잘못된 · 미래 날짜 400은 ex03에서 계약에 더해야 함(PLAN.md 7절)
- `GET /api/bookmarks` · `GET /api/folders`의 operation-4xx-response 경고는 ex11에서 401을 더하면 사라짐
- 랭킹 섹션의 `issues`는 maxItems 5만 두고 minItems는 두지 않음(데이터 적은 섹션 대비). 0개 허용 여부는 PLAN에 없음
- 화면에 "폴더 만들기 후 바로 저장"은 POST /api/folders → POST /api/bookmarks 두 번 호출로 됨(계약상 문제 없음)
- MCP 커넥터(Canva · Gmail · Google Drive)가 인증 필요 상태로 떠 있었으나 이번 작업과 무관해 쓰지 않음
