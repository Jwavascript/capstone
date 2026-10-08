import { describe, expect, it } from 'vitest';
import { buildRanking, rankIssues, type IssueRow, type SectionKey } from '../server/ranking';

const AT_03 = '2026-10-07T03:00:00+09:00';

// 동점 후보: c2 · c3 · c4는 80건, c4는 UTC 표기(= KST 06:00)라 문자열로 비교하면 가장 이르게 보임
const TIED = [
  { id: 'c1', articleCount: 120, latestPublishedAt: AT_03 },
  { id: 'c2', articleCount: 80, latestPublishedAt: '2026-10-07T05:10:00+09:00' },
  { id: 'c3', articleCount: 80, latestPublishedAt: '2026-10-07T05:40:00+09:00' },
  { id: 'c4', articleCount: 80, latestPublishedAt: '2026-10-06T21:00:00Z' },
  { id: 'c5', articleCount: 30, latestPublishedAt: AT_03 },
  { id: 'c6', articleCount: 30, latestPublishedAt: AT_03 },
  { id: 'c7', articleCount: 10, latestPublishedAt: AT_03 },
];

const FEW = [
  { id: 'a', articleCount: 5, latestPublishedAt: AT_03 },
  { id: 'b', articleCount: 50, latestPublishedAt: AT_03 },
  { id: 'c', articleCount: 20, latestPublishedAt: AT_03 },
];

describe('rankIssues', () => {
  it('동점: 연관기사 수 ↓ → 발행 시각(시각으로 비교) ↓ → id ↑, 앞 5개에 rank 1~5 (AC-03-2)', () => {
    const expected = [
      { id: 'c1', rank: 1 }, { id: 'c4', rank: 2 }, { id: 'c3', rank: 3 }, { id: 'c2', rank: 4 }, { id: 'c5', rank: 5 },
    ];
    for (const input of [TIED, [...TIED].reverse()]) {
      const ranked = rankIssues(input);
      expect(ranked.map(({ id, rank }) => ({ id, rank }))).toEqual(expected);
      expect(ranked.map(x => x.id)).not.toContain('c6');
      expect(ranked.map(x => x.id)).not.toContain('c7');
    }
  });

  it('두 자리 번호: 같은 건수 · 시각이면 id 자연 순서(-9가 -10보다 위)', () => {
    const pair = [
      { id: '2026-10-07-pol-10', articleCount: 50, latestPublishedAt: AT_03 },
      { id: '2026-10-07-pol-9', articleCount: 50, latestPublishedAt: AT_03 },
    ];
    for (const input of [pair, [...pair].reverse()]) {
      expect(rankIssues(input).map(x => x.id)).toEqual(['2026-10-07-pol-9', '2026-10-07-pol-10']);
    }
  });

  it('적은 후보: 3개면 3개, rank 1~3', () => {
    const ranked = rankIssues(FEW);
    expect(ranked.map(({ id, rank }) => ({ id, rank }))).toEqual([
      { id: 'b', rank: 1 }, { id: 'c', rank: 2 }, { id: 'a', rank: 3 },
    ]);
  });
});

// 이슈 행 하나(랭킹 후보)
const row = (date: string, section: SectionKey, n: number, articleCount: number): IssueRow => ({
  id: `${date}-${section}-${n}`, date, section, title: `${section} ${n}`, summary: null, articleCount,
  url: `https://example.com/${date}-${section}-${n}`, latestPublishedAt: `${date}T03:00:00+09:00`,
});
const KEYS: SectionKey[] = ['pol', 'eco', 'soc', 'cul', 'wor', 'it'];

describe('buildRanking (D8 · AC-05-1)', () => {
  // 10-06: 6섹션 1행씩, 10-07: pol 6행(60 · 50 · 40 · 30 · 20 · 10)
  const ROWS = [
    ...KEYS.map(k => row('2026-10-06', k, 1, 10)),
    ...[60, 50, 40, 30, 20, 10].map((count, i) => row('2026-10-07', 'pol', i + 1, count)),
  ];

  it('⑦ D8: 그날 이슈가 없는 섹션만 직전 날짜의 Top 5(id · date는 그 날짜), 그날 행이 없으면 null', () => {
    for (const rows of [ROWS, [...ROWS].reverse()]) {
      const ranking = buildRanking('2026-10-07', rows)!;
      expect(ranking.date).toBe('2026-10-07');
      const pol = ranking.sections.find(s => s.key === 'pol')!.issues;
      expect(pol.map(x => [x.id, x.rank, x.articleCount, x.date])).toEqual(
        [1, 2, 3, 4, 5].map(n => [`2026-10-07-pol-${n}`, n, 70 - n * 10, '2026-10-07']));
      for (const s of ranking.sections.filter(x => x.key !== 'pol')) {
        expect(s.issues.map(x => [x.id, x.date, x.rank])).toEqual([[`2026-10-06-${s.key}-1`, '2026-10-06', 1]]);
      }
    }
    expect(buildRanking('2026-10-07', ROWS.filter(r => r.date === '2026-10-06'))).toBeNull();
  });

  it('⑧ updatedAt: 그날 ok 실행의 가장 늦은 finished_at(KST, 초 아래 버림), ok가 없으면 06:00', () => {
    const runs = [
      { status: 'ok', finishedAt: '2026-10-06T21:03:05.123Z' },
      { status: 'failed', finishedAt: '2026-10-06T22:00:00Z' },
    ];
    expect(buildRanking('2026-10-07', ROWS, runs)!.updatedAt).toBe('2026-10-07T06:03:05+09:00');
    expect(buildRanking('2026-10-07', ROWS, runs.filter(r => r.status === 'failed'))!.updatedAt).toBe('2026-10-07T06:00:00+09:00');
    expect(buildRanking('2026-10-07', ROWS)!.updatedAt).toBe('2026-10-07T06:00:00+09:00');
  });
});
