import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { SEC, issueById, secColor, type Issue, type Ranking, type View } from '../lib/api';
import { Summary } from './Item';

/* ─────────────── Tooltip (이슈맵) ─────────────── */
type Props = { ranking: Ranking | null; drawerOpen: boolean; view: View };
export default function Tip({ ranking, drawerOpen, view }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const [it, setIt] = useState<Issue | null>(null);
  const [show, setShow] = useState(false);

  const place = () => {
    const tip = ref.current;
    if (!tip) return;
    const pad = 16, tw = 290, th = tip.offsetHeight;
    let x = pos.current.x + pad, y = pos.current.y + pad;
    if (x + tw > innerWidth - 8) x = pos.current.x - tw - pad;
    if (y + th > innerHeight - 8) y = pos.current.y - th - pad;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const tile = (e.target as Element).closest?.('.tile') as HTMLElement | null;
      if (!tile || e.pointerType !== 'mouse' || drawerOpen) { setShow(false); return; }
      const found = issueById(ranking, tile.dataset.id); if (!found) return;
      pos.current = { x: e.clientX, y: e.clientY };
      setIt(found); setShow(true); place();
    };
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, [ranking, drawerOpen]);
  // 내용이 바뀌면 새 높이로 다시 자리 잡기
  useLayoutEffect(place, [it]);
  // 드로어가 열리거나 보기가 바뀌면 숨김
  useEffect(() => setShow(false), [drawerOpen, view]);

  return (
    <div className={`tip${show ? ' show' : ''}`} id="tip" role="tooltip" ref={ref}>
      {it && (
        <>
          <div className="item-meta"><span className="dot" style={{ '--c': secColor(it.section) } as CSSProperties}></span><span className="sec">{SEC[it.section].name} {it.rank}위</span><span>·</span><span className="num">연관기사 {it.articleCount}건</span></div>
          <b>{it.title}</b><Summary s={it.summary} />
        </>
      )}
    </div>
  );
}
