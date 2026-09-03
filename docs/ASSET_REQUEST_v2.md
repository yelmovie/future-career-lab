# v2 신규 에셋 요청서

작성일: 2026-09-04 · 규칙: `dokdo-design/references/image-rules.md` (1이미지 1장, 콜라주 금지, 단독 에셋은 투명 PNG, 기존 세계관·캐릭터 재사용)
**모든 항목에 fallback이 있다.** 안 와도 게임은 완주된다. 우선순위 A부터 만들어 주면 된다.

공통 스타일 문구 (모든 프롬프트 앞에 붙임):
> 기존 "미래 직업실" 세계관. 네이비/골드/크림 팔레트, 반광택 3D 렌더 느낌의 교육게임 아이콘 스타일. 초등 5~6학년용, 유아용처럼 보이지 않게. 텍스트 없음.

저장 위치: `public/assets/v2/` · 파일명은 아래 표 그대로 · 이미지 WebP 또는 PNG(투명) · SFX MP3 48kHz

## A. 진행 품질에 직접 영향 (먼저)

| ID | 파일명 | 규격 | 용도 | 프롬프트 | fallback |
|---|---|---|---|---|---|
| `v2.photo.logging` | `photo-logging.webp` | 16:9, 1280×720 | S1 드론 촬영 결과 · S1-b 확대 관찰 (톱 자국 그루터기가 보여야 함) | 드론 상공 시점, 숲 가장자리에 최근 벌목된 구역, 그루터기 여러 개와 쓰러진 나무, 한쪽에 남은 울창한 숲, 초록 앵무 한 마리 작게 | bg6 크롭 |
| `v2.photo.stream` | `photo-stream.webp` | 16:9 | S1 사진 · 세부: 물길을 막은 자재 더미 | 드론 상공 시점, 숲 속 작은 개울이 공사 자재(모래주머니·판자)에 막혀 상류에 물이 고이고 하류는 말라 있음 | bg6 크롭 |
| `v2.photo.construction` | `photo-construction.webp` | 16:9 | S1 사진 · 세부: 공사 소음 표지·중장비 | 드론 상공 시점, 숲과 맞닿은 도시 외곽 공사장, 굴착기 1대, 안전 펜스, 소음 주의 표지 | bg8 크롭 |
| `v2.badge.ecology` | `badge-ecology.png` | 1:1 투명, 1024 | 생태연구가 직업 배지 (HOME·S5·수료증) | 원형 골드 테두리 배지, 중앙에 나뭇잎과 새 발자국, 작은 돋보기, 초록·네이비 | page9 나침반 엠블럼 |
| `v2.badge.broadcast` | `badge-broadcast.png` | 1:1 투명 | 방송기술자 직업 배지 | 원형 골드 테두리 배지, 중앙에 방송 카메라와 전파 아이콘, 네이비·시안 | page8 기술 배지 |
| `v2.sfx.parrot-call` | `parrot-call.mp3` | 1~2초 | S2 정상 울음 · S3 소리 단서 | 이클렉투스 앵무 짧은 정상 울음 1회 | 파형 아이콘만 표시, 무음 |
| `v2.sfx.parrot-alarm` | `parrot-alarm.mp3` | 1~2초 | S2 스트레스 울음 · S3 경계음 | 날카롭고 반복적인 경계 울음 | 동일 |
| `v2.sfx.chainsaw` | `chainsaw-far.mp3` | 2초 | S3 벌목 소리 단서 | 멀리서 들리는 전기톱 소리, 페이드 인/아웃 | `warning-soft` 재사용 |

## B. 세계 반응·연출

| ID | 파일명 | 규격 | 용도 | 프롬프트 | fallback |
|---|---|---|---|---|---|
| `v2.scene.incident` | `scene-incident.webp` | 16:9 | P2 브리핑 키아트 (사건 제시) | 숲과 도시 경계, 저녁 하늘, 숲 위를 나는 앵무 몇 마리와 빈 나뭇가지들, 멀리 공사장 불빛. 쓸쓸하지만 무섭지 않게 | page1.keyart |
| `v2.scene.restored` | `scene-restored.webp` | 16:9 | S5 엔딩 · 앵무 무리 귀환 | 같은 구도, 아침 햇살, 복원된 숲에 초록·빨강 앵무 무리가 돌아옴, 도시와 숲 사이에 작은 완충 녹지 | bg6 + page1 앵무 쌍 오버레이 |
| `v2.parrot.sick.green` | `parrot-sick-green.png` | 투명, 기존 앵무와 같은 비율 | S2-a 구조 직후 (깃털 뽑힌 자국, 웅크림) | 기존 초록 이클렉투스와 동일 캐릭터, 가슴 깃털 일부 빠짐, 웅크린 자세, 눈은 또렷 | 기존 앵무 + CSS 채도 감소 |
| `v2.parrot.sick.red` | `parrot-sick-red.png` | 투명 | S2-a 탈수 개체 (눈 흐림, 날개 처짐) | 기존 빨강 이클렉투스와 동일 캐릭터, 날개 살짝 처짐, 눈 반쯤 감김 | 동일 |

## C. 있으면 좋음

| ID | 파일명 | 규격 | 용도 | 프롬프트 | fallback |
|---|---|---|---|---|---|
| `v2.trace.footprint.cat` | `trace-footprint-cat.png` | 투명 1:1 | S3 도감 (앵무 아님 흔적, 혼동용) | 골드 테두리 원형 단서 카드 위 고양이 발자국 | page3 발자국 재사용(색만 변경) |
| `v2.trace.footprint.boot` | `trace-footprint-boot.png` | 투명 1:1 | S3 도감 (사람 흔적) | 같은 스타일, 작업용 부츠 자국 | 동일 |
| `v2.trace.stump` | `trace-stump.png` | 투명 1:1 | S3 벌목 증거 | 톱 자국 선명한 나무 그루터기, 톱밥 | page6 통나무 터널 |
| `v2.trace.fruit` | `trace-fruit.png` | 투명 1:1 | S3 먹이나무 열매 | 앵무가 먹는 열대 열매 가지 | page5 먹이 세트 |
| `v2.reporter` | `reporter.png` | 투명, 기존 캐릭터 비율 | S4 현장 리포터 소스 화면 | 기존 학생 캐릭터 스타일의 청년 리포터, 마이크 들고 숲 앞, 헤드셋 | page7.slot2 학생 |
| `v2.sfx.drone-loop` | `drone-loop.mp3` | 3초 루프 | S1 비행 중 | 소형 드론 프로펠러 소리, 끊김 없는 루프 | 무음 |

## 요청하지 않는 것 (CSS/Phaser로 만든다)
오디오 믹서 파형 · ON AIR 표시 · 자막 카드 · 큐시트 · 배터리/신뢰 게이지 · 슬라이더 · 증거판 연결선 · 도감 빈 칸 · 3칸 분류판.

## 도착 후 절차
`asset-intake` 스킬 → `public/assets/v2/`에 넣고 → `asset-manifest.json`의 `pending` 항목을 `assets`로 승격 → `npm run assets:validate`.
