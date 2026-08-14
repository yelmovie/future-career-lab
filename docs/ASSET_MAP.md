# 미래 직업실 Asset Map

## 원칙

- 아래 source는 원본 추적용이며 삭제·덮어쓰지 않는다.
- runtime은 `scripts/prepare-assets.mjs`가 ASCII 이름의 WebP/MP3 사본으로 만든다.
- 앱 코드는 logical ID만 참조한다.
- 전체 기계 판독 매핑은 `src/data/asset-manifest.ts`와 `public/content/asset-manifest.json`을 기준으로 한다.

## 배경/샘플 매핑

| Logical ID | Source | Runtime |
|---|---|---|
| `background.page1` | `background/...03_30_32 (1).png` | `/assets/backgrounds/page-01.webp` |
| `background.page2` | `background/...03_30_33 (2).png` | `/assets/backgrounds/page-02.webp` |
| `background.page3` | `background/...03_30_34 (3).png` | `/assets/backgrounds/page-03.webp` |
| `background.page4` | `background/...03_30_34 (4).png` | `/assets/backgrounds/page-04.webp` |
| `background.page5` | `background/...03_30_34 (5).png` | `/assets/backgrounds/page-05.webp` |
| `background.page6` | `background/...03_30_34 (6).png` | `/assets/backgrounds/page-06.webp` |
| `background.page7` | `background/...03_30_36 (7).png` | `/assets/backgrounds/page-07.webp` |
| `background.page8` | `background/...03_30_36 (8).png` | `/assets/backgrounds/page-08.webp` |
| `background.page9` | `background/...03_30_38 (9).png` | `/assets/backgrounds/page-09.webp` |
| `background.page10` | `background/...03_30_38 (10).png` | `/assets/backgrounds/page-10.webp` |
| `social.og` | `og.png` | `/og.png` |

## P1 핵심 매핑

| Logical ID | Source |
|---|---|
| `main.title` | `assets/...03_33_11 (2).png` |
| `main.keyart` | `assets/...03_33_11 (1).png` |
| `character.student.main` | `assets/...03_30_45 (1).png` |
| `character.mentor.main` | `assets/...03_30_47 (3).png` |
| `parrot.green` | `3d assets/...오후 07_23_40 (1).png` |
| `parrot.red` | `3d assets/...오후 07_23_40 (2).png` |
| `drone.camera.small` | `assets/...03_33_12 (6).png` |
| `badge.main` | `assets/...03_33_12 (4).png` |

## P2~P10 배치 규칙

각 그룹의 `(n)`은 상세 JSON의 `assetSlots[n-1]`에 대응한다. 아래 예외는 시각 감사로 교정했다.

| Page | Source batch | Slots |
|---:|---|---|
| P2 | `assets/...03_30_58~03_31_01 (1~10)` | `choice_student_character` → `quick_response_icon` |
| P3 | `assets/...03_31_11~03_31_19 (1~10)` | investigator/mentor/CCTV/evidence 계열 |
| P4 | `assets/...03_31_28 (1~10)` | drone pilot/mentor/drone/controller/camera/map/monitor/clapper/wind/helipad |
| P5 | `assets/...03_31_39 (1~10)` | keeper/parrot/care item 계열, 카드형 RGB |
| P6 | `assets/...03_31_49 (1~10)` | designer/mentor/habitat item 계열, 카드형 RGB |
| P7 | `assets/...03_31_57~58 (1~10)` | mentor/student/event/action 계열, 카드형 RGB |
| P8 | `assets/...03_32_06~14 (1~10)` | commander/student/city/job badge/crisis/alliance |
| P9 | `assets/...03_32_19~27 (1~10)` | guide/student/DNA/badge/path/card/reward |
| P10 | `assets/...03_32_32~40 (1~10)` | teacher/student/frame/seal/laurel/rosette/trophy/pen/burst/pedestal |

교정 예외:

- P3 `(8)`이 `footprint_clue`, `(9)`가 `audio_recorder`, `(10)`이 `evidence_folder`; 독립 `magnifier_tool`은 P2 `(7)` fallback.
- P8 `(6)`은 `technology_job_badge`, `(7)`은 `medical_job_badge`.
- P9 `(8)`은 `career_cards_hologram`, `(9)`는 별도 DNA dashboard 참고. `branching_path_emblem`은 `(7)` 분기 화살표를 공유.
- P10 `(6)`은 `crystal_trophy`, `(7)`은 `achievement_rosette`.
- `assets/...03_32_58 (9).png`는 P10 화면 캡처이므로 atomic slot에서 제외.

## 2.5D 샘플 PNG

| Logical ID | `3d assets` source `(n)` | 용도 |
|---|---:|---|
| `parrot.green.cutout` | 1 | P1/P5/P6 |
| `parrot.red.cutout` | 2 | P1/P5 |
| `habitat.perch.feed` | 3 | P5/P6 |
| `habitat.rope.playground` | 4 | P6 |
| `habitat.foraging` | 5 | P5/P6 |
| `habitat.feeding.stand` | 6 | P5/P6 |
| `habitat.cage` | 7 | P5/P6 |
| `habitat.carrier` | 8 | P5 |
| `drone.camera.cutout` | 9 | P1/P4 |
| `drone.controller.cutout` | 10 | P4 |

## Future model slot

| Logical ID | Runtime slot | 현재 |
|---|---|---|
| `model.parrotHabitat` | `/assets/models/parrot-habitat.glb` | 파일 없음, feature flag false |

## Audio

BGM과 SFX logical ID는 `docs/AUDIT.md` 표와 동일하다. Pixabay 개별 원본 페이지·작가·라이선스는 `CREDITS.md`를 기준으로 한다.

