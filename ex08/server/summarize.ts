// npm run summarize [-- --max N]: 그날(KST 오늘) Top 5 중 요약 없는 이슈만 Claude로 3줄 요약을 issues.summary에(D6, US-04)
// 검사(옵션 → N ≥ 1이면 키 → DB에서 그날 이슈 읽기)를 통과해야 요청. 오류는 문구만 찍음(오류 객체 · 환경 변수 금지)
// 종료 코드: 0 실패 없음 · 1 실패 있음 · 2 검사 · DB 오류
import { aiClient } from './ai';
import { connectDb } from './db/client';
import { summaryStore } from './db/store';
import { hide } from './hide';
import { summarizeDay } from './summary';

async function main(): Promise<number> {
  // --max N(0~30, 기본 30) = 앞 N개만 요청
  const args = process.argv.slice(2);
  const at = args.indexOf('--max');
  const max = at < 0 ? 30 : Number(args[at + 1]);
  if (!Number.isInteger(max) || max < 0 || max > 30) {
    console.log('--max는 0~30입니다');
    return 2;
  }
  const key = process.env.ANTHROPIC_API_KEY ?? '';
  if (max >= 1 && !key) {
    console.log('ANTHROPIC_API_KEY가 없습니다');
    return 2;
  }

  let conn: ReturnType<typeof connectDb> | undefined;
  try {
    conn = connectDb();
    const summarize = max >= 1 ? aiClient(key).summarize : null;
    const result = await summarizeDay({ store: summaryStore(conn.db), summarize, key, max });
    if (result.empty) {
      console.log(`${result.date} 이슈가 없습니다`);
      return 2;
    }
    console.log(`요약 ${result.date} · 최대 ${max}개`);
    for (const r of result.results) {
      console.log(`  ${r.id} ${r.skipped ? '건너뜀: 설명문 없음' : r.error === null ? 'ok' : `실패: ${hide(r.error)}`}`);
    }
    console.log(`대상 ${result.targets} · 요청 ${result.requests}번 · 성공 ${result.succeeded} · 실패 ${result.failed} · 이미 요약 ${result.already} · 설명문 없음 ${result.noDescription}`);
    return result.code;
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
