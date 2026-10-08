// 이슈 묶기 · 연관기사 수 규칙(D11 · D13): 낱말 · 흔한 낱말 · 묶기 · 합치기 · 대표 · 대표 낱말 · 후보 · 검색 · 1쪽 검증 · id · 저장(무엇을 지우고 넣을지 정하는 한 곳)
// 환경 변수 · DB를 직접 읽지 않고 fetch · 저장소 · 키 · 검색 수 · 대기 ms를 받음. 명령은 group.ts, DB 구현은 db/store.ts의 groupStore
import { LATEST, type Fetch } from './newsdata';
import { SECTIONS, type SectionKey } from './ranking';
import { kstToday } from './sample';

// 묶기에 쓰는 그날 기사(제목만 씀, 설명문은 null이 많음). publishedAt은 ISO 문자열
export type GroupArticle = { section: SectionKey; title: string; link: string; publishedAt: string };
// 저장할 이슈 한 행. summary는 새 id면 null로 넣고, 있던 id면 그대로 둠
export type GroupIssue = {
  id: string; date: string; section: SectionKey; title: string; url: string; articleCount: number; latestPublishedAt: string;
};

// 저장소: DB 구현은 db/store.ts의 groupStore, 테스트는 메모리 구현
export type GroupStore = {
  // 그날 articles · 그날 issues(id · section · url) · 북마크가 가리키는 그날 이슈의 섹션
  load(date: string): Promise<{ articles: GroupArticle[]; issues: { id: string; section: SectionKey; url: string }[]; bookmarked: SectionKey[] }>;
  // 한 트랜잭션: sections마다 그날 이슈 중 issues에 없는 것 지움 → issues 넣기/고치기 → 그날 그 섹션 기사의 issue_id(link로 이음)
  save(date: string, sections: SectionKey[], issues: GroupIssue[], links: { section: SectionKey; link: string; issueId: string }[]): Promise<void>;
};

// 후보 한 줄: keyword는 '낱말1+낱말2'(대표 낱말이 2개 미만이면 null), note는 검색 성공이면 null, 아니면 '검색 실패: …' · '검색 안 함' · '검색 안 함(크레딧 부족)'
export type CandidateLine = { id: string; keyword: string | null; articleCount: number; size: number; note: string | null };
export type SectionResult =
  | { section: SectionKey; skipped: '기사 없음' | '북마크 있음' }
  | { section: SectionKey; articles: number; issues: number; candidates: CandidateLine[] };

const CANDIDATES = 6; // 섹션마다 검색 후보 수(D13)
// 불용어 19개: 이것으로 시작하는 덩어리는 버림
const STOPWORDS = ['오늘', '내일', '어제', '단독', '속보', '종합', '포토', '영상', '사진', '이슈',
  '정부', '대통령', '주가', '상승', '하락', '이유', '경찰', '수사', '인근'];
// 대표 낱말을 고를 때 3글자 이상이고 이 글자로 끝나면 뒤로(지우지는 않음)
const ENDINGS = ['은', '는', '이', '가', '을', '를', '에', '의', '도', '로', '와', '과'];

// 같은 낱말 = 앞부분 일치(한쪽이 다른 쪽으로 시작). 낱말은 늘 2글자 이상
export const same = (a: string, b: string) => a.startsWith(b) || b.startsWith(a);
const has = (list: string[], w: string) => list.some(x => same(x, w));
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// 제목 → 낱말: 소문자 제목의 [가-힣a-z0-9]+ 덩어리(한자 · 기호 · 공백은 끊음, 조사를 떼지 않음).
// 1글자 · 숫자만 · 불용어로 시작하는 덩어리는 버리고, 한 제목에 같은 낱말은 앞의 하나만
export function words(title: string): string[] {
  const out: string[] = [];
  for (const w of title.toLowerCase().match(/[가-힣a-z0-9]+/g) ?? []) {
    if (w.length < 2 || /^[0-9]+$/.test(w) || STOPWORDS.some(s => w.startsWith(s)) || has(out, w)) continue;
    out.push(w);
  }
  return out;
}

// 흔한 낱말 = 그날 기사(모든 섹션) 중 3개 섹션 이상의 제목에 같은 낱말이 있는 낱말 → 묶기의 공통 낱말로 안 셈
export function commonWords(articles: GroupArticle[]): Set<string> {
  const bySection = new Map<SectionKey, string[]>();
  for (const a of articles) bySection.set(a.section, [...(bySection.get(a.section) ?? []), ...words(a.title)]);
  const lists = [...bySection.values()];
  return new Set(lists.flat().filter(w => lists.filter(ws => has(ws, w)).length >= 3));
}

// 공통 낱말 수 = 상대에 같은 낱말이 있는 낱말 수를 양쪽에서 세어 작은 값
const shared = (a: string[], b: string[]) => Math.min(a.filter(w => has(b, w)).length, b.filter(w => has(a, w)).length);

export type Bundle = { members: GroupArticle[]; rep: GroupArticle; keywords: string[]; latestPublishedAt: string };

// 기사 순서 = 발행 시각 ↓ → link ↑, 묶음 순서 = 크기 ↓ → 가장 늦은 발행 시각 ↓ → 대표 link ↑
const articleOrder = (a: GroupArticle, b: GroupArticle) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || cmp(a.link, b.link);
const bundleOrder = (a: Bundle, b: Bundle) =>
  b.members.length - a.members.length || Date.parse(b.latestPublishedAt) - Date.parse(a.latestPublishedAt) || cmp(a.rep.link, b.rep.link);

// 대표 낱말(검색어) 2개: 대표 제목 낱말 중 숫자가 든 것을 빼고 묶음에서 같은 낱말이 든 제목 수 ↓ → 끝 글자가 조사 같은 3글자 이상은 뒤로
// → 대표 제목에서 먼저 나온 것. 꼴 = 묶음 제목 낱말 중 같은 낱말인 가장 짧은 것(같은 길이면 대표 제목 꼴), 앞서 고른 것과 같으면 건너뜀
function keywordsOf(members: GroupArticle[]): string[] {
  const titleWords = members.map(m => words(m.title));
  const pool = titleWords.flat();
  const count = (w: string) => titleWords.filter(ws => has(ws, w)).length;
  const late = (w: string) => Number(w.length >= 3 && ENDINGS.includes(w.at(-1)!));
  const ranked = titleWords[0].filter(w => !/[0-9]/.test(w)).map((w, i) => ({ w, i }))
    .sort((a, b) => count(b.w) - count(a.w) || late(a.w) - late(b.w) || a.i - b.i);
  const out: string[] = [];
  for (const { w } of ranked) {
    if (out.length === 2) break;
    const form = pool.filter(x => same(x, w)).reduce((s, x) => (x.length < s.length ? x : s), w);
    if (has(out, w) || has(out, form)) continue;
    out.push(form);
  }
  return out;
}

// 기사(같은 순서로 세운 것) → 묶음. 대표 = 첫 기사(가장 늦게 발행), 가장 늦은 시각 = 대표 기사 시각
function toBundle(members: GroupArticle[]): Bundle {
  const sorted = [...members].sort(articleOrder);
  return { members: sorted, rep: sorted[0], keywords: keywordsOf(sorted), latestPublishedAt: new Date(Date.parse(sorted[0].publishedAt)).toISOString() };
}

// 합치기 조건: ① 대표 낱말 2개 중 1개 이상이 같음 ② 나머지 대표 낱말이 서로 상대 묶음 낱말에 있음(2개 모두 같으면 성립)
function mergeable(ka: string[], wa: string[], kb: string[], wb: string[]) {
  if (ka.length < 2 || kb.length < 2) return false;
  for (const i of [0, 1]) {
    for (const j of [0, 1]) {
      if (!same(ka[i], kb[j])) continue;
      const ra = ka[1 - i];
      const rb = kb[1 - j];
      if (same(ra, rb) || (has(wb, ra) && has(wa, rb))) return true;
    }
  }
  return false;
}

// 한 섹션의 기사 → 묶음(D11). 줄줄이 잇지 않음: 기사 순서대로, 대표 제목과 공통 낱말(흔한 낱말 뺌) 2개 이상인 묶음 중
// 가장 많은 것(같으면 먼저 만든 것)에 넣고, 없으면 새 묶음. 그 뒤 합치기 한 번(조건은 합치기 전 대표 낱말 · 묶음 낱말로)
// 반환 순서 = 크기 ↓ → 가장 늦은 발행 시각 ↓ → 대표 link ↑
export function bundle(articles: GroupArticle[], common: Set<string> = new Set()): Bundle[] {
  const groups: { repWords: string[]; members: GroupArticle[] }[] = [];
  for (const a of [...articles].sort(articleOrder)) {
    const ws = words(a.title).filter(w => !common.has(w));
    let best: (typeof groups)[number] | undefined;
    let bestCount = 1;
    for (const g of groups) {
      const n = shared(g.repWords, ws);
      if (n > bestCount) { best = g; bestCount = n; }
    }
    if (best) best.members.push(a);
    else groups.push({ repWords: ws, members: [a] });
  }

  const list = groups.map(g => toBundle(g.members)).sort(bundleOrder);
  const bundleWords = list.map(b => b.members.flatMap(m => words(m.title)));
  const into = list.map((_, i) => i); // 합쳐 들어간 앞 묶음 번호(자기 자신이면 남음)
  for (let j = 1; j < list.length; j++) {
    const i = list.findIndex((a, k) => k < j && into[k] === k && mergeable(a.keywords, bundleWords[k], list[j].keywords, bundleWords[j]));
    if (i >= 0) into[j] = i;
  }
  return list
    .flatMap((b, i) => (into[i] === i ? [toBundle(list.flatMap((x, k) => (into[k] === i ? x.members : [])))] : []))
    .sort(bundleOrder);
}

// 1쪽 검증(D13): 1쪽 결과 제목마다 낱말을 뽑아, 묶음 낱말(두 검색어와 같은 낱말은 뺌)과 같은 낱말이 1개 이상이면 관련.
// p = 관련 수 / 1쪽 결과 수(0건이면 0) → max(round(totalResults × p), 묶음 크기)
export function relatedCount(titles: string[], keywords: string[], body: { totalResults: number; results?: unknown }, size: number) {
  const own = titles.flatMap(words).filter(w => !has(keywords, w));
  const page: unknown[] = Array.isArray(body.results) ? body.results : [];
  const title = (r: unknown) => (r && typeof (r as { title?: unknown }).title === 'string' ? (r as { title: string }).title : '');
  const related = page.filter(r => words(title(r)).some(w => has(own, w))).length;
  const p = page.length > 0 ? related / page.length : 0;
  return Math.max(Math.round(body.totalResults * p), size);
}

// 한 번 묶기: 그날 기사 · 이슈 · 북마크 섹션 읽기 → 섹션마다 묶기 · id → 섹션 pol→it, 후보 순서대로 검색(하나씩, 사이 waitMs) → 한 트랜잭션에 저장
// search = 섹션마다 앞 몇 개 후보만 검색(0~6). 북마크가 가리키는 이슈가 있는 섹션 · 기사 없는 섹션은 건너뜀(이슈 · 기사 issue_id 그대로)
// 반환: 그날 기사가 하나도 없으면 empty, 아니면 섹션 결과 · 저장한 이슈 수 · 요청 수 · 실패 수 · 마지막 x-api-limit-remaining · 종료 코드(0 · 1)
export async function group({ fetch, store, key, search, waitMs }: {
  fetch: Fetch; store: GroupStore; key: string; search: number; waitMs: number;
}) {
  const date = kstToday();
  const day = await store.load(date);
  if (day.articles.length === 0) return { date, empty: true as const };
  const common = commonWords(day.articles); // 흔한 낱말은 그날 모든 섹션 기사로
  const hide = (text: string) => (key ? text.replaceAll(key, '***') : text); // 실패 문구에 키 값이 섞이면 ***

  // 섹션마다 묶음 · id. 그날 그 섹션에 url이 대표 link와 같은 이슈가 있으면 그 id(summary도 유지), 없으면 그 섹션 기존 번호 최대 + 1부터 세운 순서대로
  type Plan =
    | { section: SectionKey; skipped: '기사 없음' | '북마크 있음' }
    | { section: SectionKey; articles: number; bundles: (Bundle & { id: string; articleCount: number; note: string | null })[] };
  const plans = SECTIONS.map(({ key: section }): Plan => {
    const mine = day.articles.filter(a => a.section === section);
    if (mine.length === 0) return { section, skipped: '기사 없음' };
    if (day.bookmarked.includes(section)) return { section, skipped: '북마크 있음' };
    const existing = day.issues.filter(i => i.section === section);
    let no = Math.max(0, ...existing.map(i => Number(i.id.slice(i.id.lastIndexOf('-') + 1))));
    const bundles = bundle(mine, common).map(b => ({
      ...b,
      id: existing.find(i => i.url === b.rep.link)?.id ?? `${date}-${section}-${++no}`,
      articleCount: b.members.length,
      note: null,
    }));
    return { section, articles: mine.length, bundles };
  });

  // 검색(D13): 후보 = 섹션마다 앞 6개, 그중 앞 search개만. 대표 낱말 2개를 제목에서 AND 검색(qInTitle, 1쪽만)
  // 성공(HTTP 200 · status success · totalResults 0 이상 정수) → 1쪽 검증으로 max(round(totalResults × p), 묶음 크기)
  // 실패 · 검색 안 함 · 후보 밖은 묶음 크기. HTTP 429나 x-api-limit-remaining 0을 받으면 남은 후보는 검색 안 함(크레딧 부족)
  let requests = 0;
  let failed = 0;
  let creditOut = false;
  let shortage = false;
  let remaining: string | null = null;
  for (const plan of plans) {
    if (!('bundles' in plan)) continue;
    for (const [i, b] of plan.bundles.slice(0, CANDIDATES).entries()) {
      if (i >= search || b.keywords.length < 2) { b.note = '검색 안 함'; continue; }
      if (creditOut) { b.note = '검색 안 함(크레딧 부족)'; shortage = true; continue; }
      if (requests++ > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
      let res: Response;
      try {
        res = await fetch(`${LATEST}?country=kr&language=ko&removeduplicate=1&qInTitle=${encodeURIComponent(`${b.keywords[0]} AND ${b.keywords[1]}`)}`, { headers: { 'X-ACCESS-KEY': key } });
      } catch (err) {
        b.note = `검색 실패: ${hide(err instanceof Error ? err.message : String(err))}`;
        failed++;
        continue;
      }
      remaining = res.headers.get('x-api-limit-remaining') ?? remaining;
      if (res.status === 429 || res.headers.get('x-api-limit-remaining') === '0') creditOut = true;
      const body = await res.json().catch(() => null);
      if (res.status === 200 && body?.status === 'success' && Number.isInteger(body.totalResults) && body.totalResults >= 0) {
        b.articleCount = relatedCount(b.members.map(a => a.title), b.keywords, body, b.members.length);
      } else {
        const detail = typeof body?.results?.message === 'string' ? ` ${body.results.message}` : '';
        b.note = `검색 실패: ${hide(`HTTP ${res.status}${detail}`)}`;
        failed++;
      }
    }
  }

  // 저장: 묶은 섹션만(건너뛴 섹션 · 다른 날짜는 그대로)
  const grouped = plans.flatMap(p => ('bundles' in p ? [p] : []));
  const issues = grouped.flatMap(p => p.bundles.map((b): GroupIssue => ({
    id: b.id, date, section: p.section, title: b.rep.title, url: b.rep.link,
    articleCount: b.articleCount, latestPublishedAt: b.latestPublishedAt,
  })));
  const links = grouped.flatMap(p => p.bundles.flatMap(b => b.members.map(a => ({ section: p.section, link: a.link, issueId: b.id }))));
  await store.save(date, grouped.map(p => p.section), issues, links);

  const sections = plans.map((p): SectionResult => ('bundles' in p
    ? {
      section: p.section, articles: p.articles, issues: p.bundles.length,
      candidates: p.bundles.slice(0, CANDIDATES).map(b => ({ id: b.id, keyword: b.keywords.length === 2 ? b.keywords.join('+') : null, articleCount: b.articleCount, size: b.members.length, note: b.note })),
    }
    : p));
  return { date, empty: false as const, sections, issues: issues.length, requests, failed, remaining, code: failed > 0 || shortage ? 1 : 0 };
}
