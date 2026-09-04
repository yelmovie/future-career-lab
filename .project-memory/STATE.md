# 프로젝트 상태 (2026-09-04)

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
- **v3 (2026-09-05 야간):** 서사를 "동물원 앵무 모모(초록)·루비(빨강) 탈출 사건"으로 교체(docs/GAME_CONCEPT_v3.md §3 이름표가 표기 기준). 페이지 순서·메커닉·저장 스키마는 v2 그대로, 문구만 바꿈.
- **v3 디자인:** 남색·금색 → 밝은 파스텔(하늘·크림·햇빛노랑·앵무초록·산호). 토큰은 src/styles/index.css 상단 `--color-*`; 예전 이름(--cream/--gold-pale/--navy-*)은 호환용으로 값만 재맵핑. 페이지 CSS 는 스크립트로 일괄 변환(어두운 배경→흰색, 밝은 글자→진한 글자, 16px 미만→16px)했으므로 새 CSS 는 `--color-*` 토큰만 쓴다. 버튼은 3D 엣지(box-shadow 0 5px 0 edge, active translateY). 배경 10장은 흰색 워시(82~90%)로 파스텔화 — 밝은 배경을 새로 만들면 워시를 줄인다.
- **v3 에셋 자리:** `v3Asset()` + `fallbackTo()` (src/shared/assets.ts). public/assets/v3/ 에 파일이 없으면 v2 그림으로 되돌아감. 프롬프트: docs/ASSET_REQUEST_v3.md.
- 크레딧 파일 위치: assets/CREDITS.md (루트에서 이동). SW 버전 fcl-v3-2026.09.05, 오디오 200 응답을 캐시에 보관.
- **v4 (2026-09-05 낮):** "한 화면 한 행동" 재설계. 공통 키트 `src/components/v4/` (StepShell·PictureChoice·SlotBoard·v4.css). P2·P4·P5·P6·P7·P8·P9·P10 전부 StepShell 위에 다시 씀(docs/GAME_DESIGN_v4.md 가 기준). 드론(P3)은 메커닉 유지·표면만. 옛 e2e(app/ux-flow/page04-board/page08/page09)는 skip 처리하고 `e2e/v4-*.spec.ts` 4개가 대신한다. page-05~10 슬롯 60장은 flood-fill 로 투명화(원본 PNG 는 assets/ 에 그대로). HabitatScene.ts·habitatModel.ts 는 더 이상 import 되지 않음(삭제 안 함).
