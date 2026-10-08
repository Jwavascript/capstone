// Claude API(D6 · D15): SDK · 모델 · 지시문 · zod 스키마, 이슈 정리 · 요약 함수. SDK를 부르는 곳은 이 파일 한 곳
// 규칙 쪽(grouping.ts · summary.ts)은 여기서 만든 함수를 받기만 함(테스트는 가짜). 키는 명령이 ANTHROPIC_API_KEY를 읽어 넘김
// 결과: stop_reason refusal → 거절, 그 밖은 parsed_output(없거나 max_tokens로 끊기면 null → 규칙 쪽에서 형식 오류), SDK가 던지면 그대로 던짐(호출 실패)
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import type { AiReply, Organize } from './grouping';
import type { Summarize } from './summary';

// 구조화 출력을 지원하는 가장 싼 모델. thinking · effort는 보내지 않음, 스트리밍 없음
export const MODEL = 'claude-haiku-4-5-20251001';

const OrganizeSchema = z.object({
  issues: z.array(z.object({
    section: z.enum(['pol', 'eco', 'soc', 'cul', 'wor', 'it']),
    articles: z.array(z.string()),
    // 길이 · 범위 제약은 두지 않음(구조화 출력이 강제하지 못해 SDK 검사가 응답 전체를 버림). 고쳐 쓰기는 grouping.ts의 정리 검사
    importance: z.number(),
    terms: z.array(z.array(z.string())),
  })),
  excluded: z.array(z.string()),
});

const SummarySchema = z.object({ line1: z.string(), line2: z.string(), line3: z.string() });

const ORGANIZE_SYSTEM = `당신은 한국어 뉴스 편집자입니다. 오늘 수집한 기사 목록을 이슈로 정리합니다.
입력은 한 줄에 기사 하나이고, 꼴은 "번호 [수집 섹션 키] 제목 | 설명문 앞부분"입니다(설명문이 없으면 제목만).

규칙
1. 같은 사건(같은 일 · 발표 · 사고)을 다룬 기사끼리 한 묶음으로 묶습니다. 수집 섹션이 달라도 같은 사건이면 묶고, 낱말만 겹치는 다른 사건은 따로 둡니다. 기사 한 건짜리 묶음도 됩니다.
2. 묶음의 섹션은 내용을 보고 6개 키 중 하나로 정합니다: pol 정치 · eco 경제 · soc 사회 · cul 생활·문화 · wor 세계 · it IT·과학. 수집 섹션 태그는 틀릴 수 있습니다.
3. 이슈가 아닌 기사는 excluded에 넣습니다: 사진 · 포토 기사, 자동 생성 주가 · 목표주가 · 시세 기사, 부음 · 인사 · 어학 칼럼.
4. 묶음마다 기사 제목 검색용 terms를 씁니다. terms는 그 사건의 핵심어 2묶음이고, 묶음마다 같은 뜻 말 1~3개를 넣습니다(예: [["장기금리","국채 금리","10년물"],["미국"]]). 말은 한 낱말이나 띄어쓰기가 있는 구절입니다. 한자 약칭(美 · 中 · 日) 대신 한글(미국 · 중국 · 일본)을 쓰고, 검색 문법(AND · OR · 괄호 · 따옴표)은 쓰지 않습니다. 흔한 낱말 하나(예: AI, 정부)만으로 된 묶음은 피합니다.
5. 모든 번호를 묶음(issues의 articles)이나 excluded 중 한 곳에 한 번씩만 넣습니다.
6. 묶음마다 importance(1~5 정수)를 씁니다. 오늘 한국 독자에게 얼마나 큰 뉴스인가입니다(5 = 전국적 큰 사건, 1 = 작은 지역 · 업계 소식).`;

const SUMMARY_SYSTEM = `당신은 한국어 뉴스 편집자입니다. 한 이슈에 묶인 기사들의 제목과 설명문을 읽고 이슈를 한국어 3줄로 요약합니다.
- line1 · line2 · line3에 한 줄씩, 줄마다 한 문장으로 100자 이내로 씁니다.
- 제목 · 설명문에 있는 사실만 씁니다. 추측 · 평가 · 해석은 쓰지 않습니다. 예를 들어 "부적절한 태도를 지적했다"처럼 입력에 없는 판단을 덧붙이지 않습니다.
- 기사 문장을 그대로 옮기지 않습니다.
- 입력이 짧으면 있는 짧은 사실을 세 줄로 나눠 쓰고, 입력에 없는 내용을 덧붙이지 않습니다.`;

// 한 번 요청: messages.parse + output_config.format(zod). 형식이 안 맞아 SDK 파싱이 실패하면 던지지 않고 null(형식 오류로 셈)
async function ask<T>(client: Anthropic, schema: z.ZodType<T>, system: string, content: string, maxTokens: number): Promise<AiReply<T>> {
  const format = zodOutputFormat(schema);
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content }],
    output_config: {
      format: {
        ...format,
        parse: (text: string): T | null => {
          try { return format.parse(text); } catch { return null; }
        },
      },
    },
  });
  if (response.stop_reason === 'refusal') return { refusal: true };
  if (response.stop_reason === 'max_tokens') return { refusal: false, output: null };
  return { refusal: false, output: response.parsed_output ?? null };
}

// 키로 정리 · 요약 함수를 만듦(명령이 try 안에서 부름)
export function aiClient(apiKey: string): { organize: Organize; summarize: Summarize } {
  const client = new Anthropic({ apiKey });
  return {
    organize: lines => ask(client, OrganizeSchema, ORGANIZE_SYSTEM, lines.join('\n'), 8000),
    summarize: articles => ask(client, SummarySchema, SUMMARY_SYSTEM,
      articles.map((a, i) => `${i + 1}. 제목: ${a.title}${a.description ? `\n   설명문: ${a.description}` : ''}`).join('\n'), 1000),
  };
}
