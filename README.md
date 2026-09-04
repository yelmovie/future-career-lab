# 미래 직업실 v2

초등 5–6학년을 위한 체험형 진로교육 게임입니다. 설문이나 적성 단정 대신 **하나의 사건**을 네 직업의 도구로 직접 다루고, 마지막에 네 직업을 한 팀으로 묶어 해결합니다.

> 도시 옆 숲에서 앵무새가 한 달 사이 절반으로 줄었다. 드론 현장가 → 동물돌봄 전문가 → 생태연구가 → 미래방송기술자가 되어 원인을 밝히고, 넷을 연합해 숲과 도시를 지킨다.

앞 스테이지의 산출물(사진·돌봄 기록·연구 그래프·방송 클립)이 뒤 스테이지의 재료가 되고, 마지막 연합 작전에서 그 품질이 효과로 드러납니다.

## 실행

```bash
npm install
npm run dev
```

Windows PowerShell에서 실행 정책 때문에 `npm`이 막히면 `npm.cmd`를 사용하세요.

주 사용 환경은 **가로 1024×768 이상 태블릿·PC·전자칠판**입니다. 세로 화면이나 960×540보다 작은 가로 화면에서는 작은 버튼을 억지로 보여 주지 않고, 가로 태블릿 또는 PC로 열라는 안내가 표시됩니다.

## 검증

```bash
npm run verify        # typecheck + lint + vitest + 에셋 매니페스트 + 프로덕션 빌드
npm run test:e2e      # Playwright (vite 서버 자동 기동)
node scripts/screenshot-pages.mjs   # 11페이지 × 3해상도 스크린샷 → test-results/screens
```

## 게임 흐름 (11페이지)

| 페이지 | 화면 | 스테이지 | 학생이 하는 일 | 산출물 |
|---:|---|---|---|---|
| 1 | HOME | – | 이어하기, 6노드 허브, 배지·직업도감 | – |
| 2 | 탐험단 브리핑 | 소개 | 사건 접수, 직업 카드 4장 뒤집기, 이름·**예측 직업** 선택 | prediction |
| 3 | 드론 정찰 비행 | S1 드론 현장가 | 바람·배터리 제약 속 경로 드래그, 목표 위 REC 타이밍 | 사진 3장(품질) |
| 4 | 현장 증거판 | S1 | 사진 확대 관찰 → 3칸 분류 → 선잇기 → 가설 | hypothesis |
| 5 | 구조된 앵무새 살피기 | S2 동물돌봄 | 두 마리 개체별 관찰·소리 분류·처치 매칭 | careLog |
| 6 | 회복 공간 만들기 | S2 | 돌봄 기록 조건에 맞춘 배치, 예측 → 시뮬 → 별 | habitatStars |
| 7 | 숲 생태 조사 | S3 생태연구가 | 흔적 수집(도감) → 그래프 읽기 → 슬라이더 하나씩 변인 실험 | traces, graphs |
| 8 | 생방송 컨트롤룸 | S4 방송기술자 | 큐시트 6세그먼트(타이머 없음), 소스·출처 있는 자막·오디오 레벨·돌발 사고 | clip(신뢰) |
| 9 | 네 직업 연합 작전 | S5 연합 | 위기 3개, 능력 힌트로 배지 짝짓기, 턴제 확산·쿨다운 | allianceTurns |
| 10 | 탐험 돌아보기 | 결과 | 예측 vs 실제, 우리 동네 적용 순서, **"나는 이제 …할 수 있다"** 문장 | abilityStatements |
| 11 | 탐험 수료증 | 보상 | 배지 5개 도장 + 능력 문장 인쇄(A4) | – |

파일 이름의 숫자는 v1 에셋 폴더 번호이고 게임 순서는 `src/app/App.tsx`와 `PAGE_META`가 결정합니다.

## 스테이지 추가·수정 방법

1. `src/shared/constants.ts` — `PAGE_META`(제목·배경 폴더), `STAGE_PAGES`, `STAGE_META`(배지·보상·배우는 것)를 수정합니다.
2. `src/app/App.tsx` — 페이지 번호에 컴포넌트를 연결합니다.
3. 스테이지 로직은 `src/pages/pageXXModel.ts`(순수 함수 + vitest)와 화면 `PageXX.tsx`로 분리합니다.
4. 산출물이 필요하면 `src/shared/types.ts`의 `Artifacts`에 필드를 더하고 `createDefaultArtifacts`를 갱신합니다.
5. `npm run verify`와 `npm run test:e2e`를 통과시킵니다.

## 기술 구조

- React 19 + TypeScript + Vite 7: 앱 셸, HUD, 저장, 접근성, 결과, 인쇄
- Phaser 3: 드론 비행(P3), 서식지 배치(P6), 도시 홀로그램(P9). 나머지는 DOM/CSS
- localStorage `future-career-lab.save.v1` (schema v2, v1 자동 이행), 세션 시드로 결정적 랜덤
- 서비스워커 `public/sw.js`: 정적 자원 캐시 우선, HTML 네트워크 우선 → 교실 와이파이가 끊겨도 진행
- 글꼴 셀프호스팅(Jua·Pretendard, OFL). 외부 요청 0
- 정적 배포: Vercel + GitHub

## 미디어와 라이선스

- 일러스트·배경(ChatGPT 이미지)·v2 에셋 14장(Google Imagen): 생성형 AI로 제작한 자체 자산 (ⓒ 2026 옐쌤)
- BGM 6곡: 자체 제작
- 효과음: Pixabay Content License 8개 + Mixkit Sound Effects Free License 4개 (표기 불필요)
- 글꼴: Jua, Pretendard (SIL OFL 1.1, 원문 동봉)

상세 출처는 [CREDITS.md](./CREDITS.md), 설계 근거는 `docs/GAME_DESIGN_v2.md`, 에셋 요청·프롬프트는 `docs/ASSET_REQUEST_v2.md`·`docs/IMAGEN_PROMPTS_v2.md`에 있습니다.

## 저작권과 라이선스

```
기획·제작: 옐쌤
제공: issamGPT AI Mart
ⓒ 2026 옐쌤
```

- 이 앱의 화면 캡처, 자체 제작 일러스트와 음원은 무단 복제·재배포·상업적 이용을 금합니다.
- 이 앱의 일러스트는 생성형 AI로 제작했습니다.
- 효과음의 저작권은 각 저작권자에게 있으며 Pixabay Content License·Mixkit Sound Effects Free License를 따릅니다.
- 교육 내용 출처: 교육부 2022 개정 교육과정 (ncic.re.kr)
- 이용 조건은 issamGPT AI Mart 이용약관을 따릅니다.

앱 안에서는 상단 톱니 버튼 → **설정**에서 같은 고지와 크레딧, 성취기준, 학생·교사용 가이드를 볼 수 있습니다.
