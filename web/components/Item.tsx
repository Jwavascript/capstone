import type { CSSProperties } from 'react';
import { MAX_COUNT, SEC, secColor, type Bookmark, type Issue } from '../lib/api';
import { timeAgo } from '../lib/date';
import { IconBm, IconExt } from './icons';

export const Summary = ({ s }: { s: string[] | null }) => s
  ? <ul className="summary">{s.map((l, i) => <li key={i}>{l}</li>)}</ul>
  : <ul className="summary pending"><li>요약을 준비 중입니다</li></ul>;

export const Score = ({ it }: { it: Issue }) => {
  const w = Math.round(10 + (it.articleCount / MAX_COUNT) * 26);
  return (
    <div className="score num" style={{ '--c': secColor(it.section), '--w': `${w}%` } as CSSProperties}>
      <b>{it.articleCount}</b><small>연관기사</small>
    </div>
  );
};

export const EmptyNoData = ({ onToday }: { onToday: () => void }) => (
  <div className="empty"><b>해당 날짜의 랭킹 데이터가 없습니다</b>다른 날짜를 선택하거나 오늘 랭킹으로 돌아가세요.<br /><button className="chip-btn" onClick={onToday}>오늘 랭킹 보기</button></div>
);

/* ─────────────── Shared item (목록·북마크 공용) ─────────────── */
type Props = {
  it: Issue | Bookmark;
  saved?: boolean;
  on: boolean;
  folderName?: string;
  onBm: (btn: HTMLElement, id: string) => void;
};
export default function Item({ it, saved, on, folderName, onBm }: Props) {
  return (
    <li className="item" data-id={it.id}>
      <Score it={it} />
      <div>
        <div className="item-meta">
          {saved && 'savedAt' in it
            ? <><span className="sec">{SEC[it.section].name} {it.rank}위</span><span>·</span><span>{folderName}</span><span className="saved-at">{timeAgo(it.savedAt)} 저장</span></>
            : <span className="sec">{it.rank}위</span>}
        </div>
        <h3><a href={it.url} target="_blank" rel="noopener">{it.title}</a></h3>
        <Summary s={it.summary} />
        <a className="src" href={it.url} target="_blank" rel="noopener">네이버 원문 <IconExt /></a>
      </div>
      <button className={`bm ${on ? 'on' : ''}`} data-bm={it.id} aria-pressed={on} aria-label={on ? '북마크 해제' : '북마크'} onClick={e => onBm(e.currentTarget, it.id)}><IconBm /></button>
    </li>
  );
}
