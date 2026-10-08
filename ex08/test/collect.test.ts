// 수집 규칙(newsdata.ts, D12 출처 섞기): 저장한 응답(fixture) · 가짜 요청 함수 · 메모리 저장소 · 대기 0으로, 네트워크 · DB 없이
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
type Kind = 'top' | 'all'; // top = prioritydomain=top 1페이지, all = 전체 출처(prioritydomain 없음)
const sectionOf = (url: string) => ORDER.find(s => CATEGORY_OF[s] === new URL(url).searchParams.get('category'))!;
const kindOf = (url: string): Kind => (new URL(url).searchParams.has('prioritydomain') ? 'top' : 'all');

// 가짜 요청 함수: 요청(URL · 헤더 키)을 기록하고 섹션 · 종류별 응답을 돌려줌(Error면 던짐)
function fakeNet(reply: (section: SectionKey, kind: Kind) => Reply) {
  const calls: { url: string; key: string | null }[] = [];
  const send: Fetch = async (url, init) => {
    calls.push({ url, key: new Headers(init.headers).get('X-ACCESS-KEY') });
    const r = reply(sectionOf(url), kindOf(url));
    if (r instanceof Error) throw r;
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'x-api-limit-remaining': '190' } });
  };
  return { send, calls };
}

// 전체 출처 응답: 그 섹션 top fixture의 link마다 #all을 붙임(top과 다른 기사)
const allOf = (name: string) => {
  const body = fixture(name);
  for (const a of body.results) a.link = `${a.link}#all`;
  return body;
};

// 기본 응답: top은 pol politics_top · eco politics · soc soc_top · cul cul_top · it q_nuri(ex06 응답), 전체 출처는 그 fixture의 link#all
// wor은 top에서 HTTP 500(results.message에 테스트 키)
const standard = (section: SectionKey, kind: Kind): Reply =>
  section === 'wor'
    ? { status: 500, body: { status: 'error', results: { message: `upstream error for ${KEY}`, code: 'InternalError' } } }
    : { status: 200, body: kind === 'top' ? fixture(FIXTURE_OF[section]) : allOf(FIXTURE_OF[section]) };

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
  it('① 요청: pages 1 → 11번(섹션마다 top → 전체, wor 1) · top 쿼리 5개 · 전체 쿼리 4개(prioritydomain 없음) · 헤더 키, 첫 요청엔 page 없음, URL에 키 없음', async () => {
    const net = fakeNet(standard);
    await run(net, memoryStore().store, 1);

    expect(net.calls).toHaveLength(11);
    expect(net.calls.map(c => [sectionOf(c.url), kindOf(c.url)])).toEqual([
      ['pol', 'top'], ['pol', 'all'], ['eco', 'top'], ['eco', 'all'], ['soc', 'top'], ['soc', 'all'],
      ['cul', 'top'], ['cul', 'all'], ['wor', 'top'], ['it', 'top'], ['it', 'all'],
    ]);
    for (const c of net.calls) {
      const url = new URL(c.url);
      expect(url.origin + url.pathname).toBe('https://newsdata.io/api/1/latest');
      if (kindOf(c.url) === 'top') {
        expect([...url.searchParams.keys()].sort()).toEqual(['category', 'country', 'language', 'prioritydomain', 'removeduplicate']);
        expect(Object.fromEntries(url.searchParams)).toMatchObject({ country: 'kr', language: 'ko', prioritydomain: 'top', removeduplicate: '1' });
      } else {
        expect([...url.searchParams.keys()].sort()).toEqual(['category', 'country', 'language', 'removeduplicate']);
        expect(Object.fromEntries(url.searchParams)).toMatchObject({ country: 'kr', language: 'ko', removeduplicate: '1' });
      }
      expect(url.searchParams.get('category')).toBe(CATEGORY_OF[sectionOf(c.url)]);
      expect(c.key).toBe(KEY);
      expect(c.url).not.toContain(KEY);
    }
    expect(new URL(net.calls[0].url).searchParams.has('page')).toBe(false);
  });

  it('② 변환(pages 0 = top만, ex06과 같음): pol 10행 · 7칸만 · description null 2 · published_at UTC · date KST 오늘, 첫 기사 title이 null이면 9행', async () => {
    const mem = memoryStore();
    await run(fakeNet(standard), mem.store, 0);

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

    const noTitle = (section: SectionKey, kind: Kind): Reply => {
      if (section !== 'pol') return standard(section, kind);
      const body = fixture('politics_top');
      body.results[0].title = null;
      return { status: 200, body };
    };
    const mem2 = memoryStore();
    await run(fakeNet(noTitle), mem2.store, 0);
    expect(mem2.articles.filter(a => a.section === 'pol')).toHaveLength(9);
  });

  it('③ 페이지: pages 2 → 16번(전체 2번째만 page=NEXT_PAGE_TOKEN), pages 0 → 6번, 전체 nextPage null → pages 2여도 11번', async () => {
    const net2 = fakeNet(standard);
    await run(net2, memoryStore().store, 2);
    expect(net2.calls).toHaveLength(16);
    expect(net2.calls.map(c => sectionOf(c.url))).toEqual(['pol', 'pol', 'pol', 'eco', 'eco', 'eco', 'soc', 'soc', 'soc', 'cul', 'cul', 'cul', 'wor', 'it', 'it', 'it']);
    expect(net2.calls.map(c => kindOf(c.url))).toEqual([
      'top', 'all', 'all', 'top', 'all', 'all', 'top', 'all', 'all', 'top', 'all', 'all', 'top', 'top', 'all', 'all',
    ]);
    expect(net2.calls.map(c => new URL(c.url).searchParams.get('page'))).toEqual([
      null, null, 'NEXT_PAGE_TOKEN', null, null, 'NEXT_PAGE_TOKEN',
      null, null, 'NEXT_PAGE_TOKEN', null, null, 'NEXT_PAGE_TOKEN',
      null, null, null, 'NEXT_PAGE_TOKEN',
    ]);

    const net0 = fakeNet(standard);
    await run(net0, memoryStore().store, 0);
    expect(net0.calls).toHaveLength(6);

    const lastPage = (section: SectionKey, kind: Kind): Reply =>
      section === 'wor' || kind === 'top' ? standard(section, kind) : { status: 200, body: { ...allOf(FIXTURE_OF[section]), nextPage: null } };
    const netLast = fakeNet(lastPage);
    await run(netLast, memoryStore().store, 2);
    expect(netLast.calls).toHaveLength(11);
  });

  it('④ 한 번 수집(pages 2): ok 섹션만 그날 행을 바꾸고 failed(wor)는 옛 행 유지, 링크 중복 없음, description 300자, collect_runs 6행 · 종료 코드 1', async () => {
    const mem = memoryStore(OLD);
    const result = await run(fakeNet(standard), mem.store, 2);

    const today = mem.articles.filter(a => a.date === TODAY);
    const countOf = (s: SectionKey) => today.filter(a => a.section === s).length;
    expect(ORDER.map(countOf)).toEqual([19, 20, 20, 20, 2, 18]);
    expect(today.filter(a => a.section === 'wor')).toEqual([OLD[1], OLD[2]]);
    expect(today.filter(a => a.section === 'pol').map(a => a.link)).not.toContain(OLD[0].link);
    expect(today.filter(a => a.section === 'pol').map(a => a.link)).not.toContain(OLD[2].link);
    expect(mem.articles.filter(a => a.date === YESTERDAY)).toEqual([OLD[3]]);
    const ecoLinks = new Set(fixture('politics').results.flatMap((a: { link: string }) => [a.link, `${a.link}#all`]));
    expect(today.filter(a => a.section === 'it' && ecoLinks.has(a.link))).toHaveLength(0);

    // description: eco 2건 · it 4건(top · 전체 출처에서 각각 1 · 2건)만 앞 300자로 잘림, 나머지 행은 원문 그대로
    const original = new Map<string, string | null>(Object.values(FIXTURE_OF)
      .flatMap(name => fixture(name).results.flatMap((a: { link: string; description: string | null }) =>
        [[a.link, a.description], [`${a.link}#all`, a.description]] as [string, string | null][])));
    const fresh = today.filter(a => a.section !== 'wor');
    const cut = fresh.filter(a => a.description !== original.get(a.link));
    expect(cut.map(a => a.section)).toEqual(['eco', 'eco', 'it', 'it', 'it', 'it']);
    for (const a of cut) {
      expect([...a.description!]).toHaveLength(300);
      expect(original.get(a.link)!.startsWith(a.description!)).toBe(true);
    }

    expect(mem.runs.map(r => [r.section, r.status, r.articleCount])).toEqual([
      ['pol', 'ok', 19], ['eco', 'ok', 20], ['soc', 'ok', 20], ['cul', 'ok', 20], ['wor', 'failed', 0], ['it', 'ok', 18],
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
    await run(fakeNet(standard), mem.store, 2);
    const before = mem.articles.length;

    await run(fakeNet(standard), mem.store, 2);
    expect(mem.articles).toHaveLength(before);
    expect(new Set(mem.articles.map(a => `${a.date} ${a.link}`)).size).toBe(before);
    expect(mem.runs).toHaveLength(12);
  });

  const ALL_FAIL: [string, Reply, string, number][] = [
    ['모든 응답 HTTP 401', { status: 401, body: { status: 'error', results: { message: 'API key invalid', code: 'Unauthorized' } } }, 'HTTP 401', 6],
    ['요청 함수가 던짐', new TypeError('fetch failed'), '1페이지: fetch failed', 6],
    ['results: []', { status: 200, body: { status: 'success', totalResults: 0, results: [], nextPage: 'NEXT_PAGE_TOKEN' } }, '기사 0건', 12],
  ];
  it.each(ALL_FAIL)('⑥ 전부 실패(%s): 6섹션 failed · 요청 6번(results: []는 12번) · 넣어 둔 행 그대로 · 종료 코드 2', async (_, reply, expected, requests) => {
    const net = fakeNet(() => reply);
    const mem = memoryStore(OLD);
    const result = await run(net, mem.store, 2);

    expect(mem.runs.map(r => [r.section, r.status, r.articleCount])).toEqual(ORDER.map(s => [s, 'failed', 0]));
    for (const r of mem.runs) expect(r.message).toContain(expected);
    expect(net.calls).toHaveLength(requests);
    expect(mem.articles).toEqual(OLD);
    expect(result.code).toBe(2);
  });
});
