# 프로젝트 상태 (2026-09-04)

- **v2 초기 배포 가능 완성본.** 로컬 커밋까지 완료, **푸시는 안 함**(사용자 요청 시). 성적표: docs/reviews/FINAL-CHECK-20260904.md
- 구조: 11페이지(브리핑→S1 드론·증거판→S2 돌봄·회복공간→S3 생태→S4 방송→S5 연합→돌아보기→수료증). 페이지 번호 ≠ 파일 번호(src/app/App.tsx, PAGE_META).
- 저장 스키마 v2(artifacts·prediction·abilityStatements). v1 세이브는 진행 초기화 후 이름·설정만 유지.
- 에셋: v2 Imagen 14장(원본 _unused/v2-originals), SFX 4개 Mixkit(픽사베이는 Cloudflare로 자동 다운로드 불가), 폰트 Jua·Pretendard 서브셋 셀프호스팅.
- 오프라인: public/sw.js. 첫 방문은 온라인 필요, 두 번째부터 오프라인 진행 확인.
- 검수 도구: scripts/screenshot-pages.mjs(3해상도), scripts/probe-offline.mjs.
- 사용자 직접 확인 필요: 교육 항목(성취기준 코드 [검증 필요], 앵무 돌봄 문구, S3 단순 모델), 실제 태블릿·아동 플레이.
- 미해결: Phaser 캔버스 글꼴 1920 비례 없음, HTML5 DnD는 iOS에서 탭 대안 경로, 미사용 슬롯 이미지 59개(_unused/DELETE-CANDIDATES.md).
