// DB 연결: DATABASE_URL(Supabase Transaction pooler, 포트 6543). 이 모드는 prepared statement를 못 쓰므로 prepare: false
// 연결을 만드는 곳은 api 서버(index.ts) · 수집(collect.ts) · 묶기(group.ts)뿐
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export function connectDb() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  return { client, db: drizzle(client) };
}

export type Db = ReturnType<typeof connectDb>['db'];
