# 에셋 요청 v4 — "한 화면 한 행동" 재설계 뒤 필요한 그림

작성일: 2026-09-05 · v3 요청(`docs/ASSET_REQUEST_v3.md` A-1~A-4)은 그대로 유효. 이 문서는 v4 화면이 새로 쓰는 자리만 적는다.
규칙과 공통 스타일 문구는 v3 문서와 같다. 모든 캐릭터·소품은 **흰 배경(투명 처리는 asset-intake)**, 글자 없음.

지금 상태: 아래 자리는 전부 기존 그림으로 채워져 있어 진행에는 지장이 없다. 만들면 더 또렷해지는 순서대로 적었다.

## A. 관찰 카드 6장 — P5 돌봄 (지금은 글자만)

자리: `src/pages/page05Data.ts` `CARE_ZONES[*].image` (없음 → 관찰 카드가 글자만 보임). 파일이 오면 `public/assets/v4/care-<zone>.webp` 로 넣고 `image:` 한 줄씩 추가.
비율 **1:1**, 흰 배경, 각 200×200 이상.

| 파일 | 내용 |
|---|---|
| `care-green-eyes.webp` | 초록 앵무 얼굴 클로즈업, 눈은 맑지만 놀란 듯 크게 뜬 모습 |
| `care-green-feathers.webp` | 초록 앵무 가슴 깃털이 군데군데 뽑혀 성긴 모습 클로즈업 |
| `care-green-behavior.webp` | 초록 앵무가 횃대 구석에 웅크리고 주변을 두리번거리는 모습 |
| `care-red-eyes.webp` | 빨강 앵무 눈이 반쯤 감기고 흐릿한 모습 클로즈업 |
| `care-red-water.webp` | 물그릇이 가득한데 빨강 앵무가 등을 돌리고 있는 모습 |
| `care-red-posture.webp` | 빨강 앵무 날개가 축 처지고 몸이 기운 모습 |

프롬프트 틀: `Close-up illustration of a {green male / red female} eclectus parrot, {상태}, plain white background, soft studio light, centered. Bright, cheerful, cute educational game illustration, soft 3D-render look for kids, no text, no watermark.`

## B. 새 정원 배경 1장 — P6 (지금은 흰 카드 3칸)

자리: `public/assets/v4/garden-board.webp` → `src/pages/page06.css` `.v4-slots` 배경으로 한 줄 추가.
비율 **16:6** (가로로 긴 정원). 왼쪽 1/3 그늘진 나무, 가운데 1/3 횃대와 빈 바닥, 오른쪽 1/3 관람로 울타리와 사람 실루엣. 가운데는 물건을 올릴 수 있게 비운다.
```
Wide illustration of a zoo bird garden (aviary interior) split into three zones from left to right: shady quiet tree corner, an open middle floor with a wooden perch stand, and a visitor walkway with a low fence on the right. Empty floor space for placing objects, bright daylight, pastel greens and cream. Bright, cheerful, cute educational game illustration, soft 3D-render look for kids, no text, no watermark.
```

## C. 위기 그림 3장 — P9 연합 (지금은 도시 홀로그램 소품 재사용)

자리: `src/pages/Page08Crisis.tsx` `CRISIS_ART` 맵 → `public/assets/v4/crisis-<id>.webp`.
비율 **4:3**.

| 파일 | 내용 |
|---|---|
| `crisis-fire.webp` | 숲 가장자리 마른 가지에서 연기가 올라오고 멀리 공사장 불꽃, 위험하지만 무섭지 않게 |
| `crisis-flock.webp` | 먹구름·강풍 예보 아래 둥지 있는 나무들과 작은 새 무리, 화살표 없음 |
| `crisis-citizens.webp` | 공사장 앞에서 팻말(글자 없음)을 든 시민들과 물음표 말풍선 |

## D. 지점 장면 3장 — P7 생태 (지금은 같은 정글 배경 1장에 흔적만 바뀜)

자리: `src/pages/page07EcologyModel.ts` `POINTS[*].scene` → `public/assets/v4/point-<A|B|C>.webp`.
비율 **16:9**. A 숲 가장자리(도로·그루터기·톱밥), B 개울가(물웅덩이·젖은 땅), C 깊은 숲(열매 나무 빽빽). 흔적은 코드가 올리므로 그림에는 넣지 않는다.

## E. 힌트 아이콘 — P9 (지금은 인라인 SVG, 충분함)
눈·그래프·집·확성기 4개. SVG 로 그려 두어 요청 불필요. 취향으로 바꾸려면 64×64 투명 PNG.

## 파일명 체크리스트
```
public/assets/v4/
  care-green-eyes.webp  care-green-feathers.webp  care-green-behavior.webp
  care-red-eyes.webp    care-red-water.webp       care-red-posture.webp
  garden-board.webp
  crisis-fire.webp  crisis-flock.webp  crisis-citizens.webp
  point-A.webp  point-B.webp  point-C.webp
```
