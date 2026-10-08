// DB 저장소(api 서버용): issues · folders · bookmarks를 읽고 씀. 랭킹 조립은 ranking.ts(메모리 저장소와 같은 곳)
// 수집 저장소(collect.ts용): collectStore가 articles · collect_runs를 읽고 씀. 무엇을 지우고 넣을지는 newsdata.ts가 정함
// 묶기 저장소(group.ts용): groupStore가 articles · issues · bookmarks를 읽고 issues · articles.issue_id를 씀. 무엇을 지우고 넣을지는 grouping.ts가 정함
import { and, asc, count, desc, eq, inArray, lt, lte, max, notInArray, sql } from 'drizzle-orm';
import type { Store } from '../app';
import type { GroupStore } from '../grouping';
import type { CollectStore } from '../newsdata';
import { buildRanking, findCard, SECTIONS, type IssueRow } from '../ranking';
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

    // 대체 섹션 행(D8: 그날 이슈가 없는 섹션만, 그 이전에 그 섹션 이슈가 있는 가장 늦은 날짜의 행) · 그날 ok 실행의 가장 늦은 finished_at만 읽어 넘김
    ranking: async date => {
      const rows = await rowsOn([date]);
      if (rows.length === 0) return null;
      for (const { key } of SECTIONS.filter(s => !rows.some(r => r.section === s.key))) {
        const [prev] = await db.select({ date: max(issues.date) }).from(issues).where(and(eq(issues.section, key), lt(issues.date, date)));
        if (prev?.date) rows.push(...(await db.select().from(issues).where(and(eq(issues.section, key), eq(issues.date, prev.date)))).map(toRow));
      }
      const [run] = await db.select({ finishedAt: max(collectRuns.finishedAt) }).from(collectRuns)
        .where(and(eq(collectRuns.date, date), eq(collectRuns.status, 'ok')));
      return buildRanking(date, rows, run?.finishedAt ? [{ status: 'ok', finishedAt: run.finishedAt.toISOString() }] : []);
    },

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

export function groupStore(db: Db): GroupStore {
  return {
    // 그날 articles(섹션 · 제목 · 링크 · 발행 시각) · 그날 issues(id · 섹션 · url) · 북마크가 가리키는 그날 이슈의 섹션
    load: async date => ({
      articles: (await db.select({ section: articles.section, title: articles.title, link: articles.link, publishedAt: articles.publishedAt })
        .from(articles).where(eq(articles.date, date)).orderBy(asc(articles.id)))
        .map(a => ({ ...a, publishedAt: a.publishedAt.toISOString() })),
      issues: await db.select({ id: issues.id, section: issues.section, url: issues.url }).from(issues).where(eq(issues.date, date)),
      bookmarked: (await db.selectDistinct({ section: issues.section }).from(bookmarks)
        .innerJoin(issues, eq(bookmarks.issueId, issues.id)).where(eq(issues.date, date))).map(r => r.section),
    }),

    // 한 트랜잭션: 섹션마다 그날 이슈 중 빠진 것 지움(그 기사들의 issue_id는 null) → 넣기/고치기(있던 id는 summary 그대로, 새 id는 summary null)
    // → 그날 그 섹션 기사의 issue_id(link → 이슈 id)
    save: async (date, sections, rows, links) => {
      await db.transaction(async tx => {
        for (const section of sections) {
          const keep = rows.filter(r => r.section === section).map(r => r.id);
          await tx.delete(issues).where(and(eq(issues.date, date), eq(issues.section, section), notInArray(issues.id, keep)));
        }
        if (rows.length) {
          await tx.insert(issues).values(rows.map(r => ({ ...r, latestPublishedAt: new Date(r.latestPublishedAt) })))
            .onConflictDoUpdate({
              target: issues.id,
              set: {
                title: sql`excluded.title`, url: sql`excluded.url`,
                articleCount: sql`excluded.article_count`, latestPublishedAt: sql`excluded.latest_published_at`,
              },
            });
        }
        for (const section of sections) {
          const mine = links.filter(l => l.section === section);
          if (mine.length === 0) continue;
          await tx.update(articles)
            .set({ issueId: sql`case ${articles.link} ${sql.join(mine.map(l => sql`when ${l.link} then ${l.issueId}`), sql` `)} end` })
            .where(and(eq(articles.date, date), eq(articles.section, section)));
        }
      });
    },
  };
}
