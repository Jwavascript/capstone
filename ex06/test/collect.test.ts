// 수집 규칙(newsdata.ts): 저장한 응답(fixture) · 가짜 요청 함수 · 메모리 저장소 · 대기 0으로, 네트워크 · DB 없이
// 시각은 setup.ts가 2026-10-07 12:00 KST로 고정
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collect, type ArticleRow, type CollectStore, type Fetch, type RunRow } from '../server/newsdata';
import type { SectionKey } from '../server/ranking';

const KEY = 'test-key-123';
const TODAY = '2026-10-07';
const YESTERDAY = '2026-10-06';
const ORDER: SectionKey[] = ['pol', 'eco', 'soc', 'cul', 'wor', 'it'];
const CATEGORY_OF: Record<SectionKey, string> = {
  pol: 'politics',
  eco: 'business',
  soc: 'domestic,crime,education',
  cul: 'lifestyle,entertainment,health,food,tourism',
  wor: 'world',
  it: 'technology,science',
};

// fixture: research/newsdata 5개 그대로(nextPage는 "NEXT_PAGE_TOKEN"). 부를 때마다 새 객체
const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/newsdata/latest_kr_ko_${name}.json`, import.meta.url), 'utf8'));
const FIXTURE_OF: Record<Exclude<SectionKey, 'wor'>, string> = {
  pol: 'politics_top', eco: 'politics', soc: 'soc_top', cul: 'cul_top', it: 'q_nuri',
};

type Reply = { status: number; body: unknown } | Error;
const sectionOf = (url: string) => ORDER.find(s => CATEGORY_OF[s] === new URL(url).searchParams.get('category'))!;

// 가짜 요청 함수: 요청(URL · 헤더 키)을 기록하고 섹션별 응답을 돌려줌(Error면 던짐)
function fakeNet(reply: (section: SectionKey) => Reply) {
  const calls: { url: string; key: string | null }[] = [];
  const send: Fetch = async (url, init) => {
    calls.push({ url, key: new Headers(init.headers).get('X-ACCESS-KEY') });
    const r = reply(sectionOf(url));
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'x-api-limit-remaining': '190' } });
  };
  return { send, calls };
}

// 기본 응답: pol politics_top · eco politics · soc soc_top · cul cul_top · it q_nuri · wor HTTP 500(results.message에 테스트 키)
const standard = (section: SectionKey): Reply =>
  section === 'wor'
    ? { status: 500, body: { status: 'error', results: { message: `upstream error for ${KEY}`, code: 'InternalError' } } }
    : { status: 200, body: fixture(FIXTURE_OF[section]) };

// 메모리 저장소: save는 DB 트랜잭션처럼 한 번에 바뀌고, (date, link)가 겹치면 던짐(unique)
function memoryStore(initial: ArticleRow[] = []) {
  const articles = [...initial];
  const runs: RunRow[] = [];
  const store: CollectStore = {
    dayArticles: async date => articles.filter(a => a.date === date).map(({ link, section }) => ({ link, section })),
    save: async (date, sections, rows, newRuns) => {
      const next = articles.filter(a => !(a.date === date && sections.includes(a.section)));
      for (const r of rows) {
        if (next.some(a => a.date === r.date && a.link === r.link)) throw new Error(`(date, link) 중복: ${r.link}`);
        next.push(r);
      }
      articles.splice(0, articles.length, ...next);
      runs.push(...newRuns);
    },
  };
  return { store, articles, runs };
}

const run = (net: ReturnType<typeof fakeNet>, store: CollectStore, pages: number) =>
  collect({ fetch: net.send, store, key: KEY, pages, waitMs: 0 });

// 넣어 두는 행: 그날 pol 옛 행 1 · wor 옛 행 2(하나는 링크가 politics_top 첫 기사와 같음) · 어제 행 1
const oldRow = (date: string, section: SectionKey, link: string): ArticleRow =>
  ({ date, section, title: '옛 기사', description: null, link, sourceId: 'old', publishedAt: '2026-10-05T00:00:00.000Z' });
const OLD = [
  oldRow(TODAY, 'pol', 'https://example.com/old-pol'),
  oldRow(TODAY, 'wor', 'https://example.com/old-wor'),
  oldRow(TODAY, 'wor', fixture('politics_top').results[0].link),
  oldRow(YESTERDAY, 'pol', 'https://example.com/old-yesterday'),
];

describe('collect (AC-01-1 · AC-01-2)', () => {
  it('① 요청: 섹션 순서 · 주소 · 쿼리 5개 · category 6묶음 · 헤더 키, 첫 요청엔 page 없음, URL에 키 없음', async () => {
    const net = fakeNet(standard);
    await run(net, memoryStore().store, 1);

    expect(net.calls.map(c => new URL(c.url).searchParams.get('category'))).toEqual(ORDER.map(s => CATEGORY_OF[s]));
    for (const c of net.calls) {
      const url = new URL(c.url);
      expect(url.origin + url.pathname).toBe('https://newsdata.io/api/1/latest');
      expect([...url.searchParams.keys()].sort()).toEqual(['category', 'country', 'language', 'prioritydomain', 'removeduplicate']);
      expect(Object.fromEntries(url.searchParams)).toMatchObject({ country: 'kr', language: 'ko', prioritydomain: 'top', removeduplicate: '1' });
      expect(c.key).toBe(KEY);
      expect(c.url).not.toContain(KEY);
    }
  });

  it('② 변환: pol 10행 · 7칸만 · description null 2 · published_at UTC · date KST 오늘, 첫 기사 title이 null이면 9행', async () => {
    const mem = memoryStore();
    await run(fakeNet(standard), mem.store, 1);

    const pol = mem.articles.filter(a => a.section === 'pol');
    expect(pol).toHaveLength(10);
    for (const a of mem.articles) {
      expect(Object.keys(a).sort()).toEqual(['date', 'description', 'link', 'publishedAt', 'section', 'sourceId', 'title']);
    }
    expect(pol.filter(a => a.description === null)).toHaveLength(2);
    const first = fixture('politics_top').results[0];
    expect(pol[0]).toEqual({
      date: TODAY, section: 'pol', title: first.title, description: first.description,
      link: first.link, sourceId: first.source_id, publishedAt: '2026-10-06T20:49:42.000Z',
    });

    const noTitle = (section: SectionKey): Reply => {
      if (section !== 'pol') return standard(section);
      const body = fixture('politics_top');
      body.results[0].title = null;
      return { status: 200, body };
    };
    const mem2 = memoryStore();
    await run(fakeNet(noTitle), mem2.store, 1);
    expect(mem2.articles.filter(a => a.section === 'pol')).toHaveLength(9);
  });

  it('③ 페이지: pages 3이면 16번(wor 1 · 나머지 3, 2 · 3번째 page=NEXT_PAGE_TOKEN), pages 1이면 6번, nextPage null이면 pages 3이어도 6번', async () => {
    const net3 = fakeNet(standard);
    await run(net3, memoryStore().store, 3);
    expect(net3.calls).toHaveLength(16);
    expect(net3.calls.map(c => sectionOf(c.url))).toEqual(['pol', 'pol', 'pol', 'eco', 'eco', 'eco', 'soc', 'soc', 'soc', 'cul', 'cul', 'cul', 'wor', 'it', 'it', 'it']);
    expect(net3.calls.map(c => new URL(c.url).searchParams.get('page'))).toEqual([
      null, 'NEXT_PAGE_TOKEN', 'NEXT_PAGE_TOKEN', null, 'NEXT_PAGE_TOKEN', 'NEXT_PAGE_TOKEN',
      null, 'NEXT_PAGE_TOKEN', 'NEXT_PAGE_TOKEN', null, 'NEXT_PAGE_TOKEN', 'NEXT_PAGE_TOKEN',
      null, null, 'NEXT_PAGE_TOKEN', 'NEXT_PAGE_TOKEN',
    ]);

    const net1 = fakeNet(standard);
    await run(net1, memoryStore().store, 1);
    expect(net1.calls).toHaveLength(6);

    const lastPage = (section: SectionKey): Reply =>
      section === 'wor' ? standard(section) : { status: 200, body: { ...fixture(FIXTURE_OF[section]), nextPage: null } };
    const netLast = fakeNet(lastPage);
    await run(netLast, memoryStore().store, 3);
    expect(netLast.calls).toHaveLength(6);
  });

  it('④ 한 번 수집: ok 섹션만 그날 행을 바꾸고 failed(wor)는 옛 행 유지, 링크 중복 없음, description 300자, collect_runs 6행 · 종료 코드 1', async () => {
    const mem = memoryStore(OLD);
    const result = await run(fakeNet(standard), mem.store, 3);

    const today = mem.articles.filter(a => a.date === TODAY);
    const countOf = (s: SectionKey) => today.filter(a => a.section === s).length;
    expect(ORDER.map(countOf)).toEqual([9, 10, 10, 10, 2, 9]);
    expect(today.filter(a => a.section === 'wor')).toEqual([OLD[1], OLD[2]]);
    expect(today.filter(a => a.section === 'pol').map(a => a.link)).not.toContain(OLD[0].link);
    expect(today.filter(a => a.section === 'pol').map(a => a.link)).not.toContain(OLD[2].link);
    expect(mem.articles.filter(a => a.date === YESTERDAY)).toEqual([OLD[3]]);
    const ecoLinks = new Set(fixture('politics').results.map((a: { link: string }) => a.link));
    expect(today.filter(a => a.section === 'it' && ecoLinks.has(a.link))).toHaveLength(0);

    // description: eco 1건 · it 2건만 앞 300자로 잘림, 나머지 행은 원문 그대로
    const original = new Map<string, string | null>(Object.values(FIXTURE_OF)
      .flatMap(name => fixture(name).results.map((a: { link: string; description: string | null }) => [a.link, a.description])));
    const fresh = today.filter(a => a.section !== 'wor');
    const cut = fresh.filter(a => a.description !== original.get(a.link));
    expect(cut.map(a => a.section)).toEqual(['eco', 'it', 'it']);
    for (const a of cut) {
      expect([...a.description!]).toHaveLength(300);
      expect(original.get(a.link)!.startsWith(a.description!)).toBe(true);
    }

    expect(mem.runs.map(r => [r.section, r.status, r.articleCount])).toEqual([
      ['pol', 'ok', 9], ['eco', 'ok', 10], ['soc', 'ok', 10], ['cul', 'ok', 10], ['wor', 'failed', 0], ['it', 'ok', 9],
    ]);
    for (const r of mem.runs) {
      expect(r.date).toBe(TODAY);
      expect(r.finishedAt).toBe(mem.runs[0].finishedAt);
      if (r.status === 'ok') {
        expect(r.message).toBeNull();
        expect(r.articleCount).toBe(countOf(r.section));
      }
    }
    const wor = mem.runs.find(r => r.section === 'wor')!;
    expect(wor.message).toContain('HTTP 500');
    expect(wor.message).toContain('***');
    expect(wor.message).not.toContain(KEY);
    expect(result.code).toBe(1);
  });

  it('⑤ 같은 날 다시: articles 행 수 같음(중복 없음) · collect_runs 12행', async () => {
    const mem = memoryStore(OLD);
    await run(fakeNet(standard), mem.store, 3);
    const before = mem.articles.length;

    await run(fakeNet(standard), mem.store, 3);
    expect(mem.articles).toHaveLength(before);
    expect(new Set(mem.articles.map(a => `${a.date} ${a.link}`)).size).toBe(before);
    expect(mem.runs).toHaveLength(12);
  });

  const ALL_FAIL: [string, Reply, string][] = [
    ['모든 응답 HTTP 401', { status: 401, body: { status: 'error', results: { message: 'API key invalid', code: 'Unauthorized' } } }, 'HTTP 401'],
    ['요청 함수가 던짐', new TypeError('fetch failed'), '1페이지: fetch failed'],
    ['results: []', { status: 200, body: { status: 'success', totalResults: 0, results: [], nextPage: 'NEXT_PAGE_TOKEN' } }, '기사 0건'],
  ];
  it.each(ALL_FAIL)('⑥ 전부 실패(%s): 6섹션 failed · 요청 6번 · 넣어 둔 행 그대로 · 종료 코드 2', async (_, reply, expected) => {
    const net = fakeNet(() => reply);
    const mem = memoryStore(OLD);
    const result = await run(net, mem.store, 3);

    expect(mem.runs.map(r => [r.section, r.status, r.articleCount])).toEqual(ORDER.map(s => [s, 'failed', 0]));
    for (const r of mem.runs) expect(r.message).toContain(expected);
    expect(net.calls).toHaveLength(6);
    expect(mem.articles).toEqual(OLD);
    expect(result.code).toBe(2);
  });
});
