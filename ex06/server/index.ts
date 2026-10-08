import { serve } from '@hono/node-server';
import { createApp } from './app';
import { connectDb } from './db/client';
import { dbStore } from './db/store';

// api 서버는 DB 저장소로 앱을 만들어 띄움
const app = createApp(dbStore(connectDb().db));
const port = Number(process.env.API_PORT || 8787);
serve({ fetch: app.fetch, port }, info => console.log(`API 서버: http://localhost:${info.port}`));
