// 요약 규칙(summary.ts, D6 · US-04 · AC-04-3): 메모리 저장소 · 가짜 요약 함수로, 네트워크 · DB 없이
// 시각은 setup.ts가 2026-10-07 12:00 KST로 고정
import { describe, expect, it } from 'vitest';
import type { AiReply } from '../server/grouping';
import type { SectionKey } from '../server/ranking';
import { summarizeDay, type Summarize, type SummaryArticle, type SummaryIssue, type SummaryStore } from '../server/summary';

const AI_KEY = 'test-ant-456';
const TODAY = '2026-10-07';
const YESTERDAY = '2026-10-06';

// 그날 pol 7이슈(article_count 70 · 60 … 10, 둘째에 summary 3줄) · eco 1이슈 · 하루 전 soc 1이슈, 이슈마다 기사 2건(하나는 설명문 null)
function memoryStore() {
  const issues: (SummaryIssue & { date: string })[] = [];
  const articles: (SummaryArticle & { issueId: string })[] = [];
  const add = (date: string, section: SectionKey, n: number, articleCount: number, summary: string[] | null = null) => {
    const id = `${date}-${section}-${n}`;
    issues.push({ id, date, section, articleCount, latestPublishedAt: `${YESTERDAY}T12:00:00.000Z`, summary });
    articles.push(
      { issueId: id, title: `${id} 앞 기사`, description: `${id} 설명문`, link: `https://example.com/${id}/a`, publishedAt: `${YESTERDAY}T10:00:00.000Z` },
      { issueId: id, title: `${id} 뒤 기사`, description: null, link: `https://example.com/${id}/b`, publishedAt: `${YESTERDAY}T11:00:00.000Z` },
    );
  };
  for (let n = 1; n <= 7; n++) add(TODAY, 'pol', n, 80 - n * 10, n === 2 ? ['요약 1', '요약 2', '요약 3'] : null);
  add(TODAY, 'eco', 1, 5);
  add(YESTERDAY, 'soc', 1, 50);
  const store: SummaryStore = {
    issues: async date => issues.filter(i => i.date === date).map(({ date: _, ...i }) => ({ ...i })),
    articles: async issueId => articles.filter(a => a.issueId === issueId).map(({ issueId: _, ...a }) => ({ ...a })),
    save: async (issueId, summary) => { issues.find(i => i.id === issueId)!.summary = summary; },
  };
  return { store, issues, articles };
}

// 가짜 요약 함수: 받은 입력을 기록하고 replies를 차례로 씀(다 쓰면 마지막 것). 함수면 입력으로 응답을 만듦(던지면 그대로)
type Make = (input: { title: string; description: string | null }[]) => AiReply<unknown>;
function fakeAi(...replies: Make[]) {
  const inputs: { title: string; description: string | null }[][] = [];
  const summarize: Summarize = async input => { inputs.push(input); return replies[Math.min(inputs.length, replies.length) - 1](input); };
  return { summarize, inputs };
}
// 정상: 입력 첫 기사 제목으로 3줄(앞뒤 공백 · 100자 줄 포함)
const normal: Make = input => ({ refusal: false, output: { line1: `  ${input[0].title} 첫째  `, line2: '둘째 줄', line3: ` ${'가'.repeat(100)} ` } });
const expected = (id: string) => [`${id} 뒤 기사 첫째`, '둘째 줄', '가'.repeat(100)];
const pol = (n: number) => `${TODAY}-pol-${n}`;
const ECO = `${TODAY}-eco-1`;

const run = (mem: ReturnType<typeof memoryStore>, summarize: Summarize | null, max = 30) =>
  summarizeDay({ store: mem.store, summarize, key: AI_KEY, max });
const summaryOf = (mem: ReturnType<typeof memoryStore>, id: string) => mem.issues.find(i => i.id === id)!.summary;

describe('summarize (US-04 · AC-04-3, D6)', () => {
  it('① 정상: 요청 5번(pol 1 · 3 · 4 · 5위 → eco), 입력은 묶인 기사 제목 · 설명문뿐(발행 시각 ↓), 3줄 저장 · 종료 코드 0', async () => {
    const mem = memoryStore();
    const ai = fakeAi(normal);
    const result = await run(mem, ai.summarize);
    if (result.empty) throw new Error('이슈 없음');

    expect(result.results).toEqual([pol(1), pol(3), pol(4), pol(5), ECO].map(id => ({ id, skipped: false, error: null })));
    expect(ai.inputs[0]).toEqual([
      { title: `${pol(1)} 뒤 기사`, description: null },
      { title: `${pol(1)} 앞 기사`, description: `${pol(1)} 설명문` },
    ]);
    for (const id of [pol(1), pol(3), pol(4), pol(5), ECO]) expect(summaryOf(mem, id)).toEqual(expected(id));
    expect(summaryOf(mem, pol(2))).toEqual(['요약 1', '요약 2', '요약 3']);
    expect(summaryOf(mem, pol(6))).toBeNull(); // Top 5 밖
    expect(summaryOf(mem, `${YESTERDAY}-soc-1`)).toBeNull(); // 하루 전 이슈는 대상 아님
    expect(result).toMatchObject({ date: TODAY, targets: 5, requests: 5, succeeded: 5, failed: 0, already: 1, noDescription: 0, code: 0 });
  });

  it('② 거절 · 빈 줄 · 101자 줄 · 키가 든 오류 · 정상 → eco만 저장 · 종료 코드 1, 다시 돌리면 실패한 4개만 요청', async () => {
    const mem = memoryStore();
    const ai = fakeAi(
      () => ({ refusal: true }),
      () => ({ refusal: false, output: { line1: '첫째', line2: '   ', line3: '셋째' } }),
      () => ({ refusal: false, output: { line1: '첫째', line2: '가'.repeat(101), line3: '셋째' } }),
      () => { throw new Error(`401 invalid x-api-key ${AI_KEY}`); },
      normal,
    );
    const result = await run(mem, ai.summarize);
    if (result.empty) throw new Error('이슈 없음');
    expect(result.results.map(r => r.error)).toEqual(['거절', '형식 오류', '형식 오류', '호출 실패: 401 invalid x-api-key ***', null]);
    for (const n of [1, 3, 4, 5]) expect(summaryOf(mem, pol(n))).toBeNull();
    expect(summaryOf(mem, ECO)).toEqual(expected(ECO));
    expect(result).toMatchObject({ targets: 5, requests: 5, succeeded: 1, failed: 4, already: 1, code: 1 });

    const again = await run(mem, fakeAi(normal).summarize);
    if (again.empty) throw new Error('이슈 없음');
    expect(again.results.map(r => r.id)).toEqual([pol(1), pol(3), pol(4), pol(5)]);
    expect(again).toMatchObject({ targets: 4, requests: 4, succeeded: 4, failed: 0, already: 2, code: 0 });
  });

  it('③ --max 2 → 요청 2번(pol 1 · 3위), --max 0 → 0번 · 종료 코드 0, 그날 이슈 없음 → empty', async () => {
    const mem = memoryStore();
    const two = await run(mem, fakeAi(normal).summarize, 2);
    expect(two).toMatchObject({ results: [{ id: pol(1), error: null }, { id: pol(3), error: null }], targets: 5, requests: 2, code: 0 });
    expect(summaryOf(mem, pol(4))).toBeNull();

    const zero = await run(memoryStore(), null, 0);
    expect(zero).toMatchObject({ results: [], targets: 5, requests: 0, succeeded: 0, failed: 0, already: 1, code: 0 });

    const empty = memoryStore();
    empty.issues.splice(0, empty.issues.length, ...empty.issues.filter(i => i.date !== TODAY));
    expect(await run(empty, fakeAi(normal).summarize)).toEqual({ date: TODAY, empty: true });
  });

  it('④ 설명문 없음: 묶인 기사에 설명문이 하나도 없는 이슈는 요청하지 않고 건너뜀(summary null · 실패 아님 · max에 안 듦)', async () => {
    // pol 3위 이슈의 기사 설명문을 모두 null로
    const noDesc = () => {
      const m = memoryStore();
      for (const a of m.articles) if (a.issueId === pol(3)) a.description = null;
      return m;
    };
    const mem = noDesc();
    const ai = fakeAi(normal);
    const result = await run(mem, ai.summarize);
    if (result.empty) throw new Error('이슈 없음');
    expect(result.results).toEqual([
      { id: pol(1), skipped: false, error: null }, { id: pol(3), skipped: true, error: null },
      { id: pol(4), skipped: false, error: null }, { id: pol(5), skipped: false, error: null }, { id: ECO, skipped: false, error: null },
    ]);
    expect(ai.inputs).toHaveLength(4);
    expect(summaryOf(mem, pol(3))).toBeNull();
    expect(result).toMatchObject({ targets: 5, requests: 4, succeeded: 4, failed: 0, noDescription: 1, code: 0 });

    // --max 2: 건너뛴 이슈는 요청 수에 들지 않음 → pol 1 · (3 건너뜀) · 4
    const two = await run(noDesc(), fakeAi(normal).summarize, 2);
    if (two.empty) throw new Error('이슈 없음');
    expect(two.results.map(r => [r.id, r.skipped])).toEqual([[pol(1), false], [pol(3), true], [pol(4), false]]);
    expect(two).toMatchObject({ requests: 2, noDescription: 1, code: 0 });
  });
});
