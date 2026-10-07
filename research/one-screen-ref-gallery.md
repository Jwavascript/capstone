# 디자인 시안 공유 플랫폼 개별 작품 레퍼런스 조사 (한 화면 뉴스 대시보드)

- 조사 일자: 2026-10-07
- 범위: Figma Community, Dribbble, Behance, Mobbin, Land-book, Godly, Designspiration, Pinterest 등 디자인 갤러리의 개별 작품. 1920×1080 또는 1440×900 한 프레임에 들어가는 뉴스·콘텐츠·모니터링 대시보드를 우선함.
- 대상 SPEC: 6개 섹션 × Top 5 = 이슈 30개 카드(순위, 제목, AI 3줄 요약, 연관기사 수, 원문 링크, 북마크). 헤더에 날짜 선택기·"오늘" 버튼·마지막 갱신 시각·로그인/북마크.

## 검증 방법과 한계 (먼저 읽을 것)

- 검증 방식: 작품 페이지의 og:image, 또는 Figma 템플릿 목록의 CDN 썸네일을 `curl`로 scratchpad(`onescreen-gallery/`)에 내려받아 Read로 직접 확인했다.
- **접근 제약이 커서 이 조사는 목표를 충분히 달성하지 못했다.**
  - Dribbble: 모든 shot/검색 URL이 HTTP 202(빈 응답, 봇 챌린지). WebFetch도 빈 본문.
  - Behance: 갤러리 URL 전부 HTTP 403. WebFetch도 403.
  - Figma Community 개별 파일: 처음 몇 건은 og:image가 받아졌으나 이후 HTTP 202(빈 응답)로 막혀 더는 확인하지 못했다. 우회 시도는 하지 않았다.
  - Muzli 404, Mobbin·Land-book·Godly는 접속은 되나 뉴스 대시보드 개별 작품을 찾지 못함. Designspiration 검색은 질의와 무관한 결과를 반환했고 출처 표기도 없어 제외. Pinterest는 핀 URL을 얻지 못함.
- Figma의 커뮤니티 커버 이미지는 대부분 **마케팅용 목업(기기 프레임, 가운데 정렬 타이틀, 일부만 잘린 화면)**이라 "프레임이 한 화면에 들어가는가"를 이미지로 증명하지 못한다. 아래 "한 화면 여부"는 이 점을 반영해 보수적으로 적었다.
- **결론적으로, "뉴스 이슈 30개를 스크롤 없이 한 화면에 보여주는 시안"을 이미지로 확인한 사례는 찾지 못했다.** 아래 추천 3개는 "이미지를 직접 본 것 중 그나마 참고 가치가 있는 것"이며, 1920×1080 프레임 크기는 어느 것도 확인하지 못했다.

## 검토한 후보 표

| 작품명 | URL | 플랫폼 | 이미지 확인 | 한 화면 여부 | 선정/탈락 사유 |
|---|---|---|---|---|---|
| Modern News: News Website (Homepage) (Mohit Bansal) | https://www.figma.com/community/file/1317043898519671693/news-website-home-page | Figma | 확인(커버 1626×960) | 노트북 목업 안에 한 화면 홈이 보임(프레임 크기 미확인) | 선정 3순위. 뉴스 홈의 Latest+Trending 2열 구성 참고용. 정보량 적고 대시보드 아님 |
| Analytics Dashboard (Tesla Reports 시안) | https://www.figma.com/community/file/1152266255337829742/analytics-dashboard | Figma | 확인(2400² 중 하단이 잘린 커버) | 커버에서 하단이 잘려 판단 불가 | 선정 1순위. 필터 바 + 카드 격자 + 2열 리스트의 밀도 참고. 뉴스 아님 |
| Dashboard (GoodFood, 사이드바형) | https://www.figma.com/community/file/1048559673287861086/dashboard | Figma | 확인 | 하단이 잘려 판단 불가 | 선정 2순위. 2×3 카드 분할 격자 참고. 사이드바 때문에 SPEC과 다름 |
| News Aggregator App UI (Rajasekar) | https://www.figma.com/community/file/1360936707750560319/news-aggregator-app | Figma | 확인(모바일 목업만) | 아니오(모바일 앱) | 탈락. Breaking News 카드, 카테고리 칩, 북마크 아이콘은 모바일 레이아웃 참고에만 쓸 수 있음 |
| Modern & Responsive News Portal UI Design | https://www.figma.com/community/file/1469197096228175395/modern-responsive-news-portal-ui-design | Figma | 확인(타이틀 카드, 화면 일부만 흐릿) | 판단 불가 | 탈락. 커버가 타이틀 중심이고 실제 화면 해상도가 낮음 |
| Dashboards Layout Ideas (reazulkarim) | https://www.figma.com/community/file/1208363071768116045/dashboards-layout-ideas | Figma | 확인(일러스트 타이틀 카드) | 판단 불가 | 탈락. 커버에 화면이 없음 |
| Dashboard Tennis | https://www.figma.com/community/file/882171933811828307/dashboard-tennis | Figma | 확인 | 아니오(회전된 카드 콜라주) | 탈락. 레이아웃 정보 없음 |
| Dashboard (Expenses) | https://www.figma.com/community/file/977500202909795677/dashboard | Figma | 확인 | 하단 잘림 | 탈락. 3열(사이드바, 목록, 요약)은 흥미롭지만 뉴스와 거리가 멈 |
| Dashboards UI Kit (craftwork) | https://www.figma.com/community/file/1135477961222225742/dashboards-ui-kit | Figma | 확인 | 아니오(겹친 목업) | 탈락 |
| 그 외 Figma 대시보드 13건(crypto, healthcare, CRM, sales 등, 썸네일 다운로드만 하고 미열람) | 예: https://www.figma.com/community/file/1153320445661469840/sales-dashboard-design | Figma | 미확인(열람 안 함) | 미확인 | 뉴스와 무관해 열람 생략 |
| UX/UI Design for a Personalized News App & Dashboard (Omar Bellaouch) | https://www.behance.net/gallery/216556107/UXUI-Design-for-a-Personalized-News-App-Dashboard | Behance | 미확인(403) | 미확인 | 검색 결과 설명만 확인. 뉴스 앱 + 관리자 대시보드 구성이라 유망한 후속 조사 후보 |
| News Web App Dashboard - Free UI Resources (Mike Taylor, Redwhale) | https://dribbble.com/shots/15139246-News-Web-App-Dashboard-Free-UI-Resources | Dribbble | 미확인(202) | 미확인 | "전 세계 뉴스를 보는 대시보드"라는 검색 결과 설명만 확인. 후속 조사 후보 |
| Bace / MakNews / Infomaz - News Dashboard | https://dribbble.com/search/news-dashboard (검색 페이지에서 언급, 개별 URL은 확보 못 함) | Dribbble | 미확인 | 미확인 | 개별 작품 URL을 얻지 못해 후보에서 제외 |
| News Aggregator App / DailyScope News APP UI / News Site 등 | https://www.figma.com/community/file/1512360353462789720/dailyscope-news-app-ui | Figma | 미확인(차단) | 미확인 | 설명상 모바일 앱 중심 |

## 추천 3개 (이미지로 확인한 범위 안에서)

공통 주의: 아래 세 작품은 모두 "참고할 부분이 있다"는 수준이며, 뉴스 30개 이슈 한 화면 배치의 직접 레퍼런스는 아니다. 프레임 크기는 미확인이다.

### 1순위. Analytics Dashboard (Tesla Reports 시안)

- URL: https://www.figma.com/community/file/1152266255337829742/analytics-dashboard
- 작성자: 미확인. 프레임 크기: 미확인(커버는 2400×2400 정사각, 화면은 하단이 잘림).
- 그리드 구조(이미지 확인): 좌측 사이드바 + 본문. 본문은 [제목 + 다운로드] → [필터 드롭다운 3개 가로 배치] → [KPI 타일 3×2(왼쪽 6개)와 막대 차트(오른쪽)] → [2열 리스트 카드("Weakest/Strongest Topics")] → 그 아래 리더보드 2열. 즉 약 3개 가로 밴드를 2열로 나눈 격자.
- 카드 구성과 정보량: KPI 타일은 라벨 + 큰 숫자 + 스파크라인 정도. 리스트 카드는 3행, 행마다 썸네일 + 제목 + 진행바 + 퍼센트. 텍스트가 매우 짧다.
- 한 화면에 담는 기법(이미지로 본 것): 타일을 작게 하고 숫자를 크게, 보조 텍스트는 회색 소문자. 카드 간격이 촘촘하고 필터를 한 줄에 몰아 세로를 아낀다. 단 커버에서 리더보드가 잘려 있어 실제로 한 화면에 들어가는지는 미확인.
- 색·타이포·여백: 흰 카드 + 연회색 배경, 파란 단색 포인트, 빨강·초록은 상태 표시에만 사용. 카드 라운드가 크고 내부 패딩이 넉넉.
- SPEC 적용: 헤더 바로 아래 필터 줄(날짜 선택기, "오늘")을 두고, 본문을 3열×2행의 섹션 카드 6개로 나눈다. 각 섹션 카드 안에 이 시안의 "3행 리스트"를 5행으로 확장해 Top 5를 넣는다.
- 가져올 부분: 필터를 한 줄로 몰아 세로 공간 절약, 카드 내부 행 구조(썸네일·제목·값), 라운드·패딩 톤.
- 맞지 않는 부분: 사이드바(SPEC에 없음), KPI·차트 중심이라 뉴스 3줄 요약을 담을 공간이 없음. 행당 텍스트가 1줄이라 이슈당 AI 3줄 요약은 따로 해결해야 함.

### 2순위. Dashboard (GoodFood)

- URL: https://www.figma.com/community/file/1048559673287861086/dashboard
- 작성자·프레임 크기: 미확인.
- 그리드 구조(이미지 확인): 좌측 사이드바 + 상단 검색/프로필 바 + 본문 2×3 분할. 윗줄은 2칸(넓은 막대 차트, 도넛), 아랫줄은 3칸(Your Rating, Most Ordered Food, Order). 카드 경계를 그림자 대신 얇은 구분선으로 나눈다.
- 카드 구성과 정보량: 제목 + "View Report" 보조 버튼 + 큰 숫자 + 증감 + 차트. 정보량은 중간.
- 한 화면에 담는 기법: 카드 박스를 쓰지 않고 구분선으로만 분할해 패딩 낭비를 줄임. 단 이미지에서 아랫줄이 잘려 있다.
- 색·타이포·여백: 라벤더 단색 포인트, 흰 바탕, 제목은 작고 숫자만 크게. 여백 넓음.
- SPEC 적용: 구분선 방식의 3×2 분할을 6개 섹션에 그대로 쓰면 카드 테두리 없이 밀도를 높일 수 있다. 각 칸 상단에 섹션명 + "더보기" 위치를 두는 패턴도 가져온다.
- 가져올 부분: 구분선 분할, 카드 제목 + 우측 보조 버튼 구조.
- 맞지 않는 부분: 사이드바, 차트 중심. 한국어 긴 제목·요약을 담을 밀도가 아님.

### 3순위. Modern News: News Website (Homepage)

- URL: https://www.figma.com/community/file/1317043898519671693/news-website-home-page
- 작성자: Mohit Bansal(커버 표기, 2023-12-13 업데이트). 프레임 크기: 미확인(노트북 목업 안에 그려짐).
- 그리드 구조(이미지 확인, 해상도가 낮음): 상단 내비게이션 + 검색 바, 본문 좌측 큰 "Latest" 히어로 캐러셀, 우측 좁은 "Trending" 리스트(썸네일 + 2줄 제목 6개), 그 아래 카테고리("Politics") 섹션이 시작. 즉 7:3 정도의 2열.
- 카드 구성: 히어로는 이미지 + 제목 + 2줄 설명. 트렌딩 행은 소형 썸네일 + 제목 2줄.
- 한 화면에 담는 기법: 우측 컬럼에 소형 썸네일 리스트로 6건을 압축. 그 외는 보이지 않아 확인 불가.
- 색·타이포·여백: 흰 바탕, 파란 로그인 버튼, 세리프 없는 제목. 그림이 작아 세부는 확인 못 함.
- SPEC 적용: "Trending" 우측 리스트의 행 구조(순위 + 제목 2줄 + 메타)를 섹션 카드 하나의 Top 5 행으로 재사용한다.
- 가져올 부분: 소형 행 리스트 패턴, 상단 날짜 표기와 로그인 버튼 위치.
- 맞지 않는 부분: 히어로 이미지 중심이라 30개 카드에 부적합, 스크롤 가정 홈 페이지.

## 최종 1순위와 이유

**Analytics Dashboard (Tesla Reports 시안)**를 1순위로 하되 신뢰도는 낮다. 이미지로 확인된 것 중 "필터 줄 + 균등 카드 격자 + 카드 안 행 리스트"라는 구조가 SPEC의 3×2 섹션 카드 + 카드당 5행 구성과 가장 비슷하기 때문이다. 다만 뉴스가 아니며 실제로 한 화면에 들어가는지도 이미지로 확인하지 못했다.

## 후속 조사 제안

- Dribbble·Behance 접근이 풀리는 환경(브라우저에서 사람이 열람)에서 아래를 직접 확인하는 것이 가장 빠르다: Behance "UX/UI Design for a Personalized News App & Dashboard"(위 표 URL), Dribbble "News Web App Dashboard-Free UI Resources"(위 표 URL), Behance 검색에서 언급된 "The Guardian - News Management Dashboard".
- 이 갤러리 조사가 막히는 만큼, 실제 뉴스 한 화면 사례는 디자인 갤러리보다 라이브 제품(예: Techmeme, Ground News 등)의 스크린샷에서 찾는 편이 효율적일 수 있다. 이번 조사 범위 밖이라 확인하지 않았다.
