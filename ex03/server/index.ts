import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
import { rankings } from './routes/rankings';
import { bookmarksRoute } from './routes/bookmarks';
import { foldersRoute } from './routes/folders';
import { BAD_REQUEST } from './schemas';

const app = new Hono();
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

const port = Number(process.env.API_PORT || 8787);
serve({ fetch: app.fetch, port }, info => console.log(`API 서버: http://localhost:${info.port}`));
