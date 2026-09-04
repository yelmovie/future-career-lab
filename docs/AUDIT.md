# 미래 직업실 PHASE 0 감사

감사 기준일: 2026-08-14  
프로젝트 루트: `D:\isamgpt\16job`

## 1. 기준 자료와 우선순위

1. `data/미래_직업실_최종설계_v1.0.json`
2. `data/미래_직업실_페이지별_상세프롬프트_v1.0.json`
3. `data/미래_직업실_MVP_TRD.md`
4. `samplepages`의 기준 P1~P10 세트
5. 실제 `assets`, `background`, `3d assets`, `sound`

동일 SHA-256 중복 문서는 다음 두 쌍이다. 원본은 보존하고 무괄호 파일을 기준으로 읽는다.

- `CLAUDE_CODE_MASTER_PROMPT_미래직업실.md` = `CLAUDE_CODE_MASTER_PROMPT_미래직업실 (1).md`
- `미래_직업실_MVP_TRD.md` = `미래_직업실_MVP_TRD (1).md`

## 2. 폴더와 자산 수

| 폴더 | 파일 수 | 상태 |
|---|---:|---|
| `assets` | PNG 104 | 전부 정상 로드, 약 164 MiB |
| `3d assets` | PNG 10 | 투명 2D 렌더 컷아웃, 실제 3D 모델 아님 |
| `background` | PNG 10 | P1~P10 전용 16:9 배경 |
| `samplepages` | PNG 30 | 기준 10장 + 대안 18장 + 별개 콘셉트 2장 |
| `sound` | BGM MP3 6 | 전부 정상, 48 kHz stereo |
| `sound/bfx` | SFX MP3 8 | Pixabay Content License로 선별·추가 |
| `data` | 8 | JSON 2, Markdown 6 |
| 루트 `og.png` | 1 | 1774×887, 소셜 카드/키아트 |

원본 이미지 115개(`assets`+`3d assets`+`og.png`)는 SHA-256 완전 중복이 없다. `assets` 중 43개만 실제 알파 채널을 갖고 있으며 P5~P10 원자 에셋은 흰 배경 RGB가 많아 카드형으로 사용한다.

## 3. P1~P10 기준 샘플과 배경

기준 샘플은 전역 셸과 페이지 순서가 가장 일관적인 `03_30_03~03_30_06` 10장이다.

| Page | 기준 samplepages | 전용 background |
|---:|---|---|
| P1 | `...오전 03_30_03 (1).png` | `...오전 03_30_32 (1).png` |
| P2 | `...오전 03_30_03 (2).png` | `...오전 03_30_33 (2).png` |
| P3 | `...오전 03_30_04 (3).png` | `...오전 03_30_34 (3).png` |
| P4 | `...오전 03_30_04 (4).png` | `...오전 03_30_34 (4).png` |
| P5 | `...오전 03_30_04 (5).png` | `...오전 03_30_34 (5).png` |
| P6 | `...오전 03_30_06 (6).png` | `...오전 03_30_34 (6).png` |
| P7 | `...오전 03_30_06 (7).png` | `...오전 03_30_36 (7).png` |
| P8 | `...오전 03_30_06 (8).png` | `...오전 03_30_36 (8).png` |
| P9 | `...오전 03_30_06 (9).png` | `...오전 03_30_38 (9).png` |
| P10 | `...오전 03_30_06 (10).png` | `...오전 03_30_38 (10).png` |

샘플 화면은 UI 이미지로 사용하지 않는다. 네이비/골드/크림 팔레트, 3열 정보 위계, 패널 비율, 캐릭터 위치만 CSS/DOM으로 재구성한다.

## 4. 실제 3D와 fallback

- `.glb/.gltf/.fbx/.obj/.usd/.mtl` 파일: 0개
- `3d assets`: 초록·빨강 앵무, 횃대, 놀이 구조, 먹이 장치, 케이지, 이동장, 드론, 조종기 투명 PNG 10개
- 현재 릴리스는 P5/P6에서 이 PNG를 사용한 2D/2.5D 관찰·배치 게임으로 완주한다.
- `public/assets/models/parrot-habitat.glb` 슬롯과 기능 플래그만 준비한다. 파일과 manifest 경로가 모두 있을 때만 3D 로더를 활성화한다.

## 5. 오디오

| 논리 ID | 원본 |
|---|---|
| `bgm_main` | `sound/main.mp3` |
| `bgm_stage1` | `sound/stage1.mp3` |
| `bgm_stage2` | `sound/stage2.mp3` |
| `bgm_stage3` | `sound/stage3.mp3` |
| `bgm_stage4` | `sound/stage4.mp3` |
| `bgm_stage5` | `sound/stage5.mp3` |
| `sfx_ui_tap` | `sound/bfx/ui-click-soft.mp3` |
| `sfx_swipe` | `sound/bfx/ui-swipe-soft.mp3` |
| `sfx_clue_found` | `sound/bfx/clue-found-glass-ping.mp3` |
| `sfx_drop_valid` | `sound/bfx/drag-drop.mp3` |
| `sfx_warning_soft` | `sound/bfx/warning-soft.mp3` |
| `sfx_record_start` | `sound/bfx/record-start-beep.mp3` |
| `sfx_stage_success` | `sound/bfx/stage-success-chime.mp3` |
| `sfx_reward` | `sound/bfx/final-reward.mp3` |

SFX는 Pixabay Content License에 따라 앱 안에서 사용하며 원본 페이지와 작가를 `assets/CREDITS.md`에 기록한다. 독립 음원 파일로 재판매·재배포하지 않는다.

## 6. 누락·위험과 처리

| 발견 | 처리 |
|---|---|
| 실제 GLB 없음 | 샘플 PNG 2.5D를 기본값으로 사용, 모델 슬롯만 준비 |
| P5~P10 원자 에셋 다수에 흰 배경 | 투명 컷아웃처럼 겹치지 않고 크림 카드/tile로 사용 |
| 원본 이미지+오디오 약 196 MiB | 선택 자산만 ASCII 경로의 WebP 사본으로 변환하고 페이지별 lazy load |
| P3 독립 `magnifier_tool` 없음 | P2의 돋보기/클립보드 자산을 fallback으로 공유 |
| P8 의료/기술 배지 순서 뒤바뀜 | 시각 감사 결과대로 논리 ID를 교정 |
| P9 `branching_path_emblem` 독립본 없음 | 분기 화살표 자산을 공유하고 manifest fallback 명시 |
| 배경에 일부 오브젝트가 구워져 있음 | 같은 스프라이트 중복 배치 금지, 인터랙션 층만 추가 |

