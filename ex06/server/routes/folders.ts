import { Hono } from 'hono';
import type { Store } from '../app';
import { folderCreate, validate } from '../schemas';

export const foldersRoute = (store: Store) => {
  const route = new Hono();

  route.get('/', async c => c.json(await store.folders(), 200));

  route.post('/', validate('json', folderCreate), async c => {
    const { name } = c.req.valid('json'); // 앞뒤 공백을 뺀 이름
    return c.json(await store.createFolder(name), 201);
  });
  return route;
};
