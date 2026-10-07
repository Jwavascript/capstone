import { Hono } from 'hono';
import { kstToday, rankingFor } from '../sample';

export const rankings = new Hono();

rankings.get('/', c => {
  const ranking = rankingFor(c.req.query('date') ?? kstToday());
  if (!ranking) return c.json({ message: '해당 날짜의 랭킹 데이터가 없습니다' }, 404);
  return c.json(ranking, 200);
});
