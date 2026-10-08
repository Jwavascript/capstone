// 이슈 묶기 · 연관기사 수 규칙(D11 · D13 · D15): AI 정리 입력 줄 · 정리 검사 · 대체 · AI 묶음 → 이슈 · 검색어 낱말,
// 낱말 · 흔한 낱말 · 묶기 · 합치기 · 대표 · 대표 낱말 · 후보 · 검색 · 1쪽 검증 · id · 저장(무엇을 지우고 넣을지 정하는 한 곳)
// 환경 변수 · DB를 직접 읽지 않고 fetch · 저장소 · 키 · 검색 수 · 대기 ms · 정리 함수를 받음. 명령은 group.ts, DB 구현은 db/store.ts의 groupStore
import { LATEST, type Fetch } from './newsdata';
import { SECTIONS, type SectionKey } from './ranking';
import { kstToday } from './sample';

// 묶기에 쓰는 그날 기사(규칙은 제목만, AI 정리는 제목 · 설명문 앞 120자). section = 수집 섹션, publishedAt은 ISO 문자열
export type GroupArticle = { section: SectionKey; title: string; description: string | null; link: string; publishedAt: string };
// AI 응답(ai.ts가 만듦, 테스트는 가짜): 거절이거나 구조화 출력(없거나 max_tokens로 끊기면 null). SDK가 던지면 호출 실패
export type AiReply<T> = { refusal: true } | { refusal: false; output: T | null };
// 정리 함수: 입력 줄(`a000 [pol] 제목 | 설명문 앞 120자`) → 묶음 · 섹션 · 제외 · 검색어
export type Organize = (lines: string[]) => Promise<AiReply<unknown>>;
// 저장할 이슈 한 행. summary는 새 id면 null로 넣고, 있던 id면 그대로 둠
export type GroupIssue = {
  id: string; date: string; section: SectionKey; title: string; url: string; articleCount: number; latestPublishedAt: string;
};

// 저장소: DB 구현은 db/store.ts의 groupStore, 테스트는 메모리 구현
export type GroupStore = {
  // 그날 articles(묶인 issue_id 포함) · 그날 issues(id · section · url) · 북마크가 가리키는 그날 이슈의 섹션
  load(date: string): Promise<{
    articles: (GroupArticle & { issueId: string | null })[]; issues: { id: string; section: SectionKey; url: string }[]; bookmarked: SectionKey[];
  }>;
  // 한 트랜잭션: sections마다 그날 이슈 중 issues에 없는 것 지움 → issues 넣기/고치기 → links의 그날 기사 issue_id(섹션 조건 없이 link로, null이면 null)
  // links의 section은 기사의 수집 섹션(DB는 (date, link)가 하나라 쓰지 않음, 메모리 저장소가 같은 link 두 행을 가를 때만 씀)
  save(date: string, sections: SectionKey[], issues: GroupIssue[], links: { section: SectionKey; link: string; issueId: string | null }[]): Promise<void>;
};

// AI 정리 결과(둘째 줄): 안 함(--ai 0) · 정리 성공(고친 뒤 묶음 · 제외 · 빠진 기사 수 · 고친 수) · 실패(이유 = 거절 · 형식 오류: … · 호출 실패: …, 그날 전체를 규칙으로)
export type AiStatus =
  | { status: 'off' }
  | { status: 'ok'; bundles: number; excluded: number; missing: number; fixes: OrganizeFixes }
  | { status: 'failed'; reason: string };

// 후보 한 줄: keyword는 AI 검색어 그대로 또는 '낱말1+낱말2'(대표 낱말이 2개 미만이면 null), note는 검색 성공이면 null, 아니면 '검색 실패: …' · '검색 안 함' · '검색 안 함(크레딧 부족)'
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

const SECTION_KEYS: string[] = SECTIONS.map(s => s.key);
const MAX_QUERY = 512; // AI 검색어 최대 글자 수(코드 포인트, 앞뒤 공백 뺌)

// AI 정리 입력: 기사를 발행 시각 ↓ → link ↑로 세워 번호 a000부터(3자리).
// 한 줄 = `a000 [수집 섹션 키] 제목 | 설명문 앞 120자(코드 포인트)`, 설명문이 null이면 ` | ` 없이 제목만
export function inputLines(articles: GroupArticle[]) {
  const ordered = [...articles].sort(articleOrder);
  const numbers = ordered.map((_, i) => `a${String(i).padStart(3, '0')}`);
  const lines = ordered.map((a, i) => {
    const desc = a.description === null ? '' : ` | ${[...a.description].slice(0, 120).join('').replace(/\s+/g, ' ')}`;
    return `${numbers[i]} [${a.section}] ${a.title}${desc}`;
  });
  return { ordered, numbers, lines };
}

type RawIssue = { section: string; articles: string[]; importance: unknown; terms: string[][] };
// 고친 뒤 AI 묶음. terms = 앞 2묶음 · 묶음마다 빈 말을 뺀 앞 3개(빈 묶음이 있거나 0묶음이면 검색어는 ex07 대표 낱말), importance = 1~5 정수
type AiIssue = { section: SectionKey; articles: string[]; importance: number; terms: string[][] };
// 고친 수: 중복 번호 · 없는 번호 · 빈 묶음 · 검색어(빈 말만 남아 ex07 대표 낱말로 바꾼 이슈) · terms(묶음 수 · 말 수를 자른 이슈) · importance(바꾼 이슈)
export type OrganizeFixes = { duplicate: number; unknown: number; empty: number; query: number; terms: number; importance: number };
const isStrings = (x: unknown): x is string[] => Array.isArray(x) && x.every(s => typeof s === 'string');
// 모양(zod 스키마와 같음, 길이 · 범위 제약 없음): section 문자열 · articles 문자열 배열 · terms 문자열 배열의 배열(importance는 아래에서 고침)
const isRawIssue = (x: unknown): x is RawIssue => {
  const i = x as RawIssue;
  return !!x && typeof x === 'object' && typeof i.section === 'string' && isStrings(i.articles)
    && Array.isArray(i.terms) && i.terms.every(isStrings);
};

// 정리 검사: 먼저 출력을 고쳐 씀 → ① 없는 번호는 버림 ② 같은 번호는 처음 나온 곳(묶음 순서대로, 그다음 제외)만 남김
// ③ 그 결과 빈 묶음은 버림 ④ terms의 빈 말(앞뒤 공백을 빼고 빈 것)은 버림(빈 묶음이 남으면 그 이슈 검색어는 ex07 대표 낱말)
// ⑤ terms는 앞 2묶음 · 묶음마다 앞 3개만, importance는 반올림해 1~5로 자름(숫자가 아니면 1)
// 그다음 형식 오류(이유 문구): 모양이 다름 · 섹션 xx · 묶음 없음(고친 뒤 0개). 통과하면 묶음 · 제외 · 고친 수
export function checkOrganize(output: unknown, numbers: string[]):
  { issues: AiIssue[]; excluded: string[]; fixes: OrganizeFixes } | string {
  const o = output as { issues?: unknown; excluded?: unknown } | null;
  if (!o || typeof o !== 'object' || !Array.isArray(o.issues) || !o.issues.every(isRawIssue) || !isStrings(o.excluded)) return '모양이 다름';
  const fixes: OrganizeFixes = { duplicate: 0, unknown: 0, empty: 0, query: 0, terms: 0, importance: 0 };
  const known = new Set(numbers);
  const seen = new Set<string>();
  const keep = (list: string[]) => list.filter(n => {
    if (!known.has(n)) { fixes.unknown++; return false; }
    if (seen.has(n)) { fixes.duplicate++; return false; }
    seen.add(n);
    return true;
  });
  const issues: RawIssue[] = [];
  for (const i of o.issues as RawIssue[]) {
    const articles = keep(i.articles);
    if (articles.length === 0) { fixes.empty++; continue; }
    issues.push({ ...i, articles });
  }
  const excluded = keep(o.excluded);
  for (const i of issues) if (!SECTION_KEYS.includes(i.section)) return `섹션 ${i.section}`;
  if (issues.length === 0) return '묶음 없음';
  return {
    issues: issues.map(i => {
      const cleaned = i.terms.map(g => g.map(w => w.trim()).filter(w => w !== ''));
      const terms = cleaned.slice(0, 2).map(g => g.slice(0, 3));
      if (cleaned.length > 2 || terms.some((g, k) => g.length < cleaned[k].length)) fixes.terms++;
      if (terms.length === 0 || terms.some(g => g.length === 0)) fixes.query++;
      const n = i.importance;
      const importance = typeof n === 'number' && Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 1;
      if (importance !== n) fixes.importance++;
      return { section: i.section as SectionKey, articles: i.articles, importance, terms };
    }),
    excluded,
    fixes,
  };
}

// 검색어 조립: 묶음마다 `(A1 OR A2) AND (B1 OR B2)`, 띄어쓰기가 있는 말은 "…", 말이 하나면 괄호 없이.
// 1묶음뿐이면 그 묶음만(`A1 OR A2`, 말이 하나면 그 말). 512자(코드 포인트) 넘으면 각 묶음의 첫 말만(`A1 AND B1`).
// 0묶음이거나 빈 묶음이 있으면 null(ex07 대표 낱말을 씀)
export function buildQuery(terms: string[][]): string | null {
  const groups = terms.map(g => g.map(w => w.trim()).filter(w => w !== '').map(w => (/\s/.test(w) ? `"${w}"` : w)));
  if (groups.length === 0 || groups.some(g => g.length === 0)) return null;
  const query = groups.length === 1
    ? groups[0].join(' OR ')
    : groups.map(g => (g.length === 1 ? g[0] : `(${g.join(' OR ')})`)).join(' AND ');
  return [...query].length > MAX_QUERY ? groups.map(g => g[0]).join(' AND ') : query;
}

// 묶음 하나 + 섹션 · importance(규칙 경로 · 빠진 기사는 0) · 검색 요청어(query, null이면 검색 안 함)
// · 후보 줄 검색어 칸(label) · 1쪽 검증에서 뺄 검색어 낱말(checkWords)
type Draft = Bundle & { section: SectionKey; importance: number; query: string | null; label: string | null; checkWords: string[] };
// 규칙 묶음(ex07): 대표 낱말 2개 → `낱말1 AND 낱말2`, 칸은 `낱말1+낱말2`(2개 미만이면 검색 안 함)
const ruleDraft = (section: SectionKey, b: Bundle, importance = 0): Draft => ({
  ...b, section, importance,
  query: b.keywords.length === 2 ? `${b.keywords[0]} AND ${b.keywords[1]}` : null,
  label: b.keywords.length === 2 ? b.keywords.join('+') : null,
  checkWords: b.keywords,
});
// AI 묶음: 섹션 · importance = AI 값, 검색어 = terms를 조립한 것(칸도 같음), 검증에서 뺄 낱말 = terms의 말을 낱말 규칙으로 뽑은 것.
// 빈 말만 있는 묶음이 있으면 ex07 대표 낱말
const aiDraft = (issue: AiIssue, members: GroupArticle[]): Draft => {
  const query = buildQuery(issue.terms);
  if (query === null) return ruleDraft(issue.section, toBundle(members), issue.importance);
  return {
    ...toBundle(members), section: issue.section, importance: issue.importance,
    query, label: query,
    checkWords: issue.terms.flat().flatMap(words),
  };
};

// AI 묶음 후보 순서: 크기 ↓ → importance ↓ → 가장 늦은 발행 시각 ↓ → 대표 link ↑
const draftOrder = (a: Draft, b: Draft) =>
  b.members.length - a.members.length || b.importance - a.importance
  || Date.parse(b.latestPublishedAt) - Date.parse(a.latestPublishedAt) || cmp(a.rep.link, b.rep.link);

// AI 정리: 입력 줄 → 정리 함수 → 검사(고쳐 쓰기 포함). 통과하면 AI 묶음 + 빠진 번호(수집 섹션 단독, 검색어는 ex07 대표 낱말), 아니면 실패 이유
async function organizeDay(input: GroupArticle[], organize: Organize, hide: (text: string) => string):
  Promise<{ drafts: Draft[]; status: AiStatus } | { reason: string }> {
  const { ordered, numbers, lines } = inputLines(input);
  let reply: Awaited<ReturnType<Organize>>;
  try {
    reply = await organize(lines);
  } catch (err) {
    return { reason: `호출 실패: ${hide(err instanceof Error ? err.message : String(err))}` };
  }
  if (reply.refusal) return { reason: '거절' };
  const checked = checkOrganize(reply.output, numbers);
  if (typeof checked === 'string') return { reason: `형식 오류: ${checked}` };
  const byNumber = new Map(numbers.map((n, i) => [n, ordered[i]]));
  const used = new Set([...checked.issues.flatMap(i => i.articles), ...checked.excluded]);
  const missing = ordered.filter((_, i) => !used.has(numbers[i]));
  const drafts = [
    ...checked.issues.map(i => aiDraft(i, i.articles.map(n => byNumber.get(n)!))),
    ...missing.map(a => ruleDraft(a.section, toBundle([a]))),
  ];
  return {
    drafts,
    status: { status: 'ok', bundles: checked.issues.length, excluded: checked.excluded.length, missing: missing.length, fixes: checked.fixes },
  };
}

// 한 번 묶기: 그날 기사 · 이슈 · 북마크 섹션 읽기 → (organize가 있으면) AI 정리, 실패하거나 없으면 ex07 규칙으로 섹션마다 묶기
// → 섹션마다 id → 섹션 pol→it, 후보 순서대로 검색(하나씩, 사이 waitMs) → 한 트랜잭션에 저장
// search = 섹션마다 앞 몇 개 후보만 검색(0~6). 북마크가 가리키는 이슈가 있는 섹션은 건너뜀(그 섹션 이슈 · 묶인 기사 그대로 · 검색 안 함)
// 묶기 입력 = 그날 기사 중 건너뛴 섹션 이슈에 묶인 기사를 뺀 것. aiKey는 AI 실패 문구에서 ***로 가림
// 반환: 그날 기사가 하나도 없으면 empty, 아니면 AI 결과 · 섹션 결과 · 저장한 이슈 수 · 요청 수 · 실패 수 · 마지막 x-api-limit-remaining · 종료 코드(0 · 1)
export async function group({ fetch, store, key, search, waitMs, organize = null, aiKey = '' }: {
  fetch: Fetch; store: GroupStore; key: string; search: number; waitMs: number; organize?: Organize | null; aiKey?: string;
}) {
  const date = kstToday();
  const day = await store.load(date);
  if (day.articles.length === 0) return { date, empty: true as const };
  const hide = (text: string) => [key, aiKey].filter(Boolean).reduce((t, secret) => t.replaceAll(secret, '***'), text); // 실패 문구의 키 값은 ***

  const skippedIds = new Set(day.issues.filter(i => day.bookmarked.includes(i.section)).map(i => i.id));
  const input: GroupArticle[] = day.articles
    .filter(a => !(a.issueId && skippedIds.has(a.issueId)))
    .map(({ section, title, description, link, publishedAt }) => ({ section, title, description, link, publishedAt }));

  // AI 정리(D15). 거절 · 형식 오류 · 호출 실패면 그날 전체를 규칙으로(섞지 않음)
  let ai: AiStatus = { status: 'off' };
  let aiDrafts: Draft[] | null = null;
  if (organize) {
    const r = await organizeDay(input, organize, hide);
    if ('drafts' in r) { aiDrafts = r.drafts; ai = r.status; } else ai = { status: 'failed', reason: r.reason };
  }

  // 섹션마다 묶음 · id. 그날 그 섹션에 url이 대표 link와 같은 이슈가 있으면 그 id(summary도 유지), 없으면 그 섹션 기존 번호 최대 + 1부터 세운 순서대로
  // AI 경로: 건너뛴 섹션으로 간 묶음은 버리고, 나머지 섹션은 묶음이 0개여도 저장(그날 이슈를 지움)
  // 규칙 경로(ex07): 섹션마다 묶기 입력 중 그 수집 섹션 기사로 묶음, 기사가 없는 섹션은 건너뜀
  const common = commonWords(day.articles); // 흔한 낱말은 그날 모든 섹션 기사로
  type Planned = Draft & { id: string; articleCount: number; note: string | null };
  type Plan = { section: SectionKey; skipped: '기사 없음' | '북마크 있음' } | { section: SectionKey; articles: number; bundles: Planned[] };
  const plans = SECTIONS.map(({ key: section }): Plan => {
    if (day.bookmarked.includes(section)) return { section, skipped: '북마크 있음' };
    let drafts: Draft[];
    if (aiDrafts) drafts = aiDrafts.filter(d => d.section === section).sort(draftOrder);
    else {
      const mine = input.filter(a => a.section === section);
      if (mine.length === 0) return { section, skipped: '기사 없음' };
      drafts = bundle(mine, common).map(b => ruleDraft(section, b));
    }
    const existing = day.issues.filter(i => i.section === section);
    let no = Math.max(0, ...existing.map(i => Number(i.id.slice(i.id.lastIndexOf('-') + 1))));
    const bundles = drafts.map((d): Planned => ({
      ...d,
      id: existing.find(i => i.url === d.rep.link)?.id ?? `${date}-${section}-${++no}`,
      articleCount: d.members.length,
      note: null,
    }));
    return { section, articles: bundles.reduce((n, b) => n + b.members.length, 0), bundles };
  });

  // 검색(D13): 후보 = 섹션마다 앞 6개, 그중 앞 search개만. 검색어를 제목에서 검색(qInTitle, 1쪽만)
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
      if (i >= search || b.query === null) { b.note = '검색 안 함'; continue; }
      if (creditOut) { b.note = '검색 안 함(크레딧 부족)'; shortage = true; continue; }
      if (requests++ > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
      let res: Response;
      try {
        res = await fetch(`${LATEST}?country=kr&language=ko&removeduplicate=1&qInTitle=${encodeURIComponent(b.query)}`, { headers: { 'X-ACCESS-KEY': key } });
      } catch (err) {
        b.note = `검색 실패: ${hide(err instanceof Error ? err.message : String(err))}`;
        failed++;
        continue;
      }
      remaining = res.headers.get('x-api-limit-remaining') ?? remaining;
      if (res.status === 429 || res.headers.get('x-api-limit-remaining') === '0') creditOut = true;
      const body = await res.json().catch(() => null);
      if (res.status === 200 && body?.status === 'success' && Number.isInteger(body.totalResults) && body.totalResults >= 0) {
        b.articleCount = relatedCount(b.members.map(a => a.title), b.checkWords, body, b.members.length);
      } else {
        const detail = typeof body?.results?.message === 'string' ? ` ${body.results.message}` : '';
        b.note = `검색 실패: ${hide(`HTTP ${res.status}${detail}`)}`;
        failed++;
      }
    }
  }

  // 저장: 묶은 섹션만(건너뛴 섹션 · 다른 날짜는 그대로). 기사 issue_id는 묶기 입력 기사마다 link로, 이슈가 없으면(제외 · 버린 묶음) null
  const grouped = plans.flatMap(p => ('bundles' in p ? [p] : []));
  const issues = grouped.flatMap(p => p.bundles.map((b): GroupIssue => ({
    id: b.id, date, section: p.section, title: b.rep.title, url: b.rep.link,
    articleCount: b.articleCount, latestPublishedAt: b.latestPublishedAt,
  })));
  const issueOf = new Map(grouped.flatMap(p => p.bundles.flatMap(b => b.members.map(a => [a, b.id] as const))));
  const links = input.map(a => ({ section: a.section, link: a.link, issueId: issueOf.get(a) ?? null }));
  await store.save(date, grouped.map(p => p.section), issues, links);

  const sections = plans.map((p): SectionResult => ('bundles' in p
    ? {
      section: p.section, articles: p.articles, issues: p.bundles.length,
      candidates: p.bundles.slice(0, CANDIDATES).map(b => ({ id: b.id, keyword: b.label, articleCount: b.articleCount, size: b.members.length, note: b.note })),
    }
    : p));
  const code = failed > 0 || shortage || ai.status === 'failed' ? 1 : 0;
  return { date, empty: false as const, ai, sections, issues: issues.length, requests, failed, remaining, code };
}

