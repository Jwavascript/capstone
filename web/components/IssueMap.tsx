import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { MAX_COUNT, SEC, SECTIONS, secColor, secIssues, type Ranking, type SectionKey } from '../lib/api';
import { EmptyNoData } from './Item';
import { IconMark } from './icons';

/* ─────────────── View 1: 이슈맵 (treemap) ─────────────── */
type Rect = { x: number; y: number; w: number; h: number };
function squarify<T extends { value: number }>(items: T[], x: number, y: number, w: number, h: number): (T & Rect)[] {
  // items: [{value, ...}] → [{...item, x, y, w, h}]
  const total = items.reduce((a, b) => a + b.value, 0);
  if (!total || w <= 0 || h <= 0) return [];
  const scale = (w * h) / total;
  const rest = items.map(it => ({ it, a: it.value * scale })).sort((a, b) => b.a - a.a);
  type Cell = (typeof rest)[number];
  const out: (T & Rect)[] = [];
  const worst = (row: Cell[], side: number) => {
    const s = row.reduce((a, b) => a + b.a, 0); let mx = 0, mn = Infinity;
    for (const r of row) { mx = Math.max(mx, r.a); mn = Math.min(mn, r.a); }
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  const layout = (row: Cell[]) => {
    const s = row.reduce((a, b) => a + b.a, 0);
    if (w >= h) { // 왼쪽에 세로 열
      const cw = s / h; let cy = y;
      for (const r of row) { const rh = r.a / cw; out.push({ ...r.it, x, y: cy, w: cw, h: rh }); cy += rh; }
      x += cw; w -= cw;
    } else {      // 위쪽에 가로 행
      const rh = s / w; let cx = x;
      for (const r of row) { const rw = r.a / rh; out.push({ ...r.it, x: cx, y, w: rw, h: rh }); cx += rw; }
      y += rh; h -= rh;
    }
  };
  let row: Cell[] = [];
  while (rest.length) {
    const side = Math.min(w, h);
    if (!row.length || worst([...row, rest[0]], side) <= worst(row, side)) row.push(rest.shift()!);
    else { layout(row); row = []; }
  }
  if (row.length) layout(row);
  return out;
}

const GAP = 2, LABEL_H = 22;

type Props = {
  ready: boolean;
  active: boolean;
  ranking: Ranking | null;
  zoom: SectionKey | null;
  selected: string | null;
  isSaved: (id: string) => boolean;
  onZoom: (k: SectionKey | null) => void;
  onOpen: (id: string) => void;
  onToday: () => void;
};
export default function IssueMap({ ready, active, ranking, zoom, selected, isSaved, onZoom, onOpen, onToday }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ W: 0, H: 0 });
  const hasMap = ready && !!ranking;

  // 지도 크기: 보기가 열릴 때 · 크기가 바뀔 때. 숨은 동안(0×0)은 이전 배치를 그대로 둠
  useLayoutEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const measure = () => {
      const W = map.clientWidth, H = map.clientHeight;
      if (W && H) setSize(s => (s.W === W && s.H === H ? s : { W, H }));
    };
    measure();
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); });
    ro.observe(map);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [hasMap, active]);

  const secTotal = (k: string) => secIssues(ranking, k).reduce((a, b) => a + b.articleCount, 0);
  const { W, H } = size;
  const gRects: { s: (typeof SECTIONS)[number]; x: number; y: number; w: number; h: number; hidden?: boolean }[] = !hasMap ? [] : zoom
    ? SECTIONS.map(s => s.key === zoom ? { s, x: 0, y: 0, w: W, h: H } : { s, x: W / 2, y: H / 2, w: 0, h: 0, hidden: true })
    : squarify(SECTIONS.map(s => ({ s, value: secTotal(s.key) })), 0, 0, W, H);
  const gByKey = new Map(gRects.map(r => [r.s.key, r]));

  return (
    <>
      <div className="map-tools">
        <div className="crumbs" id="crumbs">
          {hasMap && (zoom
            ? <><button onClick={() => onZoom(null)}>전체 섹션</button><span>/</span><b>{SEC[zoom].name}</b><span className="num">연관기사 {secTotal(zoom)}건</span></>
            : <span className="num">연관기사 합계 {SECTIONS.reduce((a, s) => a + secTotal(s.key), 0).toLocaleString()}건</span>)}
        </div>
        <div className="legend" id="legend">
          {hasMap && SECTIONS.map(s => <button key={s.key} onClick={() => onZoom(s.key)}><i className="dot" style={{ '--c': secColor(s.key) } as CSSProperties}></i>{s.name}</button>)}
        </div>
      </div>
      <div id="mapBody">
        {ready && !ranking && <EmptyNoData onToday={onToday} />}
        {hasMap && (
          <div className="map" id="map" ref={mapRef}>
            {/* 상자 · 타일은 섹션 · 순위 순서로 그려 같은 요소를 유지(확대/전체 전환 애니메이션) */}
            {SECTIONS.map(s => {
              const r = gByKey.get(s.key);
              if (!r) return null;
              const bw = Math.max(0, r.w - GAP), bh = Math.max(0, r.h - GAP);
              const tRects = r.hidden ? [] : squarify(secIssues(ranking, s.key).map(it => ({ it, value: it.articleCount })), 0, LABEL_H, bw, bh - LABEL_H);
              const tById = new Map(tRects.map(t => [t.it.id, t]));
              return (
                <div key={s.key} className="group-box" data-s={s.key}
                  style={{ left: r.x + GAP / 2, top: r.y + GAP / 2, width: bw, height: bh, opacity: r.hidden ? 0 : 1, pointerEvents: r.hidden ? 'none' : undefined }}>
                  <button className="group-label" onClick={() => onZoom(zoom ? null : s.key)}>
                    <i className="dot" style={{ '--c': secColor(s.key) } as CSSProperties}></i>{s.name} <span className="cnt num">{secTotal(s.key)}</span><span className="arrow">{zoom ? '← 전체' : '확대 →'}</span>
                  </button>
                  {secIssues(ranking, s.key).map(it => {
                    const t = tById.get(it.id);
                    if (!t) return null;
                    const tw = Math.max(0, t.w - GAP), th = Math.max(0, t.h - GAP);
                    const fs = Math.max(11.5, Math.min(zoom ? 24 : 17, Math.sqrt(tw * th) / 10.5));
                    const lines = Math.max(1, Math.floor((th - 36) / (fs * 1.32)));
                    const cls = ['tile', (th < 48 || tw < 72) && 'xs', (th < 20 || tw < 30) && 'xxs', selected === it.id && 'sel', isSaved(it.id) && 'saved'].filter(Boolean).join(' ');
                    return (
                      <button key={it.id} className={cls} data-id={it.id} onClick={() => onOpen(it.id)}
                        aria-label={`${s.name} ${it.rank}위 ${it.title}, 연관기사 ${it.articleCount}건`}
                        style={{
                          left: t.x + GAP / 2, top: t.y + GAP / 2, width: tw, height: th,
                          '--c': secColor(it.section),
                          // finviz처럼 같은 색 계열 안에서 명도로 강도 표현: 연관기사가 적을수록 밝게
                          '--l': (0.24 * (1 - Math.min(1, it.articleCount / MAX_COUNT))).toFixed(3),
                        } as CSSProperties}>
                        <span className="t" style={{ fontSize: fs, WebkitLineClamp: lines }}>{it.title}</span>
                        <span className="foot"><span className="rk">{it.rank}위</span><span className="n num">{it.articleCount}건</span><IconMark /></span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="footer">섹션 영역의 넓이는 Top 5 연관기사 합계, 각 타일은 이슈별 연관기사 수에 비례합니다. 타일을 누르면 요약을 볼 수 있습니다.</div>
    </>
  );
}
