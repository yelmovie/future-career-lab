# 프로젝트 상태 (2026-09-04)

## 최신 화면 피드백 — 2026-09-12

- 공사 소리 최대 음량 피드백 반영: 가공 스크립트에서 다이내믹 압축 후 RMS -12 dBFS로 정규화해 기존보다 평균 레벨 +8dB. 실제 PCM 피크 -1.84 dBFS, 클리핑 0개. 슬라이더 비율·전체 효과음 설정·음소거는 그대로 유지한다.
- 세부 근거는 `docs/reviews/UI-AUDIO-FOLLOWUP-20260912.md`. 공사 소리는 Freesound #88422 CC0 장비 녹음을 12초로 가공해 `public/audio/v9/construction-site-loop.wav`에 추가했다. 듣기 버튼으로 시작하며 slider는 실제 gain을 바꾼다. 듣기 필수화·자동재생·강제 음소거 해제를 추가하지 않는다. 출처는 `docs/STAGE5-CONSTRUCTION-AUDIO.md`.
- 스테이지 5 전후 그림은 왼쪽 이전 / 오른쪽 함께 바꾼 모습, 처음 50%씩. 그림 내부 제목을 유지하고 하단은 ‘두 모습 비교하기’. 이전 왼쪽 복원 이미지 구도로 돌리지 않는다.
- 수료증 ‘지구와 젤리를 찾고’ 제거, 본문 4줄을 화면/PNG/인쇄 공통 사용. 증거판 배지 본문은 ‘단서로’와 ‘찾았대!’ 뒤 줄바꿈.
- 방송 다시 보기의 잠깐 멈춤 버튼·상태·안내 제거. 자동 진행, 이전/다음, 처음부터 다시 보기 유지.
- 드론 지도 바람 구역 네모/반복 화살표 제거, 위쪽 번호별 풍향 안내로 분리. 이동은 파란 실선, 복귀는 청록 점선이며 방향 표시는 실제 선분을 따른다. 실제 비행과 4초 다시 보기 모두 이륙장 복귀 포함.
- 설정 후속: 교사용 가이드에서 수업 자료 준비 UI·정답지/판정기준·운영준비·성취기준 서문과 연계표를 제거하고 성취기준 4항목을 남겼다. 기존 교사용 전체 해금/종료 조작은 유지한다. 학생용 ‘왜 네 직업이나 해?’ 단락 제거. 효과음 정보에 CC0 공사 녹음 크레딧 추가.
- 전체 단위179개 및 화면별 검증 통과 후, 마지막 설정 수정도 교사 전체 화면 이동·진행기록 불변 E2E와 lint/빌드 통과. 자산260개/실행146개, 최신 배포185파일89,513,191바이트. 브라우저 흐름·소리·두해상도 경계 검증은 위 문서 참고.

## 최우선 최신 기준 — 스테이지 5 협업 체험 (2026-09-12)

- **스테이지 5는 이 항목과 `docs/reviews/STAGE5-COOPERATION-20260912.md`, 현재 코드가 이전 기록보다 우선이다.** 아래 2026-09-10 및 이전 기록에 남은 강제 1인 실패·12문항 릴레이·다른 공원 적용 시험은 변경 이력이다. 현재 플레이 경로로 복구하지 않는다.
- 페이지 9의 진입점 `Page08Crisis.tsx`가 새 `Stage05Cooperation.tsx`를 내보낸다. 네 직업의 인물이 앞선 사진·조사·돌봄·방송 정보를 나누고, 학생이 지도에서 세 장소를 원하는 순서로 돕는다. 묘목 두 자리 드래그·물길 쓸기·소리 슬라이더에 탭/키보드 대안이 있으며, 도움 전달→다음 팀의 작업 결과→전후 지도→수료증으로 이어진다. 배지가 직접 말하는 구성은 사용하지 않는다.
- 새 상태 `pageData.p9Cooperation` version1을 사용하며 이전 `p9Alliance`에서 끝낸 장소와 페이지 9 완료 여부를 보존한다. 진행 중인 옛 퀴즈는 새 지도로 이어지고, 완료한 저장은 엔딩으로 들어간다. 앞선 탐험 기록을 초기화하지 않는다. 상세 복구 규칙은 `stage5CooperationModel.ts`와 최신 구현 기록을 따른다.
- 새 자산은 `public/assets/v9/cooperation-{map-restored,sapling,water-cleared,quiet-site}.png`. 물길·공사장 결과는 같은 원본 현장이 정비된 그림으로 연결했다. 작업 미래형/결과 과거형, 지도 진행 단계 유지, 묘목 키보드 포커스, 지도 직접 쓸기 비교 적용 완료. 생성 기록은 `docs/STAGE5-COOPERATION-ASSETS.md`.
- 드래그 직후 compatibility click 누락에 대비해 공통 StepShell 다음 버튼은 터치 pointerup을 한 번 처리하고 뒤따르는 click을 소비한다. 수료증 탐험 기록은 새 공원 시험 칸 대신 실제 협업 로그를 사용한다.
- 검증: 단위 전체170개 후 학습기록7개(신규2개 포함) 추가 확인, lint PASS. 기능 회귀10개와 두해상도 전역 경계 E2E PASS, 마지막 수료증 기록 연결 후 협업4개 재확인 PASS. 시각12상태 및 마지막 소음/엔딩4상태에서 잘림·겹침·내부 초과0, 조작48px 이상. 실제 태블릿·학생 실증과 구분한다. 상세 증거와 빌드는 최신 구현 기록을 따른다.

## 최신 고도화 — 2026-09-10

- 사용자가 계획 검토 후 구현을 승인했고, 병렬로 교육·디자인·납품 준비를 개선했다. 이전 기록은 변경 이력이며 현재 기준은 `docs/reviews/ADVANCEMENT-RESULT-20260910.md`와 코드다. 푸시·병합·원격 배포는 하지 않았다.
- P7은 같은 시작값에서 세 조건을 비교하고 근거 없는 결론을 막으며 수정 이력을 저장한다. P8은 실제 원자료 대조·정정 방송·신뢰 회복을 기록한다. P9의 기존 연합 뒤에는 연구 기록을 다른 공원에 적용하는 마지막 도전이 있고, P11은 실제 탐험 기록을 열고 TXT로 저장한다. 폐기된 적성 예측·능력 문장 선택을 복구하지 않는다.
- P5/P6는 탭·터치 드래그·키보드를 같은 규칙으로 처리한다. 정원은 여러 타당한 배치를 허용한다. 논리 1280 무대에서 최소 조작 60px로 1024 폭에서 48px, 주요 본문 20px로 실제 16px를 확보했다. 2026-09-10 P9/P11 16상태 QA는 잘림·작은 버튼·작은 글자 위반 0이다.
- 저장은 필드별로 복구하고 손상 원문 백업이 실패하면 덮어쓰지 않는다. 수업 자료 준비는 교사의 명시적 시작·이어받기·파일 해시 확인을 제공하며 새 SW가 수업 도중 버전을 강제로 바꾸지 않는다. Vite는 실제 참조 자산만 납품하고 원본·미사용 파일을 보존한다.
- 사용자 요청으로 Meshy 공식 MCP를 개인 Codex 환경에 연결했다. API 키는 개인 환경의 Windows 암호화 저장소에서만 사용하며 프로젝트·프론트엔드·명령 인자에 넣지 않는다. 로컬 연결 준비 파일은 `/tmp/meshy-setup/`에 있고 git에서 제외된다.
- Meshy 7로 기존 앵무 이미지 4장을 참조해 `public/assets/meshy/{jigu-sick,jigu-healthy,jelly-sick,jelly-healthy}.glb` 생성 완료. 총 120크레딧, 파일 합계 16,688,924B, 각 약 16.2k 삼각형·2k 내장 JPEG, 애니메이션 없음. 원격 텍스처·압축 디코더 없이 동작한다. `sick-pair.png`/`healthy-pair.png`는 이 GLB를 직접 렌더한 2400×1650 미리보기다. 재현은 `scripts/render-parrot-previews.mjs`, 이력은 `assets/CREDITS.md`.
- 생성 모델은 이야기 속 모형이다. 지구의 빈 가슴 깃털·젤리의 반감긴 눈을 보조 관찰할 수 있지만 정적인 모델로 소리·물 섭취·진단을 확정하지 않는다. 선택형 P5 3D 창은 학습 완료 판정을 바꾸지 않는다. 실제 아동 학습효과·학교 기기 인수 없이 11/10 달성을 인증하지 않는다.
- 최종 자동 검증: 타입·린트 PASS, 단위 17파일125개 PASS, 기존 E2E19개+새3D2개(고유21개) PASS와 기존 제외9개. P5/P6 영향 회귀4개 재확인, 3D 4상태·2PNG·회전·오류 대체·기록 유지 검증. 측면·후면12뷰 큰 생성 오류0. 수업 manifest는 Vite 최종 후처리 뒤 만들고 실제 출력 전수 해시 일치를 빌드 조건으로 검사한다.
- 최종 오프라인 로컬 검사 PASS: release `2f2da0642350db74`, 176/176파일·63,577,775B 준비 완료, 인터넷 차단 뒤 전체 SHA 일치·MP3 Range·미방문9라우트·P5 실제3D 로드 통과, 런타임/네트워크 오류0. 초기 홈은 단회 DCL168ms·load327ms·2,907,456B, 초기3D요청0이었다. 이 수치는 학교망·학생 실제 완주 측정이 아니다. 증거 `test-results/advancement-20260910/offline-report.json`.
- 별도 전달용 `artifacts/meshy-parrots-20260910.zip`에는 4GLB·2PNG·생성/사용 README만 포함했다. API 키·개인 MCP 설정을 포함하지 않는다.

## 이전 변경 이력

- **v2 초기 배포 가능 완성본.** 로컬 커밋까지 완료, **푸시는 안 함**(사용자 요청 시). 성적표: docs/reviews/FINAL-CHECK-20260904.md
- 구조: 11페이지(브리핑→S1 드론·증거판→S2 돌봄·회복공간→S3 생태→S4 방송→S5 연합→돌아보기→수료증). 페이지 번호 ≠ 파일 번호(src/app/App.tsx, PAGE_META).
- 저장 스키마 v2(artifacts·prediction·abilityStatements). v1 세이브는 진행 초기화 후 이름·설정만 유지.
- 에셋: v2 Imagen 14장(원본 _unused/v2-originals), SFX 4개 Mixkit(픽사베이는 Cloudflare로 자동 다운로드 불가), 폰트 Jua·Pretendard 서브셋 셀프호스팅.
- 오프라인: public/sw.js. 첫 방문은 온라인 필요, 두 번째부터 오프라인 진행 확인.
- 검수 도구: scripts/screenshot-pages.mjs(3해상도), scripts/probe-offline.mjs.
- 사용자 직접 확인 필요: 교육 항목(성취기준 코드 [검증 필요], 앵무 돌봄 문구, S3 단순 모델), 실제 태블릿·아동 플레이.
- 미해결: HTML5 DnD는 iOS에서 탭 대안 경로, 미사용 슬롯 이미지 59개(_unused/DELETE-CANDIDATES.md).
- **페이지 4 증거판 = 4단계 마법사 (2026-09-04):** 한 화면에 네 작업이 펼쳐져 있어 초등학생이 다음 눌 곳을 못 찾던 문제를 고쳤다. `Step = 'detail'|'link'|'sort'|'guess'` 로 한 단계씩만 보여 주고, 하단 큰 버튼으로만 넘어간다(p4Step 에 저장, 이어하기 시 미완료 단계로 자동 복귀). 이전 버그: 카드를 칸에 먼저 넣으면 확대 버튼이 CSS 로 숨겨져 세부 찾기가 영영 막혔다 — 칸 안 사진 카드도 돋보기를 유지한다(e2e `page04-board.spec.ts` 가 지킴). 핫스팟은 `DETAIL_TOUCH_PAD` 만큼 넉넉히 잡고, 확대 팝업에 "못 찾겠어요" 힌트 링이 있다.
- **16:9 고정 무대 (2026-09-04):** 모든 화면은 논리 1280×720 으로 그리고 `src/app/stageScale.ts` 가 `.stage` 를 transform: scale 로 뷰포트에 맞춘다(레터박스). 폭 미디어쿼리·vw 단위 사용 금지, 글자 토큰은 px 고정(26/21/17/15). 넘치는 내용은 패널 내부 스크롤 또는 MissionGuide "자세히" 팝업으로. Phaser 는 Scale.NONE + ResizeObserver(clientWidth) — RESIZE 모드는 transform 때문에 크기를 잘못 읽는다. 뷰포트 좌표를 DOM 에 쓸 때는 `toStagePoint()`/`getStageScale()` 로 보정. 캔버스는 1920 에서 1.5배 업스케일이라 약간 부드럽게 보임(DPR 렌더링 미적용). 검수: `SHOT_PROFILES=1280x720,1920x1080 node scripts/screenshot-pages.mjs`, 숨은 상태는 `scripts/screenshot-states.mjs`.
- **v3 (2026-09-05 야간):** 서사를 "동물원 앵무 지구(초록)·젤리(빨강) 탈출 사건"으로 교체(docs/GAME_CONCEPT_v3.md §3 이름표가 표기 기준). 페이지 순서·메커닉·저장 스키마는 v2 그대로, 문구만 바꿈.
- **v3 디자인:** 남색·금색 → 밝은 파스텔(하늘·크림·햇빛노랑·앵무초록·산호). 토큰은 src/styles/index.css 상단 `--color-*`; 예전 이름(--cream/--gold-pale/--navy-*)은 호환용으로 값만 재맵핑. 페이지 CSS 는 스크립트로 일괄 변환(어두운 배경→흰색, 밝은 글자→진한 글자, 16px 미만→16px)했으므로 새 CSS 는 `--color-*` 토큰만 쓴다. 버튼은 3D 엣지(box-shadow 0 5px 0 edge, active translateY). 배경 10장은 흰색 워시(82~90%)로 파스텔화 — 밝은 배경을 새로 만들면 워시를 줄인다.
- **v3 에셋 자리:** `v3Asset()` + `fallbackTo()` (src/shared/assets.ts). public/assets/v3/ 에 파일이 없으면 v2 그림으로 되돌아감. 프롬프트: docs/ASSET_REQUEST_v3.md.
- 크레딧 파일 위치: assets/CREDITS.md (루트에서 이동). SW 버전 fcl-v3-2026.09.05, 오디오 200 응답을 캐시에 보관.
- **v4 (2026-09-05 낮):** "한 화면 한 행동" 재설계. 공통 키트 `src/components/v4/` (StepShell·PictureChoice·SlotBoard·v4.css). P2·P4·P5·P6·P7·P8·P9·P10 전부 StepShell 위에 다시 씀(docs/GAME_DESIGN_v4.md 가 기준). 드론(P3)은 메커닉 유지·표면만. 옛 e2e(app/ux-flow/page04-board/page08/page09)는 skip 처리하고 `e2e/v4-*.spec.ts` 4개가 대신한다. page-05~10 슬롯 60장은 flood-fill 로 투명화(원본 PNG 는 assets/ 에 그대로). HabitatScene.ts·habitatModel.ts 는 더 이상 import 되지 않음(삭제 안 함).
- screenshot-states.mjs 는 v4 화면과 안 맞음(옛 "자세히" 버튼 기준). 필요하면 StepShell 기준으로 다시 씀.
- **v5 디자인·P5 (2026-09-07):** ① 바탕 — 흰 워시 대신 페이지별 hue(`GameShell.tsx` PAGE_HUE → `--page-h`)로 파스텔 그라데이션·색 얼룩·점무늬를 깔고 원래 배경 그림은 `.game-shell::before` 34% 로만 비침. 상단바·푸터는 반투명 유리, 카드 그림자는 페이지 색. 밝은 배경 10장이 오면 `::before` opacity 를 .55 로. ② P5 = "앵무 병원 놀이": 돋보기(핫스팟 자리를 CSS 3.3배 확대, `zone.closeup` 은 그림 비율·`zone.hotspot` 은 372px 무대 비율) → 진료 기록판 스티커(`zone.sticker`) → 소리 비교(건강한 앵무 = parrot-call 기준, "같아요/달라요", 파형이 달라 무음에서도 답 가능) → 처치 카드에 "언제 쓰나"(`treatment.when`). 판정 모델·저장·careLog 형식은 그대로, e2e `v4-care-garden.spec.ts` 갱신. 그림 요청 목록: `docs/ASSET_REQUEST_v5.md`.
- **이름 변경 (2026-09-07):** 앵무 초록 모모 → **지구**, 빨강 루비 → **젤리**. 코드·테스트·문서 31개 파일 일괄 치환(`page05Data.ts` BIRDS.name 이 표기 기준). 에셋 파일명(parrot-sick-green 등)은 그대로.
- **앵무 소리 (2026-09-07):** Pixabay 는 Cloudflare 로 자동 내려받기 불가, Higgsfield 오디오 MCP 는 음성 전용(효과음 불가). Mixkit 무료 라이선스 미리듣기 mp3 를 `assets.mixkit.co/active_storage/sfx/{id}/{id}-preview.mp3` 로 받아 프레임 단위 트림(ffmpeg 없음, 스크래치 `mp3tool.mjs` 방식). parrot-call = 부드러운 지저귐(#2697), parrot-alarm = 날카로운 비명(#73), 신규 parrot-happy(#311) 는 P5 회복·P6 3별에서 `playCue('parrotHappy')`. 옛 파일 `_unused/audio-v2-prev/`. SW 캐시 VERSION fcl-v5-2026.09.07.
- **P8 멘토 힌트 (2026-09-08):** "출처가 뭐였지?" 같은 되묻기 대신 상황별 대사 — 화면 고르기(세그먼트별 SOURCE_HINT, 틀린 화면별 WRONG_SOURCE), 자막 고르기(CAPTION_HINT, 출처 줄별 RUMOR_HINT), 소문 송출 후(RUMOR_AIRED). 정답은 직접 말하지 않고 "진행자가 보이는 화면", "출처 줄" 처럼 볼 곳을 짚는다. e2e 는 `확인 안 된 말이 나갔어` 문구를 본다.
- **P8 소리·자막 (2026-09-08):** 소리 맞추기 단계에서 아나운서 목소리(`public/audio/v5/broadcast-mic-test.wav`, Seed Audio 합성, 모노 16kHz)를 루프로 틀고 슬라이더가 실제 음량이 된다 — `audioService.startLevelDemo/setLevelDemo/stopLevelDemo` (Web Audio: 음원→WaveShaper→Gain). 초록 칸 위(level > AUDIO_BAND.high)는 drive 를 올려 진짜 클리핑 왜곡. 자막은 화면 아래 가운데 로어서드에 `CaptionCard.announce`("~합니다" 아나운서 문장)를 한 글자 55ms 타이핑(`Typewriter`), 없으면 text.
- **잘림·클릭 자동 점검 (2026-09-07):** `node scripts/audit-clipping.mjs [outDir]` — 49개 상태(페이지·단계·팝업·교사 모드)를 열어 무대 밖 요소, overflow 잘림, 스크롤 생긴 컨테이너, 가려진 버튼, 44px 미만 터치 영역을 report.md 로 낸다. `SHOT_VIEWPORT=1024x768`(iPad, 0.8배) `SHOT_NAMES=…` `PORT=…` 로 조절. 이번에 고친 것: Modal 은 제목·탭·닫기 고정 + 본문만 스크롤(닫기가 절대 화면 밖으로 안 감), 설정은 4탭(소리·게임 방법·교사용 가이드·기록·정보), 교사용 "다음 화면" 버튼은 하단 띠 대신 상단바(무대 높이 안 뺏음), 브리핑 이름 input width 100%, 드론 결과 사진 3장 세로 균등, P5 앵무 372px, 축하 오버레이 pointer-events none. 남은 스크롤은 교사용 정답지(교사 전용)뿐.
- **P6·P7 (2026-09-07 저녁):** P6 "앵무새 마음 생각하기" 단계 삭제(2단계), 사육사 하늘이 배치 상태별 힌트(`gardenHint`), 하늘·회복 앵무 컷아웃 투명화(원본 `_unused/v3-originals`, `_unused/v5-originals`). P7 2·3단계를 슬라이더·막대 없이 그림으로 재구성: 2단계 = 지점 장면 3장 위 새 아이콘 세어 제일 적은 곳 고르기, 3단계 = 행동 카드(나무 심기/기계 소리 멈추기/물 채우기) 하나만 골라 예측 → 해 보기 → 장면 변화·새 귀환 → 원래대로, 셋 다 해 보면 원인 고르기. 모델 `ACTIONS`/`applyAction`(EDGE_LEVELS 고정). v6 그림 자리 `v5Asset('scene-edge-*', 'scene-stream', 'scene-deep', 'act-*', 'bird-small')` + `fallbackTo` — 프롬프트 docs/ASSET_REQUEST_v6.md. 옛 슬라이더 모델 함수(changeLevel/runTrial)는 테스트용으로 남아 있음.
- **디자인 유리 패스 (2026-09-07 밤):** `--glass-1/2/3`(46/66/84%) + `--glass-blur/line/inset/shadow` 토큰(index.css). v4 키트·페이지 카드가 전부 유리라 배경 그림이 비침(::before opacity .72). 페이지 CSS 에서 `--color-surface` 를 카드 배경으로 쓰지 말 것 → `--glass-2`. 블러 미지원 기기는 @supports 폴백. 수료증: Jua 제목·이름, 배지 84px, 능력 문장 알약, 도장 88px, footer 3열. 홈: 말풍선 2개(네 직업 협업 흐름), MISSION 띠·저장 상태 문구 삭제, 하단은 버튼 2개만.
- **2026-09-07 밤 2차:** 설정 탭 '학생용 가이드'(무슨 게임·왜 네 직업·4단계·물음표), '기록 초기화·정보' 탭(초기화 버튼 있음). 브리핑 이름 칸 삭제(예측만). 상단바: 스테이지 숫자 레일 제거, 홈 왼쪽에 이전 화면(←) 버튼(page-1). P4 문구 '지구와 젤리 주변, 새가 왜 줄었을까?'. P5 '행동·주변'→'주변 환경', 오른쪽 패널이 남은 높이를 채우고 돋보기 200px·글자 22~26px, 소리 카드 파형 110px. P6→P7 연결: P6 완료 문구·버튼 '숲의 다른 새들 보러 가기', P7 첫 화면에 intro 카드(pageData.page07Intro). 드론 멘토 대사는 "어디 눌러 뭘 해" 순서형. 무대 카드 유리 50→38%.
- **5단계 재설계 (2026-09-07 밤 3차):** 화재·위기·턴제 삭제. 이제 "푸른솔 숲 살리기 연합 작전" — 앞 스테이지에서 각 직업이 가져온 것(드론 하늘 사진·돌봄 기록·생태 실험 결과·방송 클립)을 둘씩 합쳐 작전 3개(열매 나무 다시 심기 = 드론+생태 / 물길 트고 쉴 곳 = 드론+돌봄 / 공사 소음 줄이기 약속 = 생태+방송). 모델 `src/pages/page09AllianceModel.ts`(MISSIONS·isRightPair), 화면은 Page08Crisis.tsx 그대로 이름 유지, 저장 `p9Alliance {index, attempts, showing}`. 출동 성공 → 전·후 결과 화면 → 다음 작전, 엔딩은 done 오버레이 대신 장면+엠블럼 띠(오버레이가 무대를 숨김). 옛 모델은 `_unused/v4-pages/page08CrisisModel*`. e2e는 파일 두 개를 병렬로 돌리면 P7 스펙이 가끔 깨짐 → `--workers=1` 권장.
- **이미지 생성 고정 원칙 (사용자 요청, 2026-09-07):** 새 이미지는 생성 전에 반드시 이 프로젝트의 기존 에셋 여러 장을 시각적으로 확인하고, 가장 많이 쓰는 3D 교육게임 화풍·파스텔 팔레트·둥근 형태·캐릭터 비율을 프롬프트의 스타일 기준으로 고정한다. 자연 관찰 장면은 요청 시 실사/준실사를 유지할 수 있지만, 사람·실내 공간·장비·동물 아이콘을 별도 지시 없이 실사로 만들지 않는다. 다른 프로젝트나 일반적인 포토리얼 스타일을 임의로 덧씌우지 않는다.
- **드론 P3 (2026-09-08):** 목표 원 위에 금색 번호 배지 1·2·3(찍으면 초록, 놓치면 산호). 청록 원 안 숫자는 "놓은 점의 순서"라 순서대로 놓으면 같은 숫자. REC 창이 열리면 버튼 위에 손가락(`TapIcon`)+"원 안이야, REC 눌러 / 한가운데! 지금 눌러" 알약이 튀고 버튼이 빛남. 마지막 점은 `LAST_DWELL_MS` 2600ms 제자리 비행(배터리 안 닳음)이라 3번도 찍을 시간이 있음.
- **디자인 2차 (2026-09-08):** 무대 카드(.v4-card)는 거의 투명(26→12%, blur 6px)이라 배경 그림이 그대로 보이고, 글자·조작은 안쪽 유리 패널(--glass-2/3)이 받친다. 새 화면에서 글자를 카드 바닥에 직접 놓지 말 것. 선택지 24px·칩 20px·말풍선 21px. 도움말 팝업 목록(p5/p7/p8-help)은 번호 알약(counter)로, 문구 앞 "1 " 숫자는 뺐음. 모달은 유리+블러.
- **5단계 릴레이 재설계 (2026-09-08):** "둘씩 짝짓기"가 재미·이해·연관성 모두 약해서 통째로 교체. 이제 지도(v5 drone-map-wide, 1536×570, 핀 % 좌표 36/40·61/66·80/38) 위 위험 지점 3곳을 ① 혼자 출동(한 직업만 골라 보내면 ✓1 ✕3, 숲 0/3) → ② 작전마다 릴레이 4턴(드론 핀 탭 → 생태 이유 그림 → 돌봄 물건 → 방송 말 카드, 턴마다 그 직업 배지가 멘토로 말함) → ③ 엔딩 막대 "혼자 1조각 vs 함께 12조각". 모델 `page09AllianceModel.ts`(MISSIONS·RELAY·SOLO·isRightAnswer·wrongHint, TOTAL_TURNS 12), 화면 Page08Crisis.tsx(ForestMap 컴포넌트, 지도는 px 고정 720×267 / 930×345 라 핀이 항상 맞음), CSS page07-08.css 전면 교체, 저장 `p9Alliance {phase,index,turn,attempts,solo}`, allianceTurns = 확인 횟수(클린 = 12). e2e `v4-alliance-reflection.spec.ts`·audit 상태 10개(p09-solo…p09-ending, `relayAt(index, turn, phase)` 시드) 갱신. 그림 요청 docs/ASSET_REQUEST_v9.md(다 고쳐진 지도 `v9Asset('forest-map-restored')` 는 이미 fallbackTo 로 연결, 전문가 컷아웃 4장은 BADGE_IMAGE 자리). 주의: `.p9-map > img` 같은 자식 선택자는 새 이미지에도 걸리므로 `.p9-map__img` 클래스로만 잡을 것.
- **P10 예측·실제 비교 삭제 (2026-09-08):** 사용자 피드백("뜬금없어")으로 돌아보기 1단계를 지우고 능력 문장 고르기 한 화면만 남김. `Page09DNA.tsx` 는 `actualJob` 을 더 안 부름(함수·테스트는 resultRules 에 그대로), 브리핑의 '잘 맞을 것 같은 직업' 예측 단계도 같은 날 삭제(브리핑 2단계: 이야기 → 캐릭터 만나기, `GameSave.prediction` 필드 제거·로드 시 옛 값 버림). PAGE_META[10].short '내가 해 낸 것', audit 상태 p10-ability.
- **홈 상단 정리 (2026-09-08):** 로고 위 "FUTURE CAREER LAB" 알약(kicker)이 확대 화면에서 뿌연 띠처럼 보이고 로고 윗선이 잘려 보인다는 피드백 → 알약 삭제, 로고 560px·translateY(-60px)로 내려 글자 윗선이 무대 위 약 40px(1280 기준 70px 부근)에 오게 함. 부제는 margin 0. 배경 그림 자체의 천장 흰 패널은 이미지 일부(로고 뒤 하늘 영역).
- **홈 말풍선 = 캐릭터 탭 (2026-09-08):** 상시 말풍선 대신 키아트 위 투명 버튼 2개(`.home-hotspot--student/--mentor`, 무대 px 고정 좌표)에 "말 걸기" 알약이 떠 있고, 누르면 그 사람 말풍선이 튀어나온다(꼬리는 clip-path 삼각형으로 신입 탐험가 = 오른쪽 아래, 탐험단장 = 왼쪽 아래, 각각 머리 쪽). 다시 누르면 닫힘, 한 번 만나면 알약 사라짐. audit 상태 p01-talk-student/mentor.
- **드론 REC 위치 (2026-09-08):** 사용자 지정으로 REC 버튼을 바 왼쪽 끝에서 무대 x≈420(지도 가운데 쪽)으로 옮김(`.drone-v4__rec margin-left: 380px`, 바는 rec|pad 2열). REC 창 안내(손가락+알약)는 바 안 열이 아니라 REC 바로 위 지도 아래 가장자리에 absolute 로 뜸.
- **P9 "조각" 삭제 (2026-09-08):** 엔딩의 혼자 1조각/함께 12조각 막대와 관련 멘트를 전부 지움. 엔딩 패널은 엠블럼 + 한 줄 + 함께한 직업 배지 4개(`.p9-team`). 혼자 출동 결과 제목 '혼자서는 숲을 못 살려'.
- **드론 지도 좌표 (2026-09-08):** P3 논리 좌표(0~1)를 캔버스 비율이 아니라 지도 그림(contain) 사각형 기준으로 바꿈(`DroneFlightScene.mapRect/toPx/toFrac`). 목표 3곳은 그림 속 벌목지·통나무 개울·공사장 위 좌표(.36/.40 · .61/.66 · .80/.38, P9 핀과 동일). 거리가 짧아져 `BASE_DRAIN_PER_SECOND` 3.2→3.8(직진 1-2-3은 10~28% 남고 바람 읽은 경로는 40%+). e2e·audit 시드 좌표도 갱신.
- **P4 해설 단계 (2026-09-08):** 가설 카드를 누르자마자 배지 오버레이가 뜨던 것을 3단계로: 카드 고르기(멘토가 note 로 되짚음) → "이 가설로 정하기" → 해설 화면(찍음→흔적→짐작, `EXPLAIN_LINE`) → "배지 받기"에서 completePage(4)·배지. 완료 후 재방문은 3단계+오버레이.
- **숲새 합창 소리 (2026-09-08):** `forest-birdsong.mp3`가 TTS "안녕하세요"(parrot-call-audible)와 같은 파일이었음 → Mixkit #17 5.2초로 교체. P7 흔적 카드·나무 심기/기계 멈추기/물 채우기 결과 모두 이 파일. SW VERSION fcl-v5-2026.09.08.
