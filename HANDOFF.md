# HANDOFF — 이슈랭크 캡스톤 (2026-10-08 기준)

다른 PC · 새 Claude 세션에서 이어 갈 때 이 파일을 가장 먼저 읽게 한다.

## 1. 새 PC에서 시작하기
1. `git clone https://github.com/Jwavascript/capstone.git` → `cd capstone/ex08` → `npm.cmd install`
2. `ex08/.env`를 손으로 만든다. git에는 없다. 값은 메신저 · 채팅 · 커밋으로 옮기지 말 것.
   - `DATABASE_URL`: Supabase Transaction pooler 6543. 비밀번호는 2026-10-08에 교체됨
   - `NEWSDATA_API_KEY`
   - `ANTHROPIC_API_KEY`
   - 값은 큰따옴표로 감쌈. 이름 목록은 `ex08/.env.example`
3. 확인: `npm.cmd test`(51개 통과) · `npm.cmd run build`
4. 화면: 터미널 둘에서 `npm.cmd run api`(8787) · `npm.cmd run dev`(3000)
5. 새 Claude에게 처음 보낼 말(예):
   > HANDOFF.md, CLAUDE.md, PLAN.md(5절 결정 · 10절 메모), plan/PLAN_backend_ex08.md, reports/ex08_judge.md를 읽고 지금 상태와 남은 결정을 정리해 줘. 코드는 아직 고치지 마.

## 2. 진행 방식 (사용자가 정한 것)
- `plan_helper.md` 순서대로 단계 exXX를 진행한다. 각 단계는 서브에이전트 3개를 **순서대로**, 각각 **opus 모델**로 돌린다.
  - `agent_prompts/1_plan_agent.md`: 계획 → `plan/PLAN_backend_exXX.md`
  - `agent_prompts/2_build_agent.md`: 제작 → `exXX/` · `reports/exXX_build.md`
  - `agent_prompts/3_judge_agent.md`: 심사 → `reports/exXX_judge.md`
- 커밋은 사용자가 원할 때만. `web/` · `plan/PLAN_web.md`는 사용자의 별도 작업이라 건드리지 않는다.
- 결정 기록은 `PLAN.md` 5절(D0~D15), 단계에서 실제로 문제가 된 것은 10절에 한 줄씩 적는다.
- 답은 한국어로, 쉬운 말로.

## 3. 지금 상태
| 단계 | 상태 |
|---|---|
| ex01~ex06 | 완료 · 커밋 |
| ex07 | 완료. 2차 PASS 31/31, 이슈맵 로그 비율 보완 PASS(커밋 `5cb2a7a` · `7d62470`) |
| ex08 AI 이슈 정리 · 3줄 요약 | 제작 4차까지 끝, **심사 FAIL 1줄**(OK 33 · FAIL 1 · SKIP 6, 브라우저 줄). 사용자 커밋 `f1e0b23` · `2f2b954` |

ex08 요약:
- `npm run group`: Claude(Haiku 4.5)가 그날 기사를 묶고, 섹션 · 제외 · `terms`(검색 핵심어 2묶음) · `importance`(1~5)를 정한다. 실패하면 ex07 규칙으로 묶는다.
- 연관기사 수: `qInTitle` 검색 + 1쪽 검증(D13).
- `npm run summarize`: Top 5 중 요약이 없는 이슈를 3줄로 요약한다. 설명문이 없으면 건너뛴다.
- 하루 실행 순서: `collect` → `group` → `summarize`(ex09가 자동화할 예정)

## 4. 남은 결정 (다음 세션에서 사용자에게 먼저 물을 것)
1. **ex08 FAIL 1줄**(`오늘 랭킹(DB)`): 연관기사 수가 같으면 화면 순위가 발행 시각순이 되어 "1위 = 첫 후보" 기대가 깨진다.
   - 추천: `importance`를 `issues`에 저장(마이그레이션 0004)하고, 순위를 연관기사 수 ↓ → importance ↓ → 시각 ↓ 순으로 매긴다.
   - 다른 길: PLAN 기대값만 고친다.
2. **AI 정리 품질**(Haiku의 한계, `reports/ex08_judge.md` 품질 절):
   - 다른 사건을 한 묶음으로 묶는다(eco 1위 6건이 서로 다른 사건).
   - 검색어가 너무 구체적이어서 결과가 0건이 된다(첫 후보 6개 중 3개).
   - 잘못 제외하거나 섹션을 잘못 정한다.
   - 실행마다 결과가 크게 흔들린다.
   - 추천: 정리만 `claude-sonnet-5-5`로 바꾸고 요약은 Haiku로 둔다. 하루 약 $0.15에서 약 $0.3이 된다.
   - 사용자는 원래 "비용 최소화"를 골랐으므로, 바꾸려면 다시 확인받는다.
   - 다른 길: Haiku를 유지하고 지시문을 고친다(짧은 핵심어 등). 검색 결과가 0건이면 넓은 검색어로 한 번 더 찾는다.
3. **정리할 것**
   - `ex08/.vitest/`를 `.gitignore`에 넣고 저장소에서 뺀다(`git rm -r --cached ex08/.vitest`).
   - DB의 eco-49 요약(3차에 생긴 것, 입력에 없는 내용)을 null로 바꾼다.
   - PLAN 테스트 ⑦(나)④ 문구("513자 → ex07 낱말")를 검색어 조립 규칙("512자 넘으면 첫 말만")에 맞춘다.
4. ex08 PASS 뒤 커밋 메시지 예: `ex08: AI 이슈 정리 · 3줄 요약`. 그다음은 ex09(하루 1회 자동 실행, GitHub Actions)이다. 상세 창의 "수집 오전 6:00" 고정 문구도 ex09에서 맞춘다.

## 5. 꼭 지킬 것 (실제로 사고가 났던 곳)
- **비밀값 누출**:
  - `DATABASE_URL`이 두 번 출력으로 샌 적이 있다(ex05 심사, 2026-10-08 조사 스크립트). 그때마다 비밀번호를 교체했다.
  - `.env`를 직접 읽는 스크립트는 큰따옴표를 떼고, 클라이언트 생성까지 try 안에 두고, `process.on('uncaughtException')`에서 오류 코드만 찍는다.
  - 출력은 먼저 비밀값이 섞였는지 true/false로 검사한 뒤에만 보여 준다(PLAN의 "안전 실행").
- **newsdata.io 크레딧**:
  - 하루 200이고, 2026-10-08 끝에 46이 남았다(날마다 초기화).
  - 수집 1번 = 12~18, 묶기 검색 = 섹션당 1~6.
  - 실제 호출은 PLAN 검증표가 정한 만큼만, 나머지는 fixture로 한다.
- **Claude 호출**: 확인용은 몇 번만. 실제 응답 원문은 `research/anthropic/`과 `ex08/test/fixtures/ai/`에 있다.
- **DB**: 확인용 행은 끝나면 지우고, 실제 수집 기사 · 이슈 · 요약은 남긴다. 샘플 데이터는 실제 DB에 넣지 않는다(D14).
- **환경**: Windows, Python 없음. `npm.cmd` · `npx.cmd`를 쓴다. 3000 · 8787 서버는 끝나면 끈다. 단, 사용자가 띄운 서버는 끄지 않는다.

## 6. 왜 이렇게 됐나 (짧은 역사)
- **출처**: 네이버는 robots.txt와 약관 때문에 제외 → newsdata.io 무료 플랜(D0).
- **연관기사 수**: `q` 한 낱말 검색은 `ai` 7,221건처럼 부풀었다 → `qInTitle` + 1쪽 검증(D13). 실험 자료는 `research/newsdata/q_vs_qintitle_2026-10-08.json`.
- **규칙 묶기의 한계**:
  - newsdata `category` 태그 자체가 틀린다(범죄 기사가 politics).
  - 같은 사건을 다른 낱말로 쓴다(`장기금리` 2건 vs 동의어 OR 72건).
  - 그래서 AI 정리(D15)로 넘어갔다.
- **Haiku 구조화 출력**:
  - 같은 입력 4번 중 2번이 `terms` 묶음 수를 어겼다.
  - 그래서 zod를 느슨하게 받고 코드에서 고쳐 쓴다.
  - 번호 중복도 자주 나와서 처음 것만 쓴다.
- **화면**: 누리호 408건이 지도를 덮었다 → 섹션 블록은 같은 넓이, 타일은 log(1+n) 비율로 바꿨다.
