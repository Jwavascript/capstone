// 묶기 규칙(grouping.ts, D11 · D13): 저장한 응답(fixture) · 가짜 요청 함수 · 메모리 저장소 · 대기 0으로, 네트워크 · DB 없이
// 시각은 setup.ts가 2026-10-07 12:00 KST로 고정
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bundle, commonWords, group, relatedCount, words, type GroupArticle, type GroupIssue, type GroupStore } from '../server/grouping';
import type { Fetch } from '../server/newsdata';
import type { SectionKey } from '../server/ranking';

const KEY = 'test-key-123';
const TODAY = '2026-10-07';
const id = (section: SectionKey, n: number) => `${TODAY}-${section}-${n}`;

// fixture: research/newsdata 7개 그대로. 부를 때마다 새 객체
const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/newsdata/${name}.json`, import.meta.url), 'utf8'));
const latest = (name: string) => fixture(`latest_kr_ko_${name}`);
// fixture 기사 → 그날 기사(제목 · 링크 · 발행 시각은 pubDate를 UTC로)
const articlesOf = (name: string, section: SectionKey): GroupArticle[] =>
  latest(name).results.map((a: { title: string; link: string; pubDate: string }) =>
    ({ section, title: a.title, link: a.link, publishedAt: new Date(`${a.pubDate.replace(' ', 'T')}Z`).toISOString() }));
// 그날 기사: pol = politics_top 10 + politics 10(이 순서) · it = q_nuri 10 · 나머지 0
const DAY = () => [...articlesOf('politics_top', 'pol'), ...articlesOf('politics', 'pol'), ...articlesOf('q_nuri', 'it')];
const linkOf = (source: string) => articlesOf('q_nuri', 'it').find(a => a.link.includes(source))!.link;
const SBS_JECHEONG = 'https://news.sbs.co.kr/news/endPage.do?news_id=N1008785889';
const CHOSUN_JECHEONG = 'https://www.chosun.com/politics/politics_general/2026/10/07/OX54HZIT3RAUHJWLFUCVF7WKGI/';
const chosunTitle = () => DAY().find(a => a.link === CHOSUN_JECHEONG)!.title;

// 실제 117건(titles_2026-10-08.json): 섹션 그대로, link https://example.com/t{순번 3자리}, 발행 시각 모두 같음 → 정한 순서 = 순번
const REAL = (): GroupArticle[] =>
  fixture('titles_2026-10-08').articles.map((a: { section: SectionKey; title: string }, i: number) =>
    ({ section: a.section, title: a.title, link: `https://example.com/t${String(i).padStart(3, '0')}`, publishedAt: '2026-10-07T00:00:00.000Z' }));
// 실험 응답(q_vs_qintitle_2026-10-08.json) 중 qInTitle 하나 → newsdata 응답 꼴
const experiment = (topic: string) => {
  const r = fixture('q_vs_qintitle_2026-10-08').results.find((x: { topic: string; param: string }) => x.topic === topic && x.param === 'qInTitle');
  return { status: 'success', totalResults: r.totalResults as number, results: (r.titles as string[]).map(title => ({ title })), nextPage: null };
};

// 메모리 저장소: save는 DB 트랜잭션처럼 한 번에 바뀜(빠진 이슈 지움 → 넣기/고치기, 있던 id는 summary 그대로 → 기사 issue_id)
function memoryStore(initial: GroupArticle[]) {
  const articles = initial.map(a => ({ ...a, date: TODAY, issueId: null as string | null }));
  const issues: (GroupIssue & { summary: string[] | null })[] = [];
  const bookmarks: string[] = [];
  const store: GroupStore = {
    load: async date => ({
      articles: articles.filter(a => a.date === date).map(({ section, title, link, publishedAt }) => ({ section, title, link, publishedAt })),
      issues: issues.filter(i => i.date === date).map(({ id, section, url }) => ({ id, section, url })),
      bookmarked: [...new Set(issues.filter(i => i.date === date && bookmarks.includes(i.id)).map(i => i.section))],
    }),
    save: async (date, sections, rows, links) => {
      for (const old of issues.filter(i => i.date === date && sections.includes(i.section) && !rows.some(r => r.id === i.id))) {
        if (bookmarks.includes(old.id)) throw new Error(`북마크가 가리키는 이슈를 지움: ${old.id}`);
        issues.splice(issues.indexOf(old), 1);
        for (const a of articles) if (a.issueId === old.id) a.issueId = null;
      }
      for (const r of rows) {
        const old = issues.find(i => i.id === r.id);
        if (old) Object.assign(old, r);
        else issues.push({ ...r, summary: null });
      }
      for (const a of articles) {
        if (a.date !== date || !sections.includes(a.section)) continue;
        a.issueId = links.find(l => l.section === a.section && l.link === a.link)?.issueId ?? null;
      }
    },
  };
  return { store, articles, issues, bookmarks };
}

type Reply = { status: number; body: unknown };
const EMPTY: Reply = { status: 200, body: { status: 'success', totalResults: 0, results: [], nextPage: null } };
// 기본 응답: qInTitle 첫 낱말이 누리호 → q_nuri(249, 1쪽 10건) · 제청 → totalResults 120 · 1쪽 = q_nuri 앞 3건 + chosun 제청 기사 제목
// · 트럼프 → HTTP 500(results.message에 키) · 그 밖 → totalResults 0 · results []
const basic = (q: string): Reply => {
  const first = q.split(' AND ')[0];
  if (first === '누리호') return { status: 200, body: latest('q_nuri') };
  if (first === '제청') return { status: 200, body: { status: 'success', totalResults: 120, results: [...latest('q_nuri').results.slice(0, 3), { title: chosunTitle() }] } };
  if (first === '트럼프') return { status: 500, body: { status: 'error', results: { message: `upstream error for ${KEY}`, code: 'InternalError' } } };
  return EMPTY;
};

// 가짜 요청 함수: 요청(URL · 헤더 키)을 기록, 헤더 x-api-limit-remaining(기본 190). first를 주면 첫 응답만 그것으로
function fakeNet({ remaining = '190', first, reply = basic }: { remaining?: string; first?: Reply; reply?: (q: string) => Reply } = {}) {
  const calls: { url: string; key: string | null }[] = [];
  const send: Fetch = async (url, init) => {
    calls.push({ url, key: new Headers(init.headers).get('X-ACCESS-KEY') });
    const r = calls.length === 1 && first ? first : reply(new URL(url).searchParams.get('qInTitle') ?? '');
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'x-api-limit-remaining': remaining } });
  };
  return { send, calls };
}

const run = (net: ReturnType<typeof fakeNet>, mem: ReturnType<typeof memoryStore>, search: number) =>
  group({ fetch: net.send, store: mem.store, key: KEY, search, waitMs: 0 });
const issue = (mem: ReturnType<typeof memoryStore>, issueId: string) => mem.issues.find(i => i.id === issueId);
const qs = (net: ReturnType<typeof fakeNet>) => net.calls.map(c => new URL(c.url).searchParams.get('qInTitle')!.replace(' AND ', '+'));
// 결과의 후보 줄(건너뛴 섹션은 없음)
const candidatesOf = (result: Awaited<ReturnType<typeof group>>, section: SectionKey) => {
  if (result.empty) throw new Error('기사 없음');
  const s = result.sections.find(x => x.section === section)!;
  return 'candidates' in s ? s.candidates : [];
};
// 비교용 요약: 묶음마다 대표 link · 검색어 · 기사 link(정렬)
const shape = (articles: GroupArticle[], common?: Set<string>) =>
  bundle(articles, common).map(b => ({ rep: b.rep.link, keywords: b.keywords.join('+'), links: b.members.map(a => a.link).sort() }));

describe('group (AC-02-1 · AC-02-2, D11 · D13)', () => {
  it('① 낱말 · 묶기: pol 19묶음(제청 2건, 대표 sbs · 제청+작심), it 2묶음(누리호 5 + 4건을 합쳐 9건 대표 sbs · 누리호+우주 / 주요일정+대전), 합치기 조건 ②, 순서를 뒤집어도 같음', () => {
    expect(words('누리호, 오늘 다시 우주로…위성 15기 실었다')).toEqual(['누리호', '다시', '우주로', '위성', '15기', '실었다']);
    expect(words('노벨화학상에 ‘유기 합성분야’ 카강·소아이')).toEqual(['노벨화학상에', '유기', '합성분야', '카강', '소아이']);
    expect(words('李대통령 “과거 검찰, 없는 죄 뒤집어씌워”')).toEqual(['과거', '검찰', '없는', '뒤집어씌워']);
    expect(words('[오늘의 주요일정] 대전·충남(7일, 수)')).toEqual(['주요일정', '대전', '충남', '7일']);

    const pol = DAY().filter(a => a.section === 'pol');
    const it_ = DAY().filter(a => a.section === 'it');

    const polBundles = shape(pol);
    expect(polBundles).toHaveLength(19);
    expect(polBundles.filter(b => b.links.length > 1)).toEqual([
      { rep: SBS_JECHEONG, keywords: '제청+작심', links: [CHOSUN_JECHEONG, SBS_JECHEONG].sort() },
    ]);
    expect(polBundles[0].rep).toBe(SBS_JECHEONG);

    // 묶기에서 대표 sbs 5건(누리호+우주) · 대표 newspim 4건(누리호+발사)으로 나뉜 뒤 합치기로 9건
    const itBundles = shape(it_);
    expect(itBundles).toEqual([
      {
        rep: linkOf('sbs'), keywords: '누리호+우주',
        links: ['sbs', 'kbs', 'etoday', 'newsis', 'yonhapnewstv', 'newspim', 'fnnews', 'edaily', 'it-science'].map(linkOf).sort(),
      },
      { rep: linkOf('news1.kr/local'), keywords: '주요일정+대전', links: [linkOf('news1.kr/local')] },
    ]);

    // 합치기 조건 ②: edaily를 빼면 뒤 묶음 검색어가 누리호+군집위성, 군집위성이 앞 묶음 낱말에 없어 3묶음(5 · 3 · 1)
    const noEdaily = shape(it_.filter(a => a.link !== linkOf('edaily')));
    expect(noEdaily.map(b => [b.links.length, b.keywords])).toEqual([[5, '누리호+우주'], [3, '누리호+군집위성'], [1, '주요일정+대전']]);

    expect(shape([...pol].reverse())).toEqual(polBundles);
    expect(shape([...it_].reverse())).toEqual(itBundles);
  });

  it('② 검색 6 → 요청 8번(pol 6개 → it 2개, qInTitle AND), 1쪽 검증한 연관기사 수 · issue_id · 종료 코드 1', async () => {
    const mem = memoryStore(DAY());
    const net = fakeNet();
    const result = await run(net, mem, 6);

    expect(qs(net)).toEqual(['제청+작심', '종일+해외직구', '트럼프+이란전', '충남+스마트팜', '문체부장관+예체능', '차량+훔쳐', '누리호+우주', '주요일정+대전']);
    for (const c of net.calls) {
      const url = new URL(c.url);
      expect(url.origin + url.pathname).toBe('https://newsdata.io/api/1/latest');
      expect([...url.searchParams.keys()].sort()).toEqual(['country', 'language', 'qInTitle', 'removeduplicate']);
      expect(Object.fromEntries(url.searchParams)).toMatchObject({ country: 'kr', language: 'ko', removeduplicate: '1' });
      expect(c.key).toBe(KEY);
      expect(c.url).not.toContain(KEY);
    }
    expect(net.calls[6].url).toContain('qInTitle=%EB%88%84%EB%A6%AC%ED%98%B8%20AND%20%EC%9A%B0%EC%A3%BC');

    expect(mem.issues).toHaveLength(21);
    // it-1: 249 × 9/10(1쪽에서 주요일정 기사만 관련 없음) = 224, pol-1: 120 × 1/4(chosun 제목만 관련) = 30
    expect(issue(mem, id('it', 1))).toMatchObject({ articleCount: 224, url: linkOf('sbs') });
    expect(issue(mem, id('it', 2))!.articleCount).toBe(1);
    expect(issue(mem, id('pol', 1))).toMatchObject({ articleCount: 30, url: SBS_JECHEONG, latestPublishedAt: '2026-10-06T21:14:00.000Z' });
    for (let n = 2; n <= 19; n++) expect(issue(mem, id('pol', n))!.articleCount).toBe(1);
    for (const i of mem.issues) expect(i.summary).toBeNull();

    const pol3 = candidatesOf(result, 'pol')[2];
    expect(pol3).toMatchObject({ id: id('pol', 3), keyword: '트럼프+이란전', articleCount: 1, size: 1 });
    expect(pol3.note).toContain('검색 실패: HTTP 500');
    expect(pol3.note).toContain('***');
    expect(pol3.note).not.toContain(KEY);
    expect(candidatesOf(result, 'it')[0]).toEqual({ id: id('it', 1), keyword: '누리호+우주', articleCount: 224, size: 9, note: null });

    expect(mem.articles).toHaveLength(30);
    for (const a of mem.articles) expect(a.issueId).not.toBeNull();
    expect(mem.articles.filter(a => a.issueId === id('pol', 1))).toHaveLength(2);
    expect(mem.articles.filter(a => a.issueId === id('it', 1))).toHaveLength(9);
    expect(result).toMatchObject({ issues: 21, requests: 8, failed: 1, remaining: '190', code: 1 });
    expect(result.empty ? [] : result.sections.filter(s => 'skipped' in s)).toEqual(
      ['eco', 'soc', 'cul', 'wor'].map(section => ({ section, skipped: '기사 없음' })));
  });

  it('② 검색 0 → 요청 0번 · 묶음 크기 · 종료 코드 0, 검색 1 → 요청 2번(제청+작심 · 누리호+우주)', async () => {
    const mem0 = memoryStore(DAY());
    const net0 = fakeNet();
    const result0 = await run(net0, mem0, 0);
    expect(net0.calls).toHaveLength(0);
    expect(issue(mem0, id('it', 1))!.articleCount).toBe(9);
    expect(issue(mem0, id('pol', 1))!.articleCount).toBe(2);
    expect(candidatesOf(result0, 'pol').map(c => c.note)).toEqual(Array(6).fill('검색 안 함'));
    expect(result0).toMatchObject({ requests: 0, failed: 0, remaining: null, code: 0 });

    const net1 = fakeNet();
    await run(net1, memoryStore(DAY()), 1);
    expect(qs(net1)).toEqual(['제청+작심', '누리호+우주']);
  });

  it('② 크레딧 부족: 첫 응답 HTTP 429 → 요청 1번 · 모두 묶음 크기, 헤더 0 → 요청 1번 · pol-1만 30, 둘 다 종료 코드 1', async () => {
    const mem = memoryStore(DAY());
    const net = fakeNet({ first: { status: 429, body: { status: 'error', results: { message: 'rate limit', code: 'RateLimitExceeded' } } } });
    const result = await run(net, mem, 6);
    expect(net.calls).toHaveLength(1);
    expect(issue(mem, id('pol', 1))!.articleCount).toBe(2);
    expect(issue(mem, id('it', 1))!.articleCount).toBe(9);
    expect(issue(mem, id('it', 2))!.articleCount).toBe(1);
    expect(candidatesOf(result, 'pol')[0].note).toContain('검색 실패: HTTP 429');
    expect(candidatesOf(result, 'pol')[1].note).toBe('검색 안 함(크레딧 부족)');
    expect(candidatesOf(result, 'it')[0].note).toBe('검색 안 함(크레딧 부족)');
    expect(result.code).toBe(1);

    const memZero = memoryStore(DAY());
    const netZero = fakeNet({ remaining: '0' });
    const resultZero = await run(netZero, memZero, 6);
    expect(netZero.calls).toHaveLength(1);
    expect(issue(memZero, id('pol', 1))!.articleCount).toBe(30);
    expect(memZero.issues.filter(i => i.id !== id('pol', 1)).map(i => i.articleCount))
      .toEqual(memZero.issues.filter(i => i.id !== id('pol', 1)).map(i => (i.id === id('it', 1) ? 9 : 1)));
    expect(resultZero).toMatchObject({ remaining: '0', failed: 0, code: 1 });
  });

  // ③은 각각 ② 상태(검색 6)에서 시작
  const afterTwo = async () => {
    const mem = memoryStore(DAY());
    await run(fakeNet(), mem, 6);
    return mem;
  };
  const snapshot = (mem: ReturnType<typeof memoryStore>) =>
    mem.issues.map(i => ({ id: i.id, url: i.url })).sort((a, b) => a.id.localeCompare(b.id));

  it('③ 다시 묶기: 같은 기사로 한 번 더 → 이슈 21행 · id · url 같음', async () => {
    const mem = await afterTwo();
    const before = snapshot(mem);
    await run(fakeNet(), mem, 6);
    expect(mem.issues).toHaveLength(21);
    expect(snapshot(mem)).toEqual(before);
  });

  it('③ 다시 묶기: it-1에 요약을 넣고 kbs를 빼면 it-1 유지(묶음 8 · summary 그대로)', async () => {
    const mem = await afterTwo();
    const summary = ['첫째 줄', '둘째 줄', '셋째 줄'];
    issue(mem, id('it', 1))!.summary = summary;
    mem.articles.splice(mem.articles.findIndex(a => a.section === 'it' && a.link === linkOf('kbs')), 1);

    const result = await run(fakeNet(), mem, 6);
    expect(candidatesOf(result, 'it')[0]).toMatchObject({ id: id('it', 1), size: 8 });
    expect(issue(mem, id('it', 1))).toMatchObject({ url: linkOf('sbs'), summary });
  });

  it('③ 다시 묶기: sbs를 빼면 대표 kbs · 새 id it-3(summary null · 묶음 8) · it-1 지워짐 · it-2 그대로', async () => {
    const mem = await afterTwo();
    issue(mem, id('it', 1))!.summary = ['첫째 줄', '둘째 줄', '셋째 줄'];
    const it2 = { ...issue(mem, id('it', 2))! };
    mem.articles.splice(mem.articles.findIndex(a => a.section === 'it' && a.link === linkOf('sbs')), 1);

    await run(fakeNet(), mem, 6);
    expect(issue(mem, id('it', 1))).toBeUndefined();
    expect(issue(mem, id('it', 3))).toMatchObject({ url: linkOf('kbs'), summary: null });
    expect(issue(mem, id('it', 2))).toEqual(it2);
    expect(mem.articles.filter(a => a.issueId === id('it', 3))).toHaveLength(8);
  });

  it('③ 다시 묶기: pol-1에 북마크 → pol 건너뜀(이슈 · 기사 issue_id 그대로) · 요청 2번(it만)', async () => {
    const mem = await afterTwo();
    mem.bookmarks.push(id('pol', 1));
    const polIssues = structuredClone(mem.issues.filter(i => i.section === 'pol'));
    const polLinks = mem.articles.filter(a => a.section === 'pol').map(a => [a.link, a.issueId]);

    const net = fakeNet();
    const result = await run(net, mem, 6);
    expect(qs(net)).toEqual(['누리호+우주', '주요일정+대전']);
    expect(mem.issues.filter(i => i.section === 'pol')).toEqual(polIssues);
    expect(mem.articles.filter(a => a.section === 'pol').map(a => [a.link, a.issueId])).toEqual(polLinks);
    expect(result.empty ? null : result.sections[0]).toEqual({ section: 'pol', skipped: '북마크 있음' });
  });

  it('④ 실제 117건: 검색 1 → 이슈 108 · 요청 6번 · 흔한 낱말에 안 끌림, 순서를 뒤집어도 같음', async () => {
    const mem = memoryStore(REAL());
    const net = fakeNet({ reply: q => (q === '소아이 AND 노벨화학상' ? { status: 200, body: experiment('노벨화학상') } : EMPTY) });
    const result = await run(net, mem, 1);

    const count = (section: SectionKey) => mem.issues.filter(i => i.section === section).length;
    expect(mem.issues).toHaveLength(108);
    expect((['pol', 'eco', 'soc', 'cul', 'wor', 'it'] as const).map(count)).toEqual([19, 18, 18, 17, 20, 16]);
    expect(qs(net)).toEqual(['여고생+살해', '부동산+불법사찰', '고깃집서+대피', '김지원+유퀴즈', '남고+오고', '소아이+노벨화학상']);
    expect(result).toMatchObject({ requests: 6, failed: 0, code: 0 });

    const issueOf = (n: number) => mem.articles.find(a => a.link === `https://example.com/t${String(n).padStart(3, '0')}`)!.issueId;
    expect(issueOf(20)).not.toBe(issueOf(21)); // eco 불법사찰 · 오세훈은 `부동산` 하나뿐
    expect([38, 39, 40].map(issueOf)).toEqual(Array(3).fill(id('it', 1)));
    expect(issue(mem, id('it', 1))!.articleCount).toBe(11);
    expect(issueOf(48)).not.toBe(id('it', 1));
    expect(issueOf(79)).toBe(issueOf(80));
    expect(issueOf(81)).not.toBe(issueOf(79)); // `경찰` · `수사`는 불용어
    expect(issueOf(69)).not.toBe(issueOf(76)); // 인구 하나가 인구감소 · 인구활력 둘과 같아도 1
    expect(issueOf(97)).not.toBe(issueOf(98)); // `ai`는 흔한 낱말
    expect(new Set([0, 1, 2, 3].map(issueOf)).size).toBe(1);
    expect(words(REAL()[40].title)).toEqual(expect.arrayContaining(['노벨화학상에', '소아이']));

    const common = commonWords(REAL());
    for (const section of ['pol', 'eco', 'soc', 'cul', 'wor', 'it'] as const) {
      const mine = REAL().filter(a => a.section === section);
      expect(shape([...mine].reverse(), common)).toEqual(shape(mine, common));
    }
  });

  it('⑤ 1쪽 검증: 실험 응답 세 줄 → 2 · 11 · 30, 1쪽 0건 → 묶음 크기', () => {
    const titleOf = (n: number) => REAL()[n].title;
    expect(relatedCount([titleOf(97)], ['중국', 'ai'], experiment('중국 AI'), 1)).toBe(2);
    expect(relatedCount([38, 39, 40].map(titleOf), ['노벨화학상', '소아이'], experiment('노벨화학상'), 3)).toBe(11);
    expect(relatedCount([titleOf(21)], ['오세훈', '부동산'], experiment('부동산(잘못 묶인 예)'), 1)).toBe(30);
    expect(relatedCount([38, 39, 40].map(titleOf), ['노벨화학상', '소아이'], { totalResults: 11, results: [] }, 3)).toBe(3);
  });
});
