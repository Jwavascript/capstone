import { Hono } from 'hono';
import { bookmarks, findIssue, folders } from '../sample';

export const bookmarksRoute = new Hono();

bookmarksRoute.get('/', c =>
  c.json([...bookmarks].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)), 200));

bookmarksRoute.post('/', async c => {
  const { issueId, folderId } = await c.req.json<{ issueId: string; folderId: string }>();
  const issue = findIssue(issueId);
  if (!issue) return c.json({ message: '이슈를 찾을 수 없습니다' }, 404);
  if (!folders.some(f => f.id === folderId)) return c.json({ message: '폴더를 찾을 수 없습니다' }, 404);
  if (bookmarks.some(b => b.id === issueId)) return c.json({ message: '이미 북마크한 이슈입니다' }, 409);
  const bookmark = { ...issue, folderId, savedAt: new Date().toISOString() };
  bookmarks.push(bookmark);
  return c.json(bookmark, 201);
});

bookmarksRoute.delete('/:issueId', c => {
  const i = bookmarks.findIndex(b => b.id === c.req.param('issueId'));
  if (i < 0) return c.json({ message: '북마크를 찾을 수 없습니다' }, 404);
  bookmarks.splice(i, 1);
  return c.body(null, 204);
});
