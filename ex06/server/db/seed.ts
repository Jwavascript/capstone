// npm run seed: 실행일 KST 오늘 기준 샘플(seedRows)을 DB에 넣음
// 한 트랜잭션에서 bookmarks → folders → issues를 모두 지우고 다시 넣음 → 몇 번 돌려도 같은 행 수
import { kstToday, seedRows } from '../sample';
import { connectDb } from './client';
import { bookmarks, folders, issues } from './schema';

const { client, db } = connectDb();

async function main() {
  const rows = seedRows(kstToday());
  await db.transaction(async tx => {
    await tx.delete(bookmarks);
    await tx.delete(folders);
    await tx.delete(issues);
    await tx.insert(issues).values(rows.issues.map(r => ({ ...r, latestPublishedAt: new Date(r.latestPublishedAt) })));
    await tx.insert(folders).values(rows.folders.map(f => ({ ...f, createdAt: new Date(f.createdAt) })));
    await tx.insert(bookmarks).values(rows.bookmarks.map(b => ({ ...b, createdAt: new Date(b.createdAt) })));
  });
  console.log(`issues ${rows.issues.length} · folders ${rows.folders.length} · bookmarks ${rows.bookmarks.length}`);
}

main().finally(() => client.end());
