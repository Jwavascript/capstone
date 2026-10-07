// 테이블 3개(Drizzle). summary 말고 모두 NOT NULL. RLS는 켜기만 함(정책 없음):
// 서버는 테이블 주인으로 접속해 영향 없고, Supabase Data API(anon 키)로는 못 읽음
import { date, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { SectionKey } from '../ranking';

// 날짜 · 섹션마다 랭킹 후보 행. id {date}-{section}-{번호}, rank는 저장하지 않음
export const issues = pgTable('issues', {
  id: text('id').primaryKey(),
  date: date('date', { mode: 'string' }).notNull(), // YYYY-MM-DD 문자열 그대로
  section: text('section').$type<SectionKey>().notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  articleCount: integer('article_count').notNull(),
  latestPublishedAt: timestamp('latest_published_at', { withTimezone: true }).notNull(),
  summary: text('summary').array(),
}).enableRLS();

// id f{번호}, 목록은 created_at ↑(만든 순)
export const folders = pgTable('folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

// 이슈당 하나(issue_id unique) = 폴더 하나(AC-10-4), 목록은 created_at ↓
export const bookmarks = pgTable('bookmarks', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  issueId: text('issue_id').notNull().unique().references(() => issues.id),
  folderId: text('folder_id').notNull().references(() => folders.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();
