# PLAN_web — 화면을 Next.js(React) 컴포넌트로 전환

> 이유: 화면이 `public/index.html` 한 파일(948줄)에 CSS · 마크업 · 스크립트가 섞여 있고, Next.js는 그 파일을 rewrite로 내보내기만 함. 그래서 같은 화면 · 동작을 Next.js App Router 페이지와 React 컴포넌트로 옮김
> 코드 폴더: `web/` (`ex04/` 복사). exXX 단계 흐름 밖의 별도 폴더라 PLAN.md 로드맵 · ex05(Supabase)는 그대로
> SPEC 근거: US-03 ~ US-05 · US-07 ~ US-10의 화면 동작(바뀌지 않음)

## 이번 범위
- `public/index.html`의 `<style>` · 마크업 · `<script>`를 App Router 파일로 옮김. 화면 문구 · 클래스 · 섹션 키 · 카드 칸 · 폴더 동작 · `/api/*` 호출 · 데모 로그인 토글은 그대로
- 새 패키지: 없음(next · react · react-dom · @types/react가 이미 있음)
- 하지 않음: `server/` · BFF(`app/api/[...path]/route.ts`) · `test/` · `openapi.yaml` 변경, 화면 기능 · 문구 · 디자인 변경, 상태 관리 · 데이터 패칭 라이브러리, CSS Modules · Tailwind 전환, 서버 컴포넌트에서 데이터 미리 받기, 화면 자동 테스트

## 화면 변경
| 파일 | 옮겨 오는 것 |
|---|---|
| `app/layout.tsx` | `<html lang="ko">`, 제목 "이슈랭크"(metadata), Pretendard `<link>`, `globals.css` |
| `app/globals.css` | `<style>` 내용 그대로 |
| `app/page.tsx` | `'use client'`. 상태 · 데이터 읽기 · 북마크 저장/해제/되돌리기 · 폴더 만들기 · 보기 전환(`#map` · `#list` · `#bookmarks`, 뒤로 가기) · 날짜 이동 · 키보드(1 · 2 · 3 · ← · → · Esc) · 토스트 |
| `components/Header.tsx` | 로고 · 보기 전환 pill · 북마크 개수 · 데모 로그인 버튼 |
| `components/DateContext.tsx` | 제목 · 설명 · 날짜 표시 · 이전/다음 · 달력(max = KST 오늘) · "오늘" · 갱신 시각 |
| `components/IssueMap.tsx` | `squarify` 트리맵 · 확대/전체 · 범례 · 타일 크기별 글자 |
| `components/RankList.tsx` | 섹션 탭 · 요약 펼치기 · 목록 |
| `components/Bookmarks.tsx` | 폴더 칩 · 날짜별 묶음 · 빈 화면 · 로그인 필요 |
| `components/Item.tsx` | 목록 · 북마크 공용 카드(요약 null → "요약을 준비 중입니다") |
| `components/Drawer.tsx` · `FolderPop.tsx` · `Tip.tsx` · `Toast.tsx` · `icons.tsx` | 이슈 상세 · 폴더 고르기/새 폴더 · 이슈맵 툴팁 · 토스트 · SVG |
| `lib/api.ts` · `lib/date.ts` | `api()` · 응답 타입 · `SECTIONS` / `TODAY`(KST) · 날짜 형식 · `timeAgo` |

- 지움: `public/index.html`, `next.config.mjs`의 `/` → `/index.html` rewrite
- 서버 렌더 HTML에는 날짜 · 데이터 칸을 비워 두고, 브라우저에서 `/api/rankings` · `/api/bookmarks` · `/api/folders`를 받은 뒤 채움(지금 화면 순서 그대로. 빌드한 날과 KST 오늘이 달라도 hydration이 어긋나지 않게)
- 트리맵 상자 · 타일은 섹션 키 · 이슈 id를 key로, 섹션 · 순위 순서로 그려 확대/전체 전환 애니메이션을 유지

## 구현 순서
1. `ex04/` → `web/` 복사(`node_modules` · `.next` · `tsconfig.tsbuildinfo` 제외), `package.json` name을 `issuerank-web`으로, `npm.cmd install`
2. `lib/` → `components/` → `app/globals.css` · `layout.tsx` · `page.tsx`
3. `public/index.html` · rewrite 지움
마지막. `npm.cmd run build` · `npm.cmd test`

## 검증 방법
- 서버 줄은 두 터미널에서 `web/`의 `npm.cmd run api` · `npm.cmd run dev`를 띄운 상태로, 요청은 node fetch로

| 확인 | 방법 | 기대 결과 |
|---|---|---|
| 빌드 · 테스트 | `npm.cmd run build` · `npm.cmd test` | 성공 · ex04 테스트 모두 통과 |
| 서버 그대로 | `git diff --no-index`로 ex04 ↔ web의 `server/` · `app/api/` · `test/` · `openapi.yaml` | 차이 없음 |
| 옛 파일 | `web/public/index.html`, `next.config.mjs`의 `rewrites` | 없음 |
| 출발점 그대로 | `git status ex04/ frontend/` | 변경 없음 |
| 화면 주소 | `GET http://localhost:3000/` | 200, `lang="ko"`, `<title>이슈랭크</title>`, "이슈맵" · "랭킹" · 세 보기의 푸터 문구 |
| 중계 | 3000 · 8787의 `GET /api/rankings` | 상태 코드 · 본문 같음 |
| 화면 문구 | 원래 HTML의 화면 문구를 `web/app` · `web/components`에서 검색 | 모두 있음 |
| 브라우저(사람) | 이슈맵 · 확대/전체 · 툴팁 · 드로어 · 목록 탭 · 요약 펼치기 · 북마크 저장 · 새 폴더 · 해제 · 되돌리기 · 폴더 칩 · 날짜 이동 · "오늘" · 키보드 · 뒤로 가기 · 모바일 폭 · 콘솔 | ex04 화면과 같고 콘솔에 hydration 오류 없음 |
