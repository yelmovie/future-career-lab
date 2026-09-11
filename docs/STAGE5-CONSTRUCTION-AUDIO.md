# 스테이지 5 공사 소리

적용 파일: `public/audio/v9/construction-site-loop.wav`

## 출처와 이용조건

- 원음: **construction equipment tracked.wav**, **cognito perceptu**, Freesound #88422.
- 공식 페이지: https://freesound.org/people/cognito%20perceptu/sounds/88422/
- 이용조건: **CC0 1.0 Universal** — https://creativecommons.org/publicdomain/zero/1.0/
- 확인일: 2026-09-11. 공식 음원 페이지에 CC0 표시와 상업적 복제·수정·배포 허용 안내가 있다.
- 공개 고음질 MP3: https://cdn.freesound.org/previews/88/88422_57789-hq.mp3
- 내려받은 MP3는 `assets/source-audio/construction-tracked-88422.mp3`에 보관한다. 원본 WAV를 내려받았다고 표시하지 않는다.
- 작성자가 설명한 내용은 흙을 옮기는 궤도식 공사 장비의 작동음이다. 저작자나 Freesound의 프로젝트 후원을 의미하지 않는다.

## 가공과 재현

원음을 모노 22,050Hz로 변환하고 큰 소리의 피크를 압축한 뒤, 8–20.8초를 잘랐다. 앞뒤 0.8초를 교차 연결해 12초 반복 음원으로 만들고, DC 오프셋을 제거했다. 2026-09-12 음량 개선판은 RMS -12 dBFS, 최대 피크 약 -1.84 dBFS, 16-bit PCM WAV, 529,244바이트다. 기존 RMS -20 dBFS보다 평균 레벨을 8dB 높였으며 실제 PCM의 클리핑 샘플은 0개다. 기기 출력 음량이나 체감 음량의 배수를 뜻하는 수치는 아니다.

압축 설정은 threshold -26dB, knee 12dB, ratio 4:1, attack 3ms, release 120ms다. 최종 정규화는 RMS -12 dBFS와 피크 -1 dBFS 한도를 함께 적용한다. 슬라이더·효과음 설정의 비율과 음소거 동작은 유지한다.

```powershell
node scripts/prepare-construction-audio.mjs assets/source-audio/construction-tracked-88422.mp3
```

입수 URL, 원음과 결과물 SHA-256, 가공 수치는 `assets/licenses/construction-audio.json`에 남긴다. 이 작업에서 검토한 Mixkit 후보는 앱에 사용하지 않았다.

## 동작

- 사진 속 **공사 소리 듣기**를 누르면 사용자 입력 안에서 오디오를 시작한다. Web Audio gain은 0에서 부드럽게 올라간다.
- 듣는 동안 배경음은 멈추고, 공사 소리 손잡이가 80→20으로 내려가면 실제 음량도 같은 비율로 줄어든다. 0에서는 무음이다.
- **공사 소리 멈추기**, 지도 이동, 결과 화면 이동, 페이지 이동에서 재생을 정리한다.
- 전체 음소거 또는 효과음 0 설정을 존중한다. 음소거 해제만으로 다시 재생하지 않는다. 탭이 숨겨지면 중앙 오디오 서비스가 일시 정지한다.
- 음원이 실패하면 재시도 안내를 표시하고, 소리를 듣지 않아도 기존 미션 조건으로 진행할 수 있다.

실제 브라우저 재생과 음량·음소거·이동 검사는 `e2e/cooperation-audio.spec.ts`, 오디오 실패와 소유권 검사는 `tests/audioService.test.ts`에서 확인한다.

2026-09-12 음량 개선판 검증: 기존 공사 소리 E2E 5개 통과(반복 재생·슬라이더·음소거·선택적 듣기·태블릿 조작), lint와 프로덕션 빌드 통과. 실제 PCM 평균 레벨은 -12.0003 dBFS, 피크 -1.8359 dBFS, 클리핑 0개이며 출력 WAV와 출처 기록의 SHA-256이 일치한다. 기기 스피커의 체감 음량은 별도 확인 대상이다.
