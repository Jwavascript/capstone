import { Hono } from 'hono';
import { bookmarks, folders, newFolderId } from '../sample';
import { folderCreate, validate } from '../schemas';

export const foldersRoute = new Hono();

const withCount = (f: { id: string; name: string }) => ({ ...f, count: bookmarks.filter(b => b.folderId === f.id).length });

foldersRoute.get('/', c => c.json(folders.map(withCount), 200));

foldersRoute.post('/', validate('json', folderCreate), c => {
  const { name } = c.req.valid('json'); // 앞뒤 공백을 뺀 이름
  const folder = { id: newFolderId(), name };
  folders.push(folder);
  return c.json(withCount(folder), 201);
});
