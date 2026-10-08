// newsdata.io 수집 규칙: 요청 · 변환 · 페이지 · 실패 · 저장(무엇을 지우고 넣을지 정하는 한 곳)
// 환경 변수 · DB를 직접 읽지 않고 fetch · 저장소 · 키 · 페이지 수 · 대기 ms를 받음. 명령은 collect.ts, DB 구현은 db/store.ts의 collectStore
import { SECTIONS, type SectionKey } from './ranking';
import { kstToday } from './sample';

const LATEST = 'https://newsdata.io/api/1/latest';

// D12: 섹션마다 묶어 요청하는 category. 요청한 섹션을 그 기사의 섹션으로 씀
export const CATEGORIES: Record<SectionKey, string> = {
  pol: 'politics',
  eco: 'business',
  soc: 'domestic,crime,education',
  cul: 'lifestyle,entertainment,health,food,tourism',
  wor: 'world',
  it: 'technology,science',
};

// articles 한 행(7칸, 본문은 저장하지 않음). publishedAt은 ISO 문자열
export type ArticleRow = {
  date: string; section: SectionKey; title: string; description: string | null;
  link: string; sourceId: string; publishedAt: string;
};
// collect_runs 한 행. 실행마다 섹션 6행, 한 실행의 finishedAt은 같음
export type RunRow = {
  date: string; section: SectionKey; status: 'ok' | 'failed'; message: string | null;
  articleCount: number; finishedAt: string;
};

// 저장소: DB 구현은 db/store.ts의 collectStore, 테스트는 메모리 구현
export type CollectStore = {
  dayArticles(date: string): Promise<{ link: string; section: SectionKey }[]>; // 그날 articles 행의 link · section
  // 한 트랜잭션: 그날 sections 행을 지움 → articles를 순서대로 넣음 → collect_runs에 runs를 넣음
  save(date: string, sections: SectionKey[], articles: ArticleRow[], runs: RunRow[]): Promise<void>;
};

export type Fetch = (url: string, init: { headers: Record<string, string> }) => Promise<Response>;

// 응답의 기사 한 건(쓰는 칸만)
type Item = { title?: string | null; description?: string | null; link?: string | null; source_id?: string | null; pubDate?: string | null };

// 기사 → 행. 제목 · 링크 · source_id · pubDate 중 하나라도 없으면 null(건너뜀)
// description: 앞뒤 공백을 지우고, 없거나 빈 문자열이면 null, 300자(코드 포인트)를 넘으면 앞 300자만
// pubDate는 UTC로 읽음: "2026-10-06 20:49:42" → "2026-10-06T20:49:42.000Z"
function toRow(item: Item, date: string, section: SectionKey): ArticleRow | null {
  const { title, link, source_id: sourceId, pubDate } = item;
  if (!title || !link || !sourceId || !pubDate) return null;
  const description = item.description?.trim();
  return {
    date, section, title,
    description: description ? [...description].slice(0, 300).join('') : null,
    link, sourceId,
    publishedAt: new Date(`${pubDate.replace(' ', 'T')}Z`).toISOString(),
  };
}

// 한 번 수집: 그날 행 읽기 → 섹션 pol→eco→soc→cul→wor→it 순서로 요청(하나씩, 사이 waitMs) → 6섹션을 다 받은 뒤 한 트랜잭션에 저장
// 반환: 날짜 · collect_runs 6행 · 요청 수 · 마지막으로 받은 x-api-limit-remaining · 종료 코드(0 모두 ok · 1 일부 failed · 2 모두 failed)
export async function collect({ fetch, store, key, pages, waitMs }: {
  fetch: Fetch; store: CollectStore; key: string; pages: number; waitMs: number;
}) {
  const date = kstToday();
  const existing = await store.dayArticles(date);
  let requests = 0;
  let remaining: string | null = null;
  const hide = (text: string) => text.replaceAll(key, '***'); // 실패 문구에 키 값이 섞이면 ***

  // 섹션 하나: 최대 pages페이지. 2페이지부터 앞 응답의 nextPage를 page로, nextPage가 없거나 results가 비면 멈춤
  // 요청 중 하나라도 실패하면 남은 페이지는 요청하지 않고 받은 페이지도 버림(failed). 받은 기사가 0건이어도 failed
  async function fetchSection(section: SectionKey): Promise<{ articles: ArticleRow[] } | { message: string }> {
    const articles: ArticleRow[] = [];
    let page: string | undefined;
    for (let n = 1; n <= pages; n++) {
      if (requests++ > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
      const url = `${LATEST}?country=kr&language=ko&prioritydomain=top&removeduplicate=1&category=${CATEGORIES[section]}`
        + (page ? `&page=${encodeURIComponent(page)}` : '');
      let res: Response;
      try {
        res = await fetch(url, { headers: { 'X-ACCESS-KEY': key } });
      } catch (err) {
        return { message: hide(`${n}페이지: ${err instanceof Error ? err.message : String(err)}`) };
      }
      remaining = res.headers.get('x-api-limit-remaining') ?? remaining;
      const body = await res.json().catch(() => null);
      if (res.status !== 200 || body?.status !== 'success') {
        const detail = typeof body?.results?.message === 'string' ? ` ${body.results.message}` : '';
        return { message: hide(`${n}페이지: HTTP ${res.status}${detail}`) };
      }
      const items: Item[] = Array.isArray(body.results) ? body.results : [];
      for (const item of items) {
        const row = toRow(item, date, section);
        if (row) articles.push(row);
      }
      if (!body.nextPage || items.length === 0) break;
      page = body.nextPage;
    }
    return articles.length ? { articles } : { message: '기사 0건' };
  }

  const results: { section: SectionKey; got: { articles: ArticleRow[] } | { message: string } }[] = [];
  for (const { key: section } of SECTIONS) results.push({ section, got: await fetchSection(section) });

  // 저장 규칙: ok 섹션의 그날 행을 지우고 ok 섹션 행을 순서대로 넣음. failed 섹션의 그날 행 · 다른 날짜 행은 그대로(AC-01-2, D8)
  // 같은 링크는 섹션 안 · 섹션 사이 모두 먼저 받은 하나만(D12), 그날 failed 섹션에 남은 행과 같은 링크는 건너뜀
  const failed = new Set(results.filter(r => 'message' in r.got).map(r => r.section));
  const taken = new Set(existing.filter(a => failed.has(a.section)).map(a => a.link));
  const finishedAt = new Date().toISOString();
  const rows: ArticleRow[] = [];
  const runs = results.map(({ section, got }): RunRow => {
    if ('message' in got) return { date, section, status: 'failed', message: got.message, articleCount: 0, finishedAt };
    let count = 0;
    for (const a of got.articles) {
      if (taken.has(a.link)) continue;
      taken.add(a.link);
      rows.push(a);
      count++;
    }
    return { date, section, status: 'ok', message: null, articleCount: count, finishedAt };
  });
  await store.save(date, results.filter(r => !failed.has(r.section)).map(r => r.section), rows, runs);

  const ok = runs.filter(r => r.status === 'ok').length;
  return { date, runs, requests, remaining, code: ok === runs.length ? 0 : ok === 0 ? 2 : 1 };
}
