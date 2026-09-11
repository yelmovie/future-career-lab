# 스테이지 5 생성 이미지 · 2026-09-12

방법: Codex 내장 `image_gen` 도구. 기존 현장 사진과 지도의 구도·지형·스타일을 유지하는 참조 편집이며, 묘목만 신규 생성했다. 외부 API 키와 Meshy는 사용하지 않았다. 원본 생성 파일은 개인 생성 폴더에 보존하고 아래 프로젝트 경로에 복사했다.

교육적 연결: 물길은 어린이가 표시한 위치를 전문 정비팀이 치운 뒤의 모습이다. 공사장은 공사팀이 가림벽과 조용한 작업 시간을 마련한 모습이다. 복구 지도와 자란 나무는 꾸준한 돌봄과 시간이 흐른 뒤를 표현한다. 실제 복구나 측정 결과를 촬영한 사진은 아니다.

## 함께 복구한 숲 지도

- 최종 경로: `public/assets/v9/cooperation-map-restored.png`
- 참조: `public/assets/v5/drone-map-wide.webp`

최종 생성 지시:

```text
Use case: precise-object-edit. Edit target is attached educational 3D isometric forest island map. Create its restored future AFTER version for a children's cooperation game. Keep identical entire island outline, framing, camera angle, blue-gold base, main river geometry, tree style and lighting. Transparent background, very wide landscape matching target. Change only these three zones: (1) center-left brown logged clearing at about 36% x 40% y: replace dense stumps with a varied grove of healthy leafy fruit trees and young saplings with grassy paths, representing careful planting and tending over time; (2) lower center-right river bottleneck about 61%x66%y: remove artificial log/debris obstruction while retaining natural rocks and show a clearly unobstructed water passage and vegetated banks; (3) upper-right construction area80%x38%y: keep recognizable fenced work site and parked yellow excavator but add a solid sound reduction barrier on forest-facing edge, work safely separated from quiet bird habitat. Add a few small native-looking blue/brown songbirds resting around improved habitat. No tropical pet parrots, no people, no buttons, no UI, no text, no numbers, no labels, no logos. Preserve high quality colorful sculpted miniature 3D game render, rounded forms, coherent scale; no photographic texture or flat vector substitutes. Important: restored zones must be visibly different from input without changing alignment or making the whole image a new map.
```

## 열매나무 묘목

- 최종 경로: `public/assets/v9/cooperation-sapling.png`
- 참조: `신규 생성`

최종 생성 지시:

```text
Create one friendly high-quality stylized 3D young fruit-tree sapling for an elementary-school forest cooperation activity, consistent with the rounded existing forest-map assets. A slender trunk, 2–3 small branches and healthy green leaves, a compact root ball. No mature fruit, flowerpot, hands, labels, UI or text. Whole sapling visible with generous margin (about 65% width, 80% height). Solid pale mint #edf7ee background.
```

## 정비팀이 막힘을 제거한 같은 물길

- 최종 경로: `public/assets/v9/cooperation-water-cleared.png`
- 참조: `public/assets/v8/broadcast-photo-stream-blocked-v2.jpg`

최종 생성 지시:

```text
Edit the supplied photograph to show the SAME exact forest stream after a professional maintenance team has cleared the artificial blockage. Match square composition, fixed camera viewpoint, lighting, tree canopy, moss-covered large boulders, banks, foreground stones and naturalistic photographic style exactly. Remove ONLY the two concrete pipes crossing the middle of the stream, the two vertical wooden planks, the sandbags and artificial rubble dam. Show clear water flowing freely through the now-open middle channel over existing natural stones into the foreground. The same upstream turquoise pool should remain, slightly shallower with a natural flow. Keep all the surrounding healthy forest unchanged. No new forest clearing, no new construction, no workers/people, no machinery, no text, icons, arrows, before-after split, or labels. This is the result scene after a child marks a blocked location and professionals clear it; environmental continuity is essential. High-quality real outdoor photograph, calm clean water, credible hydrology.
```

## 가림벽을 세운 같은 공사장

- 최종 경로: `public/assets/v9/cooperation-quiet-site.png`
- 참조: `public/assets/v8/broadcast-photo-construction-v2.jpg`

최종 생성 지시:

```text
Edit the supplied photograph into the SAME exact roadside construction site after the crew agrees to protect nearby forest from excessive construction noise. Preserve square composition, fixed camera viewpoint, sunny lighting, same tree line, same yellow excavator and orange roller positions, gravel piles, orange safety mesh and traffic cones. Machinery is now calmly parked during a scheduled quiet break; lower excavator bucket to rest safely on ground and eliminate dust. Install a realistic continuous tall acoustic barrier of muted sage-green solid sound-absorbing panels BETWEEN the machinery and the forest along the rear boundary, visibly behind the excavator and roller, keeping upper trees visible above the panels. The barrier should clearly show the physical action taken, no futuristic or decorative nonsense. Keep foreground and existing roadside layout intact. No people or children, no cut stumps, no new unrelated clearing, no text, logos, graphics, sound-wave icons, or comparison split. Naturalistic photographic style exactly matching the reference. This is the result after children send a request and the professional construction crew installs sound barriers and pauses noisy machinery.
```

지도 배경 후속 편집: 첫 결과의 격자무늬를 없애고 배경만 단색 `#edf7ee`로 교체했다. 최종 지도와 묘목의 배경은 투명이 아니다. 묘목 UI는 원형 안쪽 여백과 클리핑을 적용한다.
