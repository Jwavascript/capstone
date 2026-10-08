// npm run group [-- --search N] [--ai 0|1]: 그날(KST 오늘) 기사를 AI 정리(D15, 실패하면 ex07 제목 규칙 D11)로 묶어 issues에,
// 검색어 제목 검색 · 1쪽 검증으로 연관기사 수(D13)
// 검사(옵션 → N ≥ 1이면 newsdata 키 → --ai 1이면 Anthropic 키 → DB에서 그날 기사 · 이슈 · 북마크 섹션 읽기)를 통과해야 요청. 오류는 문구만 찍음(오류 객체 · 환경 변수 금지)
// 종료 코드: 0 검색 실패 · 크레딧 부족 · AI 정리 실패 없음 · 1 있음 · 2 검사 · 저장 오류
import { aiClient } from './ai';
import { connectDb } from './db/client';
import { groupStore } from './db/store';
import { group } from './grouping';
import { hide } from './hide';

async function main(): Promise<number> {
  // --search N(0~6, 기본 6) = 섹션마다 앞 N개 후보만 검색
  const args = process.argv.slice(2);
  const at = args.indexOf('--search');
  const search = at < 0 ? 6 : Number(args[at + 1]);
  if (![0, 1, 2, 3, 4, 5, 6].includes(search)) {
    console.log('--search는 0~6입니다');
    return 2;
  }
  // --ai 0|1(기본 1). 0이면 AI를 부르지 않고 ex07 규칙
  const aiAt = args.indexOf('--ai');
  const useAi = aiAt < 0 ? 1 : Number(args[aiAt + 1]);
  if (![0, 1].includes(useAi)) {
    console.log('--ai는 0 또는 1입니다');
    return 2;
  }
  const key = process.env.NEWSDATA_API_KEY ?? '';
  if (search >= 1 && !key) {
    console.log('NEWSDATA_API_KEY가 없습니다');
    return 2;
  }
  const aiKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (useAi === 1 && !aiKey) {
    console.log('ANTHROPIC_API_KEY가 없습니다');
    return 2;
  }

  let conn: ReturnType<typeof connectDb> | undefined;
  try {
    conn = connectDb();
    const organize = useAi === 1 ? aiClient(aiKey).organize : null;
    const result = await group({ fetch, store: groupStore(conn.db), key, search, waitMs: 1000, organize, aiKey });
    if (result.empty) {
      console.log(`${result.date} 기사가 없습니다`);
      return 2;
    }
    console.log(`묶기 ${result.date} · 섹션당 검색 최대 ${search}개`);
    const ai = result.ai;
    // 고친 수는 모두 0이면 생략
    const fixed = ai.status === 'ok' && Object.values(ai.fixes).some(n => n > 0)
      ? ` · 고침 중복 ${ai.fixes.duplicate} · 없는 번호 ${ai.fixes.unknown} · 빈 묶음 ${ai.fixes.empty} · 검색어 ${ai.fixes.query}`
      + ` · terms ${ai.fixes.terms} · importance ${ai.fixes.importance}` : '';
    console.log(ai.status === 'ok' ? `AI 정리 · 묶음 ${ai.bundles} · 제외 ${ai.excluded} · 빠진 기사 ${ai.missing}${fixed}`
      : ai.status === 'failed' ? `AI 정리 실패: ${hide(ai.reason)} → 규칙으로 묶음` : 'AI 정리 안 함(--ai 0)');
    for (const s of result.sections) {
      if ('skipped' in s) {
        console.log(`${s.section} 건너뜀: ${s.skipped}`);
        continue;
      }
      console.log(`${s.section} 기사 ${s.articles} · 이슈 ${s.issues}`);
      for (const c of s.candidates) {
        console.log(`  ${c.id} ${c.keyword ?? '-'} ${c.articleCount}건 (묶음 ${c.size})${c.note ? ` ${c.note}` : ''}`);
      }
    }
    console.log(`이슈 ${result.issues} · 검색 ${result.requests}번 · 실패 ${result.failed} · 남은 크레딧 ${result.remaining ?? '?'}`);
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
