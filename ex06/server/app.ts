import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { rankings } from './routes/rankings';
import { bookmarksRoute } from './routes/bookmarks';
import { foldersRoute } from './routes/folders';
import { BAD_REQUEST } from './schemas';
import type { Issue, Ranking } from './ranking';

export type Bookmark = Issue & { folderId: string; savedAt: string };
export type Folder = { id: string; name: string; count: number };

// 저장소: 라우트는 이 함수들만 부름. 메모리 구현은 sample.ts(테스트), DB 구현은 db/store.ts(api 서버)
export type Store = {
  latestDate(): Promise<string | null>;                              // 최근 수집일(KST 오늘 이하 가장 늦은 date), 없으면 null
  ranking(date: string): Promise<Ranking | null>;                    // 날짜의 이슈 → 랭킹, 없으면 null
  issue(id: string): Promise<Issue | null>;                          // 이슈 하나(카드 8칸)
  bookmarks(): Promise<Bookmark[]>;                                  // 북마크 목록, savedAt ↓
  saveBookmark(issue: Issue, folderId: string): Promise<Bookmark | null>; // 저장, 이미 북마크한 이슈면 null
  deleteBookmark(issueId: string): Promise<boolean>;                 // 해제, 없으면 false
  folders(): Promise<Folder[]>;                                      // 폴더 목록(만든 순) + 개수
  createFolder(name: string): Promise<Folder>;                       // 폴더 만들기
};

// Hono 앱(라우트 3개 · onError). 서버는 index.ts가 띄우고, 테스트는 app.request로 바로 부름
export function createApp(store: Store) {
  const app = new Hono();
  app.route('/api/rankings', rankings(store));
  app.route('/api/bookmarks', bookmarksRoute(store));
  app.route('/api/folders', foldersRoute(store));

  // 깨진 JSON 본문(검사기가 던지는 400)은 { message }로. 그 밖은 Hono 기본 처리와 같음
  app.onError((err, c) => {
    if (err instanceof HTTPException && err.status === 400) return c.json({ message: BAD_REQUEST }, 400);
    if (err instanceof HTTPException) return err.getResponse();
    console.error(err);
    return c.text('Internal Server Error', 500);
  });
  return app;
}
