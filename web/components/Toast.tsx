/* ─────────────── Toast ─────────────── */
export type ToastState = { msg: string; action?: string; fn?: () => void; show: boolean };

export default function Toast({ t, onAction }: { t: ToastState; onAction: () => void }) {
  return (
    <div className={`toast${t.show ? ' show' : ''}`} id="toast" role="status">
      {t.msg && <><span>{t.msg}</span>{t.action && <button onClick={onAction}>{t.action}</button>}</>}
    </div>
  );
}
