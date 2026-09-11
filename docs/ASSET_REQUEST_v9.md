# 그림 요청 v9 — 5단계 "숲 살리기 릴레이" (2026-09-08)

5단계(페이지 9)를 "지도 위 위험 지점 3곳을 네 직업이 차례로 고치는 릴레이"로 다시 만들었어.
지금은 있는 그림(v5 드론 지도, 직업 배지, v2 흔적 사진, v5 정원 물건, v7 방송 자료, v7 숲 새)만으로 돌아가.
아래 그림이 오면 더 살아나고, 없어도 그대로 동작해(`v9Asset()` + `fallbackTo`).

넣는 곳: `public/assets/v9/` · 형식 webp · 스타일 기준은 `docs/PROJECT_IMAGE_STYLE.md`
(기존 3D 교육게임 화풍, 파스텔, 둥근 형태 — 사람·장비·아이콘은 실사 금지).

## 1. 다 고쳐진 숲 지도 (엔딩) — `forest-map-restored.webp` · 1536×570

지금 지도 `public/assets/v5/drone-map-wide.webp` 와 **똑같은 구도·카메라·크기**로, 세 자리만 바뀐 버전.
- 왼쪽 가운데 갈색 벌목지 → 어린 열매 나무가 줄지어 심긴 초록 땅 (빨간 열매 점 몇 개)
- 아래 가운데 통나무로 막힌 개울 → 통나무가 치워지고 물이 시원하게 흐름
- 오른쪽 위 공사장 → 노란 기계는 멈춰 있고 울타리에 작은 "쉿" 새 표지판, 주변에 새 두세 마리
- 배경 나머지는 원본과 픽셀 단위로 같아야 해(핀 좌표 36%·40%, 61%·66%, 80%·38% 를 그대로 씀).

프롬프트(영문): *Same isometric 3D game map as reference, identical camera and layout. Replace the brown clear-cut patch with rows of young fruit trees on fresh grass, clear the log jam so the stream flows freely, and show the construction site quiet with the yellow excavator parked and a small bird sign on the fence. Bright pastel 3D educational game style, soft rounded shapes, white background outside the island.*

## 2. 직업 전문가 컷아웃 4장 (릴레이 턴에서 말하는 사람) — `expert-*.webp` · 1024×1024 투명

지금은 배지가 말풍선 옆에서 말해. 아이 눈높이엔 사람이 말하는 게 더 좋아.
탐험단장(`public/assets/page-01/mentor.webp`) 과 사육사 하늘(`public/assets/v3/keeper-haneul.webp`) 과 같은 비율·화풍, 전신, 투명 배경, 왼쪽을 보며 말하는 자세.

| 파일 | 인물 | 손에 든 것 |
|---|---|---|
| `expert-drone.webp` | 드론 현장가 (10대 후반 느낌, 조끼·헤드셋) | 작은 드론 조종기, 어깨 위 드론 |
| `expert-ecology.webp` | 생태연구가 (안경, 카키 셔츠) | 돋보기와 그래프 태블릿 |
| `expert-care.webp` | 동물돌봄 전문가 (초록 앞치마) | 앵무 지구(초록)를 팔에 앉힘 |
| `expert-broadcast.webp` | 미래방송기술자 (헤드폰, 파란 재킷) | 손마이크와 작은 카메라 |

프롬프트 공통(영문): *Full-body 3D cartoon character for a children's educational game, same style and proportions as reference mentor, friendly smile, facing slightly left as if talking, transparent background, soft pastel colors, rounded shapes.* + 표의 복장·소품.

## 3. (선택) 고쳐진 자리 스티커 3장 — `spot-fixed-*.webp` · 512×512 투명

결과 화면에서 초록 도장 대신 지도 위에 붙일 작은 그림. 없으면 도장 + 새로 충분해.
- `spot-fixed-trees.webp` 어린 열매 나무 3그루 묶음
- `spot-fixed-water.webp` 흐르는 물 + 물 마시는 새
- `spot-fixed-quiet.webp` "쉿" 표지판 + 앉은 새

## 적용 방법
파일을 `public/assets/v9/` 에 넣기만 하면 돼. 코드 자리:
- 1번 → `Page08Crisis.tsx` 엔딩 `ForestMap restored` (`v9Asset('forest-map-restored')`)
- 2번 → `Page08Crisis.tsx` 의 `MENTOR_IMAGE`(지금은 `BADGE_IMAGE`) 를 `v9Asset('expert-…')` + `fallbackTo(BADGE_IMAGE[job])` 로 바꾸면 됨
- 3번 → `.p9-pin--fixed` 자리에 `<img>` 추가
