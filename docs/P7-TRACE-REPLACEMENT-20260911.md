# P7 잘린 열매나무 단서

부츠 발자국은 사람의 통행을 보여 주지만 새 감소와 먹이 조건을 직접 살피기에는 연결이 약했다. 숲 가장자리 단서를 `tree-cut` / **잘린 열매나무**로 바꿨다. 그림은 잘린 그루터기와 열매 달린 잘린 가지를 함께 보여 준다. 멘토는 먹이가 줄었는지 질문하고, 학생은 다른 지점 관찰과 먹이·소음·물의 개별 비교 실험을 거쳐 판단한다. 단서만으로 원인을 확정하거나 실험 점수를 변경하지 않는다.

- 현장 단서를 누르거나 발견한 도감을 다시 누르면 관찰 설명을 읽을 수 있다.
- A/B/C 배경은 기존 벌목지/개울가/깊은 숲 그림을 각각 사용한다.
- 기존 저장값 `foot-boot`는 `tree-cut`로 복원한다. 중복은 제거하고 발견 개수와 진행은 보존한다.
- 최종 이미지: `public/assets/v8/trace-cut-fruit-tree.png`.
- 제작: 2026-09-11, OpenAI 내장 imagegen. 기존 `page-01/keyart.webp`를 화풍, `v2/trace-stump.webp`를 그루터기 형태 참고로 사용했다. 별도 CLI/API 키를 사용하지 않았다.
- 최종 파일은 흰 배경 PNG이며 앱에서 multiply 혼합으로 밝은 카드 배경에 맞춰 표시한다. 투명 PNG라고 표시하지 않는다.

## 생성 프롬프트

Create ONE new transparent-background square PNG game item icon for this existing Korean elementary-school forest ecology educational game. The first supplied image is STYLE REFERENCE ONLY: warm polished family-friendly 3D illustration, rounded sculpted shapes, crisp silhouette and rich natural colors. The second supplied image is SUBJECT REFERENCE ONLY for a visibly sawn tree stump. Do not edit or reproduce either whole reference image. Subject of the new icon: a freshly sawn low fruit-bearing forest tree stump, clear pale flat cut surface and tree rings, warm brown bark; immediately beside it lies one severed thick branch with a clearly visible cut end, 3 large green leaves and 5 conspicuous red-orange berries still attached. Stump and fallen berry branch must be one compact centered coherent cutout, visually explain that a fruit tree was cut down. Give the branch and berries strong legible shapes at 64px display size, berries occupy roughly a quarter of silhouette. Three-quarter elevated view. Large object fills 85 percent of square with safe padding. True transparent background/alpha, no forest scenery, no white square, no frame, no badge rim, no magnifying glass, no tools, no people, no boots or footprints, no birds, no letters, no text, no logo. High quality finished production game sprite, soft warm highlights, clean readable 3D forms, no photorealistic microtexture.

## 배경 보정 프롬프트

Edit this exact generated forest ecology game item icon. Preserve the stump and the cut branch with berries and leaves exactly in subject, color, shape and composition. Remove EVERY gray-and-white checkerboard tile from the entire background and all small holes between the roots/leaves/branch. Replace background with perfectly uniform pure white RGB255,255,255, a plain white studio cutout background. No transparency grid, no checkerboard, no gray squares, no added elements, no text. Keep clean object edges, square canvas, and everything else the same. This will be displayed as a small game inventory item.
