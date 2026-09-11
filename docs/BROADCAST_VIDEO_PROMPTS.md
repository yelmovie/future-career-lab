# 생방송 컨트롤룸 영상 제작 프롬프트

아래 포스터를 각 영상의 시작 이미지로 사용한다. 공통 출력은 `16:9, 1920×1080, H.264 MP4, 24 또는 30fps, 6~8초`다. 자연 현장 영상은 시작 이미지의 실사/준실사 질감을 유지하고, 사람·방송실 장면은 프로젝트의 둥근 3D 교육게임 화풍을 절대 실사로 바꾸지 않는다. 카메라와 인물의 얼굴·눈 크기·의상·장비 위치를 첫 이미지에서 바꾸지 말고, 자막·글자·로고·워터마크는 생성하지 않는다. 웹 화면에서 반복 재생하므로 시작과 끝의 카메라 움직임은 부드럽게 연결한다.

## 1. 오프닝

- 시작 이미지: `public/assets/v7/broadcast-opening-poster-male.jpg`
- 저장 경로: `public/video/broadcast/opening.mp4`
- 프롬프트: 고정된 3D 애니메이션 뉴스 스튜디오 카메라. 짧은 검은 머리에 네이비 정장과 하늘색 넥타이를 한 남자 앵커가 카메라를 보며 자연스럽게 두 문장 정도 오프닝을 말하고 한 번 가볍게 고개를 끄덕인다. 얼굴·머리·의상은 시작 이미지와 동일하게 유지한다. 손은 책상 위에서 작고 안정적으로 움직인다. 뒤 비디오월의 숲·새 심볼과 파형만 아주 미세하게 움직인다. 느린 2% 푸시인, 네이비·골드 장비와 시안·코랄 조명, 부드러운 장난감 재질을 유지한다. 실사 피부나 실제 사람으로 변환하지 않는다. 마지막 프레임은 첫 프레임과 가까운 자세로 돌아와 반복이 부드럽게 이어진다.

## 2. 현장 상황

- 시작 이미지: `public/assets/v6/broadcast-field-poster.webp`
- 저장 경로: `public/video/broadcast/field.mp4`
- 프롬프트: 안정화된 뉴스 드론이 훼손된 숲 가장자리 위를 매우 천천히 오른쪽 앞으로 이동한다. 노란 굴착기는 실제 속도로 흙을 한 번 들어 옮기고, 바퀴와 버킷 주변에 약한 먼지가 자연스럽게 흩어진다. 마른 개울 바닥과 그루터기, 남아 있는 숲의 경계가 계속 잘 보인다. 갑작스러운 줌이나 장면 전환 없이 사실적인 현장 보도 영상, 나무·기계·지형의 형태와 위치를 유지한다.

## 3. 원인 설명

- 시작 이미지: `public/assets/v7/broadcast-cause-poster-male.jpg`
- 저장 경로: `public/video/broadcast/cause.mp4`
- 프롬프트: 고정된 뉴스 스튜디오 와이드 숏. 오프닝과 동일한 짧은 검은 머리·네이비 정장·하늘색 넥타이의 남자 앵커가 몸을 카메라 쪽에 둔 채 한 손으로 비디오월의 근거를 차례로 짧게 가리킨다. 얼굴·머리·의상은 시작 이미지와 동일하게 유지한다. 나무 훼손 화면과 감소 화살표에 은은한 테두리 빛이 순서대로 켜지고, 새 실루엣은 천천히 화면 밖으로 날아가지만 패널 구성과 데이터 의미는 변하지 않는다. 글자와 숫자는 새로 만들지 않는다.

## 4. 시민 행동 요청

- 시작 이미지: `public/assets/v7/broadcast-action-poster.webp`
- 저장 경로: `public/video/broadcast/action.mp4`
- 프롬프트: 삼각대에 고정한 현장 뉴스 카메라. 리포터가 카메라를 보며 한 문장을 말하고 왼손으로 뒤 복원 현장을 소개한다. 자원봉사자들은 묘목을 조심스럽게 심고, 멈춘 굴착기 주변의 소음 차단막은 바람에 아주 조금 흔들리며, 복원된 개울 물은 자연스럽게 흐른다. 리포터 얼굴과 손가락, 마이크 모양이 무너지지 않게 하고 과도한 군중 이동이나 카메라 흔들림은 넣지 않는다.

## 5. 마이크 사고

- 시작 이미지: `public/assets/v7/broadcast-mic-failure-poster.webp`
- 저장 경로: `public/video/broadcast/mic-failure.mp4`
- 프롬프트: 같은 현장 리포터 숏을 유지한다. 리포터가 말하던 중 목소리가 끊긴 것을 알아차리고, 당황하지 않은 채 마이크 아래 케이블을 내려다본 뒤 한 번 살짝 눌러 확인한다. 허리의 송신기 빨간 상태등이 두 번 천천히 깜빡인다. 표정은 걱정스럽지만 전문적이고 차분하다. 배경 작업은 계속되며 불꽃·연기·위험 연출은 없다. 마지막에는 카메라를 다시 바라보며 조용히 기다린다.

## 공통 네거티브 프롬프트

`photoreal person, live-action human, photographic skin, realistic studio conversion, readable text, captions, subtitles, logos, watermark, extra fingers, deformed hands, face morphing, enlarged or shrunken eyes, duplicated people, changing clothes, changing equipment, camera jump, sudden zoom, scene cut, flicker, unstable background, style drift`
