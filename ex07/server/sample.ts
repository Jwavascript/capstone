// 샘플: 화면에 있던 POOL · rng를 옮겨 실행일(KST) 기준 이슈 · 북마크 · 폴더를 만듦
// seedRows(오늘) · memoryStore(같은 샘플로 도는 메모리 저장소)는 테스트에만 씀(D14: 실제 DB에는 샘플을 넣지 않음)
import { buildRanking, findCard, SECTIONS, type IssueRow, type SectionKey } from './ranking';
import type { Bookmark, Store } from './app';

// 섹션당 7개 풀에서 날짜별로 5개를 뽑아 랭킹 후보 구성
const POOL: Record<SectionKey, [string, string[]][]> = {
  pol: [
    ['내년도 예산안 국회 상임위 심사 본격화', ['상임위별 예비심사가 시작돼 증액·감액 쟁점이 드러나고 있다.', '여야는 지역 SOC와 복지 예산 규모를 두고 이견을 보였다.', '예결위는 다음 달 중순까지 수정안을 마련할 계획이다.']],
    ['국정감사 첫 주, 부처별 현안 질의 집중', ['첫 주에는 경제·외교 부처에 대한 질의가 이어졌다.', '자료 제출 지연을 두고 위원회 곳곳에서 공방이 벌어졌다.', '증인 채택 문제는 다음 주 추가 협의하기로 했다.']],
    ['지방선거 앞두고 선거구 획정안 논의', ['선거구획정위원회가 인구 편차 기준을 반영한 초안을 공개했다.', '일부 지역은 선거구 통폐합 가능성이 제기됐다.', '국회는 이달 안에 획정안 처리를 목표로 한다.']],
    ['여야 원내대표 회동, 민생법안 처리 합의', ['양측은 전세사기 피해 지원 등 민생법안 우선 처리에 합의했다.', '쟁점 법안은 소위에서 추가 논의하기로 했다.', '본회의는 다음 주 목요일 열릴 예정이다.']],
    ['정부 조직 개편안 국무회의 의결', ['일부 위원회를 통합하는 개편안이 국무회의를 통과했다.', '정부는 중복 기능을 정리해 행정 효율을 높인다고 설명했다.', '관련 법 개정안은 이번 주 국회에 제출된다.']],
    ['한중 외교장관 회담, 공급망 협력 논의', ['양국은 핵심 광물 공급망 안정에 협력하기로 했다.', '고위급 교류 정례화 방안도 함께 논의했다.', '후속 실무 협의는 연내 개최될 예정이다.']],
    ['청년 정책 기본계획 발표', ['주거·일자리·자산형성 3개 분야 과제가 담겼다.', '청년 전용 임대주택 공급 목표가 상향됐다.', '세부 예산은 내년 예산안 심사에서 확정된다.']],
  ],
  eco: [
    ['기준금리 동결, 연내 인하 가능성 시사', ['한국은행이 기준금리를 현 수준에서 동결했다.', '물가 둔화 흐름이 이어지면 인하를 검토할 수 있다고 밝혔다.', '시장은 연말 인하 가능성을 높게 반영하기 시작했다.']],
    ['반도체 수출 석 달 연속 증가세', ['9월 반도체 수출이 전년 대비 두 자릿수 증가했다.', 'AI 서버용 고대역폭 메모리 수요가 증가를 이끌었다.', '전체 수출도 함께 늘며 무역수지 흑자가 이어졌다.']],
    ['원·달러 환율 1,380원대 등락', ['미국 고용지표 발표 이후 환율 변동성이 커졌다.', '외국인 주식 순매수가 환율 상단을 제한했다.', '당국은 쏠림 현상을 면밀히 점검하겠다고 밝혔다.']],
    ['수도권 아파트 매매가 상승폭 둔화', ['대출 규제 강화 이후 거래량이 감소했다.', '서울 주요 지역은 여전히 상승세를 유지했다.', '전문가들은 연말까지 관망세가 이어질 것으로 봤다.']],
    ['가계부채 증가세, 2금융권으로 이동', ['은행권 대출 증가폭은 줄었으나 2금융권은 늘었다.', '금융당국은 풍선효과 차단을 위한 점검에 나섰다.', '추가 규제 여부는 이달 말 결정된다.']],
    ['소비자물가 2%대 초반 유지', ['농산물 가격 하락이 물가 안정에 기여했다.', '외식·서비스 물가는 여전히 높은 수준이다.', '정부는 연말 성수품 수급 관리에 들어간다.']],
    ['코스피 외국인 순매수 전환', ['반도체·이차전지 중심으로 외국인 자금이 유입됐다.', '지수는 2주 만에 박스권 상단을 돌파했다.', '증권가는 실적 시즌 결과에 주목하고 있다.']],
  ],
  soc: [
    ['의대 정원 후속 대책, 수련병원 지원 확대', ['정부가 전공의 수련 환경 개선 예산을 늘리기로 했다.', '지역 수련병원에 대한 인건비 지원이 포함됐다.', '의료계는 세부 이행 계획을 요구했다.']],
    ['수도권 광역버스 증차, 출근길 혼잡 완화', ['혼잡도가 높은 노선에 2층 버스가 추가 투입된다.', '배차 간격이 평균 3분가량 줄어들 전망이다.', '운영 결과를 보고 대상 노선을 확대한다.']],
    ['전세사기 피해 지원 특별법 개정 추진', ['피해자 인정 요건을 완화하는 개정안이 발의됐다.', '경매 유예 기간 연장도 함께 담겼다.', '정부는 재정 부담을 이유로 신중한 입장이다.']],
    ['학교폭력 대응 전담 조사관 제도 확대', ['교사 대신 외부 조사관이 사안을 조사하는 제도다.', '시행 첫 학기 교사 업무 부담이 줄었다는 평가가 나왔다.', '내년부터 전국 모든 교육지원청으로 확대된다.']],
    ['가을 태풍 북상, 남부지방 강풍 대비', ['기상청은 주말 남해안에 강한 비바람을 예보했다.', '지자체는 해안가 시설물 점검에 들어갔다.', '항공·여객선 일부 운항 차질이 예상된다.']],
    ['고령 운전자 면허 갱신 기준 강화 논의', ['인지기능 검사 주기를 단축하는 방안이 검토된다.', '조건부 면허 도입에 대한 공청회가 열렸다.', '이동권 보장 대책이 함께 필요하다는 지적이 나왔다.']],
    ['저출생 대책, 육아휴직 급여 상한 인상', ['육아휴직 급여 월 상한액이 단계적으로 오른다.', '중소기업 대체인력 지원금도 확대된다.', '시행 시기는 내년 1월부터다.']],
  ],
  cul: [
    ['가을 축제 시즌, 지역 관광객 증가', ['주요 지역 축제 방문객이 지난해보다 늘었다.', '숙박·음식점 매출 증가로 지역 경제에 활기가 돌았다.', '일부 축제는 바가지요금 단속을 강화했다.']],
    ['국내 영화 관객 수 회복세', ['추석 연휴 개봉작 흥행으로 관객 수가 반등했다.', '중예산 영화들이 입소문을 타며 장기 상영 중이다.', '업계는 연말까지 회복세가 이어질지 주목한다.']],
    ['독감 예방접종 시작, 고령층 우선', ['65세 이상은 이번 주부터 무료 접종이 가능하다.', '어린이와 임신부는 지난달부터 접종 중이다.', '보건당국은 코로나19 백신 동시 접종을 권고했다.']],
    ['도서관 야간 개방 확대 시범 운영', ['일부 공공도서관이 밤 10시까지 문을 연다.', '직장인 이용률이 크게 늘었다는 분석이다.', '내년 전국 확대 여부를 검토한다.']],
    ['K-팝 월드투어 공연 매출 사상 최대', ['해외 공연 매출이 상반기 기준 최대치를 기록했다.', '북미·유럽 대형 공연장 매진이 이어졌다.', '암표 거래 대책 마련 요구도 커지고 있다.']],
    ['한글날 앞두고 우리말 바로 쓰기 캠페인', ['공공기관 보도자료의 외국어 남용 실태가 공개됐다.', '대체어 목록이 새로 배포됐다.', '시민 참여형 공모전도 함께 열린다.']],
    ['국립공원 단풍 절정 시기 예보', ['설악산은 이달 중순 절정에 이를 전망이다.', '탐방로 혼잡을 줄이기 위해 예약제가 확대됐다.', '산행 안전 수칙 준수가 당부됐다.']],
  ],
  wor: [
    ['미 연준 위원들, 추가 인하 속도 두고 이견', ['일부 위원은 고용 둔화를 이유로 인하를 지지했다.', '다른 위원들은 물가 재상승 위험을 경고했다.', '시장은 다음 회의 결과에 촉각을 곤두세우고 있다.']],
    ['유럽, 에너지 가격 안정 대책 발표', ['겨울철을 앞두고 가스 비축 목표를 상향했다.', '취약계층 에너지 요금 지원도 연장됐다.', '회원국 간 공동 구매 확대가 논의됐다.']],
    ['중동 휴전 협상 재개', ['중재국 주도로 협상단이 다시 마주 앉았다.', '인질 석방과 인도적 지원 통로가 핵심 쟁점이다.', '협상 결과는 이번 주말 윤곽이 드러날 전망이다.']],
    ['일본 새 내각 출범, 경제 정책 방향 주목', ['새 내각은 임금 인상과 투자 확대를 강조했다.', '엔화 약세 대응 방안에 시장 관심이 쏠렸다.', '한일 관계 기조는 유지될 것으로 보인다.']],
    ['기후총회 앞두고 감축 목표 상향 압박', ['주요국에 2035년 감축 목표 제출이 요구되고 있다.', '개도국은 재원 지원 확대를 조건으로 내걸었다.', '총회는 다음 달 개막한다.']],
    ['중국 경기부양책 추가 발표', ['소비 진작과 부동산 안정 대책이 함께 나왔다.', '지방정부 특별채권 발행 한도가 늘었다.', '아시아 증시는 일제히 상승 마감했다.']],
    ['우크라이나 재건 회의, 민간 투자 유치', ['재건 사업에 민간 자본 참여 방안이 논의됐다.', '에너지·교통 인프라가 우선 분야로 꼽혔다.', '국내 기업들도 참여 의향을 밝혔다.']],
  ],
  it: [
    ['국내 AI 기본법 시행령 초안 공개', ['고위험 AI 범위와 사업자 의무가 구체화됐다.', '업계는 규제 부담이 과도하다는 의견을 냈다.', '의견 수렴을 거쳐 연내 확정할 예정이다.']],
    ['차세대 HBM 양산 경쟁 본격화', ['국내 업체들이 차세대 고대역폭 메모리 샘플 공급을 시작했다.', '주요 GPU 업체의 인증 일정이 관건이다.', '내년 상반기 양산 체제 전환이 목표다.']],
    ['통신 3사 요금제 개편, 데이터 중간 구간 신설', ['20~50GB 구간 요금제가 새로 나왔다.', '평균 요금이 소폭 낮아질 것으로 분석됐다.', '알뜰폰 업계는 경쟁력 약화를 우려했다.']],
    ['누리호 5차 발사 준비 착수', ['발사체 조립이 시작돼 연말 발사를 목표로 한다.', '실용위성 여러 기를 함께 실을 예정이다.', '민간 기업 주도 체제로 전환하는 첫 사례다.']],
    ['개인정보 유출 사고, 과징금 부과', ['대형 플랫폼에 역대 최대 규모 과징금이 부과됐다.', '접근 통제 미흡이 주요 원인으로 지목됐다.', '피해자 보상 방안은 별도로 논의된다.']],
    ['양자컴퓨팅 국가 연구 로드맵 발표', ['2030년까지 국산 양자컴퓨터 개발 목표가 제시됐다.', '인력 양성 프로그램도 함께 추진된다.', '민간 협력 컨소시엄이 꾸려졌다.']],
    ['자율주행 레벨4 시범 운행 구역 확대', ['도심 일부 구간에서 무인 셔틀 운행이 허용됐다.', '사고 책임 기준을 담은 가이드라인이 마련됐다.', '시민 탑승 체험 신청이 시작됐다.']],
  ],
};

const DATA_DAYS = 45; // 실행일 KST 오늘 포함 최근 45일만 데이터 있음
const NULL_SUMMARY = 'soc-6'; // 요약 null 샘플(매일 soc Top 5에 들어감)

function rng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

// KST 오늘 YYYY-MM-DD
export const kstToday = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayNum = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
const addDays = (s: string, n: number) => new Date((dayNum(s) + n) * 864e5).toISOString().slice(0, 10);

// 날짜 하나의 후보 행(섹션 6 × 5): 섹션마다 풀에서 5개를 뽑고 연관기사 수와 그날 KST 00:00~05:59 발행 시각을 붙임
function rowsFor(date: string): IssueRow[] {
  const r = rng(date);
  return SECTIONS.flatMap(({ key }) => {
    const nums = POOL[key].map((_, i) => i).sort(() => r() - .5).slice(0, 5);
    if (key === 'soc' && !nums.includes(6)) nums[4] = 6;
    const counts = nums.map(() => Math.round(14 + r() ** 1.6 * 170));
    const minutes = nums.map(() => Math.floor(r() * 360));
    return nums.map((n, i): IssueRow => {
      const [title, summary] = POOL[key][n];
      const hh = String(Math.floor(minutes[i] / 60)).padStart(2, '0');
      const mm = String(minutes[i] % 60).padStart(2, '0');
      return {
        id: `${date}-${key}-${n}`, date, section: key, title,
        summary: `${key}-${n}` === NULL_SUMMARY ? null : summary,
        articleCount: counts[i], url: 'https://news.naver.com/',
        latestPublishedAt: `${date}T${hh}:${mm}:00+09:00`,
      };
    });
  });
}

// 샘플 북마크 10개: k일 전(1~10일 전) 랭킹의 그 섹션 1위 이슈, 저장 시각은 서로 다르게
const SEED: [string, SectionKey][] = [
  ['f1', 'it'], ['f2', 'eco'], ['f3', 'cul'], ['f1', 'eco'], ['f2', 'eco'],
  ['f3', 'wor'], ['f1', 'it'], ['f2', 'soc'], ['f3', 'pol'], ['f1', 'it'],
];

// seed 행(순수 함수): 오늘 포함 45일 × 섹션 6 × 후보 5 = 이슈 1350, 폴더 f1~f3(만든 순), 북마크 10
export function seedRows(today: string) {
  const issues = Array.from({ length: DATA_DAYS }, (_, k) => rowsFor(addDays(today, k - (DATA_DAYS - 1)))).flat();
  const folderDay = addDays(today, -11); // 폴더는 북마크(1~10일 전)보다 먼저 만든 것으로
  const folders = [
    { id: 'f1', name: '반도체·AI', createdAt: `${folderDay}T09:00:00+09:00` },
    { id: 'f2', name: '부동산·금리', createdAt: `${folderDay}T09:01:00+09:00` },
    { id: 'f3', name: '나중에 읽기', createdAt: `${folderDay}T09:02:00+09:00` },
  ];
  const bookmarks = SEED.map(([folderId, key], i) => {
    const date = addDays(today, -(i + 1));
    const issueId = buildRanking(date, rowsFor(date))!.sections.find(s => s.key === key)!.issues[0].id;
    return { issueId, folderId, createdAt: `${date}T${String(21 - i).padStart(2, '0')}:${String(10 + i * 3).padStart(2, '0')}:00+09:00` };
  });
  return { issues, folders, bookmarks };
}

/* ─── 메모리 저장소(재시작하면 샘플로 돌아감). 테스트가 씀 ─── */
// 이슈는 지금 KST 오늘 포함 최근 45일만 있음
const rowsOn = (date: string) => {
  const age = dayNum(kstToday()) - dayNum(date);
  return age >= 0 && age < DATA_DAYS ? rowsFor(date) : [];
};

const folders: { id: string; name: string }[] = [];
let nextFolderNo = 4;
const bookmarks: Bookmark[] = [];
const withCount = (f: { id: string; name: string }) => ({ ...f, count: bookmarks.filter(b => b.folderId === f.id).length });

// 폴더 f1~f3 · 샘플 북마크 10개 · 다음 폴더 번호 4로 되돌림(같은 배열을 비우고 다시 채움)
export function resetSample() {
  const rows = seedRows(kstToday());
  folders.splice(0, folders.length, ...rows.folders.map(({ id, name }) => ({ id, name })));
  nextFolderNo = 4;
  bookmarks.splice(0, bookmarks.length, ...rows.bookmarks.map(b =>
    ({ ...findCard(b.issueId, rows.issues)!, folderId: b.folderId, savedAt: b.createdAt })));
}

export const memoryStore: Store = {
  latestDate: async () => kstToday(), // 메모리 샘플은 KST 오늘 데이터가 늘 있음
  ranking: async date => buildRanking(date, rowsOn(date)),
  issue: async id => findCard(id, rowsOn(id.slice(0, 10))),
  bookmarks: async () => [...bookmarks].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)),
  saveBookmark: async (issue, folderId) => {
    if (bookmarks.some(b => b.id === issue.id)) return null;
    const bookmark = { ...issue, folderId, savedAt: new Date().toISOString() };
    bookmarks.push(bookmark);
    return bookmark;
  },
  deleteBookmark: async issueId => {
    const i = bookmarks.findIndex(b => b.id === issueId);
    if (i < 0) return false;
    bookmarks.splice(i, 1);
    return true;
  },
  folders: async () => folders.map(withCount),
  createFolder: async name => {
    const folder = { id: `f${nextFolderNo++}`, name };
    folders.push(folder);
    return withCount(folder);
  },
};

resetSample();
