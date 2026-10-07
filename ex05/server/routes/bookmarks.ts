import { Hono } from 'hono';
import type { Store } from '../app';
import { bookmarkCreate, validate } from '../schemas';

export const bookmarksRoute = (store: Store) => {
  const route = new Hono();

  route.get('/', async c => c.json(await store.bookmarks(), 200));

  route.post('/', validate('json', bookmarkCreate), async c => {
    const { issueId, folderId } = c.req.valid('json');
    const issue = await store.issue(issueId);
    if (!issue) return c.json({ message: '이슈를 찾을 수 없습니다' }, 404);
    if (!(await store.folders()).some(f => f.id === folderId)) return c.json({ message: '폴더를 찾을 수 없습니다' }, 404);
    const bookmark = await store.saveBookmark(issue, folderId);
    if (!bookmark) return c.json({ message: '이미 북마크한 이슈입니다' }, 409);
    return c.json(bookmark, 201);
  });

  route.delete('/:issueId', async c => {
    if (!(await store.deleteBookmark(c.req.param('issueId')))) return c.json({ message: '북마크를 찾을 수 없습니다' }, 404);
    return c.body(null, 204);
  });
  return route;
};
