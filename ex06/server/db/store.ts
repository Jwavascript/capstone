// DB 저장소(api 서버용): issues · folders · bookmarks를 읽고 씀. 랭킹 조립은 ranking.ts(메모리 저장소와 같은 곳)
// 수집 저장소(collect.ts용): collectStore가 articles · collect_runs를 읽고 씀. 무엇을 지우고 넣을지는 newsdata.ts가 정함
import { and, asc, count, desc, eq, inArray, lte, max } from 'drizzle-orm';
import type { Store } from '../app';
import type { CollectStore } from '../newsdata';
import { buildRanking, findCard, type IssueRow } from '../ranking';
import { kstToday } from '../sample';
import type { Db } from './client';
import { articles, bookmarks, collectRuns, folders, issues } from './schema';

// DB 행 → 랭킹 후보 행(발행 시각은 ISO 문자열로)
const toRow = (r: typeof issues.$inferSelect): IssueRow => ({ ...r, latestPublishedAt: r.latestPublishedAt.toISOString() });

export function dbStore(db: Db): Store {
  // 그 날짜들의 이슈 행 전부
  const rowsOn = async (dates: string[]) =>
    dates.length ? (await db.select().from(issues).where(inArray(issues.date, dates))).map(toRow) : [];

  return {
    // D3: KST 오늘 이하 가장 늦은 date
    latestDate: async () => {
      const [r] = await db.select({ date: max(issues.date) }).from(issues).where(lte(issues.date, kstToday()));
      return r?.date ?? null;
    },

    ranking: async date => buildRanking(date, await rowsOn([date])),

    issue: async id => {
      const [r] = await db.select({ date: issues.date }).from(issues).where(eq(issues.id, id));
      return r ? findCard(id, await rowsOn([r.date])) : null;
    },

    // rank는 그 이슈 날짜 · 섹션 랭킹에서, savedAt = created_at.toISOString()
    bookmarks: async () => {
      const list = await db
        .select({ issueId: bookmarks.issueId, folderId: bookmarks.folderId, createdAt: bookmarks.createdAt, date: issues.date })
        .from(bookmarks).innerJoin(issues, eq(bookmarks.issueId, issues.id))
        .orderBy(desc(bookmarks.createdAt));
      const rows = await rowsOn([...new Set(list.map(b => b.date))]);
      return list.map(b => ({ ...findCard(b.issueId, rows)!, folderId: b.folderId, savedAt: b.createdAt.toISOString() }));
    },

    // issue_id unique: 이미 있으면 넣지 않고 null
    saveBookmark: async (issue, folderId) => {
      const [r] = await db.insert(bookmarks).values({ issueId: issue.id, folderId })
        .onConflictDoNothing({ target: bookmarks.issueId })
        .returning({ createdAt: bookmarks.createdAt });
      return r ? { ...issue, folderId, savedAt: r.createdAt.toISOString() } : null;
    },

    deleteBookmark: async issueId =>
      (await db.delete(bookmarks).where(eq(bookmarks.issueId, issueId)).returning({ id: bookmarks.id })).length > 0,

    folders: async () =>
      db.select({ id: folders.id, name: folders.name, count: count(bookmarks.id) })
        .from(folders).leftJoin(bookmarks, eq(bookmarks.folderId, folders.id))
        .groupBy(folders.id).orderBy(asc(folders.createdAt)),

    // 새 폴더 id: 있는 번호 중 가장 큰 값 + 1
    createFolder: async name => {
      const ids = await db.select({ id: folders.id }).from(folders);
      const id = `f${Math.max(0, ...ids.map(f => Number(f.id.slice(1)))) + 1}`;
      await db.insert(folders).values({ id, name });
      return { id, name, count: 0 };
    },
  };
}

export function collectStore(db: Db): CollectStore {
  return {
    // 그날 articles 행의 link · section
    dayArticles: async date =>
      db.select({ link: articles.link, section: articles.section }).from(articles).where(eq(articles.date, date)),

    // 한 트랜잭션: 그날 sections 행 지움 → 행을 순서대로 넣음 → collect_runs 행(시각은 ISO 문자열 → Date)
    save: async (date, sections, rows, runs) => {
      await db.transaction(async tx => {
        if (sections.length) await tx.delete(articles).where(and(eq(articles.date, date), inArray(articles.section, sections)));
        if (rows.length) await tx.insert(articles).values(rows.map(r => ({ ...r, publishedAt: new Date(r.publishedAt) })));
        await tx.insert(collectRuns).values(runs.map(r => ({ ...r, finishedAt: new Date(r.finishedAt) })));
      });
    },
  };
}
