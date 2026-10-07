// 순위 규칙(AC-03-2)과 랭킹 조립. 메모리 저장소(sample.ts) · DB 저장소(db/store.ts)가 같이 씀
export type SectionKey = 'pol' | 'eco' | 'soc' | 'cul' | 'wor' | 'it';
export type Issue = {
  id: string; date: string; section: SectionKey; rank: number; title: string;
  summary: string[] | null; articleCount: number; url: string;
};
export type Ranking = { date: string; updatedAt: string; sections: { key: SectionKey; name: string; issues: Issue[] }[] };
// 저장된 이슈 한 행(랭킹 후보). rank는 저장하지 않고 조회 때 계산
export type IssueRow = Omit<Issue, 'rank'> & { latestPublishedAt: string };

export const SECTIONS: { key: SectionKey; name: string }[] = [
  { key: 'pol', name: '정치' },
  { key: 'eco', name: '경제' },
  { key: 'soc', name: '사회' },
  { key: 'cul', name: '생활·문화' },
  { key: 'wor', name: '세계' },
  { key: 'it', name: 'IT·과학' },
];

export type Candidate = { id: string; articleCount: number; latestPublishedAt: string };

// 연관기사 수 ↓ → 최근 발행 시각 ↓ → id 자연 순서(숫자 부분은 수로, …-pol-9 < …-pol-10), 앞 5개에 rank 1~5
export function rankIssues<T extends Candidate>(candidates: T[]): (T & { rank: number })[] {
  return [...candidates]
    .sort((a, b) =>
      b.articleCount - a.articleCount
      || Date.parse(b.latestPublishedAt) - Date.parse(a.latestPublishedAt)
      || a.id.localeCompare(b.id, 'en', { numeric: true }))
    .slice(0, 5)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

// 날짜 하나의 행 → 섹션 6개 랭킹(카드 8칸, 발행 시각 빼고). 행이 없으면 null
export function buildRanking(date: string, rows: IssueRow[]): Ranking | null {
  if (rows.length === 0) return null;
  const sections = SECTIONS.map(({ key, name }) => {
    const issues = rankIssues(rows.filter(r => r.section === key))
      .map(({ id, date, section, rank, title, summary, articleCount, url }): Issue =>
        ({ id, date, section, rank, title, summary, articleCount, url }));
    return { key, name, issues };
  });
  return { date, updatedAt: `${date}T06:00:00+09:00`, sections };
}

// 행들 중 id의 카드. rank는 그 이슈 날짜의 랭킹(GET /api/rankings?date=와 같음)에서 찾음
export function findCard(id: string, rows: IssueRow[]): Issue | null {
  const row = rows.find(r => r.id === id);
  if (!row) return null;
  const ranking = buildRanking(row.date, rows.filter(r => r.date === row.date));
  for (const s of ranking!.sections) { const it = s.issues.find(x => x.id === id); if (it) return it; }
  return null;
}
