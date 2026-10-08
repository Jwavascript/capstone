// 묶기 규칙(grouping.ts, D11 · D13 · D15): 저장한 응답(fixture) · 가짜 요청 함수 · 가짜 정리 함수 · 메모리 저장소 · 대기 0으로, 네트워크 · DB 없이
// 시각은 setup.ts가 2026-10-07 12:00 KST로 고정
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildQuery, bundle, commonWords, group, relatedCount, words, type AiReply, type GroupArticle, type GroupIssue, type GroupStore, type Organize } from '../server/grouping';
import type { Fetch } from '../server/newsdata';
import type { SectionKey } from '../server/ranking';

const KEY = 'test-key-123';
const AI_KEY = 'test-ant-456';
const TODAY = '2026-10-07';
const id = (section: SectionKey, n: number) => `${TODAY}-${section}-${n}`;

// fixture: research/newsdata 7개 그대로. 부를 때마다 새 객체
const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/newsdata/${name}.json`, import.meta.url), 'utf8'));
const latest = (name: string) => fixture(`latest_kr_ko_${name}`);
// fixture 기사 → 그날 기사(제목 · 설명문(없으면 null) · 링크 · 발행 시각은 pubDate를 UTC로)
const articlesOf = (name: string, section: SectionKey): GroupArticle[] =>
  latest(name).results.map((a: { title: string; description: string | null; link: string; pubDate: string }) =>
    ({ section, title: a.title, description: a.description || null, link: a.link, publishedAt: new Date(`${a.pubDate.replace(' ', 'T')}Z`).toISOString() }));
// 그날 기사: pol = politics_top 10 + politics 10(이 순서) · it = q_nuri 10 · 나머지 0
const DAY = () => [...articlesOf('politics_top', 'pol'), ...articlesOf('politics', 'pol'), ...articlesOf('q_nuri', 'it')];
const linkOf = (source: string) => articlesOf('q_nuri', 'it').find(a => a.link.includes(source))!.link;
const SBS_JECHEONG = 'https://news.sbs.co.kr/news/endPage.do?news_id=N1008785889';
const CHOSUN_JECHEONG = 'https://www.chosun.com/politics/politics_general/2026/10/07/OX54HZIT3RAUHJWLFUCVF7WKGI/';
const chosunTitle = () => DAY().find(a => a.link === CHOSUN_JECHEONG)!.title;

// 실제 117건(titles_2026-10-08.json): 섹션 그대로, link https://example.com/t{순번 3자리}, 발행 시각 모두 같음 → 정한 순서 = 순번
const REAL = (): GroupArticle[] =>
  fixture('titles_2026-10-08').articles.map((a: { section: SectionKey; title: string }, i: number) =>
    ({ section: a.section, title: a.title, description: null, link: `https://example.com/t${String(i).padStart(3, '0')}`, publishedAt: '2026-10-07T00:00:00.000Z' }));
// 실험 응답(q_vs_qintitle_2026-10-08.json) 중 qInTitle 하나 → newsdata 응답 꼴
const experiment = (topic: string) => {
  const r = fixture('q_vs_qintitle_2026-10-08').results.find((x: { topic: string; param: string }) => x.topic === topic && x.param === 'qInTitle');
  return { status: 'success', totalResults: r.totalResults as number, results: (r.titles as string[]).map(title => ({ title })), nextPage: null };
};

// 메모리 저장소: save는 DB 트랜잭션처럼 한 번에 바뀜(빠진 이슈 지움 → 넣기/고치기, 있던 id는 summary 그대로 → links의 기사 issue_id)
// fixture에는 같은 link가 pol · it 두 섹션에 있어(DB라면 (date, link)가 하나) 기사 행은 수집 섹션 + link로 가림
function memoryStore(initial: GroupArticle[]) {
  const articles = initial.map(a => ({ ...a, date: TODAY, issueId: null as string | null }));
  const issues: (GroupIssue & { summary: string[] | null })[] = [];
  const bookmarks: string[] = [];
  const store: GroupStore = {
    load: async date => ({
      articles: articles.filter(a => a.date === date)
        .map(({ section, title, description, link, publishedAt, issueId }) => ({ section, title, description, link, publishedAt, issueId })),
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
      for (const l of links) {
        const a = articles.find(x => x.date === date && x.section === l.section && x.link === l.link);
        if (a) a.issueId = l.issueId;
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

  // ⑥~⑧ AI 정리(D15). 가짜 정리 함수는 받은 입력 줄(`a000 [pol] 제목 | 설명문`)로 응답을 만듦
  // 입력 줄에서 기사 번호 찾기(수집 섹션 · 제목으로, 없으면 null)
  const numberOf = (lines: string[], a: GroupArticle) => {
    const head = `[${a.section}] ${a.title}`;
    const line = lines.find(l => l.slice(5) === head || l.slice(5).startsWith(`${head} | `));
    return line ? line.slice(0, 4) : null;
  };
  const NURI = () => articlesOf('q_nuri', 'it').filter(a => a.link !== linkOf('news1.kr/local'));
  const SCHEDULE = () => articlesOf('q_nuri', 'it').find(a => a.link === linkOf('news1.kr/local'))!;
  const CAR = () => DAY().find(a => a.section === 'pol' && a.title.startsWith('차량 훔쳐'))!;
  const JECHEONG = () => DAY().filter(a => a.link === SBS_JECHEONG || a.link === CHOSUN_JECHEONG);
  const CAR_QUERY = '(차량 OR 승용차) AND 훔친';
  // ⑥ 가짜 정리: it 누리호 9건 · soc 차량 훔친 10대(pol 기사) · pol 제청 2건 · 제외 주요일정 · 나머지 pol 17건은 빼먹음
  // 입력에 없는 기사는 넣지 않고, 기사가 하나도 없는 묶음은 뺌
  const sixOutput = (lines: string[]) => {
    const nums = (list: GroupArticle[]) => list.map(a => numberOf(lines, a)).filter((n): n is string => n !== null);
    return {
      issues: [
        { section: 'it', articles: nums(NURI()), importance: 5, terms: [['누리호'], ['우주']] },
        { section: 'soc', articles: nums([CAR()]), importance: 2, terms: [['차량', '승용차'], ['훔친']] },
        { section: 'pol', articles: nums(JECHEONG()), importance: 4, terms: [['제청'], ['대법관']] },
      ].filter(i => i.articles.length > 0),
      excluded: nums([SCHEDULE()]),
    };
  };
  // 가짜 정리 함수: 받은 입력 줄을 기록하고 make(lines)로 응답(던지면 그대로 던짐)
  function fakeAi(make: (lines: string[]) => AiReply<unknown>) {
    const inputs: string[][] = [];
    const organize: Organize = async lines => { inputs.push(lines); return make(lines); };
    return { organize, inputs };
  }
  const runAi = (net: ReturnType<typeof fakeNet>, mem: ReturnType<typeof memoryStore>, search: number, organize: Organize) =>
    group({ fetch: net.send, store: mem.store, key: KEY, search, waitMs: 0, organize, aiKey: AI_KEY });
  const sixAi = () => fakeAi(lines => ({ refusal: false, output: sixOutput(lines) }));
  const issueIdOf = (mem: ReturnType<typeof memoryStore>, section: SectionKey, link: string) =>
    mem.articles.find(a => a.section === section && a.link === link)!.issueId;

  it('⑥ AI 정상: 묶음 3 · 제외 1 · 빠진 기사 17, 검색 1 → 요청 3번(pol → soc → it), 이슈 20(pol 18 · soc 1 · it 1), 종료 코드 0', async () => {
    const mem = memoryStore(DAY());
    const net = fakeNet();
    const ai = sixAi();
    const result = await runAi(net, mem, 1, ai.organize);

    // 입력 줄: 30건, 발행 시각 ↓ → link ↑, 번호 a000부터, 설명문 앞 120자(null이면 제목만)
    const lines = ai.inputs[0];
    expect(lines).toHaveLength(30);
    expect(lines.map(l => l.slice(0, 4))).toEqual(lines.map((_, i) => `a${String(i).padStart(3, '0')}`));
    const sbs = articlesOf('q_nuri', 'it')[0];
    expect(lines).toContain(`${numberOf(lines, sbs)} [it] ${sbs.title} | ${[...sbs.description!].slice(0, 120).join('').replace(/\s+/g, ' ')}`);
    const noDesc = DAY().find(a => a.description === null)!;
    expect(lines).toContain(`${numberOf(lines, noDesc)} [${noDesc.section}] ${noDesc.title}`);

    expect(result).toMatchObject({ ai: { status: 'ok', bundles: 3, excluded: 1, missing: 17 }, issues: 20, requests: 3, failed: 0, code: 0 });
    expect(net.calls.map(c => new URL(c.url).searchParams.get('qInTitle'))).toEqual(['제청 AND 대법관', CAR_QUERY, '누리호 AND 우주']);
    expect(net.calls[1].url).toContain(`qInTitle=${encodeURIComponent(CAR_QUERY)}`);
    const count = (section: SectionKey) => mem.issues.filter(i => i.section === section).length;
    expect((['pol', 'eco', 'soc', 'cul', 'wor', 'it'] as const).map(count)).toEqual([18, 0, 1, 0, 0, 1]);
    expect(issue(mem, id('it', 1))).toMatchObject({ articleCount: 224, url: linkOf('sbs') });
    expect(issue(mem, id('pol', 1))).toMatchObject({ articleCount: 30, url: SBS_JECHEONG });
    expect(issue(mem, id('soc', 1))).toMatchObject({ articleCount: 1, url: CAR().link, title: CAR().title });
    // 기사 섹션은 수집 섹션 그대로, issue_id는 AI 섹션 이슈 · 제외는 null
    expect(issueIdOf(mem, 'pol', CAR().link)).toBe(id('soc', 1));
    expect(issueIdOf(mem, 'it', SCHEDULE().link)).toBeNull();
    expect(mem.articles.filter(a => a.issueId === id('it', 1))).toHaveLength(9);
    expect(candidatesOf(result, 'soc')).toEqual([{ id: id('soc', 1), keyword: CAR_QUERY, articleCount: 1, size: 1, note: null }]);
    expect(candidatesOf(result, 'pol')[1].note).toBe('검색 안 함');
    expect(result.empty ? [] : result.sections.filter(s => ['eco', 'cul', 'wor'].includes(s.section)))
      .toEqual(['eco', 'cul', 'wor'].map(section => ({ section, articles: 0, issues: 0, candidates: [] })));
    expect(result.empty ? [] : result.sections.find(s => s.section === 'pol')).toMatchObject({ articles: 19, issues: 18 });
  });

  it('⑥ AI 정상: 같은 가짜로 한 번 더 → id 20개 그대로(it-1 summary 유지), pol-1에 북마크 → pol 건너뜀 · 정리 입력 11건 · 요청 2번', async () => {
    const mem = memoryStore(DAY());
    await runAi(fakeNet(), mem, 1, sixAi().organize);
    const before = snapshot(mem);
    const summary = ['첫째 줄', '둘째 줄', '셋째 줄'];
    issue(mem, id('it', 1))!.summary = summary;

    await runAi(fakeNet(), mem, 1, sixAi().organize);
    expect(snapshot(mem)).toEqual(before);
    expect(issue(mem, id('it', 1))!.summary).toEqual(summary);

    mem.bookmarks.push(id('pol', 1));
    const polIssues = structuredClone(mem.issues.filter(i => i.section === 'pol'));
    const polLinks = mem.articles.filter(a => a.section === 'pol').map(a => [a.link, a.issueId]);
    const net = fakeNet();
    const ai = sixAi();
    const result = await runAi(net, mem, 1, ai.organize);
    expect(ai.inputs[0]).toHaveLength(11);
    expect(net.calls.map(c => new URL(c.url).searchParams.get('qInTitle'))).toEqual([CAR_QUERY, '누리호 AND 우주']);
    expect(result.empty ? null : result.sections[0]).toEqual({ section: 'pol', skipped: '북마크 있음' });
    expect(mem.issues.filter(i => i.section === 'pol')).toEqual(polIssues);
    expect(mem.articles.filter(a => a.section === 'pol').map(a => [a.link, a.issueId])).toEqual(polLinks);
    expect(issueIdOf(mem, 'pol', CAR().link)).toBe(id('soc', 1));
  });

  const state = (mem: ReturnType<typeof memoryStore>) => ({ issues: mem.issues, links: mem.articles.map(a => [a.section, a.link, a.issueId]) });
  // ⑥ 정상 응답을 고친 가짜
  const edit = (change: (o: ReturnType<typeof sixOutput>) => void) => (lines: string[]): AiReply<unknown> => {
    const o = sixOutput(lines);
    change(o);
    return { refusal: false, output: o };
  };

  it('⑦ (가) 대체: 거절 · 모양이 다름 · 섹션 xx · 모든 번호가 없는 번호(묶음 없음) · 호출 실패 → --ai 0과 같은 결과 · 종료 코드 1', async () => {
    // AI 없이(--ai 0) 돌린 결과
    const plain = memoryStore(DAY());
    const plainResult = await run(fakeNet(), plain, 0);
    expect(plainResult).toMatchObject({ ai: { status: 'off' }, code: 0 });

    const cases: [(lines: string[]) => AiReply<unknown>, string][] = [
      [() => ({ refusal: true }), '거절'],
      [() => ({ refusal: false, output: { issues: 'x' } }), '형식 오류: 모양이 다름'],
      [() => ({ refusal: false, output: null }), '형식 오류: 모양이 다름'],
      [edit(o => { o.issues[1].section = 'xx'; }), '형식 오류: 섹션 xx'],
      [() => ({ refusal: false, output: { issues: [{ section: 'it', articles: ['a999'], importance: 3, terms: [['누리호'], ['우주']] }], excluded: [] } }), '형식 오류: 묶음 없음'],
      [() => { throw new Error(`401 invalid x-api-key ${AI_KEY}`); }, '호출 실패: 401 invalid x-api-key ***'],
    ];
    for (const [make, reason] of cases) {
      const mem = memoryStore(DAY());
      const net = fakeNet();
      const result = await runAi(net, mem, 0, fakeAi(make).organize);
      if (result.empty || result.ai.status !== 'failed') throw new Error(`대체 안 됨: ${reason}`);
      expect(result.ai.reason).toBe(reason);
      expect(result.ai.reason).not.toContain(AI_KEY);
      expect(result.code).toBe(1);
      expect(net.calls).toHaveLength(0);
      expect(state(mem)).toEqual(state(plain));
      expect(result.sections).toEqual(plainResult.empty ? null : plainResult.sections);
    }
  });

  it('⑦ (나) 고쳐 쓰기: 없는 번호 · 중복 번호 · 빈 묶음 · 검색어 길이 → AI 경로 그대로(고침 수) · 종료 코드 0', async () => {
    // ⑥ 정상 응답 그대로(검색 0)
    const six = memoryStore(DAY());
    await runAi(fakeNet(), six, 0, sixAi().organize);
    const runEdit = async (change: (o: ReturnType<typeof sixOutput>) => void) => {
      const mem = memoryStore(DAY());
      const result = await runAi(fakeNet(), mem, 0, fakeAi(edit(change)).organize);
      if (result.empty || result.ai.status !== 'ok') throw new Error('AI 경로 아님');
      expect(result.code).toBe(0);
      return { mem, result, ai: result.ai };
    };

    // ① 없는 번호 a999를 한 묶음에 더함 → ⑥과 이슈 같음
    const one = await runEdit(o => { o.issues[2].articles.push('a999'); });
    expect(one.ai).toMatchObject({ bundles: 3, excluded: 1, missing: 17, fixes: { duplicate: 0, unknown: 1, empty: 0, query: 0 } });
    expect(state(one.mem)).toEqual(state(six));

    // ② 첫 묶음(it 누리호)의 번호 하나를 다른 묶음 · 제외에도 넣음 → 처음 나온 묶음에만 묶임
    let moved = '';
    const two = await runEdit(o => { moved = o.issues[0].articles[0]; o.issues[2].articles.push(moved); o.excluded.push(moved); });
    expect(two.ai).toMatchObject({ bundles: 3, excluded: 1, fixes: { duplicate: 2, unknown: 0, empty: 0, query: 0 } });
    expect(state(two.mem)).toEqual(state(six));

    // ③ 한 건짜리 묶음(soc 차량)의 번호를 앞 묶음(it 누리호)에도 넣음 → soc 묶음이 비어 사라짐, 이슈 하나 적음
    const three = await runEdit(o => { o.issues[0].articles.push(o.issues[1].articles[0]); });
    expect(three.ai).toMatchObject({ bundles: 2, excluded: 1, missing: 17, fixes: { duplicate: 1, unknown: 0, empty: 1, query: 0 } });
    expect(three.mem.issues).toHaveLength(19);
    expect(three.mem.issues.filter(i => i.section === 'soc')).toHaveLength(0);
    expect(issueIdOf(three.mem, 'pol', CAR().link)).toBe(id('it', 1));
    expect(three.mem.articles.filter(a => a.issueId === id('it', 1))).toHaveLength(10);

    // ④ 빈 말만 있는 묶음(it) → 후보 줄 검색어가 ex07 낱말1+낱말2, 너무 긴 terms(soc, 조립 513자 이상) → 각 묶음 첫 말만
    const four = await runEdit(o => {
      o.issues[0].terms = [['', '  '], ['우주']];
      o.issues[1].terms = [['차량', 'ㄱ'.repeat(300)], ['훔친', 'ㄴ'.repeat(300)]];
    });
    expect(four.ai).toMatchObject({ bundles: 3, fixes: { duplicate: 0, unknown: 0, empty: 0, query: 1 } });
    expect(candidatesOf(four.result, 'it')[0]).toMatchObject({ id: id('it', 1), keyword: '누리호+우주' });
    expect(candidatesOf(four.result, 'soc')[0]).toMatchObject({ id: id('soc', 1), keyword: '차량 AND 훔친' });
    expect(state(four.mem)).toEqual(state(six));
  });

  it('⑦ (다) 검색어 조립: 괄호 · OR · 따옴표 · 말 하나면 괄호 없음 · 512자 넘으면 첫 말만 · 1묶음은 그 묶음만 · 빈 묶음 · 0묶음이면 null', () => {
    expect(buildQuery([['장기금리', '국채 금리', '10년물'], ['미국']])).toBe('(장기금리 OR "국채 금리" OR 10년물) AND 미국');
    expect(buildQuery([[' 누리호 '], ['우주', '발사']])).toBe('누리호 AND (우주 OR 발사)');
    expect(buildQuery([['', ' '], ['우주']])).toBeNull();
    // 조립 결과가 512자(코드 포인트)면 그대로, 513자면 각 묶음 첫 말만
    const at512 = buildQuery([['가', '나'.repeat(250)], ['다', '라'.repeat(243)]])!;
    expect([...at512].length).toBe(512);
    expect(at512.startsWith('(가 OR ')).toBe(true);
    expect(buildQuery([['가', '나'.repeat(250)], ['다', '라'.repeat(244)]])).toBe('가 AND 다');
    expect(buildQuery([['국채 금리', 'ㄱ'.repeat(600)], ['미국']])).toBe('"국채 금리" AND 미국');
    // 1묶음뿐이면 그 묶음만(괄호 없음), 말이 하나면 그 말, 0묶음이면 null
    expect(buildQuery([['국채 금리', '장기금리']])).toBe('"국채 금리" OR 장기금리');
    expect(buildQuery([['누리호']])).toBe('누리호');
    expect(buildQuery([])).toBeNull();
  });

  it('⑦ (라) 모양 고쳐 쓰기: terms 3묶음 · 1묶음 · 말 4개, importance 범위 밖 · 소수 · 숫자 아님 → AI 경로 그대로 · 종료 코드 0', async () => {
    const mem = memoryStore(DAY());
    const ai = fakeAi(lines => {
      const o = sixOutput(lines) as { issues: { terms: unknown; importance: unknown }[]; excluded: string[] };
      o.issues[0].terms = [['누리호'], ['우주'], ['발사']]; // it: 3묶음 → 앞 2묶음
      o.issues[0].importance = 7; // → 5
      o.issues[1].terms = [['차량', '승용차', '자동차', '오토바이']]; // soc: 1묶음 · 말 4개 → 그 묶음 앞 3개만
      o.issues[1].importance = 2.4; // → 2
      o.issues[2].importance = '높음'; // pol: 숫자 아님 → 1
      return { refusal: false, output: o };
    });
    const result = await runAi(fakeNet(), mem, 0, ai.organize);
    if (result.empty || result.ai.status !== 'ok') throw new Error('AI 경로 아님');
    expect(result.ai).toMatchObject({ bundles: 3, fixes: { duplicate: 0, unknown: 0, empty: 0, query: 0, terms: 2, importance: 3 } });
    expect(result.code).toBe(0);
    expect(candidatesOf(result, 'it')[0].keyword).toBe('누리호 AND 우주');
    expect(candidatesOf(result, 'soc')[0].keyword).toBe('차량 OR 승용차 OR 자동차');
    expect(candidatesOf(result, 'pol')[0].keyword).toBe('제청 AND 대법관');
  });

  it('⑦ (마) 실제 응답 원문(terms 1묶음 12개 · 3묶음 1개, 중복 번호) → 고쳐 쓰기 뒤 AI 경로로 통과', async () => {
    // 그날 실제 입력 104줄 자리: 번호 a000~a103 = 순번(발행 시각 같음 → link 순)
    const day: GroupArticle[] = Array.from({ length: 104 }, (_, i) => ({
      section: 'pol', title: `기사 ${i}`, description: null,
      link: `https://example.com/r${String(i).padStart(3, '0')}`, publishedAt: '2026-10-07T00:00:00.000Z',
    }));
    const raw = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/ai/${name}.json`, import.meta.url), 'utf8'));
    // 묶음 · 제외 · 빠진 기사는 고친 뒤 수(중복 번호는 처음 나온 곳만)
    const cases: [string, { bundles: number; excluded: number; missing: number }, { terms: number; duplicate: number }][] = [
      ['organize_raw_terms1_2026-10-08', { bundles: 76, excluded: 17, missing: 1 }, { terms: 0, duplicate: 2 }],
      ['organize_raw_terms3_2026-10-08', { bundles: 83, excluded: 11, missing: 0 }, { terms: 1, duplicate: 5 }],
    ];
    for (const [name, counts, fixes] of cases) {
      const output = raw(name);
      const mem = memoryStore(day);
      const result = await runAi(fakeNet(), mem, 0, fakeAi(() => ({ refusal: false, output })).organize);
      if (result.empty || result.ai.status !== 'ok') throw new Error(`AI 경로 아님: ${name}`);
      expect(result.ai).toMatchObject(counts);
      expect(result.ai.fixes).toEqual({ ...fixes, unknown: 0, empty: 0, query: 0, importance: 0 });
      expect(result).toMatchObject({ requests: 0, code: 0 });
      expect(mem.issues).toHaveLength(result.ai.bundles + result.ai.missing);
    }
  });

  it('⑧ 실제 117건: 손으로 쓴 정리(80묶음 · 제외 19) → 이슈 80(pol 15 · eco 13 · soc 19 · cul 8 · wor 14 · it 11) · 을지로 대표 t070 · 요청 0번', async () => {
    const output = JSON.parse(readFileSync(new URL('./fixtures/ai/organize_117.json', import.meta.url), 'utf8'));
    const mem = memoryStore(REAL());
    const net = fakeNet();
    const ai = fakeAi(() => ({ refusal: false, output }));
    const result = await runAi(net, mem, 0, ai.organize);

    // 발행 시각이 모두 같아 번호 a000~a116 = 순번 t000~t116
    expect(ai.inputs[0].map(l => l.slice(5))).toEqual(REAL().map(a => `[${a.section}] ${a.title}`));
    expect(result).toMatchObject({ ai: { status: 'ok', bundles: 80, excluded: 19, missing: 0 }, issues: 80, requests: 0, code: 0 });
    const count = (section: SectionKey) => mem.issues.filter(i => i.section === section).length;
    expect((['pol', 'eco', 'soc', 'cul', 'wor', 'it'] as const).map(count)).toEqual([15, 13, 19, 8, 14, 11]);

    const t = (n: number) => `https://example.com/t${String(n).padStart(3, '0')}`;
    const issueOf = (n: number) => mem.articles.find(a => a.link === t(n))!.issueId;
    const euljiro = mem.issues.find(i => i.url === t(70))!;
    expect(euljiro).toMatchObject({ section: 'soc', articleCount: 3 });
    expect(mem.articles.filter(a => a.issueId === euljiro.id).map(a => a.link)).toEqual([t(70), t(77), t(78)]);
    expect(mem.articles.find(a => a.link === t(70))!.section).toBe('pol'); // 기사 섹션은 수집 섹션 그대로
    const excluded = [5, 6, 7, 8, 9, 14, 17, 23, 24, 25, 26, 28, 35, 43, 45, 49, 50, 82, 85];
    expect(excluded.map(issueOf)).toEqual(Array(19).fill(null));
    expect(mem.articles.filter(a => a.issueId === null)).toHaveLength(19);
    expect(new Set([38, 39, 40, 48, 99, 107].map(issueOf)).size).toBe(1);
    expect(mem.issues.find(i => i.id === issueOf(38))!.section).toBe('it');
    expect(mem.issues.find(i => i.id === issueOf(10))!.section).toBe('pol');
    expect(mem.issues.find(i => i.id === issueOf(67))!.section).toBe('soc');
    expect(mem.issues.find(i => i.id === issueOf(109))!.section).toBe('pol');
    // 후보 순서: 크기 ↓ → importance ↓ → 시각 ↓ → link ↑(시각이 모두 같음). wor는 모두 1건, importance 4인 t106이 첫 후보
    expect(candidatesOf(result, 'wor')[0]).toMatchObject({ id: issueOf(106), keyword: '트럼프 AND 경유' });
    expect(candidatesOf(result, 'eco').slice(0, 2).map(c => c.id)).toEqual([issueOf(22), issueOf(108)]);
    expect(candidatesOf(result, 'eco')[1].keyword).toBe('(국채금리 OR 장기금리 OR "국채 금리") AND 미국');
  });
});
