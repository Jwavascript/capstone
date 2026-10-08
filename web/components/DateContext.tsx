import type { Ranking, View } from '../lib/api';
import { TODAY, addDays, fmtDate, fmtUpdated } from '../lib/date';

/* ─────────────── Shared date context (map + list) ─────────────── */
type Props = {
  ready: boolean;
  date: string;
  ranking: Ranking | null;
  view: View;
  onDate: (d: string) => void;
};
export default function DateContext({ ready, date, ranking, view, onDate }: Props) {
  const isToday = date === TODAY;
  return (
    <div className="wrap-wide" id="contextWrap" hidden={view === 'bookmarks'}>
      <div className={`context${view === 'list' ? ' narrow' : ''}`} id="context">
        <div className="ctx-row">
          <div>
            <h1 id="rankTitle">{!ready || isToday ? '오늘 가장 많이 보도된 이슈' : `${fmtDate(date)}의 주요 이슈`}</h1>
            <p id="rankDesc">{ready && (view === 'map'
              ? '6개 섹션 Top 5 이슈를 연관기사 수만큼의 넓이로 한 화면에 펼쳤습니다.'
              : '섹션마다 연관기사가 많은 순으로 상위 5개 이슈를 AI가 3줄로 요약했습니다.')}</p>
          </div>
          <div>
            <div className="datebar">
              <button className="icon-btn" id="prevDay" aria-label="이전 날짜" onClick={() => onDate(addDays(date, -1))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <label className="date-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                <span id="dateText" className="num">{ready && fmtDate(date) + (isToday ? ' · 오늘' : '')}</span>
                <input type="date" id="dateInput" aria-label="날짜 선택" value={ready ? date : ''} max={ready ? TODAY : undefined}
                  onChange={e => { if (e.target.value) onDate(e.target.value); }} />
              </label>
              <button className="icon-btn" id="nextDay" aria-label="다음 날짜" disabled={ready && isToday} onClick={() => onDate(addDays(date, 1))}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
              </button>
              <button className="chip-btn" id="todayBtn" hidden={!ready || isToday} onClick={() => onDate(TODAY)}>오늘</button>
            </div>
            <div className="updated num" id="updated">
              {ready && ranking ? `${fmtUpdated(ranking.updatedAt)} 수집 · 이슈 ${ranking.sections.reduce((a, x) => a + x.issues.length, 0)}개` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
