// npm run collect [-- --pages N]: newsdata.io에서 섹션 6개의 최신 기사를 articles에, 섹션마다 결과를 collect_runs에
// 시작 전 검사(옵션 → 키 → DB에서 그날 행 읽기)를 통과해야 요청. 오류는 문구만 찍음(오류 객체 · 환경 변수 금지)
// 종료 코드: 0 모두 ok · 1 일부 failed · 2 모두 failed 또는 검사 · 저장 오류
import { connectDb } from './db/client';
import { collectStore } from './db/store';
import { collect } from './newsdata';

// 문구 안의 DATABASE_URL 값 · 그 비밀번호 · 키를 ***로
function hide(text: string) {
  const url = process.env.DATABASE_URL ?? '';
  const password = /^[^:]+:\/\/[^:@/]*:(.*)@/.exec(url)?.[1] ?? '';
  let decoded = '';
  try { decoded = decodeURIComponent(password); } catch {}
  return [url, password, decoded, process.env.NEWSDATA_API_KEY ?? '']
    .filter(Boolean)
    .reduce((t, secret) => t.replaceAll(secret, '***'), text);
}

async function main(): Promise<number> {
  // --pages N(1~3, 기본 3) = 섹션당 최대 페이지
  const args = process.argv.slice(2);
  const at = args.indexOf('--pages');
  const pages = at < 0 ? 3 : Number(args[at + 1]);
  if (![1, 2, 3].includes(pages)) {
    console.log('--pages는 1~3입니다');
    return 2;
  }
  const key = process.env.NEWSDATA_API_KEY;
  if (!key) {
    console.log('NEWSDATA_API_KEY가 없습니다');
    return 2;
  }

  let conn: ReturnType<typeof connectDb> | undefined;
  try {
    conn = connectDb();
    const { date, runs, requests, remaining, code } =
      await collect({ fetch, store: collectStore(conn.db), key, pages, waitMs: 1000 });
    const ok = runs.filter(r => r.status === 'ok');
    console.log(`수집 ${date} · 섹션당 최대 ${pages}페이지`);
    for (const r of runs) console.log(r.status === 'ok' ? `${r.section} ok ${r.articleCount}건` : `${r.section} failed ${r.message}`);
    console.log(`ok ${ok.length} · failed ${runs.length - ok.length} · 기사 ${ok.reduce((n, r) => n + r.articleCount, 0)}건`
      + ` · 요청 ${requests}번 · 남은 크레딧 ${remaining ?? '?'}`);
    return code;
  } catch (err) {
    // Drizzle은 드라이버 오류를 감싸 문구를 "Failed query: …(줄바꿈)params: …"로 바꾸므로, 감싼 원래 오류(cause)가 있으면 그 문구(한 줄)
    const e = err instanceof Error && err.cause instanceof Error ? err.cause : err;
    console.log(`DB 오류: ${hide(e instanceof Error ? e.message : String(e))}`);
    return 2;
  } finally {
    await conn?.client.end();
  }
}

main().then(code => { process.exitCode = code; });
