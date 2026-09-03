# 삭제 후보 목록 (2026-09-04)

실제 삭제는 하지 않았다. 아래는 **정적 코드 검색에서 참조가 없는** 런타임 에셋이다. 일부는 동적 슬롯 참조(`pageAsset(9, field.assetSlot)`, Phaser preload 루프)로 쓰일 수 있으므로, 이동 전에 `grep -rn "pageAsset(폴더"` 로 동적 사용을 확인한다.

런타임 영향: 브라우저는 참조된 파일만 내려받으므로 **첫 화면 용량에는 영향 없음.** 저장소·dist 크기만 줄어든다.

합계 59개 · 약 7 MB

| 경로 | 크기 | 근거 |
|---|---:|---|
| `/assets/page-02/slot-01.webp` | 115 KB | src/ 정적 참조 없음 |
| `/assets/page-02/slot-02.webp` | 134 KB | src/ 정적 참조 없음 |
| `/assets/page-02/slot-03.webp` | 95 KB | src/ 정적 참조 없음 |
| `/assets/page-02/slot-04.webp` | 167 KB | src/ 정적 참조 없음 |
| `/assets/page-02/slot-05.webp` | 119 KB | src/ 정적 참조 없음 |
| `/assets/page-02/slot-06.webp` | 102 KB | src/ 정적 참조 없음 |
| `/assets/page-03/slot-01.webp` | 165 KB | src/ 정적 참조 없음 |
| `/assets/page-03/slot-02.webp` | 190 KB | src/ 정적 참조 없음 |
| `/assets/page-03/slot-06.webp` | 247 KB | src/ 정적 참조 없음 |
| `/assets/page-03/slot-09.webp` | 191 KB | src/ 정적 참조 없음 |
| `/assets/page-03/slot-10.webp` | 215 KB | src/ 정적 참조 없음 |
| `/assets/page-04/slot-01.webp` | 127 KB | src/ 정적 참조 없음 |
| `/assets/page-04/slot-04.webp` | 264 KB | src/ 정적 참조 없음 |
| `/assets/page-04/slot-07.webp` | 230 KB | src/ 정적 참조 없음 |
| `/assets/page-04/slot-08.webp` | 254 KB | src/ 정적 참조 없음 |
| `/assets/page-04/slot-09.webp` | 233 KB | src/ 정적 참조 없음 |
| `/assets/page-04/slot-10.webp` | 223 KB | src/ 정적 참조 없음 |
| `/assets/page-05/slot-02.webp` | 52 KB | src/ 정적 참조 없음 |
| `/assets/page-05/slot-05.webp` | 101 KB | src/ 정적 참조 없음 |
| `/assets/page-05/slot-06.webp` | 152 KB | src/ 정적 참조 없음 |
| `/assets/page-05/slot-07.webp` | 60 KB | src/ 정적 참조 없음 |
| `/assets/page-05/slot-08.webp` | 86 KB | src/ 정적 참조 없음 |
| `/assets/page-05/slot-10.webp` | 45 KB | src/ 정적 참조 없음 |
| `/assets/page-06/slot-02.webp` | 102 KB | src/ 정적 참조 없음 |
| `/assets/page-06/slot-03.webp` | 109 KB | src/ 정적 참조 없음 |
| `/assets/page-06/slot-04.webp` | 99 KB | src/ 정적 참조 없음 |
| `/assets/page-06/slot-05.webp` | 102 KB | src/ 정적 참조 없음 |
| `/assets/page-06/slot-06.webp` | 66 KB | src/ 정적 참조 없음 |
| `/assets/page-06/slot-08.webp` | 105 KB | src/ 정적 참조 없음 |
| `/assets/page-06/slot-09.webp` | 172 KB | src/ 정적 참조 없음 |
| `/assets/page-06/slot-10.webp` | 129 KB | src/ 정적 참조 없음 |
| `/assets/page-07/slot-02.webp` | 48 KB | src/ 정적 참조 없음 |
| `/assets/page-07/slot-03.webp` | 107 KB | src/ 정적 참조 없음 |
| `/assets/page-07/slot-04.webp` | 63 KB | src/ 정적 참조 없음 |
| `/assets/page-07/slot-05.webp` | 64 KB | src/ 정적 참조 없음 |
| `/assets/page-07/slot-06.webp` | 81 KB | src/ 정적 참조 없음 |
| `/assets/page-07/slot-08.webp` | 58 KB | src/ 정적 참조 없음 |
| `/assets/page-07/slot-09.webp` | 90 KB | src/ 정적 참조 없음 |
| `/assets/page-07/slot-10.webp` | 99 KB | src/ 정적 참조 없음 |
| `/assets/page-08/slot-01.webp` | 40 KB | src/ 정적 참조 없음 |
| `/assets/page-08/slot-02.webp` | 58 KB | src/ 정적 참조 없음 |
| `/assets/page-08/slot-06.webp` | 154 KB | src/ 정적 참조 없음 |
| `/assets/page-08/slot-07.webp` | 128 KB | src/ 정적 참조 없음 |
| `/assets/page-08/slot-08.webp` | 101 KB | src/ 정적 참조 없음 |
| `/assets/page-09/slot-02.webp` | 42 KB | src/ 정적 참조 없음 |
| `/assets/page-09/slot-03.webp` | 167 KB | src/ 정적 참조 없음 |
| `/assets/page-09/slot-04.webp` | 150 KB | src/ 정적 참조 없음 |
| `/assets/page-09/slot-05.webp` | 109 KB | src/ 정적 참조 없음 |
| `/assets/page-09/slot-06.webp` | 146 KB | src/ 정적 참조 없음 |
| `/assets/page-09/slot-07.webp` | 150 KB | src/ 정적 참조 없음 |
| `/assets/page-09/slot-08.webp` | 82 KB | src/ 정적 참조 없음 |
| `/assets/page-09/slot-09.webp` | 139 KB | src/ 정적 참조 없음 |
| `/assets/page-10/slot-01.webp` | 35 KB | src/ 정적 참조 없음 |
| `/assets/page-10/slot-03.webp` | 118 KB | src/ 정적 참조 없음 |
| `/assets/page-10/slot-04.webp` | 132 KB | src/ 정적 참조 없음 |
| `/assets/page-10/slot-05.webp` | 159 KB | src/ 정적 참조 없음 |
| `/assets/page-10/slot-08.webp` | 93 KB | src/ 정적 참조 없음 |
| `/assets/page-10/slot-09.webp` | 83 KB | src/ 정적 참조 없음 |
| `/assets/page-10/slot-10.webp` | 100 KB | src/ 정적 참조 없음 |

## 이미 옮긴 것

| 경로 | 이유 |
|---|---|
| `_unused/v1-pages/Page02WorkStyle.tsx` | v1 '일하는 방식 8상황' 페이지, v2 브리핑으로 대체 |
| `_unused/v1-pages/page07LiveWorkModel.ts`·`.test.ts` | v1 타이머형 실시간 업무 모델, S4 방송 모델로 대체 |
| `_unused/v2-originals/*.png` | Imagen 원본(18MB), 런타임은 최적화 WebP 사용 |
| `_unused/fonts-full/*` | 서브셋 전 전체 글꼴, 런타임은 `.sub.woff2`·서브셋 Jua 사용 |
