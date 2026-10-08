// Hono 앱을 서버 없이 app.request로 부름. 시각은 setup에서 2026-10-07 12:00 KST로 고정
import { describe, expect, it, vi } from 'vitest';
import { app } from '../server/app';

const TODAY = '2026-10-07';
const YESTERDAY = '2026-10-06';
const TOMORROW = '2026-10-08';
const DAYS_AGO_44 = '2026-08-24';
const DAYS_AGO_45 = '2026-08-23';

const MSG = {
  noRanking: '해당 날짜의 랭킹 데이터가 없습니다',
  dateFormat: '날짜는 YYYY-MM-DD 형식으로 입력해 주세요',
  dateFuture: '오늘 이후 날짜는 조회할 수 없습니다',
  badRequest: '요청 형식이 올바르지 않습니다',
  folderName: '폴더 이름은 1~16자로 입력해 주세요',
  duplicate: '이미 북마크한 이슈입니다',
  noIssue: '이슈를 찾을 수 없습니다',
  noFolder: '폴더를 찾을 수 없습니다',
  noBookmark: '북마크를 찾을 수 없습니다',
};

const SECTIONS = [
  { key: 'pol', name: '정치' },
  { key: 'eco', name: '경제' },
  { key: 'soc', name: '사회' },
  { key: 'cul', name: '생활·문화' },
  { key: 'wor', name: '세계' },
  { key: 'it', name: 'IT·과학' },
];
const ISSUE_KEYS = ['articleCount', 'date', 'id', 'rank', 'section', 'summary', 'title', 'url'];
const BOOKMARK_KEYS = [...ISSUE_KEYS, 'folderId', 'savedAt'].sort();

type Issue = { id: string; articleCount: number; rank: number; summary: string[] | null };
type Ranking = { date: string; updatedAt: string; sections: { key: string; name: string; issues: Issue[] }[] };
type Bookmark = Issue & { folderId: string; savedAt: string };
type Folder = { id: string; name: string; count: number };

const get = (path: string) => app.request(path);
const postRaw = (path: string, body: string) =>
  app.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
const post = (path: string, body: unknown) => postRaw(path, JSON.stringify(body));
const del = (path: string) => app.request(path, { method: 'DELETE' });

const listBookmarks = async () => (await (await get('/api/bookmarks')).json()) as Bookmark[];
const listFolders = async () => (await (await get('/api/folders')).json()) as Folder[];
const countOf = async (id: string) => (await listFolders()).find(f => f.id === id)?.count;
const todayPolTop = async () => ((await (await get('/api/rankings')).json()) as Ranking).sections[0].issues[0].id;

const expectMessage = async (res: Response, status: number, message: string) => {
  expect(res.status).toBe(status);
  expect(await res.json()).toEqual({ message });
};

describe('GET /api/rankings', () => {
  it('오늘 랭킹: 섹션 6개 · 섹션마다 5개 · 8칸 카드 · 같은 응답 (AC-03-1)', async () => {
    const res1 = await get('/api/rankings');
    const res2 = await get('/api/rankings');
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    const text1 = await res1.text();
    expect(await res2.text()).toBe(text1);

    const body = JSON.parse(text1) as Ranking;
    expect(body.date).toBe(TODAY);
    expect(body.updatedAt).toBe('2026-10-07T06:00:00+09:00');
    expect(body.sections.map(({ key, name }) => ({ key, name }))).toEqual(SECTIONS);
    for (const s of body.sections) {
      expect(s.issues).toHaveLength(5);
      expect(s.issues.map(x => x.rank)).toEqual([1, 2, 3, 4, 5]);
      s.issues.slice(1).forEach((x, i) => expect(x.articleCount).toBeLessThanOrEqual(s.issues[i].articleCount));
      for (const x of s.issues) expect(Object.keys(x).sort()).toEqual(ISSUE_KEYS);
    }
    const soc = body.sections.find(s => s.key === 'soc')!;
    expect(soc.issues.filter(x => x.summary === null)).toHaveLength(1);
  });

  it('지난 날짜: 어제 · 44일 전은 200, 45일 전 · 2000-01-01은 404 (AC-09-1 · AC-09-3)', async () => {
    const res = await get(`/api/rankings?date=${YESTERDAY}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Ranking;
    expect(body.date).toBe(YESTERDAY);
    for (const s of body.sections) for (const x of s.issues) expect(x.id.startsWith(`${YESTERDAY}-`)).toBe(true);

    expect((await get(`/api/rankings?date=${DAYS_AGO_44}`)).status).toBe(200);
    await expectMessage(await get(`/api/rankings?date=${DAYS_AGO_45}`), 404, MSG.noRanking);
    await expectMessage(await get('/api/rankings?date=2000-01-01'), 404, MSG.noRanking);
  });

  it('날짜 형식: 한 자리 일 · 없는 날 · 빈 값 · 문자는 400', async () => {
    for (const q of ['2026-10-7', '2026-02-30', '', 'abc']) {
      await expectMessage(await get(`/api/rankings?date=${q}`), 400, MSG.dateFormat);
    }
  });

  it('미래 날짜: 내일 · 2999-01-01은 400 (AC-09-4)', async () => {
    for (const q of [TOMORROW, '2999-01-01']) {
      await expectMessage(await get(`/api/rankings?date=${q}`), 400, MSG.dateFuture);
    }
  });

  it('KST 자정: 23:59:59엔 오늘이 10-07, 00:00:00엔 10-08', async () => {
    vi.setSystemTime('2026-10-07T23:59:59+09:00');
    expect(((await (await get('/api/rankings')).json()) as Ranking).date).toBe(TODAY);
    await expectMessage(await get(`/api/rankings?date=${TOMORROW}`), 400, MSG.dateFuture);

    vi.setSystemTime('2026-10-08T00:00:00+09:00');
    expect(((await (await get('/api/rankings')).json()) as Ranking).date).toBe(TOMORROW);
    expect((await get(`/api/rankings?date=${TOMORROW}`)).status).toBe(200);
  });
});

describe('북마크 · 폴더', () => {
  it('목록: 북마크 10개 savedAt 내림차순, 폴더 f1 4 · f2 3 · f3 3 (AC-08-1 · AC-10-1)', async () => {
    const res = await get('/api/bookmarks');
    expect(res.status).toBe(200);
    const list = (await res.json()) as Bookmark[];
    expect(list).toHaveLength(10);
    expect(list[0].savedAt).toBe('2026-10-06T21:10:00+09:00');
    list.slice(1).forEach((b, i) => expect(Date.parse(b.savedAt)).toBeLessThan(Date.parse(list[i].savedAt)));
    for (const b of list) expect(Object.keys(b).sort()).toEqual(BOOKMARK_KEYS);

    const fres = await get('/api/folders');
    expect(fres.status).toBe(200);
    expect(await fres.json()).toEqual([
      { id: 'f1', name: '반도체·AI', count: 4 },
      { id: 'f2', name: '부동산·금리', count: 3 },
      { id: 'f3', name: '나중에 읽기', count: 3 },
    ]);
  });

  it('저장 · 폴더 하나: 201 뒤 같은 이슈는 409 (AC-07-1 · AC-10-4)', async () => {
    const issueId = await todayPolTop();
    const res = await post('/api/bookmarks', { issueId, folderId: 'f1' });
    expect(res.status).toBe(201);
    const saved = (await res.json()) as Bookmark;
    expect(saved.savedAt).toBe('2026-10-07T03:00:00.000Z');
    const list = await listBookmarks();
    expect(list[0].id).toBe(issueId);
    expect(list[0].folderId).toBe('f1');
    expect(await countOf('f1')).toBe(5);

    await expectMessage(await post('/api/bookmarks', { issueId, folderId: 'f2' }), 409, MSG.duplicate);
    expect(await countOf('f2')).toBe(3);
  });

  it('없는 이슈 · 폴더: 404', async () => {
    await expectMessage(await post('/api/bookmarks', { issueId: '2000-01-01-pol-0', folderId: 'f1' }), 404, MSG.noIssue);
    await expectMessage(await post('/api/bookmarks', { issueId: await todayPolTop(), folderId: 'f999' }), 404, MSG.noFolder);
  });

  it('해제 · 없을 때: 204 → 404, 모두 지우면 [] (AC-07-2 · AC-08-2)', async () => {
    const [first, ...rest] = await listBookmarks();
    expect((await del(`/api/bookmarks/${first.id}`)).status).toBe(204);
    await expectMessage(await del(`/api/bookmarks/${first.id}`), 404, MSG.noBookmark);

    expect(rest).toHaveLength(9);
    for (const b of rest) expect((await del(`/api/bookmarks/${b.id}`)).status).toBe(204);
    const res = await get('/api/bookmarks');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('새 폴더: f4 만들고 북마크하면 count 1 (AC-10-2)', async () => {
    const res = await post('/api/folders', { name: '테스트' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 'f4', name: '테스트', count: 0 });

    expect((await post('/api/bookmarks', { issueId: await todayPolTop(), folderId: 'f4' })).status).toBe(201);
    expect(await countOf('f4')).toBe(1);
  });

  it('깨진 본문 · 북마크 칸: 400, 북마크 10개 그대로', async () => {
    await expectMessage(await postRaw('/api/bookmarks', '{'), 400, MSG.badRequest);
    await expectMessage(await postRaw('/api/folders', '{'), 400, MSG.badRequest);
    const bad = [
      {},
      { issueId: 'abc', folderId: 'f1' },
      { issueId: `${YESTERDAY}-xyz-0`, folderId: 'f1' },
      { issueId: `${YESTERDAY}-pol-0`, folderId: '' },
    ];
    for (const body of bad) await expectMessage(await post('/api/bookmarks', body), 400, MSG.badRequest);
    expect(await listBookmarks()).toHaveLength(10);
  });

  it('폴더 이름 길이: 앞뒤 공백 뺀 코드 포인트 1~16자 (AC-10-2)', async () => {
    for (const name of ['가'.repeat(16), '😀'.repeat(16)]) {
      expect((await post('/api/folders', { name })).status).toBe(201);
    }
    for (const body of [{ name: '가'.repeat(17) }, { name: '😀'.repeat(17) }, { name: '   ' }, {}, { name: 3 }]) {
      await expectMessage(await post('/api/folders', body), 400, MSG.folderName);
    }
  });

  it('앞뒤 공백 · 같은 이름: 공백 빼고 저장, 같은 이름도 201', async () => {
    const r1 = await post('/api/folders', { name: '  여행  ' });
    expect(r1.status).toBe(201);
    const f1 = (await r1.json()) as Folder;
    expect(f1.name).toBe('여행');

    const r2 = await post('/api/folders', { name: ' ' + '나'.repeat(16) + ' ' });
    expect(r2.status).toBe(201);
    expect(((await r2.json()) as Folder).name).toBe('나'.repeat(16));

    const r3 = await post('/api/folders', { name: '여행' });
    expect(r3.status).toBe(201);
    const f3 = (await r3.json()) as Folder;
    expect(f3.name).toBe('여행');
    expect(f3.id).not.toBe(f1.id);
    expect((await listFolders()).filter(f => f.name === '여행')).toHaveLength(2);
  });
});
