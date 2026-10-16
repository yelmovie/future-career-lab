# Credits and licenses

## OG 공유 이미지 (2026-09-12)

`public/og-career-team.jpg`는 사용자가 선택한 3번 '네 직업 협력' 시안이다. Codex 내장 image_gen으로 기존 키아트·로고·탐험단장을 참고해 제작했다. 1774×887px, 2:1 비율을 유지하고 JPEG 품질 92로 인코딩했다. 생성 원본과 다른 네 시안은 로컬 `output/og-samples-20260912/`에 보관한다. 서비스 메타데이터는 이 파일의 HTTPS 절대 주소를 사용한다.

## 스테이지 5 공사 장비 소리 (2026-09-11, CC0)

`public/audio/v9/construction-site-loop.wav`는 **cognito perceptu**의 **construction equipment tracked.wav** ([Freesound #88422](https://freesound.org/people/cognito%20perceptu/sounds/88422/))를 가공한 12초 반복 음원이다. 공식 페이지에서 **[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)** 공개를 확인했으며 상업적 복제·수정·배포가 가능하다. 공개 고음질 MP3의 8–20.8초를 모노 변환하고, 앞뒤 0.8초 교차 연결·음량 정규화했다. 2026-09-12에는 다이내믹 압축을 적용해 평균 레벨을 -20에서 -12 dBFS로 높였다. 원음, 해시, 재현 방법은 `assets/source-audio/construction-tracked-88422.mp3`, `assets/licenses/construction-audio.json`, `docs/STAGE5-CONSTRUCTION-AUDIO.md`에 보관한다. 기존 다른 스테이지의 짧은 전기톱 효과음은 바꾸지 않았다.

## P7 잘린 열매나무 단서 (2026-09-11)

`public/assets/v8/trace-cut-fruit-tree.png`는 OpenAI 내장 imagegen으로 제작한 프로젝트 에셋이다. 기존 키아트와 그루터기 그림을 참고했다. 흰 배경 PNG로 저장하고 앱에서 밝은 카드 배경과 혼합해 표시한다. 변경 이유·원본 프롬프트·저장 호환은 [제작 기록](../docs/P7-TRACE-REPLACEMENT-20260911.md)에 적었다.

## Project artwork

`assets`, `background`, `samplepages`, `3d assets`, `og.png`는 이 프로젝트의 자체 제작 자산이며 **생성형 AI로 제작**했다. 저작권자는 옐쌤(ⓒ 2026 옐쌤)이다. 원본을 보존하며 이 앱 안에서만 최적화 사본을 사용한다. 무단 복제·재배포·상업적 이용을 금한다.

## Background music

`sound/main.mp3`, `sound/stage1.mp3`~`stage5.mp3`는 이 프로젝트의 자체 제작 자산이다. 저작권자는 옐쌤(ⓒ 2026 옐쌤)이며 무단 복제·재배포·상업적 이용을 금한다.

## Pixabay sound effects

아래 효과음은 앱 내 상호작용에 사용한다. 2026-08-14에 각 페이지에서 “Free for use under the Pixabay Content License” 표시를 확인했다. Pixabay는 무료 사용·수정과 무표기 사용을 허용하지만, 원본을 독립 파일 형태로 판매·배포하는 것은 금지한다.

License: https://pixabay.com/service/license-summary/

| Runtime file | Pixabay title | Creator | Source |
|---|---|---|---|
| `ui-click-soft.mp3` | UI Click Soft | SoundShelfStudio | https://pixabay.com/sound-effects/technology-ui-click-soft-512213/ |
| `ui-swipe-soft.mp3` | UI Swipe Navigation Soft | SoundShelfStudio | https://pixabay.com/sound-effects/film-special-effects-ui-swipe-navigation-soft-523625/ |
| `clue-found-glass-ping.mp3` | UI Soft Glass Ping | SoundShelfStudio | https://pixabay.com/sound-effects/film-special-effects-ui-soft-glass-ping-526562/ |
| `drag-drop.mp3` | UI Drag Drop | SoundShelfStudio | https://pixabay.com/sound-effects/technology-ui-drag-drop-518781/ |
| `warning-soft.mp3` | UI Warning Buzz | SoundShelfStudio | https://pixabay.com/sound-effects/film-special-effects-ui-warning-buzz-515667/ |
| `record-start-beep.mp3` | UI Data Processing Beep | SoundShelfStudio | https://pixabay.com/sound-effects/film-special-effects-ui-data-processing-beep-527474/ |
| `stage-success-chime.mp3` | UI Success Chime | SoundShelfStudio | https://pixabay.com/sound-effects/technology-ui-success-chime-513565/ |
| `final-reward.mp3` | Success/Finish UI sound effect | Nomagician | https://pixabay.com/sound-effects/technology-successfinish-ui-sound-effect-467873/ |


## v2 추가 효과음 (2026-09-04, Mixkit Sound Effects Free License — 표기 불필요, 상업 이용 가능)

| 파일 | 원본 | 출처 | 라이선스 | 가공 |
|---|---|---|---|---|
| ~~`public/audio/v2/parrot-call.mp3`~~ (v5 에서 교체, 원본은 `_unused/audio-v2-prev/`) | Tropical bird squeak (#27) | https://mixkit.co/free-sound-effects/bird/ | Mixkit Sound Effects Free License | 1.3초 트림, 페이드, 라우드니스 정규화 |
| ~~`public/audio/v2/parrot-alarm.mp3`~~ (v5 에서 교체, 원본은 `_unused/audio-v2-prev/`) | Hawk call squawk (#1277) | https://mixkit.co/free-sound-effects/bird/ | Mixkit Sound Effects Free License | 2.2초 트림, 페이드, 정규화 |
| `public/audio/v2/chainsaw-far.mp3` | Cutting trees with chainsaw ambiance and axe hits (#796) | https://mixkit.co/free-sound-effects/chainsaw/ | Mixkit Sound Effects Free License | 4초 지점부터 2.6초, 페이드 인/아웃, 정규화 |
| `public/audio/v2/drone-loop.mp3` | Tactical drone ambience (#2744) | https://mixkit.co/free-sound-effects/drone/ | Mixkit Sound Effects Free License | 10초 지점부터 3초 루프, 정규화 |

## v5 아나운서 목소리 (2026-09-08, 생성형 AI 음성)

| 파일 | 내용 | 제작 | 비고 |
|---|---|---|---|
| `public/audio/v5/broadcast-mic-test.wav` | "여기는 미래 방송국입니다. 마이크 테스트, 하나, 둘, 셋." | Higgsfield · Seed Audio 1.0(ByteDance) 프리셋 음성 Ainsley 로 생성 | 실제 사람 목소리가 아닌 합성 음성. P8 소리 맞추기에서 슬라이더 음량·왜곡 체험용. 2026-10-16 이름 변경에 맞춰 기존 음성의 방송국 소개·마이크 확인 구간(7.5초)만 사용 |

## v5 앵무 소리 교체·추가 (2026-09-07, Mixkit Sound Effects Free License — 표기 불필요, 상업 이용 가능)

앵무 병원 놀이(P5)에서 "건강한 앵무 소리"와 "이 아이 소리"를 비교하므로, 건강한 쪽은 부드러운 지저귐, 이상한 쪽은 날카로운 비명으로 갈라지게 골랐다. 트림은 MP3 프레임 단위(재인코딩 없음). 2026-09-07 각 페이지에서 Mixkit Sound Effects Free License 표시를 확인했다. 원본 미리듣기 파일은 `_shots/audio-candidates/`(Git 제외).

| 파일 | 원본 | 출처 | 라이선스 | 가공 |
|---|---|---|---|---|
| `public/audio/v2/parrot-call.mp3` | Double little bird chirp (#2697) | https://mixkit.co/free-sound-effects/bird/ | Mixkit Sound Effects Free License | 0~2.4초 트림 |
| `public/audio/v2/parrot-alarm.mp3` | Jungle bird screech (#73) | https://mixkit.co/free-sound-effects/bird/ | Mixkit Sound Effects Free License | 0~2.4초 트림 |
| `public/audio/v2/parrot-happy.mp3` | Tropical forest bird chirp (#311) | https://mixkit.co/free-sound-effects/bird/ | Mixkit Sound Effects Free License | 전체(1.2초) |

앱에서는 위 원본을 보존하고 다음 런타임 사본을 재생한다.

| 런타임 파일 | 제작·가공 | 용도 |
|---|---|---|
| `public/audio/v2/parrot-call-audible.mp3` | Windows 기본 한국어 음성 합성(Microsoft Heami)으로 자체 생성한 “안녕하세요!”에 피치 조정·라우드니스 정규화(`-18 LUFS`, true peak `-2 dB`) | 건강한 앵무가 사람 말을 따라 하는 기준음 |
| `public/audio/v2/parrot-alarm-audible.mp3` | 위 Jungle bird screech (#73)를 1.7초로 트림하고 EBU R128 라우드니스 정규화(`-18 LUFS`, true peak `-2 dB`) | 스트레스 상태의 짧고 거친 경고음 |

## v6 숲 비교·생방송 이미지 (2026-09-07)

`public/assets/v6/`의 숲 복원 전후 장면, 한국 숲새 6종, 방송 조정실·오프닝·현장·원인 설명·행동 요청·마이크 사고 포스터, 근거/소문/마이크 선택 이미지는 OpenAI imagegen으로 제작한 프로젝트 자체 에셋이다. 동일 카메라의 숲 장면을 기준으로 나무·기계 작동·물 중 한 변수만 바뀌도록 편집 생성했으며, 방송 이미지는 하나의 뉴스 특집처럼 조명과 장비 톤을 통일했다. 영상 제작용 시작 이미지와 프롬프트는 `docs/BROADCAST_VIDEO_PROMPTS.md`에 기록했다.

## v7 프로젝트 화풍 재정렬 이미지 (2026-09-07)

`public/assets/v7/`의 방송 조정실·대기·오프닝·원인 설명·현장 리포터·마이크 사고 포스터, 근거/소문/마이크 선택 카드와 숲새 6종은 OpenAI 내장 imagegen으로 제작한 프로젝트 자체 에셋이다. `page-01/keyart.webp`, 기존 멘토, 방송 장비, 스테이지 배경을 스타일 레퍼런스로 사용해 큰 눈의 둥근 3D 캐릭터, 네이비·골드 장비, 시안·코랄 조명으로 통일했다. 자연 관찰용 숲 비교 장면과 드론 현장 장면은 v6 원본을 유지한다. 고정 스타일 기준은 `docs/PROJECT_IMAGE_STYLE.md`에 기록했다.

## v2 추가 이미지 (2026-09-04)

`public/assets/v2/*.webp` 14장은 생성형 AI(Google Imagen)로 제작한 자체 에셋이다. 원본 PNG는 `_unused/v2-originals/` 에 보존. 프롬프트는 `docs/IMAGEN_PROMPTS_v2.md`.

## 글꼴 (2026-09-04, SIL Open Font License 1.1 — 원문 동봉)

| 파일 | 글꼴 | 출처 | 라이선스 | 가공 |
|---|---|---|---|---|
| `public/assets/fonts/Jua-Regular.woff2` | Jua (Google Fonts) | https://fonts.google.com/specimen/Jua | SIL OFL 1.1 (`Jua-OFL.txt`) | 한글 완성형·라틴 서브셋, woff2 변환 |
| `public/assets/fonts/Pretendard-*.sub.woff2` | Pretendard 1.3.9 | https://github.com/orioncactus/pretendard | SIL OFL 1.1 (`Pretendard-OFL.txt`) | 2026-09-10 보관 전체 원본(Version 1.309, 14,336자)과 바이트 동일하게 복구. `.sub`는 이전 URL 호환용 이름이며 현재 자체 서브셋 아님. 원본 이름·저작권·OFL 메타데이터 유지 |

원본 전체 글꼴 파일은 `_unused/fonts-full/` 에 보존.

## v5 숲새 합창 (2026-09-08, Mixkit Sound Effects Free License)

| 파일 | 원본 | 출처 | 라이선스 | 가공 |
|---|---|---|---|---|
| `public/audio/v2/forest-birdsong.mp3` | Little birds singing in the trees (#17) | https://mixkit.co/free-sound-effects/birds/ | Mixkit Sound Effects Free License | 0~5.2초 트림 |

이전 파일은 `parrot-call-audible.mp3`(음성 합성 "안녕하세요")와 같은 내용이 잘못 복사돼 있어 숲새 흔적·실험 결과에서 사람 목소리가 났다. 원본은 `_unused/audio-v2-prev/forest-birdsong-tts-duplicate.mp3`.


## 2026-09-10 납품 자산 정리

- Pretendard Regular/Bold는 `_unused/fonts-full/`의 보관 WOFF2를 재가공 없이 런타임 경로로 복사했다. 각각 source/runtime SHA-256 동일성을 확인했다. 새로운 글꼴 다운로드·설치·이름 변경은 하지 않았다. 보관 파일의 name metadata에는 Version 1.309, 길형진 저작권과 SIL OFL 1.1이 있다. 이전 자체 서브셋에서 원본의 Reserved Font Name을 유지하던 상태를 해소하기 위한 변경이다.
- 원본 스토리보드 PNG 6개와 미사용 후보는 삭제하지 않는다. 빌드는 현재 앱이 참조하는 자산만 복사하므로 원본 스토리보드는 배포 대상에서 제외된다. `dist/asset-build-report.json`에 해당 빌드의 제외 목록을 남긴다.
- 실제 미디어 바이트·SHA-256·사용 코드 위치는 `public/assets/asset-manifest.json`에 기록한다. 코드 참조의 정확성은 권리 증명의 대체물이 아니다.

### 추가 증빙이 필요한 자료

| 자료 | 현재 확인한 것 | 아직 확정하지 않은 것 |
|---|---|---|
| `public/assets/v8/` | 프로젝트의 현행 이미지 파일과 적용 위치. 기존 앱의 생성형 AI 이미지 고지는 유지 | 파일별 생성/입수 도구·시점·원본의 상세 기록 |
| `public/video/storyboards/` | 프로젝트에 보관된 영상 기획용 그림과 프롬프트. 앱에서 사용하지 않아 배포 제외 | 상세 생성/입수 이력 |
| `public/audio/v5/broadcast-mic-test.wav` | 위 표의 제작 메모: Higgsfield/Seed Audio 합성 음성 | 생성 당시 서비스 조건·계정 플랜·업체 납품 범위의 권리자 확인 |
| `public/audio/v2/parrot-call-audible.mp3` | 위 표의 제작 메모: Windows 기본 음성 합성 후 가공 | 해당 음성 출력물의 납품 이용조건 확인 |

이 표는 위반 판정이 아니다. 외부 허락·계약·당시 이용조건을 확인하지 않은 채 확인 완료로 기록하지 않는다. 납품 범위가 확정되면 권리자가 근거를 첨부하거나 조건이 명확한 자체 음성으로 교체한다.

## Meshy 앵무새 3D 모형 (2026-09-10)

프로젝트의 기존 앵무새 이미지를 입력으로 Meshy 7 standard에서 지구·젤리의 돌봄 전/후 GLB 네 개를 생성했다. 생성 요청은 목표 삼각형 16,000개·2K 텍스처·GLB 형식이다. 아래 task ID는 생성 이력을 위한 작업 식별자이며 API 인증 정보는 포함하지 않는다.

| 모형 | 입력 그림 | Meshy task ID |
|---|---|---|
| `public/assets/meshy/jigu-sick.glb` | `public/assets/v2/parrot-sick-green.webp` | `01a086c4-dc21-71a5-a460-6ffff8ada640` |
| `public/assets/meshy/jigu-healthy.glb` | `public/assets/v5/parrot-well-green.webp` | `01a086c4-f68e-766f-9817-f1fc04ba3fbe` |
| `public/assets/meshy/jelly-sick.glb` | `public/assets/v2/parrot-sick-red.webp` | `01a086c4-ea6a-7465-802d-800de0ff0c53` |
| `public/assets/meshy/jelly-healthy.glb` | `public/assets/v5/parrot-well-red.webp` | `01a086c5-0439-737f-897d-9de8f89b556c` |

생성 요청 네 건에 사용된 크레딧은 각 30, 합계 120이다. 파일별 실제 바이트·SHA-256·삼각형 수·내장 텍스처 크기는 자산 manifest의 `modelStats`와 GLB 검사 결과로 확인한다. 모형은 포즈가 고정된 개별 파일이며 리깅·애니메이션을 제작했다고 표시하지 않는다. 입력 그림의 출처는 위 기존 이미지 이력을 따른다. 계정 플랜의 이용조건과 업체 납품 계약상 이용범위는 별도 확인 대상이다.

`sick-pair.png`와 `healthy-pair.png`는 이 GLB를 로컬 3D 뷰포트에서 렌더한 미리보기다. 추가 이미지 생성 서비스를 사용하지 않았다. 재현 스크립트는 `scripts/render-parrot-previews.mjs`에 보관한다.

## 스테이지 5 협업 활동 이미지 (2026-09-12)

`public/assets/v9/cooperation-map-restored.png`, `cooperation-sapling.png`, `cooperation-water-cleared.png`, `cooperation-quiet-site.png`는 Codex 내장 image_gen으로 제작했다. 지도는 기존 `v5/drone-map-wide.webp`의 구도를 유지한 복구 편집이고, 물길과 공사장은 각각 기존 `v8/broadcast-photo-stream-blocked-v2.jpg`, `broadcast-photo-construction-v2.jpg`를 참조해 같은 현장이 정비된 결과로 편집했다. 묘목은 신규 생성했다. 생성 원본을 수정 없이 프로젝트에 복사했으며, 묘목의 원형 표시는 CSS로 처리한다. 이 그림은 교육용 가상 상황이며 실제 복구 현장 사진이 아니다. 최종 프롬프트와 경로는 `docs/STAGE5-COOPERATION-ASSETS.md`에 기록했다.

## P8 마이크 교체 후 방송 재개 이미지 (2026-09-11)

`public/assets/v8/broadcast-mic-recovered.png`는 OpenAI 내장 image_gen으로 생성한 프로젝트 자체 이미지다. 기존 v7 마이크 사고·현장 리포터 그림을 얼굴·복장·숲 장소·화풍 참조로 사용해, 같은 가상 리포터가 새 은색 그릴 마이크로 방송을 이어가는 모습을 1장 제작했다. 이미지에는 문자·로고·상태 패널을 넣지 않았다. 정확한 프롬프트, 참조 역할과 생성 원본 경로는 `docs/P8-MIC-RECOVERY-IMAGE-20260911.md`에 기록했다.

같은 날 P8 내용에 맞는 `broadcast-anchor-neutral.png`(같은 남자 앵커·빈 파란 배경), `broadcast-graph-water.png`(물 채우기와 새 2마리), `broadcast-action-report.png`(새와 거리를 두고 전화로 도움을 요청하는 성인)를 각각 OpenAI 내장 image_gen으로 1장씩 추가 제작했다. v7 앵커 그림과 v8 자연 카드 이미지는 얼굴·복장·화풍 참조로만 사용했으며, 정확한 프롬프트·참조 역할·원본 경로도 위 문서에 기록했다. 결과 PNG는 생성 원본을 변경 없이 프로젝트로 복사했다.

카드 자막과 그림의 뜻을 맞추기 위해 `broadcast-graph-trees-grown.png`(건강한 열매 묘목을 심고 보호)와 `broadcast-graph-quiet.png`(빈 운전석·땅에 내린 버킷·작업자가 들고 있는 열쇠로 기계 정지 표현)를 각각 OpenAI 내장 image_gen으로 추가 생성했다. 위 물 채우기·신고 카드의 스타일을 참조했으며, 벌목 장면이나 음파 그림을 재사용하지 않았다. 두 PNG의 정확한 생성 프롬프트·참조 역할·원본 경로·확인 내용도 같은 문서에 기록했다.

## 최종 고도화 자산 (2026-09-12)

학교 화단의 도움 전·후 그림 두 장은 OpenAI 내장 image_gen으로 새로 제작했다. 기존 프로젝트 화풍을 따르며 동일한 화단에서 빈 물그릇이 채워지고 새가 물을 마시는 변화만 보여 준다. 실제 학교나 인물을 촬영한 자료가 아니다. 파일·생성 이력은 [학교 화단 자산 기록](SCHOOL-GARDEN-ASSETS-20260912.md)에 정리했다.

기존 방송·협업·나무 흔적·3D 미리보기 PNG 13장은 같은 그림을 WebP로 인코딩해 배포한다. 출처와 권리는 변환 전 기록을 그대로 따른다. 생성 원본은 `_unused/release-optimization-20260912/`에 보존하며 `scripts/optimize-release-images.py`로 변환을 재현할 수 있다. 런타임 경로는 같은 이름의 `.webp`이며 실제 참조·크기·해시는 asset manifest에서 확인한다. 학교 화단 생성 원본은 `output/school-garden-20260912/`에 보관하고 배포하지 않는다.
