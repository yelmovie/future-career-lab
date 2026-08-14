# 미래 직업실

초등 5–6학년을 위한 체험형 진로교육 게임 MVP입니다. 설문이나 직업 적성 단정 대신, 관찰·비교·계획·실행·수정·협업을 실제 게임 행동으로 경험하고 마지막에 자신의 플레이를 되돌아봅니다.

## 실행

```bash
npm install
npm run dev
```

Windows PowerShell에서 실행 정책 때문에 `npm`이 막히면 `npm.cmd`를 사용하세요.

```powershell
npm.cmd run dev
```

최적화된 런타임 미디어는 `public/`에 포함되어 있습니다. 사용자 제공 원본 팩이 로컬에 있을 때만 `npm run assets:prepare`로 파생본을 다시 생성하세요.

## 검증

```bash
npm run verify
npm run test:e2e
```

`verify`는 TypeScript, ESLint, 단위 테스트, 에셋 매니페스트, 프로덕션 빌드를 연속 실행합니다.

## 페이지

1. HOME — 이어하기, 오늘의 미션, 5단계 허브
2. 일하는 방식 선택 — 8개 상황 기반 자기이해
3. 직업 미스터리 — 복수 단서와 Evidence Board
4. 드론 촬영 미션 — 경로·비행·촬영·리뷰
5. 앵무새 돌봄 점검 — 2D/2.5D 관찰 및 기록
6. 앵무새 서식지 구성 — 배치·시뮬레이션·재설계
7. 실시간 업무 — 제한 자원 우선순위 판단
8. 연합 위기 대응 — 직업 협업 전략
9. 나의 직업 DNA — 비진단형 플레이 성찰
10. 탐험 수료증 — A4 인쇄

## 3D 모델 슬롯

현재 공급된 `3d assets`는 GLB가 아니라 투명 PNG 렌더입니다. MVP는 이 이미지를 사용해 모든 핵심 학습 흐름을 완주하며, 실제 모델은 `public/assets/models/parrot-habitat.glb` 슬롯에 나중에 넣도록 분리했습니다. 기본 feature flag는 꺼져 있습니다.

## 미디어와 라이선스

원본 이미지는 저장소 루트의 공급 파일로 보존하고, 런타임은 `npm run assets:prepare`로 생성한 ASCII 경로의 WebP 파생본을 사용합니다. 배경음악은 공급된 6곡, 효과음은 Pixabay에서 내려받은 8개를 사용합니다. 상세 출처는 [CREDITS.md](./CREDITS.md)에 있습니다.

## 기술 구조

- React + TypeScript + Vite: 앱 셸, HUD, 저장, 접근성, 결과, 인쇄
- Phaser 3: 핵심 조작 미션의 캔버스 레이어
- localStorage: schema/content version, deterministic session seed, 복구 가능한 저장
- 정적 배포: Vercel + GitHub

설계 근거와 점검 결과는 `docs/`를 참고하세요.
