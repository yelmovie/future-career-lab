# 에셋 요청 v5 — 바탕 고도화 + 앵무 병원 놀이(P5)

작성일: 2026-09-07 · 상태: **생성 대기**. 아래 파일이 없어도 화면은 지금 그림으로 동작한다. 파일명을 표대로 맞춰 넣으면 그대로 반영된다.

공통 스타일 문구(모든 프롬프트 끝에):
`Bright, cheerful, cute educational game illustration, soft 3D-render look like a modern animated film for kids, pastel sky-blue / cream / warm yellow / parrot green / coral palette, clean outlines, gentle lighting, no text, no letters, no watermark.`

규칙: 한 프롬프트 = 한 장. 글자·로고 금지. 캐릭터는 홈 키아트(`public/assets/page-01/keyart.webp`)와 같은 인물·앵무(초록 이클렉투스 지구, 빨강 이클렉투스 젤리).

---

## A. 바탕 10장 (효과가 가장 큼)

지금은 남색 배경을 34% 만 비치게 하고 그 위에 페이지 색 파스텔 그라데이션을 깔았다. **밝은 바탕을 새로 만들면 그림이 더 많이 보이게 투명도를 올릴 수 있다.**
파일명은 `public/assets/backgrounds/page-01.webp` … `page-10.webp` 로 **덮어쓰기**(원본은 `_unused/backgrounds-v2/` 로 이동). 비율 **16:9, 1920×1080**. 가운데 70% 는 UI 가 덮으므로 **소품은 가장자리에만**, 가운데는 빈 벽·빈 하늘처럼 단순하게.

| 파일 | 어느 화면 | 장면 | 주조색 |
|---|---|---|---|
| page-01 | 홈 | 밝은 미래 탐험단 연구실, 큰 창으로 아침 햇빛, 선반에 드론·지구본·화분 | 하늘색 |
| page-02 | 브리핑 | 둥근 회의 테이블과 화이트보드가 있는 밝은 브리핑룸 | 파랑 |
| page-03 | 증거판·돌아보기 | 코르크 증거판과 모니터가 있는 밝은 조사실 | 하늘색 |
| page-04 | 드론 | 숲이 보이는 옥상 드론 이륙장, 파란 하늘·흰 구름 | 하늘색 |
| page-05 | 앵무 살피기 | 창이 큰 동물병원 진료실, 횃대·케이지·진료 도구 | 연두 |
| page-06 | 생태 조사 | 푸른솔 숲 오솔길, 개울, 열매 나무 | 청록 |
| page-07 | 새 정원 | 유리 온실 같은 큰 새 정원(아비어리) 내부 | 연두 |
| page-08 | 연합 작전 | 도시 지도 홀로그램 테이블이 있는 밝은 작전실 | 연보라 |
| page-09 | 생방송 | 큰 스크린이 있는 밝은 방송 스튜디오 | 코랄 |
| page-10 | 수료증 | 트로피와 액자가 있는 밝은 수료식 홀 | 노랑 |

```
Wide {장면} background for a kids' educational game, bright daylight, {주조색} pastel tint, props only near the left and right edges, the center 70% is a plain softly lit wall/sky with nothing on it for UI overlay, 16:9. Bright, cheerful, cute educational game illustration, soft 3D-render look like a modern animated film for kids, clean outlines, gentle lighting, no text, no letters, no watermark.
```

## B. 앵무 병원 놀이(P5) — 있으면 훨씬 좋아지는 것

### B-1. 증상 확대 그림 6장 (돋보기 안에 보일 것)
지금은 앵무 전체 그림을 CSS 로 3.3배 확대해 돋보기 안에 보여 준다. 실제 확대 그림이 있으면 "정말 보이는 것"이 훨씬 또렷하다.
파일: `public/assets/v5/closeup-{green|red}-{eyes|feathers|behavior|water|posture}.webp`, 비율 **1:1, 512×512**, 흰 배경.

| 파일 | 프롬프트 핵심 |
|---|---|
| closeup-green-eyes | 초록 앵무 얼굴 클로즈업, **눈은 맑고 또렷**, 놀란 듯 옆을 두리번거리는 눈 |
| closeup-green-feathers | 초록 앵무 가슴 클로즈업, **가슴 깃털이 듬성듬성 빠져 회색 솜털이 보이고**, 아래 바닥에 뽑힌 초록 깃털 두세 개 |
| closeup-green-behavior | 케이지 안 횃대 위 초록 앵무, **숨을 곳이 없는 텅 빈 케이지**, 옆방 문틈으로 큰 소리 파동(그림 기호) |
| closeup-red-eyes | 빨강 앵무 얼굴 클로즈업, **눈이 흐리고 반쯤 감김**, 축 처진 눈꺼풀 |
| closeup-red-water | 빨강 앵무 부리와 물그릇 클로즈업, **물그릇이 가득 찬 채 그대로**, 부리 가장자리가 말라 갈라짐 |
| closeup-red-posture | 빨강 앵무 전신, **날개가 축 처지고 횃대 대신 바닥 가까이 웅크림** |

```
Close-up of a {초록/빨강} eclectus parrot, {핵심}, soft focus background of a bright veterinary room, square 1:1, centered. Bright, cheerful, cute educational game illustration, soft 3D-render look like a modern animated film for kids, clean outlines, gentle lighting, no text, no letters, no watermark.
```

### B-2. 처치 카드 그림 4장 (지금은 3D 샘플·슬롯 그림을 빌려 씀)
파일: `public/assets/v5/treat-{water|shelter|puzzle|feather}.webp`, **1:1, 512×512, 투명 배경(PNG 로 주면 됨)**.

| 파일 | 그림 |
|---|---|
| treat-water | 작은 물그릇과 전해질 가루 봉지, 스포이트 |
| treat-shelter | 천으로 반쯤 가린 아늑한 나무 숨숨 상자 |
| treat-puzzle | 씨앗이 숨겨진 나무 먹이 퍼즐 장난감 |
| treat-feather | 분무기와 부드러운 깃털 손질 브러시 |

```
A single {그림} for a pet parrot, isolated on a plain white background, front three-quarter view, centered, no parrot in the image. Bright, cheerful, cute educational game illustration, soft 3D-render look, clean outlines, no text, no letters, no watermark.
```

### B-3. 회복한 지구·젤리 (선택)
지금 회복 그림은 `page-05/slot-03.webp`, `slot-04.webp`. 아픈 그림(v2 parrot-sick-*)과 같은 횃대·같은 각도에서 **눈이 초롱초롱하고 깃털이 매끈한** 버전이 있으면 "고쳐졌다"가 한눈에 보인다.
파일: `public/assets/v5/parrot-well-green.webp`, `parrot-well-red.webp`, 흰 배경, 세로 3:5.

## C. 사육사 하늘 (v3 요청 그대로, 아직 없음)
`public/assets/v3/keeper-haneul.webp` — 지금은 `page-05/slot-01.webp` 가 그 역할. 프롬프트는 `docs/ASSET_REQUEST_v3.md` A-4.

---

## 파일이 오면 코드에서 바꿀 곳
- 바탕 10장: 코드 수정 없음(덮어쓰기). 밝기가 충분하면 `src/styles/index.css` `.game-shell::before { opacity: .34 }` 를 `.55` 로.
- B-1: `src/pages/Page05ParrotCheck.tsx` 돋보기 `.p5-closeup` 의 `backgroundImage` 를 `v5Asset('closeup-…')` 로 (한 줄).
- B-2: `TREATMENT_IMAGE` 표 4줄 교체.
- B-3: `page05Data.ts` `recoveredImage` 2줄 교체.
