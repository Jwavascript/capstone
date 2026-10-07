# 한 화면(스크롤 없음) 대시보드 레퍼런스: 오픈소스 템플릿 편

- 조사 일자: 2026-10-07
- 범위: 라이브 데모 또는 스크린샷이 공개된 오픈소스·무료 대시보드 템플릿/저장소 (뷰포트 고정형, 벤토/그리드, 관제·TV 월보드, 뉴스 대시보드)
- 대상 SPEC: 6개 섹션 x Top 5 = 이슈 카드 30개를 1920x1080 / 1440x900에서 스크롤 없이 표시. 모바일은 세로 스택.

## 검증 방법과 한계

- 방법: GitHub API로 라이선스/최종 푸시/스타 확인, README·저장소 내 스크린샷을 `curl`로 scratchpad(`onescreen-template\`)에 내려받아 Read로 직접 확인, 레이아웃 CSS/템플릿 소스를 raw.githubusercontent.com에서 읽어 `h-screen`, `overflow`, grid 정의 확인. clone·실행은 하지 않음.
- 한계:
  - 라이브 데모를 브라우저로 직접 띄워 1920x1080/1440x900에서 확인하지는 못함. "한 화면 여부"는 스크린샷 + CSS 소스 근거임.
  - 웹 검색 결과의 일반 키워드 검색(`h-screen dashboard` 등)은 품질이 낮아, 뉴스/관제/TV 월보드 쪽 키워드로 후보를 좁힘. 후보 수가 많지 않으며 전수 조사가 아님.
  - "확인" = 이미지 또는 소스 코드로 직접 본 것, "미확인" = 보지 못했거나 추정.

## 검토한 후보

| 이름 | 저장소 URL | 데모 URL | 라이선스 | 이미지 확인 | 한 화면 여부 | 선정/탈락 사유 |
|---|---|---|---|---|---|---|
| granholm/tv-dashboard | https://github.com/granholm/tv-dashboard | 없음(README 스크린샷만) | 없음(GitHub API 라이선스 404, 파일 미확인) | 확인(1919x1078 스크린샷) | 예(확인: 스크린샷 + `h-screen w-screen grid-cols-4 grid-rows-3`, body `overflow-hidden`) | 1순위. 뉴스+위젯 4영역 1080p 고정 그리드. 라이선스 없음이므로 코드 복사 대신 패턴 참고 |
| Hue-Jhan/OSINT-War-Room | https://github.com/Hue-Jhan/OSINT-War-Room | 없음(`media/`에 mp4만) | MIT (확인) | 미확인(영상만 있고 이미지 없음) | 예(소스 확인: `.app-container{height:100vh;width:100vw}`, 패널 `overflow:hidden`, 본문만 내부 스크롤) | 2순위. 라이선스가 안전하고 "헤더+패널 카드 헤더/바디 내부스크롤" 구조가 SPEC과 유사. 시각 확인 못함 |
| koala73/worldmonitor | https://github.com/koala73/worldmonitor | https://worldmonitor.app | AGPL-3.0 (API 확인) | 확인(`.github/pr-assets/world-variant.png`) | 부분(확인: `html,body{overflow:hidden}`로 뷰포트 고정, 단 `.main-content`가 내부 스크롤이고 `.panels-grid`는 auto-fill) | 3순위. 뉴스 관제형 헤더/툴바/뷰포트 고정 셸 참고용. 전체 패널이 한 번에 보이진 않음. AGPL이라 코드 복사 부담 |
| glanceapp/glance | https://github.com/glanceapp/glance | 없음(README 이미지) | AGPL-3.0 (API 확인) | 확인(`readme-main-image.png`) | 아니오(확인: 이미지 하단이 잘리고 "SHOW MORE", 3열 컬럼 흐름 스크롤형) | 탈락. 피드 대시보드 UI 느낌만 참고 가능, 스크롤 전제 |
| hipcityreg/situation-monitor | https://github.com/hipcityreg/situation-monitor | https://situation-monitor-rose.vercel.app | 없음(API 확인: null) | 미확인(저장소에 스크린샷 없음) | 아니오(확인: `column-count` 1~6 masonry + `.dashboard{overflow-y:auto}`, `min-height:100vh`) | 탈락. 뉴스 패널 대시보드이나 스크롤형 masonry, 라이선스 없음 |
| Smashing/smashing (Dashing 후속) | https://github.com/Smashing/smashing | https://smashing.github.io/ | MIT (API 확인) | 확인(997x599 샘플) | 아니오/부분(확인: gridster, 위젯 기본 크기 300x360px 고정, 뷰포트에 맞춰 늘어나지 않음) | 탈락. TV 월보드 원조지만 고정 px 타일, 구형(2023 이후 푸시 없음), 텍스트 3줄 카드엔 부적합 |
| keen/dashboards | https://github.com/keen/dashboards | http://keen.github.io/dashboards/ | MIT (API 확인) | 미확인(preview.png가 1KB대 극소 이미지라 판독 안 함) | 아니오(확인: CSS 차트 높이 고정 px, 뷰포트 고정 규칙 없음) | 탈락. 2021 이후 갱신 없음, 스크롤형 |
| MELORD77/kiosk-v3 | https://github.com/MELORD77/kiosk-v3 | 없음 | 미확인 | 미확인 | 미확인(README 설명상 1080x1920/1920x1080 키오스크) | 탈락(검증 불가). 여관·민원형 키오스크, 뉴스 대시보드 아님 |
| Tremor/shadcn 계열 관리자 템플릿 일반 | https://tremor.so (참고) | 각 사이트 | MIT 계열(미개별확인) | 미확인 | 아니오(추정: 통상 사이드바+스크롤 페이지) | 탈락. 검색에서 뷰포트 고정형 사례를 찾지 못함 |

## 추천 3개 (순위)

### 1순위: granholm/tv-dashboard

- URL: https://github.com/granholm/tv-dashboard (데모 없음, README 스크린샷 확인)
- 라이선스: 없음 확인(API 404). 사실상 재사용 권한 불명이므로 코드 복붙 금지, 구조만 참고해 직접 구현.
- 기술 스택(README/소스 확인): Vue 3 + Vite + Tailwind CSS, 백엔드 Bun + Express(RSS/HA 프록시), 차트 Chart.js.
- 그리드 구조(확인): `grid grid-cols-4 grid-rows-3 h-screen w-screen p-6 gap-6`. 왼쪽 3열 x 2행 = 메인(뉴스 로테이터), 오른쪽 1열 x 2행 = "Latest News" 리스트, 하단 1행 = 날씨(2열) + 전기요금 차트(2열).
- 뷰포트 고정 방식(소스 확인): 루트 `h-screen w-screen` + 그리드 행 3등분, `style.css`에서 `body{overflow-hidden; width:1920px; height:1080px}`. 카드 `overflow-hidden`, 리스트 카드만 `overflow-y-auto scrollbar-hide`.
- 한 화면에 담기게 한 기법: (1) 행/열 비율을 grid-cols/rows로 선언, (2) 긴 텍스트는 `line-clamp-2`, `line-clamp-3`로 자름(NewsRotator에서 확인), (3) 넘칠 수 있는 영역은 내부 스크롤 + 스크롤바 숨김, (4) 대표 기사는 로테이션(자동 순환)으로 공간 절약.
- SPEC 30개 카드 적용: 같은 방식으로 `h-screen` 루트 + 헤더 고정 행 + 본문 `grid-cols-3 grid-rows-2`로 섹션 6개 패널을 배치. 패널마다 5개 이슈를 5등분 행으로 두고 제목 `line-clamp-1`, AI 요약 `line-clamp-3`.
- 가져올 부분: `h-screen` + 명시적 grid-cols/rows, `p-6 gap-6` 다크 카드 톤, `line-clamp`, 다크 모드 팔레트, 상단 진행바 로테이션 아이디어.
- 맞지 않는 부분: 1920x1080 하드코딩(`body` 고정 px) → 1440x900에서 깨짐, 반응형/모바일 스택 없음, 한 카드에 이슈 1개씩만 보이는 구조(30개 동시 표시 아님), 라이선스 없음.

### 2순위: Hue-Jhan/OSINT-War-Room

- URL: https://github.com/Hue-Jhan/OSINT-War-Room
- 라이선스: MIT (확인). 코드 재사용 가능.
- 기술 스택: Python FastAPI 백엔드 + 바닐라 JS/HTML5 프런트, Leaflet 지도, Split.js(CDN)로 패널 분할(소스 확인).
- 그리드 구조(소스 확인): 좌측 56px 사이드바 + `.main-area`(세로 flex: 상단바 48px + `#split-vertical`). `#split-vertical`은 위 지도 패널 / 아래 `#split-horizontal`에서 3개 컬럼 패널(통신/피드/경제)을 가로 분할. 스크린샷은 미확인.
- 뷰포트 고정 방식(코드 확인): `.app-container{display:flex;height:100vh;width:100vw;padding:8px;gap:8px}`, `.main-area{height:100%}`, 카드 `.panel-card{display:flex;flex-direction:column;overflow:hidden;height:100%;min-height:0}`, 패널 헤더 고정, 바디만 `height:0; overflow-y:auto`로 내부 스크롤. 주석에 "Critical Fix: max-height 100%" 등 flex 넘침 버그 대응이 남아 있음.
- 한 화면에 담기게 한 기법: 모든 박스에 `min-height:0` + `overflow:hidden`을 부여해 flex 자식이 부모를 밀어내지 못하게 하고, 바디만 내부 스크롤.
- SPEC 적용: `.panel-card`(헤더 + 바디) 패턴을 섹션 패널 6개에 그대로 사용. 바디는 5개 이슈를 flex column으로 균등 분배하여 내부 스크롤이 생기지 않게 조정.
- 가져올 부분: `min-height:0` 및 `overflow:hidden` 레시피, 패널 카드 헤더/바디 구조, 컴팩트 다크 톤.
- 맞지 않는 부분: 지도·사이드바·Split.js 드래그 리사이즈는 불필요, 전술 관제 컨셉(밀도 높은 모노스페이스) 시연 톤과 다름, 이미지 미확인.

### 3순위: koala73/worldmonitor (World Monitor)

- URL: https://github.com/koala73/worldmonitor, 데모 https://worldmonitor.app
- 라이선스: AGPL-3.0 (API 확인). 코드 복사 시 소스 공개 의무가 있어 구조·아이디어 참고만 권장.
- 기술 스택: TypeScript, 순수 CSS(`src/styles/main.css`), 지도(3D 글로브/WebGL), 데스크톱 앱 지원(README 기준, 세부 스택 미확인).
- 그리드 구조(스크린샷 확인): 상단 알림 배너 + 툴바 헤더, "GLOBAL SITUATION" 지도 영역(화면 상단 약 55%), 하단에 라이브 뉴스 / 웹캠 / AI 인사이트 3패널, 맨 아래 푸터. 코드상 패널 영역은 `.panels-grid{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}`.
- 뷰포트 고정 방식(소스 확인): `html,body{height:100%;overflow:hidden}`, `#app`은 고정 뷰포트 flex column(주석 확인), `.main-content{flex:1 1 0;min-height:0;overflow-y:auto}`, `.map-section{height:50vh;min-height:350px;max-height:90vh}`.
- 한 화면에 담기게 한 기법: 셸은 고정하고 본문만 내부 스크롤, 지도는 vh 비율로 높이 지정, 패널은 auto-fill로 열 수 자동 조정.
- SPEC 적용: 헤더/툴바(날짜 선택기, 오늘 버튼, 갱신 시각 배치)와 푸터 상태바 구성 참고. 패널 그리드는 auto-fill 대신 고정 3x2로 바꿔야 함.
- 가져올 부분: 고정 셸(`overflow:hidden` + flex column + 내부 스크롤 본문), 헤더 툴바 구성, 패널 헤더 UI, 모바일에서 탭바로 전환하는 아이디어(`.mobile-tab-bar` 확인).
- 맞지 않는 부분: 모든 패널이 한 번에 보이지 않음(내부 스크롤 전제, "한 화면 전체 정보" 조건 불충족), 지도 중심 컨셉, 라이선스 AGPL, 규모가 커서 이식 비용 큼.

## 최종 결론

- 최종 1순위: granholm/tv-dashboard. 이유: 이미지(1919x1078)와 소스(`h-screen` + `grid-cols-4 grid-rows-3`, `overflow-hidden`)가 모두 확인되고, 구조가 단순해서 SPEC의 6패널 확장이 쉬움. 뉴스 중심이라 도메인도 맞음. 단 라이선스가 없어 코드는 복사하지 않고 같은 Tailwind 패턴으로 직접 작성. 안전한 코드 재사용이 필요한 부분(flex 넘침 방지)은 MIT인 Hue-Jhan 레시피를 병용.
- 공통 결론: 30개 카드를 정말 한 화면에 모두 보여주는 템플릿은 찾지 못함(가장 가까운 것이 1순위지만 카드 수가 적음). 즉 "고정 뷰포트 셸 + 3x2 섹션 패널 + 텍스트 클램프" 조합은 직접 구성해야 함.

## SPEC용 한 화면 레이아웃 CSS 골격 (1920x1080 기준 제안, 미검증 초안)

수치 산정(추정): 헤더 56px, 여백/간격 합 약 40px, 본문 약 984px를 2행으로 나누면 섹션 패널 1개당 약 490px. 패널 헤더 32px 제외 시 이슈 5개가 각 약 90px. 한 이슈 = 제목 1줄(15px) + 요약 3줄(12px x 16px 줄간격 = 48px) + 메타/버튼 줄(18px) = 약 85px로 빠듯하게 들어감. 1440x900에서는 이슈당 약 70px이라 요약 글자 11px로 축소하거나 `clamp()` 사용이 필요함(미검증).

```css
:root { --hdr: 56px; --gap: 10px; }
html, body { height: 100%; margin: 0; overflow: hidden; }          /* 데스크톱 스크롤 금지 */

.app {
  display: grid;
  height: 100dvh;
  grid-template-rows: var(--hdr) minmax(0, 1fr);                    /* minmax(0,1fr) 필수: 넘침 방지 */
  gap: var(--gap);
  padding: var(--gap);
}
.board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));                 /* 3열 */
  grid-template-rows: repeat(2, minmax(0, 1fr));                    /* 2행 = 섹션 6개 */
  gap: var(--gap);
  min-height: 0;
}
.section { display: grid; grid-template-rows: 32px minmax(0, 1fr); min-height: 0; overflow: hidden; }
.issues  { display: grid; grid-template-rows: repeat(5, minmax(0, 1fr)); min-height: 0; }
.issue .title   { font-size: clamp(13px, 1.4vh, 15px); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.issue .summary { font-size: clamp(11px, 1.15vh, 12.5px); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

@media (max-width: 900px) {                                          /* 모바일: 세로 스택 + 스크롤 허용 */
  html, body { overflow: auto; }
  .app { height: auto; grid-template-rows: auto auto; }
  .board { grid-template-columns: 1fr; grid-template-rows: none; }
  .issues { grid-template-rows: none; }
}
```

핵심 기법 요약: `100dvh` 루트 + `minmax(0,1fr)` 행/열 + 모든 중간 박스에 `min-height:0; overflow:hidden` + 제목/요약 `line-clamp` + 모바일 미디어쿼리에서만 스크롤 해제.

## 참고한 이미지 파일 (scratchpad)

`C:\Users\User\AppData\Local\Temp\claude\c--Users-User-Documents-capstone\df945911-b33d-4c15-bfbb-ea64904319ed\scratchpad\onescreen-template\` 아래 `granholm.png`, `wm-world.png`, `glance.png`, `smashing.png`
