import type { CSSProperties } from 'react';
import { SEC, secColor, type Issue } from '../lib/api';
import { fmtDate, fmtShort } from '../lib/date';
import { IconBm, IconExt, IconX } from './icons';
import { Score, Summary } from './Item';

/* ─────────────── Drawer (이슈 상세) ─────────────── */
// 닫히는 동안에도 내용이 보이도록 연 이슈(it)를 open과 따로 둠
export type DrawerState = { it: Issue; open: boolean } | null;

type Props = {
  drawer: DrawerState;
  on: boolean;
  onClose: () => void;
  onBm: (btn: HTMLElement, id: string) => void;
};
export default function Drawer({ drawer, on, onClose, onBm }: Props) {
  const open = !!drawer?.open;
  const it = drawer?.it;
  return (
    <>
      <div className={`scrim${open ? ' show' : ''}`} id="scrim" onClick={onClose}></div>
      <aside className={`drawer${open ? ' show' : ''}`} id="drawer" aria-label="이슈 상세" aria-hidden={!open}>
        {it && (
          <>
            <div className="drawer-top">
              <div className="item-meta"><span className="dot" style={{ '--c': secColor(it.section) } as CSSProperties}></span><span className="sec">{SEC[it.section].name}</span><span>·</span><span>{fmtDate(it.date)} 랭킹</span></div>
              <button className="icon-btn" aria-label="닫기" onClick={onClose}><IconX /></button>
            </div>
            <div className="drawer-body">
              <div className="rank-big"><Score it={it} /><span className="item-meta"><span className="sec">{SEC[it.section].name} {it.rank}위</span></span></div>
              <h2>{it.title}</h2>
              <Summary s={it.summary} />
              <dl className="facts">
                <dt>연관기사</dt><dd className="num">{it.articleCount}건</dd>
                <dt>섹션 순위</dt><dd>{SEC[it.section].name} {it.rank}위 / 5</dd>
                <dt>수집</dt><dd>{fmtShort(it.date)} 오전 6:00</dd>
              </dl>
            </div>
            <div className="drawer-foot">
              <a className="btn-primary" href={it.url} target="_blank" rel="noopener">네이버 원문 <IconExt /></a>
              <button className={`btn-ghost bm-wide ${on ? 'on' : ''}`} data-bm={it.id} aria-pressed={on} onClick={e => onBm(e.currentTarget, it.id)}>
                <IconBm /><span>{on ? '북마크됨' : '북마크'}</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
