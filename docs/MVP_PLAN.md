# 미래 직업실 MVP 구현 계획

## 제품 목표

학생이 직업 설명 문제를 푸는 대신 `관찰 → 탐색 → 조작 → 추론 → 판단 → 결과 확인 → 수정`을 반복해 “직업인이 되어 직접 해봤다”고 느끼게 한다. 초등 5~6학년, 권장 35분, 5 Stage/10 Page를 한 번의 저장 데이터로 완주한다.

## 10페이지 구조

| Page | 화면 | 실제 핵심 상호작용 | 완료 조건 | 주 기술 |
|---:|---|---|---|---|
| 1 | 미래 직업실 HOME | 이어하기, 오늘의 미션, 진행 노드 | 자체 완료 없음 | React/DOM |
| 2 | 일하는 방식 선택 | 좌우 swipe·공간 선택 8장면 | 8개 상황 선택 | React pointer |
| 3 | 직업 미스터리 | CAM/hotspot 조사, 단서 수집, 증거 선 잇기 | 4단서·3종·유효 연결 2개 | Phaser + DOM |
| 4 | 드론 촬영 | waypoint 2~4개, 실제 비행, REC, 결과 replay | 계획·비행·촬영·review | Phaser + DOM HUD |
| 5 | 앵무새 돌봄 점검 | 2.5D 회전/zoom, 오브젝트 관찰·기록 | 5영역 중 근거 있는 4영역 | DOM/canvas fallback |
| 6 | 앵무새 서식지 구성 | drag·rotate·snap·collision, 관찰 simulation, 재설계 | simulation 후 유효 설계 | Phaser + DOM |
| 7 | 실시간 업무 | 4~5개 사건, 제한 시간/AP, 우선순위·복구 | 근무 결과 1회 확정 | timer state + Phaser monitor |
| 8 | 연합 위기 대응 | 도시 지도, 직업 배치, synergy·cooldown | 핵심 위기 안정화 | Phaser + DOM HUD |
| 9 | 나의 직업 DNA | 실제 로그 근거 3개와 분야 추천 | Stage 1~5 완료 데이터 해석 | React/DOM |
| 10 | 수료증 | 해금, A4 미리보기·인쇄 | Stage 1~5 실제 완료 | HTML/CSS print |

## 기술 역할

- React/DOM: App Shell, 내비게이션, 텍스트, HUD, 모달, Toast, 진행률, 설정, P1/P2/P9/P10.
- Phaser: P3 증거 연결, P4 경로/드론, P6 배치/판정, P7 live monitor, P8 지도/배치/cooldown.
- 2.5D fallback: P5와 P6에서 현재 투명 PNG 샘플을 사용한다.
- Three 모델 슬롯: 현재 비활성. GLB가 추가되고 manifest/flag가 함께 켜질 때만 별도 로더를 사용한다.

## 공통 시스템

1. `AppProvider`: 플레이/설정/진도 단일 상태.
2. `SaveManager`: schema/content version, corruption guard, migration registry, 이어하기.
3. `AssetManager`: logical ID만 노출, 실제 ASCII runtime path resolve, optional fallback.
4. `AudioManager`: 사용자 제스처 unlock, BGM 1곡, BGM/SFX 개별 on/off·volume, visibility pause.
5. `EventBus`: Phaser와 DOM 사이 typed domain event.
6. `GameLayout`: Header, ProgressBar, 좌/중앙/우 panel, BottomBar.
7. `Modal/Toast/RewardModal`: focus 이동·복귀, 중복 표시 guard.

## 상태·저장 구조

```ts
interface SaveData {
  schemaVersion: 1;
  contentVersion: "2026.08";
  player: { createdAt: string; sessionSeed: number };
  lastPage: number;
  stageProgress: Record<1|2|3|4|5, StageProgress>;
  badges: string[];
  jobCards: string[];
  traits: Record<TraitId, number>;
  logs: PlayLog[];
  pageData: Record<string, unknown>;
  settings: AudioSettings;
}
```

저장 키는 `future-career-lab.save.v1`로 고정한다. 완료·보상·수료증 해금은 멱등 함수로 처리하고, 파싱이나 migration 실패 시 앱을 중단하지 않고 안전한 새 저장을 제공한다.

## 구현 순서

1. 문서·manifest·WebP/audio runtime 자산 준비.
2. Vite/React/TypeScript와 verify 파이프라인 구성.
3. App Shell, state/save, asset/audio, EventBus, 공통 UI.
4. P1/P9/P10과 잠금·인쇄 구조.
5. P2~P4, P5~P6, P7~P8을 세 작업으로 병렬 구현.
6. 전체 완주·이어하기·재시도·fallback·print 검증.
7. 반응형/접근성/성능 수정 후 GitHub/Vercel 배포.

## UX 기준

- 새 터치 대상 48×48px 이상, 드래그 대상 64×64px 이상.
- 핵심 지시문 18px 이상, 본문 16px 이상, `word-break: keep-all`.
- 정오답·경고는 색만 쓰지 않고 아이콘·테두리·텍스트를 함께 제공.
- 주 행동은 하단 우측 한 곳, 같은 기능은 모든 화면에서 같은 컴포넌트.
- 애니메이션 150~300ms, 화면 전환 400ms 이하, `prefers-reduced-motion` 지원.
- 샘플의 네이비/골드/크림 분위기는 유지하되 실제 텍스트와 버튼은 DOM으로 만든다.

