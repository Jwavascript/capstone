import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { rankings } from './routes/rankings';
import { bookmarksRoute } from './routes/bookmarks';
import { foldersRoute } from './routes/folders';

const app = new Hono();
app.route('/api/rankings', rankings);
app.route('/api/bookmarks', bookmarksRoute);
app.route('/api/folders', foldersRoute);

const port = Number(process.env.API_PORT || 8787);
serve({ fetch: app.fetch, port }, info => console.log(`API 서버: http://localhost:${info.port}`));
