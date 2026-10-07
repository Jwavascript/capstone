import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { rankings } from './routes/rankings';
import { bookmarksRoute } from './routes/bookmarks';
import { foldersRoute } from './routes/folders';
import { BAD_REQUEST } from './schemas';

// Hono 앱(라우트 3개 · onError). 서버는 index.ts가 띄우고, 테스트는 app.request로 바로 부름
export const app = new Hono();
app.route('/api/rankings', rankings);
app.route('/api/bookmarks', bookmarksRoute);
app.route('/api/folders', foldersRoute);

// 깨진 JSON 본문(검사기가 던지는 400)은 { message }로. 그 밖은 Hono 기본 처리와 같음
app.onError((err, c) => {
  if (err instanceof HTTPException && err.status === 400) return c.json({ message: BAD_REQUEST }, 400);
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.text('Internal Server Error', 500);
});
