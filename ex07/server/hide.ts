// 명령(collect.ts · group.ts)이 찍는 문구 안의 DATABASE_URL 값 · 그 비밀번호 · 키를 ***로
export function hide(text: string) {
  const url = process.env.DATABASE_URL ?? '';
  const password = /^[^:]+:\/\/[^:@/]*:(.*)@/.exec(url)?.[1] ?? '';
  let decoded = '';
  try { decoded = decodeURIComponent(password); } catch {}
  return [url, password, decoded, process.env.NEWSDATA_API_KEY ?? '']
    .filter(Boolean)
    .reduce((t, secret) => t.replaceAll(secret, '***'), text);
}
