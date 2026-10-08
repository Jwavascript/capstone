// 순위 규칙(AC-03-2): 연관기사 수 ↓ → 최근 발행 시각 ↓ → id ↑, 앞 5개에 rank 1~5
export type Candidate = { id: string; articleCount: number; latestPublishedAt: string };

export function rankIssues<T extends Candidate>(candidates: T[]): (T & { rank: number })[] {
  return [...candidates]
    .sort((a, b) =>
      b.articleCount - a.articleCount
      || Date.parse(b.latestPublishedAt) - Date.parse(a.latestPublishedAt)
      || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, 5)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}
