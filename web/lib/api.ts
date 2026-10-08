/* ─────────────── Data ─────────────── */
export type SectionKey = 'pol' | 'eco' | 'soc' | 'cul' | 'wor' | 'it';
export type Issue = {
  id: string; date: string; section: SectionKey; rank: number;
  title: string; summary: string[] | null; articleCount: number; url: string;
};
export type Ranking = { date: string; updatedAt: string; sections: { key: SectionKey; name: string; issues: Issue[] }[] };
export type Bookmark = Issue & { folderId: string; savedAt: string };
export type Folder = { id: string; name: string; count: number };
export type View = 'map' | 'list' | 'bookmarks';

export const SECTIONS: { key: SectionKey; name: string }[] = [
  { key: 'pol', name: '정치' },
  { key: 'eco', name: '경제' },
  { key: 'soc', name: '사회' },
  { key: 'cul', name: '생활·문화' },
  { key: 'wor', name: '세계' },
  { key: 'it',  name: 'IT·과학' },
];
export const SEC = Object.fromEntries(SECTIONS.map(s => [s.key, s])) as Record<SectionKey, { key: SectionKey; name: string }>;
export const secColor = (k: string) => `var(--s-${k})`;
export const MAX_COUNT = 184;

export const secIssues = (ranking: Ranking | null, k: string) => ranking?.sections.find(s => s.key === k)?.issues ?? [];
export const issueById = (ranking: Ranking | null, id: string | undefined) => {
  if (ranking) for (const s of ranking.sections) { const it = s.issues.find(x => x.id === id); if (it) return it; }
  return null;
};

/* ─────────────── API (같은 주소의 /api만 부름) ─────────────── */
export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch('/api' + path, opts.body ? { ...opts, headers: { 'Content-Type': 'application/json' } } : opts);
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.message || res.statusText), { status: res.status });
  return data as T;
}
