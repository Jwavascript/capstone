// AI 3줄 요약 규칙(D6, US-04 · AC-04-3): 대상 · 입력 · 검사 · 저장(무엇을 요청하고 쓸지 정하는 한 곳)
// 환경 변수 · DB를 직접 읽지 않고 저장소 · 요약 함수 · 키 · 최대 요청 수를 받음. 명령은 summarize.ts, DB 구현은 db/store.ts의 summaryStore
import type { AiReply } from './grouping';
import { rankIssues, SECTIONS, type SectionKey } from './ranking';
import { kstToday } from './sample';

// 요약 함수(ai.ts가 만듦, 테스트는 가짜): 묶인 기사 제목 · 설명문(최대 10건) → { line1, line2, line3 }
export type Summarize = (articles: { title: string; description: string | null }[]) => Promise<AiReply<unknown>>;
export type SummaryIssue = { id: string; section: SectionKey; articleCount: number; latestPublishedAt: string; summary: string[] | null };
export type SummaryArticle = { title: string; description: string | null; link: string; publishedAt: string };

// 저장소: DB 구현은 db/store.ts의 summaryStore, 테스트는 메모리 구현
export type SummaryStore = {
  issues(date: string): Promise<SummaryIssue[]>; // 그날 이슈
  articles(issueId: string): Promise<SummaryArticle[]>; // 그 이슈에 묶인 기사(issue_id)
  save(issueId: string, summary: string[]): Promise<void>; // issues.summary
};

const ARTICLES = 10; // 요약 입력 기사 최대 수
const MAX_LINE = 100; // 한 줄 최대 글자 수(코드 포인트)

// 요약 검사: { line1, line2, line3 } 문자열 3개를 앞뒤 공백 빼고, 하나라도 비었거나 100자 넘으면(또는 모양이 다르면) null(형식 오류)
export function checkSummary(output: unknown): string[] | null {
  const o = output as { line1?: unknown; line2?: unknown; line3?: unknown } | null;
  if (!o || typeof o !== 'object') return null;
  const lines = [o.line1, o.line2, o.line3];
  if (!lines.every(l => typeof l === 'string')) return null;
  const trimmed = (lines as string[]).map(l => l.trim());
  return trimmed.every(l => l.length > 0 && [...l].length <= MAX_LINE) ? trimmed : null;
}

// 한 번 요약: 날짜 = KST 오늘. 대상 = 그날 이슈로 섹션마다 매긴 Top 5(ex04 순위 규칙, 이전 날짜 이슈는 아님) 중 summary null,
// 순서 섹션 pol→it · rank 1→5, 앞 max개만 하나씩 요청. 입력 = 묶인 기사 발행 시각 ↓ 최대 10건의 제목 · 설명문
// 입력 기사에 설명문이 하나도 없으면 요청하지 않고 건너뜀(summary null 그대로, 실패 아님, 요청 수 max에 들지 않음)
// 거절 · 형식 오류 · 호출 실패는 summary null 그대로(다음 실행에서 다시). 실패 문구의 key는 ***
// 반환: 그날 이슈가 없으면 empty, 아니면 이슈마다 결과(skipped = 설명문 없음) · 대상 수 · 이미 요약 수 · 종료 코드(0 실패 없음 · 1 실패 있음)
export async function summarizeDay({ store, summarize, key, max }: {
  store: SummaryStore; summarize: Summarize | null; key: string; max: number;
}) {
  const date = kstToday();
  const day = await store.issues(date);
  if (day.length === 0) return { date, empty: true as const };
  const top = SECTIONS.flatMap(({ key: section }) => rankIssues(day.filter(i => i.section === section)));
  const targets = top.filter(i => i.summary === null);
  const hide = (text: string) => (key ? text.replaceAll(key, '***') : text);

  const results: { id: string; skipped: boolean; error: string | null }[] = [];
  let requests = 0;
  for (const issue of targets) {
    if (requests >= max) break;
    const articles = (await store.articles(issue.id))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || (a.link < b.link ? -1 : a.link > b.link ? 1 : 0))
      .slice(0, ARTICLES)
      .map(a => ({ title: a.title, description: a.description }));
    if (articles.every(a => !a.description)) {
      results.push({ id: issue.id, skipped: true, error: null });
      continue;
    }
    requests++;
    let reply: Awaited<ReturnType<Summarize>>;
    try {
      reply = await summarize!(articles); // max ≥ 1이면 명령이 요약 함수를 넘김
    } catch (err) {
      results.push({ id: issue.id, skipped: false, error: `호출 실패: ${hide(err instanceof Error ? err.message : String(err))}` });
      continue;
    }
    const lines = reply.refusal ? null : checkSummary(reply.output);
    if (lines) await store.save(issue.id, lines);
    results.push({ id: issue.id, skipped: false, error: lines ? null : reply.refusal ? '거절' : '형식 오류' });
  }
  const failed = results.filter(r => r.error !== null).length;
  const noDescription = results.filter(r => r.skipped).length;
  return {
    date, empty: false as const, results,
    targets: targets.length, requests, succeeded: requests - failed, failed, noDescription,
    already: top.length - targets.length, code: failed > 0 ? 1 : 0,
  };
}
