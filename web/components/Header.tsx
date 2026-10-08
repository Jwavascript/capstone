import { useLayoutEffect, useRef } from 'react';
import type { View } from '../lib/api';

type Props = {
  view: View;
  bmCount: number | '';
  loggedIn: boolean;
  onGo: (view: View) => void;
  onUser: () => void;
};
export default function Header({ view, bmCount, loggedIn, onGo, onUser }: Props) {
  const swRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  // 보기 전환 pill 위치: 보기가 바뀔 때 · 크기가 바뀔 때 · 글꼴을 받은 뒤
  useLayoutEffect(() => {
    const placePill = () => {
      const btn = swRef.current?.querySelector<HTMLElement>(`[data-view="${view}"]`);
      const pill = pillRef.current;
      if (!btn || !pill) return;
      pill.style.width = btn.offsetWidth + 'px';
      pill.style.transform = `translateX(${btn.offsetLeft - 3}px)`;
    };
    placePill();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(placePill); });
    ro.observe(document.body);
    document.fonts?.ready.then(placePill);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [view]);

  return (
    <header className="header">
      <div className="header-inner">
        <a className="brand" href="#map" aria-label="이슈랭크 홈">
          <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>이슈랭크</span>
        </a>
        <nav className={`switch${view === 'bookmarks' ? ' off' : ''}`} role="tablist" aria-label="보기 전환" ref={swRef}>
          <span className="switch-pill" aria-hidden="true" ref={pillRef}></span>
          <button role="tab" data-view="map" aria-selected={view === 'map'} onClick={() => onGo('map')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="12" height="20" rx="1.5"/><rect x="16" y="2" width="6" height="11" rx="1.5"/><rect x="16" y="15" width="6" height="7" rx="1.5"/></svg>
            이슈맵 <kbd>1</kbd>
          </button>
          <button role="tab" data-view="list" aria-selected={view === 'list'} onClick={() => onGo('list')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
            랭킹 <kbd>2</kbd>
          </button>
        </nav>
        <div className="header-right">
          <button className="pill-btn" id="bmNav" aria-label="북마크" aria-current={view === 'bookmarks' ? 'page' : undefined} onClick={() => onGo('bookmarks')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3.8h12v17l-6-4.2-6 4.2z"/></svg>
            <span className="lbl">북마크</span><span className="cnt num">{bmCount}</span>
          </button>
          <button className="pill-btn" id="userBtn" onClick={onUser}>
            {loggedIn ? <><span className="avatar">김</span>로그아웃</> : '로그인'}
          </button>
        </div>
      </div>
    </header>
  );
}
