# 미래 직업실 Technical Requirements Document

## 1. 기술 스택

- React + TypeScript + Vite
- Phaser 3: P3/P4/P6/P7/P8 게임 캔버스
- HTML/CSS/SVG: 접근 가능한 UI, P5 fallback, P9 결과, P10 인쇄
- Vitest: unit/component smoke
- Playwright: 전체 완주·이어하기·print E2E
- Vercel static deployment, hash route 사용

Three.js는 모델 추가 전 runtime dependency/scene을 만들지 않는다. 모델 슬롯과 기능 플래그만 유지해 초기 번들과 실패 surface를 줄인다.

## 2. 폴더 구조

```text
src/
  app/                 App, route, providers
  components/          공통 DOM UI
  pages/               P1~P10
  game/
    phaser/            wrapper, scenes, shared helpers
    three/             future loader contract + dispose contract
  data/                gameplay content JSON/TS
  state/               store, types, migrations
  services/            asset/audio/save/timer
  shared/              RNG, math, guards, EventBus
public/
  assets/              optimized runtime WebP
  audio/bgm/            BGM
  audio/sfx/            Pixabay SFX
  assets/models/        future GLB slot
  content/              runtime manifest/version
scripts/                asset preparation and validation
tests/                  unit tests
e2e/                    Playwright flows
```

## 3. Scene architecture

React가 route와 저장을 소유하고 Phaser Scene은 화면 안 조작만 소유한다. `PhaserStage`가 mount 시 game 1개를 만들고 unmount 시 `game.destroy(true)`를 호출한다. Scene은 DOM을 직접 찾거나 수정하지 않고 EventBus 이벤트만 보낸다.

이벤트 예:

- `clue:found`, `evidence:linked`, `hypothesis:checked`
- `drone:flight-started`, `drone:telemetry`, `drone:review-ready`
- `habitat:item-placed`, `habitat:simulation-finished`
- `work:event-updated`, `strategy:assignment-updated`
- `stage:completed`, `ui:toast`, `audio:sfx`

모든 구독 함수는 unsubscribe를 반환한다.

## 4. App state와 guards

전역 필수 guards: `resultShown`, `isStageEnded`, `isTransitioning`, `rewardGranted`, `modalOpen`, `sceneDisposed`, `isPrinting`.

- stage 완료와 reward는 ID Set으로 중복 방지.
- P7 event state: `queued → active → resolved | expired → recovery`.
- P8 card state: `ready → assigned → resolving → cooldown → ready`.
- seed 기반 shuffle/incident selection을 사용하고 gameplay에서 raw `Math.random()`을 쓰지 않는다.

## 5. AssetLoader

컴포넌트는 raw 파일 경로를 갖지 않는다. `asset-manifest.json`의 logical ID만 사용한다. resolver 순서:

1. optimized primary WebP/MP3
2. 투명 `3d assets` PNG 파생본
3. 호환 cross-page fallback
4. CSS/SVG placeholder

페이지 진입 시 해당 page group만 preload한다. 이미지 실패는 카드 placeholder로 바꾸고 진행을 막지 않는다. 선택 자산만 배포하며 원본 180 MiB를 public에 전량 복사하지 않는다.

## 6. AudioManager

- 첫 사용자 제스처 뒤 unlock.
- 동시에 BGM 한 곡만 재생.
- route 변경 시 300ms fade.
- BGM/SFX on/off와 volume을 저장.
- `visibilitychange` 시 pause, 복귀 시 사용자 설정에 따라 resume.
- source 실패는 no-op 처리하고 stage 완료를 막지 않는다.
- SFX 출처/라이선스는 `assets/CREDITS.md`에서 추적한다.

## 7. SaveManager와 migration

- localStorage key: `future-career-lab.save.v1`
- `schemaVersion`과 `contentVersion` 필수.
- load → validate → migrate → normalize → save 순서.
- 알 수 없는 필드는 보존 가능한 범위에서 유지.
- corruption 시 오류 boundary가 새 게임/초기화 선택을 제공.
- migration registry는 `(from, to) => data` 형태로 추가한다.

## 8. 3D slot과 fallback

`FEATURE_3D_PARROT_INSPECTION=false`가 기본이다. 다음 세 조건이 모두 참일 때만 모델 scene을 생성한다.

1. feature flag true
2. manifest의 `model.parrotHabitat.src`가 non-empty
3. HEAD/loader가 성공

그 외에는 P5의 2.5D 회전·zoom·object picking을 사용한다. 2.5D도 5개 동일 logical zone과 동일 완료 조건을 제공하므로 dead fallback이 아니다. 향후 Three scene은 geometry/material/texture/render target/renderer를 `dispose()`하고 RAF와 listener를 해제해야 한다.

## 9. Responsive/performance

- 기준: 1920×1080, 1440×810, 1366×768, 1280×720, 1024×768 landscape.
- 보조: 768/375 portrait는 재배치 UI를 제공하고 확대를 막지 않는다.
- CSS Grid/Flex/`clamp()`/`aspect-ratio` 사용.
- DPR max 1.5, Phaser canvas 1개, animation 동시 2개 이하.
- WebP quality 82, page별 lazy load, BGM은 현재 stage 1곡만.
- `prefers-reduced-motion`에서는 tween과 축하 애니메이션을 최소화.

## 10. Testing와 release gate

`npm run verify`:

1. `tsc --noEmit`
2. ESLint
3. Vitest
4. asset manifest missing-file/duplicate-ID 검사

Playwright:

- 새 게임 P1→P10 완주
- 중간 refresh 후 이어하기
- P3 근거 부족 재탐색
- P4 재촬영
- P5 GLB 없음에도 fallback 완주
- P7 result/reward 1회
- P8 동일 카드 중복 배치 차단·cooldown
- P10 print에서 게임 UI 숨김

배포 차단: console error, manifest 누락, save crash, 중복 reward/modal, fallback 진행 불가, print UI 누출, build/verify 실패.

## 11. Deployment

- GitHub repository: `future-career-lab`
- default branch: `main`
- Vercel: Vite static build, output `dist`
- hash route로 direct-route rewrite 의존 제거
- production 전 `npm run verify && npm run build`

