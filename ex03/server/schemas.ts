// 입력 규칙(Zod): 랭킹 날짜 · 북마크 저장 · 폴더 만들기. 어기면 400 { message }
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { SECTIONS, kstToday } from './sample';

export const BAD_REQUEST = '요청 형식이 올바르지 않습니다';
const DATE_FORMAT = '날짜는 YYYY-MM-DD 형식으로 입력해 주세요';
const DATE_FUTURE = '오늘 이후 날짜는 조회할 수 없습니다';
const FOLDER_NAME = '폴더 이름은 1~16자로 입력해 주세요';

// YYYY-MM-DD(월 · 일 두 자리) + 달력에 있는 날짜
const isDate = (s: string) => z.iso.date().safeParse(s).success;

// {날짜}-{섹션 키}-{숫자}. 미래 여부는 보지 않음
const isIssueId = (id: string) => {
  const m = /^(.{10})-([a-z]+)-\d+$/.exec(id);
  return !!m && isDate(m[1]) && SECTIONS.some(s => s.key === m[2]);
};

// GET /api/rankings ?date: 형식 → 미래 순서. 생략하면 KST 오늘(라우트에서)
export const rankingsQuery = z.object({
  date: z.iso.date({ error: DATE_FORMAT }).refine(d => d <= kstToday(), { error: DATE_FUTURE }).optional(),
});

// POST /api/bookmarks 본문. 표에 없는 칸은 무시
export const bookmarkCreate = z.object({
  issueId: z.string({ error: BAD_REQUEST }).refine(isIssueId, { error: BAD_REQUEST }),
  folderId: z.string({ error: BAD_REQUEST }).min(1, { error: BAD_REQUEST }),
}, { error: BAD_REQUEST });

// POST /api/folders 본문. 앞뒤 공백을 뺀 1~16자, 뺀 값으로 저장. 같은 이름 허용
export const folderCreate = z.object({
  name: z.string({ error: FOLDER_NAME }).trim().min(1, { error: FOLDER_NAME }).max(16, { error: FOLDER_NAME }),
}, { error: BAD_REQUEST });

// 검사 실패 시 첫 위반의 메시지로 400
export const validate = <T extends z.ZodType>(target: 'json' | 'query', schema: T) =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) return c.json({ message: result.error.issues[0].message }, 400);
  });
