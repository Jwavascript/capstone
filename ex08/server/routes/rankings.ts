import { Hono } from 'hono';
import type { Store } from '../app';
import { rankingsQuery, validate } from '../schemas';

export const rankings = (store: Store) => {
  const route = new Hono();

  // date를 생략하면 최근 수집일(D3)
  route.get('/', validate('query', rankingsQuery), async c => {
    const date = c.req.valid('query').date ?? await store.latestDate();
    const ranking = date ? await store.ranking(date) : null;
    if (!ranking) return c.json({ message: '해당 날짜의 랭킹 데이터가 없습니다' }, 404);
    return c.json(ranking, 200);
  });
  return route;
};
