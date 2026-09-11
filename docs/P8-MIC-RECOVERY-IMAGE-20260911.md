# P8 마이크 교체 후 방송 재개 이미지

- 생성일: 2026-09-11
- 도구: OpenAI 내장 `image_gen` (builtin). CLI/API 키 경로는 사용하지 않음.
- 최종 에셋: `public/assets/v8/broadcast-mic-recovered.png`
- 원본: `C:/Users/bongb/.codex/generated_images/01a0902b-c264-7d51-a3e7-d6e38ccf223e/exec-a0aea2c5-35cd-4f33-9756-bd3128d40686.png`
- 생성 수: 1장. 최종 PNG는 원본을 바이트 변경 없이 복사.
- 용도: P8 마이크 선택 후 문제 해결과 방송 재개를 보여 주는 결과 화면.

## 참조 이미지와 역할

1. `public/assets/v7/broadcast-mic-failure-poster.webp`: 동일한 가상 리포터의 얼굴, 옷, 머리, 안경 및 숲 장소 기준.
2. `public/assets/v7/broadcast-action-poster.webp`: 같은 리포터의 편안하게 말하는 표정 및 프로젝트 3D 화풍 기준.

두 이미지를 `view_image`로 확인한 다음 `referenced_image_paths`에 전달했다. 새 마이크는 기존 금색 그릴과 구분되도록 은색 그릴로 표현했다. 자막·상태 표시는 앱에서 렌더하며 이미지에는 넣지 않았다.

## 생성에 사용한 정확한 프롬프트

```text
Use case: identity-preserve.
Asset type: ONE finished raster illustration for the microphone-recovery result screen in a Korean elementary-school educational adventure game.
Primary request: Show that the SAME fictional female forest reporter has replaced her broken microphone and is calmly and confidently continuing the broadcast. Create exactly one new image.
Input images: Image 1 (broadcast-mic-failure-poster.webp) is the identity, clothing, material, and forest-location reference. Image 2 (broadcast-action-poster.webp) is a supporting reference for the SAME reporter's friendly speaking expression and polished 3D game illustration style. Both are references, not a collage.
Subject invariants: Keep the same recognizable fictional reporter: young adult female, large warm brown eyes, thin round gold-rimmed glasses, chestnut-brown half-up ponytail with side-swept front strands, small gold hoop earrings, navy blazer with thin gold piping, cream blouse, navy lanyard with completely blank badge, dark wristwatch. Preserve her face identity and stylized proportions.
Changed action and expression: She has visibly recovered from the microphone problem, with relaxed eyebrows and a calm, reassuring friendly smile, mouth slightly open mid-speech, looking naturally toward the broadcast camera. No hand touching her ear and no worried face. One anatomically correct hand holds a fresh, working handheld microphone clearly upright at the center of her chest near her mouth. The replacement microphone has a clean silver mesh grille, navy handle, and a subtle gold band, so it is visibly distinct from the old gold-grille microphone. Her other arm rests naturally and is largely outside the crop.
Scene/backdrop: Same sunlit forest edge with green trees and a softly blurred cleared area in the distance. The forest has not magically regrown; only the microphone problem has been fixed. Subtle recognizable forest background, no drone needed in this tight crop.
Style/medium: High-quality polished realistic 3D animated educational-game illustration, consistent with both supplied references. Soft believable skin and fabric, carefully rendered glasses and hair, warm natural daytime lighting. Friendly and professional, not exaggerated celebration.
Composition/framing: Near-square portrait, medium close-up from top of hair to waist. Reporter centered, face centered in the upper half and fully visible, top of hair comfortably inside frame. Microphone clearly visible in the central chest area. Keep bottom approximately 20 percent free of the face, reserved as quiet clothing/background for a UI caption placed by the application. Avoid extreme facial close-up or cut-off hair.
Text: NONE.
Constraints: No generated text, letters, numbers, logos, brand marks, watermarks, captions, banners, sound-wave overlays, status symbols, icons, panels, or UI. The application supplies all captions and status. No extra characters. No repeated hands, extra fingers, distorted eyeglass lenses, or duplicated microphone.
```

## 확인

- 같은 가상 리포터의 갈색 머리, 둥근 금색 안경, 네이비·금색 재킷과 3D 화풍이 유지됨.
- 걱정하는 표정 대신 편안하고 친근한 표정으로 마이크를 들고 말하는 장면.
- 은색 그릴의 새 마이크와 손이 명확히 보이며 얼굴은 화면 상단 절반에 배치됨.
- 이미지 내 문자, 로고, 상태 패널 및 UI 오버레이 없음. 빈 명찰 유지.
- 배경의 벌목 흔적은 남겨 마이크 수리와 숲 복원을 혼동하지 않게 함.
- 결과: PNG 1254 × 1254. 생성 결과를 시각적으로 확인 후 프로젝트에 복사함.

## 추가 생성: 조사 결과에 중립적인 남자 앵커

- 도구: OpenAI 내장 `image_gen`, 각각 별도 요청으로 1장씩 생성.
- 최종 에셋: `public/assets/v8/broadcast-anchor-neutral.png`
- 원본: `C:/Users/bongb/.codex/generated_images/01a0902b-c264-7d51-a3e7-d6e38ccf223e/exec-a5cd51ef-fc75-4362-8898-5ca67bc8d0c6.png`
- 참조 역할: `public/assets/v7/broadcast-cause-poster-male.jpg`, `public/assets/v7/broadcast-opening-poster-male.jpg`: 동일 남자 앵커의 얼굴·머리·복장·스튜디오 화풍 참조. 원인별 그림은 복제하지 않고 빈 파란 화면으로 요청.
- 결과: PNG 1254 × 1254, 원본을 변경 없이 복사.
- 시각 확인: 같은 남자 앵커와 네이비 정장·푸른 넥타이 유지. 배경 화면에 벌목·새·그래프 등 특정 결론을 암시하는 내용이 없고 손짓이 보임.

### 정확한 프롬프트

```text
Use case: identity-preserve.
Asset type: ONE new near-square character portrait for a Korean elementary-school educational game's broadcast screen.
Primary request: The SAME fictional male news anchor presents the child's investigation calmly from the same blue news studio. His backdrop is completely neutral so the artwork does not imply any particular environmental cause.
Input images: Image 1, broadcast-cause-poster-male.jpg, is the main reference for the fictional anchor's face, hair, navy suit, blue tie, polished 3D rendering, and studio materials. Image 2, broadcast-opening-poster-male.jpg, supports the SAME face identity and studio palette. Use these as identity/style references, not a collage.
Subject invariants: Same young adult male fictional anchor, short side-parted dark brown hair, large warm brown eyes, thick neat eyebrows, clean-shaven friendly face, navy business suit, crisp white shirt, blue textured tie. Preserve facial identity and proportions.
Action/expression: Friendly confident professional expression, mouth slightly open while explaining; looking toward broadcast camera. One anatomically correct hand makes a modest open-palm explanatory gesture near chest height, wholly visible in frame; other hand rests naturally on desk.
Composition: Near-square medium portrait from comfortably above the hair to just below the desk edge. Face in upper-middle, head fully visible with breathing room, torso and gesturing hand readable. Bottom 20 percent should be quiet dark desk or suit to accommodate application-rendered captions. Center the anchor so narrower UI crop does not cut the face or hand.
Scene/backdrop: Same tasteful blue/navy broadcast studio with subtle cyan rim lights and thin gold accents. One large empty calm blue gradient display behind the anchor. Keep display totally blank. Soft environmental studio lights, no alarm light.
Style/medium: Premium polished 3D educational-game character illustration consistent with both reference images; believable fabric, expressive but not exaggerated eyes, refined warm facial lighting.
Text: NONE.
Constraints: NO trees, tree stumps, cut wood, forest or logging imagery, construction machinery, birds, disaster scenes, charts, bars, arrows, diagrams, waveforms, numbers, letters, words, logos, watermarks, status symbols, alarm beacons, captions, news lower-thirds, or UI. Do not copy the cause-specific background from Image 1. No extra people, duplicated hands, extra fingers, or microphones. Exactly one image.
```

## 추가 생성: 물 채우기 비교 결과 카드

- 도구: OpenAI 내장 `image_gen`, 각각 별도 요청으로 1장씩 생성.
- 최종 에셋: `public/assets/v8/broadcast-graph-water.png`
- 원본: `C:/Users/bongb/.codex/generated_images/01a0902b-c264-7d51-a3e7-d6e38ccf223e/exec-0ed05ef3-829f-4c1e-84a5-54d17f0b62c9.png`
- 참조 역할: `public/assets/v8/broadcast-graph-food-trees.jpg`, `public/assets/v8/broadcast-graph-noise.jpg`: 미니어처 3D 자연 그림의 재질·배경색·화풍만 참조. 벌목·기계·새가 떠나는 의미는 복제하지 않음.
- 결과: PNG 1254 × 1254, 원본을 변경 없이 복사.
- 시각 확인: 물길로부터 맑은 물이 채워지는 작은 웅덩이와 정확히 새 2마리를 확인함. 새 한 마리가 물을 마시며, 장치·그래프·글자·벌목은 없음.

### 정확한 프롬프트

```text
Use case: scientific-educational.
Asset type: ONE square polished 3D miniature illustration for an elementary-school educational-game evidence card.
Primary request: Show the actual tested action of replenishing water in a shallow forest pool, with exactly TWO small forest birds now beside the water. The picture should be instantly understandable as water replenishment and a modest result, not a graph device.
Input images: Image 1 broadcast-graph-food-trees.jpg and Image 2 broadcast-graph-noise.jpg are visual STYLE and MATERIAL references only: dimensional miniature nature scene, softly detailed foliage, polished storybook realism, warm off-white studio-like background. Do not copy their subject, tree stumps, machinery, flying-away birds, or sound-wave graphics.
Scene: A small natural shallow forest creek basin surrounded by a few smooth stones, damp soil, low fresh green plants, and a little moss. Clear turquoise-blue fresh water is visibly flowing gently from a narrow stone-lined feeder channel into the basin, creating a tiny ripple where it arrives. A few dry cracked soil patches just beyond the new wet edge show that water was previously low, without an ominous disaster mood. The center of the image is the replenished water surface, broad and easy to recognize even on a small card.
Birds: Exactly TWO small anatomically believable stylized forest songbirds: one little blue bird stands on a waterside stone and bends its beak down to drink, while one small warm-brown bird stands at the nearby wet edge. Both birds are calm and small relative to the water feature. No additional birds, bird symbols, reflections that resemble extra birds, eggs, or chicks.
Composition/framing: Square image, self-contained miniature diorama viewed from a gentle three-quarter angle, basin fills central two-thirds, birds near foreground/middle, feeder channel visible above center. Warm off-white simple background and soft natural contact shadow. Nothing cropped at the outer edges. Make water/replenishment the visual focus, no pond-sized tree, no large waterfall.
Style/medium: Premium polished 3D educational storybook-game illustration matching supplied style references; tactile stone and soil, bright transparent water, soft leaf detail, balanced friendly colors, warm light. A clear natural scene, not an infographic.
Text: NONE.
Constraints: No text, letters, numbers, labels, arrows, charts, graphs, tablets, screens, phones, devices, borders, UI, icons, badges, logos, watermarks, sound waves, construction equipment, tree stumps, logging, fallen cut branches, or extra animals. Exactly one picture and exactly two birds.
```

## 추가 생성: 다친 새를 발견했을 때 도움 요청 카드

- 도구: OpenAI 내장 `image_gen`, 각각 별도 요청으로 1장씩 생성.
- 최종 에셋: `public/assets/v8/broadcast-action-report.png`
- 원본: `C:/Users/bongb/.codex/generated_images/01a0902b-c264-7d51-a3e7-d6e38ccf223e/exec-56105726-83c8-4615-b413-398947a556ec.png`
- 참조 역할: `public/assets/v8/broadcast-graph-food-trees.jpg`, `public/assets/v8/broadcast-graph-noise.jpg`: 부드러운 오프화이트 배경·3D 자연 재질의 스타일 참조. 내용은 도움을 요청하는 성인과 떨어진 곳에 쉬는 새로 새롭게 생성.
- 결과: PNG 1254 × 1254, 원본을 변경 없이 복사.
- 시각 확인: 성인이 전화로 도움을 요청하며 새와 거리를 두는 모습을 확인함. 사람의 손이 새에 닿지 않음. 출혈·치료 장면·글자·UI가 없음.

### 정확한 프롬프트

```text
Use case: scientific-educational.
Asset type: ONE square polished 3D pictorial citizen-action card for an elementary-school educational game.
Primary request: Instantly communicate "If you find a hurt wild bird, ask a grown-up to call wildlife care helpers." Show an adult calling for help and respectfully staying away from the bird. Exactly one coherent scene.
Input images: Image 1 broadcast-graph-food-trees.jpg and Image 2 broadcast-graph-noise.jpg are style/material/background references only: premium miniature 3D nature scene, softly detailed foliage, warm off-white studio-like background. Do not copy their machinery, stumps, departing birds, arrows, or sound waves.
Subject: A friendly concerned adult forest visitor, clearly adult proportions, short brown hair, simple sage-green outdoor jacket, cream shirt, brown trousers and sturdy shoes, is standing on the left side of a small forest-path diorama. The adult holds one plain unbranded smartphone naturally to their ear and speaks to care helpers. Free hand rests near their torso. Eyes glance gently toward a small wild songbird on the ground a few steps away.
Bird and spatial safety: ONE small brown-and-cream wild forest bird is resting quietly beside a low leafy plant at the right side of the path, about two meters from the adult. It looks tired with wings resting unevenly, but there is no visible wound, blood, bandage, broken bone, scary injury, tears, distress mark, or gore. The visitor is not touching, feeding, grabbing, or treating the bird. No child, no self-treatment, no veterinarian performing procedures. The distinct empty stretch of path between them must make respectful distance obvious.
Scene/backdrop: Small tactile woodland path with a few green plants, smooth stones, moss and fallen leaves, shown as a self-contained miniature with a warm off-white simple backdrop and gentle contact shadow. Friendly daylight.
Composition: Square, whole adult from head to shoes visible on left, bird clearly recognizable on lower-right, adult larger but bird not tiny. Gentle three-quarter view. Clear uncluttered visual hierarchy focused on phone call and the waiting bird. If showing a care helper through the phone makes the scene complex, do NOT show it; the adult holding the phone to the ear and the bird at a safe distance is sufficient.
Style/medium: Premium polished 3D educational-game illustration with expressive but calm face, realistic tactile materials softened for a child audience, matching reference diorama material quality. No exaggerated cartoon panic.
Text: NONE.
Constraints: No words, letters, numbers, logos, watermarks, speech bubbles, icons, UI, arrows, warning symbols, medical cross, screens floating in space, extra people, extra birds, extra hands, extra fingers, duplicate phones, tree stumps, cut wood, forestry machinery, cages or pet collars. Exactly one image.
```

## 추가 생성: 나무 심기·먹이나무 보호 카드의 의미 교정

- 도구: OpenAI 내장 `image_gen`, 각각 별도 요청으로 1장씩 생성.
- 최종 에셋: `public/assets/v8/broadcast-graph-trees-grown.png`
- 원본: `C:/Users/bongb/.codex/generated_images/01a0902b-c264-7d51-a3e7-d6e38ccf223e/exec-b589bb0d-2c52-45b8-a618-f658de6a83ac.png`
- 참조 역할: `public/assets/v8/broadcast-graph-water.png`: 새로 생성한 물 채우기 카드의 입체 미니어처 자연 재질·오프화이트 배경·조명을 스타일로만 참조. 물과 새는 제외.
- 결과: PNG 1254 × 1254, 원본을 변경 없이 복사.
- 시각 확인: 새로 심은 묘목의 잎·열매·지지대·심은 흙 및 모종삽, 뒤의 건강한 큰 열매나무가 보임. 나무 심기를 벌목 장면으로 표시하지 않음. 새 수치는 UI가 담당하므로 새 그림은 제외.

### 정확한 프롬프트

```text
Use case: scientific-educational.
Asset type: ONE square polished 3D miniature illustration for an elementary educational-game comparison and citizen-action card.
Primary request: Immediately show the POSITIVE action of planting and protecting trees that provide food for forest birds. This image depicts healthy trees increased, not tree cutting. It must make sense with the UI caption "나무 심기".
Input image: broadcast-graph-water.png is a STYLE, material, composition and warm off-white background reference only. Do not copy water, pool, channel, birds, or exact scene. Match its premium dimensional miniature nature illustration, tactile surfaces, warm daylight and visual polish.
Scene and subject: A friendly self-contained miniature forest patch. Two or three healthy newly planted native berry-bearing broadleaf saplings in the foreground have plenty of fresh green leaves and clearly visible small red and purple berry clusters. Roots are planted in fresh forest soil with shallow watering rings; slender simple wooden planting stakes support two young saplings gently. A modest hand shovel rests on the soil beside a sapling. Behind them is a sturdy mature healthy broadleaf fruit/berry tree with a full intact leafy canopy and berries, showing food and shelter are protected. Low greenery, a little moss, a few pebbles and natural fallen leaves complete the scene.
Composition: Square, gentle elevated three-quarter angle, saplings and berry clusters large and immediately readable at small card size. The self-contained patch fills most of the canvas, with the whole small trees and mature tree crown comfortably inside the edges. Simple warm off-white studio-like background, soft contact shadow; no full photographic landscape. Visually emphasize healthy leaves, berries and newly planted soil rather than tools.
Style: Premium polished 3D educational storybook game illustration, tactile believable foliage and bark, softly stylized shapes, friendly natural colors. Match the water card's material quality and lighting.
Text: NONE.
Constraints: No bird or animal figures, literal bird count, words, letters, numbers, labels, text on shovel, logos, watermarks, UI, icons, arrows, graphs, screens, devices, people, construction machine, cut branches, tree stumps, saws, disaster, barren forest, dead tree, or large exposed roots. No fruit harvested into a basket. Keep all trees visibly alive and planted. Exactly one image.
```

## 추가 생성: 기계 소리 멈추기 카드의 의미 교정

- 도구: OpenAI 내장 `image_gen`, 각각 별도 요청으로 1장씩 생성.
- 최종 에셋: `public/assets/v8/broadcast-graph-quiet.png`
- 원본: `C:/Users/bongb/.codex/generated_images/01a0902b-c264-7d51-a3e7-d6e38ccf223e/exec-14a8c631-d66c-43df-8e23-1b7972f8d137.png`
- 참조 역할: `public/assets/v8/broadcast-graph-water.png`, `public/assets/v8/broadcast-action-report.png`: 자연 미니어처의 재질·조명·배경과 성인 캐릭터 비율의 스타일 참조. 기존 주제나 인물은 복제하지 않음.
- 결과: PNG 1254 × 1254, 원본을 변경 없이 복사.
- 시각 확인: 굴착기의 버킷이 지면에 놓이고 운전석이 비어 있으며 작업자는 밖에서 뺀 열쇠를 들고 있음. 기계가 멈췄음을 나타냄. 음파·연기·흩날리는 흙·새·벌목·글자는 없음.

### 정확한 프롬프트

```text
Use case: scientific-educational.
Asset type: ONE square polished 3D miniature illustration for an elementary educational-game comparison and citizen-action card.
Primary request: Immediately show that loud construction work has STOPPED so the forest is quiet. The scene must communicate an idle shut-down machine, never active digging. It must fit the caption "기계 소리 멈추기".
Input images: Image 1 broadcast-graph-water.png is a STYLE and material reference: premium polished dimensional miniature forest scene, warm off-white background, tactile detail, friendly daylight. Image 2 broadcast-action-report.png is a supporting STYLE and adult-character-proportion reference only. Do not copy its person, phone, bird or scene.
Main subject: One compact yellow tracked excavator is parked at the forest edge, seen clearly at three-quarter angle. Its boom is lowered and the EMPTY metal bucket rests FLAT on the ground in front of it. Engine completely off, no smoke or exhaust, no motion blur, no moving dirt, no lights. Cab is visibly EMPTY with the door open. The machine is clean, unbranded and stationary.
Shutdown cue: A friendly adult construction operator stands OUTSIDE beside the open cab, clearly separated from the controls. Wearing a plain yellow hard hat, orange safety vest, navy trousers and work boots, the operator holds one detached metal ignition key and small plain key ring visibly in one open hand at chest height. The key is out of the machine. His relaxed calm stance shows a work break. Other hand naturally rests at side. Do not show the operator seated or driving.
Environment: A small self-contained forest-edge diorama on compact dirt, a few stones and moss, with intact healthy leafy trees and low green plants behind. Nothing being destroyed or cleared. Peaceful daylight and a warm off-white simple backdrop. Do not fill the image with an unrelated landscape.
Composition: Square, entire machine and entire adult visible. Parked machine is the largest object, bucket on ground in foreground and operator beside open cab readable at small card size. Camera at gentle elevated three-quarter view, subject centered. Soft natural contact shadow. Emphasize shutdown through lowered bucket, empty cab and operator's detached key rather than symbolic graphics.
Style: Premium polished 3D educational storybook game miniature, slightly softened friendly shapes, realistically rendered materials, matching supplied images. No heavy photoreal landscape.
Text: NONE.
Constraints: No words, letters, numbers, logos, watermarks, labels, arrows, charts, icons, UI, screens, traffic signs, sound waves, radiating lines, smoke, dust cloud, motion marks, alarm, people driving, birds, fleeing animals, tree stumps, cut wood, severed branches, fallen tree, visible cutting or digging. Exactly one image.
```
