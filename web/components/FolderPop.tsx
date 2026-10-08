import { useLayoutEffect, useRef } from 'react';
import type { Folder } from '../lib/api';

/* ─────────────── Folder picker popover ─────────────── */
// n: 열 때마다 1씩 올려 새 폴더 입력칸을 비움
export type Pop = { id: string; rect: DOMRect; open: boolean; n: number } | null;

type Props = {
  pop: Pop;
  folders: Folder[];
  onSave: (folderId: string) => void;
  onCreate: (name: string) => void;
};
export default function FolderPop({ pop, folders, onSave, onCreate }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // 누른 버튼 아래(자리가 없으면 위)에 붙임
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !pop?.open) return;
    const r = pop.rect, ph = el.offsetHeight;
    const below = r.bottom + 6 + ph < innerHeight;
    el.style.top = (below ? r.bottom + 6 : r.top - ph - 6) + scrollY + 'px';
    el.style.left = Math.max(8, Math.min(innerWidth - 240, r.right - 232)) + scrollX + 'px';
  }, [pop]);

  return (
    <div className={`pop${pop?.open ? ' show' : ''}`} id="pop" role="dialog" aria-label="폴더에 저장" ref={ref}>
      {pop && (
        <>
          <div className="pop-title">폴더에 저장</div>
          {folders.map(f => <button key={f.id} className="opt" onClick={() => onSave(f.id)}><span>{f.name}</span><span className="cnt num">{f.count}</span></button>)}
          <form key={pop.n} onSubmit={e => {
            e.preventDefault();
            const name = String(new FormData(e.currentTarget).get('name') ?? '').trim();
            if (name) onCreate(name);
          }}>
            <input name="name" placeholder="새 폴더 이름" maxLength={16} autoComplete="off" /><button>만들기</button>
          </form>
        </>
      )}
    </div>
  );
}
