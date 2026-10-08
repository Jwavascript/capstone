// 테이블 5개(Drizzle). summary · articles.description · articles.issue_id · collect_runs.message 말고 모두 NOT NULL. RLS는 켜기만 함(정책 없음):
// 서버는 테이블 주인으로 접속해 영향 없고, Supabase Data API(anon 키)로는 못 읽음
import { date, integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
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

// 수집한 기사 1건 = 1행(ex06). date = 수집 시작 때 KST 오늘, section = 요청한 섹션. 본문은 저장하지 않음. issue_id는 묶기(ex07)가 채움
export const articles = pgTable('articles', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  date: date('date', { mode: 'string' }).notNull(),
  section: text('section').$type<SectionKey>().notNull(),
  title: text('title').notNull(),
  description: text('description'), // 없거나 빈 문자열이면 null, 앞 300자(코드 포인트)까지
  link: text('link').notNull(),
  sourceId: text('source_id').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(), // pubDate를 UTC로 읽음
  issueId: text('issue_id').references(() => issues.id, { onDelete: 'set null' }), // 묶인 이슈(ex07), 이슈를 지우면 null
}, t => [unique().on(t.date, t.link)]).enableRLS();

// 수집 실행마다 섹션 6행을 더함(지우지 않는 기록). failed면 article_count 0, 한 실행의 finished_at은 같음
export const collectRuns = pgTable('collect_runs', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  date: date('date', { mode: 'string' }).notNull(),
  section: text('section').$type<SectionKey>().notNull(),
  status: text('status').$type<'ok' | 'failed'>().notNull(),
  message: text('message'), // ok면 null
  articleCount: integer('article_count').notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }).notNull(),
}).enableRLS();
