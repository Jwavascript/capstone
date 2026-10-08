import type { CSSProperties } from 'react';
import { SEC, SECTIONS, secColor, secIssues, type Ranking, type SectionKey } from '../lib/api';
import Item, { EmptyNoData } from './Item';

/* ─────────────── View 2: 랭킹 목록 ─────────────── */
export type Tab = 'all' | SectionKey;
const TABS: { key: Tab; name: string }[] = [{ key: 'all', name: '전체' }, ...SECTIONS];

type Props = {
  ready: boolean;
  ranking: Ranking | null;
  section: Tab;
  expanded: boolean;
  isSaved: (id: string) => boolean;
  onSection: (t: Tab) => void;
  onExpanded: (on: boolean) => void;
  onBm: (btn: HTMLElement, id: string) => void;
  onToday: () => void;
};
export default function RankList({ ready, ranking, section, expanded, isSaved, onSection, onExpanded, onBm, onToday }: Props) {
  const secs = section === 'all' ? SECTIONS : [SEC[section]];
  return (
    <>
      <div className="tabs" role="tablist" id="secTabs" aria-label="섹션">
        {TABS.map(t => (
          <button key={t.key} role="tab" aria-selected={section === t.key} onClick={() => onSection(t.key)}>
            {t.key !== 'all' && <span className="dot" style={{ '--c': secColor(t.key) } as CSSProperties}></span>}{t.name}
          </button>
        ))}
      </div>
      <div className="list-tools">
        <label className="toggle"><input type="checkbox" id="sumToggle" checked={expanded} onChange={e => onExpanded(e.target.checked)} /><span className="track"></span>요약 펼치기</label>
      </div>
      <div id="rankList" className={expanded ? undefined : 'compact'}>
        {ready && (ranking
          ? secs.map(s => (
            <section className="group" key={s.key}>
              <div className="group-head"><h2><span className="dot" style={{ '--c': secColor(s.key) } as CSSProperties}></span>{s.name}</h2><span>Top 5</span></div>
              <ol className="items">{secIssues(ranking, s.key).map(it => <Item key={it.id} it={it} on={isSaved(it.id)} onBm={onBm} />)}</ol>
            </section>
          ))
          : <EmptyNoData onToday={onToday} />)}
      </div>
      <div className="footer">요약은 AI가 생성했으며 원문은 네이버 뉴스에서 확인할 수 있습니다.</div>
    </>
  );
}
