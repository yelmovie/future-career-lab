# v6 그림 요청 — 숲 생태 조사(P7) "새가 왜 줄었나"를 그림으로

작성일: 2026-09-07 · 저장 위치 `public/assets/v5/` (같은 폴더, 파일명 그대로) · 없으면 코드가 v2 그림으로 대신 보여 준다.
규칙: 1이미지 1장, 텍스트·글자 없음, 같은 장소는 **같은 구도**로 4장 (before → 3가지 변화). 아이가 한눈에 "뭐가 달라졌지?"를 알아야 한다.

공통 스타일(모든 프롬프트 끝에 붙임):
`Bright pastel children's educational game illustration, soft painterly 3D look, clean composition, daytime, no text, no letters, no watermark.`

## A. 실험 장면 — 숲 가장자리 (같은 구도 4장, 16:9, 1280×720)

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `scene-edge-before.webp` | 지금 상태: 새가 거의 없음 | Forest edge next to a construction road: several fresh tree stumps, one small excavator with a blinking warning light in the background, a dry cracked puddle in front, only one small bird sitting on a stump. Wide shot, camera at child eye level. + 공통 |
| `scene-edge-trees.webp` | 나무 심기 뒤 | Exactly the same forest edge composition, but young fruit trees with orange berries planted where the stumps were; excavator and dry puddle unchanged. Several small colorful birds perched in the new trees. + 공통 |
| `scene-edge-quiet.webp` | 기계 소리 멈춘 뒤 | Exactly the same forest edge composition, stumps unchanged, but the excavator is switched off and covered with a tarp, warning light off, a quiet sign board (blank, no text); a few small birds returned on the branches, dry puddle unchanged. + 공통 |
| `scene-edge-water.webp` | 물 채운 뒤 | Exactly the same forest edge composition, stumps and excavator unchanged, but the puddle is now full of clear water; one or two small birds drinking at the water edge. + 공통 |

## B. 지점 비교 카드 (16:9, 1280×720)

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| `scene-stream.webp` | B 개울가: 새 몇 마리 | A small clear forest stream with mossy stones and wet soil, a few small colorful birds drinking and hopping around, tropical leaves. + 공통 |
| `scene-deep.webp` | C 깊은 숲: 새 많음 | Deep lush forest full of fruit trees with orange and purple berries, many small colorful birds and two eclectus parrots (green and red) perched among the branches, soft sunbeams. + 공통 |

(A 숲 가장자리 카드는 `scene-edge-before.webp`를 같이 쓴다.)

## C. 행동 카드 아이콘 (1:1, 흰 배경 → 코드에서 투명화)

| 파일 | 프롬프트 |
|---|---|
| `act-plant-tree.png` | A single round game action icon on a plain white background: a child's hand planting a small fruit sapling with orange berries into soil, pastel green rim. Isolated, centered. + 공통 |
| `act-quiet.png` | A single round game action icon on a plain white background: a yellow excavator with a big red power switch turned OFF and a small crossed-out sound wave symbol, pastel blue rim. Isolated, centered. + 공통 |
| `act-fill-water.png` | A single round game action icon on a plain white background: a watering can pouring clear water into a small forest puddle, pastel cyan rim. Isolated, centered. + 공통 |
| `bird-small.png` | A single small cute forest bird (sparrow-like, warm brown and cream) sitting, side view, on a plain white background. Isolated, centered, simple shape readable at 24px. + 공통 |

## 화면에서 쓰이는 곳
- 2단계 "새가 제일 적은 곳은?": B·C·A 장면 카드 위에 `bird-small` 아이콘이 새 수만큼 앉아 있다.
- 3단계 "하나씩 바꿔 보기": 왼쪽 큰 장면이 `scene-edge-before` → 고른 행동에 따라 trees/quiet/water 로 바뀌고 새가 날아 들어온다. 오른쪽 행동 카드 3장에 `act-*` 아이콘.
