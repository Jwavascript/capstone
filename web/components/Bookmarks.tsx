import type { ReactNode } from 'react';
import type { Bookmark, Folder, View } from '../lib/api';
import { fmtDate } from '../lib/date';
import Item from './Item';

/* ─────────────── View 3: 북마크 (단순 목록) ─────────────── */
type Props = {
  ready: boolean;
  loggedIn: boolean;
  bookmarks: Bookmark[];
  folders: Folder[];
  folderFilter: string;
  isSaved: (id: string) => boolean;
  onFilter: (id: string) => void;
  onBm: (btn: HTMLElement, id: string) => void;
  onLogin: () => void;
  onGo: (view: View) => void;
};
export default function Bookmarks({ ready, loggedIn, bookmarks: all, folders, folderFilter, isSaved, onFilter, onBm, onLogin, onGo }: Props) {
  const head = (sub: string, chips: ReactNode, list: ReactNode) => (
    <>
      <div className="bm-head">
        <h1>북마크</h1>
        <p id="bmSub">{sub}</p>
      </div>
      <div className="chips" id="folderChips" role="group" aria-label="폴더">{chips}</div>
      <div id="bmList">{list}</div>
      <div className="footer">북마크는 계정에 저장되어 어느 기기에서든 같은 목록이 보입니다.</div>
    </>
  );
  if (!ready) return head('', null, null);
  if (!loggedIn) {
    return head('', null,
      <div className="empty"><b>로그인이 필요합니다</b>로그인하면 북마크한 기사를 모아 볼 수 있습니다.<br /><button className="chip-btn" onClick={onLogin}>로그인</button></div>);
  }

  const filter = folderFilter !== 'all' && !folders.some(f => f.id === folderFilter) ? 'all' : folderFilter;
  const folderName = (id: string) => folders.find(f => f.id === id)?.name ?? '';
  const chips = [{ id: 'all', name: '전체', n: all.length }, ...folders.map(f => ({ id: f.id, name: f.name, n: f.count }))]
    .map(c => <button key={c.id} className="chip" aria-pressed={filter === c.id} onClick={() => onFilter(c.id)}>{c.name} <span className="cnt num">{c.n}</span></button>);

  const items = all.filter(it => filter === 'all' || it.folderId === filter).sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
  if (!items.length) {
    return head(`저장한 기사 ${all.length}개 · 최근 저장 순`, chips,
      <div className="empty"><b>북마크한 기사가 없습니다</b>이슈맵이나 랭킹에서 관심 있는 이슈를 북마크해 보세요.<br /><button className="chip-btn" onClick={() => onGo('map')}>이슈맵 보러 가기</button></div>);
  }
  // 랭킹 날짜별로 묶어 표시 (날짜가 다른 뉴스끼리 섞이지 않게)
  const byDate = new Map<string, Bookmark[]>();
  for (const it of items) { if (!byDate.has(it.date)) byDate.set(it.date, []); byDate.get(it.date)!.push(it); }
  return head(`저장한 기사 ${all.length}개 · 최근 저장 순`, chips,
    [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([d, arr]) => (
      <section className="group" key={d}>
        <div className="group-head"><h2>{fmtDate(d)} 랭킹</h2><span>{arr.length}</span></div>
        <ol className="items">{arr.map(it => <Item key={it.id} it={it} saved on={isSaved(it.id)} folderName={folderName(it.folderId)} onBm={onBm} />)}</ol>
      </section>
    )));
}
