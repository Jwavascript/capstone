import { Hono } from 'hono';
import { bookmarks, folders, newFolderId } from '../sample';

export const foldersRoute = new Hono();

const withCount = (f: { id: string; name: string }) => ({ ...f, count: bookmarks.filter(b => b.folderId === f.id).length });

foldersRoute.get('/', c => c.json(folders.map(withCount), 200));

foldersRoute.post('/', async c => {
  const { name } = await c.req.json<{ name: string }>();
  const folder = { id: newFolderId(), name };
  folders.push(folder);
  return c.json(withCount(folder), 201);
});
