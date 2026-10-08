'use client';
import { useEffect, useRef, useState } from 'react';
import Bookmarks from '../components/Bookmarks';
import DateContext from '../components/DateContext';
import Drawer, { type DrawerState } from '../components/Drawer';
import FolderPop, { type Pop } from '../components/FolderPop';
import Header from '../components/Header';
import IssueMap from '../components/IssueMap';
import RankList, { type Tab } from '../components/RankList';
import Tip from '../components/Tip';
import Toast, { type ToastState } from '../components/Toast';
import { api, issueById, type Bookmark, type Folder, type Ranking, type SectionKey, type View } from '../lib/api';
import { TODAY, addDays } from '../lib/date';

const ORDER: View[] = ['map', 'list', 'bookmarks'];
const viewFromHash = (): View => {
  const h = location.hash.slice(1) as View;
  return ORDER.includes(h) ? h : 'map';
};
const message = (e: unknown) => (e as Error).message;

export default function Page() {
  /* ─────────────── State ─────────────── */
  const [ready, setReady] = useState(false);              // 첫 데이터를 받기 전엔 날짜 · 데이터 칸을 비워 둠
  const [view, setView] = useState<View>('map');
  const [from, setFrom] = useState<'left' | 'right'>();   // 보기 전환 방향(애니메이션)
  const [date, setDate] = useState(TODAY);
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [section, setSection] = useState<Tab>('all');     // 목록 탭
  const [zoom, setZoom] = useState<SectionKey | null>(null); // 이슈맵 확대 섹션
  const [expanded, setExpanded] = useState(true);
  const [loggedIn, setLoggedIn] = useState(true);
  const [folderFilter, setFolderFilter] = useState('all');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [pop, setPop] = useState<Pop>(null);
  const [toastState, setToastState] = useState<ToastState>({ msg: '', show: false });
  const viewRef = useRef<View>('map');                    // 토스트 버튼처럼 나중에 불리는 go()도 지금 보기를 알게
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const findBookmark = (id: string) => bookmarks.find(b => b.id === id) || null;
  const isSaved = (id: string) => !!findBookmark(id);
  const popFor = pop?.open ? pop.id : null;
  const selected = drawer?.open ? drawer.it.id : null;

  /* ─────────────── Toast ─────────────── */
  function toast(msg: string, action?: string, fn?: () => void) {
    setToastState({ msg, action, fn, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(t => ({ ...t, show: false })), 3600);
  }

  /* ─────────────── Date & ranking ─────────────── */
  // 첫 진입은 date 없이 부르고, 받은 date로 시작
  async function loadRanking(d?: string) {
    try {
      const r = await api<Ranking>('/rankings' + (d ? `?date=${d}` : ''));
      setRanking(r); setDate(r.date);
    } catch (e) {
      setRanking(null);
      if (d) setDate(d);
      if ((e as { status?: number }).status !== 404) toast(message(e));
    }
  }
  // 받은 폴더 목록을 돌려줌(방금 만든 폴더 이름을 토스트에 바로 쓰려고)
  async function loadBookmarks() {
    try {
      const [b, f] = await Promise.all([api<Bookmark[]>('/bookmarks'), api<Folder[]>('/folders')]);
      setBookmarks(b); setFolders(f);
      return f;
    } catch (e) { toast(message(e)); }
  }
  async function changeDate(d: string) {
    await loadRanking(d > TODAY ? TODAY : d);
    closeDrawer();
  }

  /* ─────────────── Drawer · popover ─────────────── */
  function openDrawer(id: string) {
    const it = issueById(ranking, id); if (!it) return;
    setDrawer({ it, open: true });
  }
  function closeDrawer() {
    setDrawer(d => (d?.open ? { ...d, open: false } : d));
    if (drawer?.open) closePop();
  }
  function openPop(btn: HTMLElement, id: string) {
    const rect = btn.getBoundingClientRect();
    setPop(p => ({ id, rect, open: true, n: (p?.n ?? 0) + 1 }));
  }
  const closePop = () => setPop(p => (p?.open ? { ...p, open: false } : p));

  /* ─────────────── Bookmarks ─────────────── */
  // 저장 · 해제 뒤 북마크 · 폴더 목록을 다시 받음. 실패하면 응답 message를 토스트로
  const postBookmark = (issueId: string | null, folderId: string) => api('/bookmarks', { method: 'POST', body: JSON.stringify({ issueId, folderId }) });
  async function save(id: string | null, folderId: string) {
    closePop();
    try { await postBookmark(id, folderId); } catch (e) { return toast(message(e)); }
    const f = (await loadBookmarks()) ?? folders;
    toast(`‘${f.find(x => x.id === folderId)?.name ?? ''}’에 저장했습니다`, '북마크 보기', () => { setFolderFilter(folderId); go('bookmarks'); });
  }
  async function unsave(id: string) {
    const hit = findBookmark(id); if (!hit) return;
    try { await api(`/bookmarks/${encodeURIComponent(id)}`, { method: 'DELETE' }); } catch (e) { return toast(message(e)); }
    await loadBookmarks();
    toast('북마크를 해제했습니다', '되돌리기', async () => {
      try { await postBookmark(id, hit.folderId); } catch (e) { return toast(message(e)); }
      await loadBookmarks();
    });
  }
  async function createFolder(name: string) {
    const id = popFor;
    let f: Folder;
    try { f = await api<Folder>('/folders', { method: 'POST', body: JSON.stringify({ name }) }); } catch (e) { return toast(message(e)); }
    save(id, f.id);
  }
  function onBm(btn: HTMLElement, id: string) {
    if (!loggedIn) return toast('북마크하려면 로그인이 필요합니다', '로그인', () => setLoggedIn(true));
    if (findBookmark(id)) { closePop(); unsave(id); return; }
    if (popFor === id) closePop(); else openPop(btn, id);
  }
  function toggleLogin() {
    setLoggedIn(!loggedIn);
    toast(!loggedIn ? '로그인했습니다 (데모)' : '로그아웃했습니다');
  }

  /* ─────────────── Navigation ─────────────── */
  function go(next: View, push = true) {
    const prev = viewRef.current;
    viewRef.current = next;
    if (prev !== next) setFrom(ORDER.indexOf(next) > ORDER.indexOf(prev) ? 'right' : 'left');
    setView(next);
    closePop(); closeDrawer();
    if (push && location.hash !== `#${next}`) history.pushState(null, '', `#${next}`);
    if (prev !== next) scrollTo({ top: 0 });
  }

  /* ─────────────── Events ─────────────── */
  // 팝오버 밖(북마크 버튼 제외)을 누르면 닫음
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest?.('#pop') && !t.closest?.('[data-bm]')) closePop();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  // 키보드 · 뒤로 가기(지금 상태를 쓰므로 렌더마다 다시 붙임)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element).matches?.('input, select, textarea')) return;
      if (e.key === 'Escape') { closePop(); closeDrawer(); }
      if (e.key === '1') go('map');
      if (e.key === '2') go('list');
      if (e.key === '3') go('bookmarks');
      if (e.key === 'ArrowLeft' && view !== 'bookmarks') changeDate(addDays(date, -1));
      if (e.key === 'ArrowRight' && view !== 'bookmarks' && date < TODAY) changeDate(addDays(date, 1));
    };
    const onPopState = () => go(viewFromHash(), false);
    document.addEventListener('keydown', onKey);
    addEventListener('popstate', onPopState);
    return () => { document.removeEventListener('keydown', onKey); removeEventListener('popstate', onPopState); };
  });

  /* ─────────────── Init ─────────────── */
  useEffect(() => {
    (async () => {
      await Promise.all([loadRanking(), loadBookmarks()]);
      setReady(true);
      go(viewFromHash(), false);
    })();
  }, []);

  const viewAttrs = (v: View) => ({ className: `view${view === v ? ' active' : ''}`, 'data-from': view === v ? from : undefined });

  return (
    <>
      <Header view={view} bmCount={loggedIn && bookmarks.length ? bookmarks.length : ''} loggedIn={loggedIn} onGo={v => go(v)} onUser={toggleLogin} />

      <main>
        {/* 이슈맵·랭킹이 공유하는 날짜 영역 */}
        <DateContext ready={ready} date={date} ranking={ranking} view={view} onDate={changeDate} />

        {/* ═════ View 1: 이슈맵 ═════ */}
        <section id="view-map" aria-label="이슈맵" {...viewAttrs('map')}>
          <div className="wrap-wide">
            <IssueMap ready={ready} active={view === 'map'} ranking={ranking} zoom={zoom} selected={selected} isSaved={isSaved}
              onZoom={k => { setZoom(k); closeDrawer(); }} onOpen={openDrawer} onToday={() => changeDate(TODAY)} />
          </div>
        </section>

        {/* ═════ View 2: 랭킹 목록 ═════ */}
        <section id="view-list" aria-label="랭킹 목록" {...viewAttrs('list')}>
          <div className="wrap">
            <RankList ready={ready} ranking={ranking} section={section} expanded={expanded} isSaved={isSaved}
              onSection={setSection} onExpanded={setExpanded} onBm={onBm} onToday={() => changeDate(TODAY)} />
          </div>
        </section>

        {/* ═════ View 3: 북마크 ═════ */}
        <section id="view-bookmarks" aria-label="북마크" {...viewAttrs('bookmarks')}>
          <div className="wrap">
            <Bookmarks ready={ready} loggedIn={loggedIn} bookmarks={bookmarks} folders={folders} folderFilter={folderFilter} isSaved={isSaved}
              onFilter={setFolderFilter} onBm={onBm} onLogin={toggleLogin} onGo={v => go(v)} />
          </div>
        </section>
      </main>

      <Tip ranking={ranking} drawerOpen={!!drawer?.open} view={view} />
      <Drawer drawer={drawer} on={!!drawer && isSaved(drawer.it.id)} onClose={closeDrawer} onBm={onBm} />
      <FolderPop pop={pop} folders={folders} onSave={folderId => save(popFor, folderId)} onCreate={createFolder} />
      <Toast t={toastState} onAction={() => { setToastState(t => ({ ...t, show: false })); toastState.fn?.(); }} />
    </>
  );
}
