// drizzle-kit 설정: schema.ts → drizzle/(SQL · meta). drizzle-kit은 .env를 스스로 읽지 않으니 있으면 읽음
import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
