/* ─────────────── Date ─────────────── */
// KST 오늘 YYYY-MM-DD(서버 kstToday와 같은 계산)
export const TODAY = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const WD = ['일', '월', '화', '수', '목', '금', '토'];
export const fmtDate = (s: string) => { const d = parse(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
export const fmtShort = (s: string) => { const d = parse(s); return `${d.getMonth() + 1}.${d.getDate()}`; };
// updatedAt(+09:00) → "10.6 오전 6:00"
export const fmtUpdated = (s: string) => { const [d, t] = s.split('T'); const [h, m] = t.split(':').map(Number); return `${fmtShort(d)} ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`; };
export const timeAgo = (ts: string) => { const m = Math.round((Date.now() - Date.parse(ts)) / 60e3); if (m < 1) return '방금'; if (m < 60) return `${m}분 전`; const h = Math.round(m / 60); if (h < 24) return `${h}시간 전`; return `${Math.round(h / 24)}일 전`; };
