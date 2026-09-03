# 아이콘 프롬프트 캔버스 (2026-09-04)

소스(`src/**/*.tsx`)에서 UI 아이콘으로 쓰인 이모지·유니코드 글리프(✓ → ↔ 등)를 전부 `src/components/Icons.tsx` SVG 또는 이미지 에셋으로 교체했다. 생성이 필요한 아이콘 프롬프트는 현재 없다.

| 위치 | 이전 | 이후 |
|---|---|---|
| GameShell 스테이지 레일 | `✓` 텍스트 | `CheckIcon` |
| Page03Mystery 진행 단계 | `✓` 텍스트, `↔` | `CheckIcon`, 문장화 |
| Page08Crisis 게임 방법 | `→` 텍스트 | `ArrowIcon` |
| 수료증 능력 문장 | CSS `content: '✓ '` | CSS 원형 불릿 |
