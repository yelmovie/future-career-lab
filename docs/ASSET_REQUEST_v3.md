# 에셋 요청 v3 — 「사라진 지구와 젤리」 · 밝고 아기자기한 톤

작성일: 2026-09-05 · 상태: **생성 대기** (코드 자리는 만들어 둠, 파일이 없어도 v2 그림으로 되돌아감)

## 규칙

- 한 프롬프트 = 한 장. 콜라주 금지. 글자·로고·워터마크 금지.
- 캐릭터 스타일은 **홈 키아트(`public/assets/page-01/keyart.webp`)와 같은 캐릭터**로 맞춘다: 카키 탐험 모자를 쓴 남학생(하늘색·흰색 후드), 갈색 포니테일 여성 멘토(카키 조끼·초록 목걸이), 초록 이클렉투스 **지구**, 빨강 이클렉투스 **젤리**, 파란 링을 단 흰색 드론 로봇.
- 결과 PNG/JPG 는 그대로 줘도 된다. WebP 변환·리사이즈·배경 제거는 `asset-intake` 에서 한다.
- 파일명을 아래 표대로 하면 코드가 자동으로 집어 쓴다.

공통 스타일 문구 (모든 프롬프트 끝에 붙어 있음):
`Bright, cheerful, cute educational game illustration, soft 3D-render look like a modern animated film for kids, pastel sky-blue / cream / warm yellow / parrot green / coral palette, clean outlines, gentle lighting, no text, no letters, no watermark.`

---

## A. 먼저 만들 것 — 서사가 바뀌어 기존 그림과 어긋나는 장면

### 1. `scene-escape.webp` — 브리핑 키아트: 찢어진 새 정원에서 날아가는 지구·젤리
자리: `public/assets/v3/scene-escape.webp` (없으면 v2 `scene-incident` 사용 — v2 그림은 앵무 "무리"가 나와 새 서사와 맞지 않음)
비율 **16:9**
```
Wide scene at a small city zoo bird garden after a typhoon: a large aviary with a torn net panel flapping in the wind, a few branches on the ground. Exactly two eclectus parrots — one bright green male and one red-and-violet female — fly out through the tear toward a forest on the hill beyond the zoo fence. A worried young zookeeper in a khaki uniform and cap stands below, one hand raised. Clearing sky after rain, soft morning light, hopeful mood, not scary. Bright, cheerful, cute educational game illustration, soft 3D-render look like a modern animated film for kids, pastel sky-blue / cream / warm yellow / parrot green / coral palette, clean outlines, gentle lighting, no text, no letters, no watermark.
```

### 2. `scene-reunion.webp` — 엔딩: 새 정원으로 돌아온 지구·젤리와 살아난 숲
자리: `public/assets/v3/scene-reunion.webp` (없으면 v2 `scene-restored` 사용 — v2 는 앵무 무리 귀환 장면)
비율 **16:9**
```
Wide celebratory scene: a rebuilt zoo bird garden with a fresh new net, wooden perches, a rope bridge and a small water bowl; one green eclectus parrot and one red eclectus parrot perched happily side by side. Behind the garden, a green forest edge on the hill with many small wild birds (sparrows, tits, a woodpecker) flying and singing, a clear stream, and a group of citizens with binoculars and a "forest keeper" armband (no text) planting a young tree. A small white drone hovers high above. Sunny morning, bright and joyful. Bright, cheerful, cute educational game illustration, soft 3D-render look like a modern animated film for kids, pastel sky-blue / cream / warm yellow / parrot green / coral palette, clean outlines, gentle lighting, no text, no letters, no watermark.
```

### 3. `scene-found.webp` — 깊은 숲 열매 나무 아래에서 발견된 지구·젤리 (S1 → S2 연결)
자리: `public/assets/v3/scene-found.webp` — **아직 화면에 안 붙어 있음.** 붙일 곳: 증거판(P4) 완료 띠 옆 작은 썸네일 또는 P5 미션 안내 그림. `Page03Mystery.tsx` 완료 부분에 `<img src={v3Asset('scene-found')} />` 를 넣으면 된다.
비율 **4:3**
```
Deep forest floor under a fruit tree with fallen figs: a green eclectus parrot and a red eclectus parrot huddled together on a low branch, feathers a little ruffled and tired but eyes open. A young explorer boy in a khaki hat kneels nearby holding a soft pet carrier open, a female mentor behind him pointing gently. Dappled warm light through leaves, tender and relieved mood. Bright, cheerful, cute educational game illustration, soft 3D-render look like a modern animated film for kids, pastel sky-blue / cream / warm yellow / parrot green / coral palette, clean outlines, gentle lighting, no text, no letters, no watermark.
```

### 4. `keeper-haneul.webp` — 사육사 하늘 (동물돌봄 전문가 멘토)
자리: `public/assets/v3/keeper-haneul.webp` — 지금은 `page-05/slot-01.webp` 가 그 역할. 만들면 `Page02Briefing.tsx` JOB_CARDS `care.mentor` 와 `Page05ParrotCheck.tsx` 멘토 그림을 이 파일로 바꾼다.
비율 **3:4 세로**, 흰 배경
```
Full-body stylized 3D character of a friendly young adult zookeeper (gender-neutral, short dark hair), khaki uniform shirt with rolled sleeves, green cap, a small clipboard in one hand and a bird treat in the other, warm smile, standing on a plain white background, front three-quarter view, centered, isolated. Same cartoon proportions as a modern animated film character. Bright, cheerful, cute educational game illustration, soft 3D-render look like a modern animated film for kids, pastel sky-blue / cream / warm yellow / parrot green / coral palette, clean outlines, gentle lighting, no text, no letters, no watermark.
```

---

## B. 있으면 더 밝아지는 것 — 배경 10장 (선택)

지금은 남색 배경 10장 위에 흰색 워시(82~90%)를 깔아 파스텔처럼 보이게 했다. 밝은 배경을 새로 만들면 워시를 걷어낼 수 있다.
파일명은 기존과 같게 `public/assets/backgrounds/page-01.webp` … `page-10.webp` 로 **덮어쓰면** 코드 수정 없이 반영된다(원본은 `_unused/`에 보관할 것). 비율 **16:9**, 중앙은 UI 가 덮으므로 **가장자리에만** 소품을 두고 가운데는 비운다.

| 파일 | 장면 |
|---|---|
| page-01 | 밝은 미래 탐험단 연구실, 큰 창으로 아침 햇빛, 선반에 드론·지구본·화분 |
| page-02 | 둥근 회의 테이블과 화이트보드가 있는 밝은 브리핑룸 |
| page-03 | 모니터와 코르크 증거판이 있는 밝은 조사실 |
| page-04 | 숲이 보이는 옥상 드론 이륙장, 파란 하늘 |
| page-05 | 창이 큰 동물병원 진료실, 횃대와 케이지 |
| page-06 | 푸른솔 숲 속 오솔길, 개울, 열매 나무 |
| page-07 | 유리 온실 같은 큰 새 정원(아비어리) 내부 |
| page-08 | 도시 지도 홀로그램 테이블이 있는 밝은 작전실 |
| page-09 | 큰 스크린이 있는 밝은 방송 스튜디오 |
| page-10 | 트로피와 액자가 있는 밝은 수료식 홀 |

프롬프트 틀:
```
Wide interior/exterior background for a kids' educational game, {장면}. Bright daylight, pastel sky-blue / cream / warm yellow accents, props only near the left and right edges, the center area is empty and softly lit for UI overlay. Bright, cheerful, cute educational game illustration, soft 3D-render look like a modern animated film for kids, clean outlines, gentle lighting, no text, no letters, no watermark.
```

---

## C. 코드에 이미 있는 자리 (v2, 파일 있음 · 참고)

`public/assets/v2/` 14장은 그대로 쓴다. 이 중 서사와 어긋나는 것은 A-1·A-2 뿐이다. 배지 2장(생태·방송)은 남색·금색 톤이라 밝은 UI 에서 조금 무거워 보이니, 여유가 있으면 아래 스타일로 다시 뽑아 **같은 파일명으로 덮어쓴다**.

```
A single round game achievement badge on a plain white background: soft white-gold rim, sky-blue center with {아이콘: a green leaf and a bird footprint / a broadcast camera and signal arcs}, small yellow star accent, front view, centered, isolated. Bright, cheerful, cute educational game illustration, soft 3D-render look, no text, no letters, no watermark.
```

---

## 파일명 체크리스트

```
public/assets/v3/
  scene-escape.webp     ← A-1 (없으면 v2 scene-incident 로 대체됨)
  scene-reunion.webp    ← A-2 (없으면 v2 scene-restored 로 대체됨)
  scene-found.webp      ← A-3 (화면 연결은 파일이 오면 한 줄 추가)
  keeper-haneul.webp    ← A-4 (화면 연결은 파일이 오면 두 줄 교체)
public/assets/backgrounds/page-01..10.webp  ← B (덮어쓰기, 선택)
public/assets/v2/badge-ecology.webp, badge-broadcast.webp  ← C (덮어쓰기, 선택)
```
