// seed 행(순수 함수): DB 없이 seedRows(오늘)만 검사
import { describe, expect, it } from 'vitest';
import { seedRows } from '../server/sample';

const TODAY = '2026-10-07';
const DAYS_AGO_44 = '2026-08-24';
const SECTION_KEYS = ['pol', 'eco', 'soc', 'cul', 'wor', 'it'];

describe('seedRows', () => {
  const rows = seedRows(TODAY);

  it('issues: 45일 × 섹션 6 × 5 = 1350, id 중복 없음, 날짜마다 soc에 summary null 1개', () => {
    expect(rows.issues).toHaveLength(1350);
    expect(new Set(rows.issues.map(r => r.id)).size).toBe(1350);

    const dates = [...new Set(rows.issues.map(r => r.date))].sort();
    expect(dates).toHaveLength(45);
    expect(dates[0]).toBe(DAYS_AGO_44);
    expect(dates[dates.length - 1]).toBe(TODAY);

    for (const date of dates) {
      const day = rows.issues.filter(r => r.date === date);
      for (const key of SECTION_KEYS) expect(day.filter(r => r.section === key)).toHaveLength(5);
      const nulls = day.filter(r => r.summary === null);
      expect(nulls).toHaveLength(1);
      expect(nulls[0].section).toBe('soc');
    }
  });

  it('folders f1~f3, bookmarks 10(이슈 안 · 저장 시각 서로 다름 · f1 4 · f2 3 · f3 3)', () => {
    expect(rows.folders.map(f => f.id)).toEqual(['f1', 'f2', 'f3']);

    expect(rows.bookmarks).toHaveLength(10);
    const ids = new Set(rows.issues.map(r => r.id));
    for (const b of rows.bookmarks) expect(ids.has(b.issueId)).toBe(true);
    expect(new Set(rows.bookmarks.map(b => Date.parse(b.createdAt))).size).toBe(10);
    const countOf = (id: string) => rows.bookmarks.filter(b => b.folderId === id).length;
    expect([countOf('f1'), countOf('f2'), countOf('f3')]).toEqual([4, 3, 3]);
  });
});
