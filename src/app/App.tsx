import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react';
import { PAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { useHashRouter } from './router';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

/**
 * 게임 순서(페이지 번호) → 화면 컴포넌트.
 * 파일 이름의 숫자는 v1 시절 에셋 폴더 번호라 게임 순서와 다르다. 순서는 이 표와 PAGE_META 가 결정한다.
 */
const pages: Record<PageNumber, LazyExoticComponent<ComponentType<{ onNavigate: (page: PageNumber) => void }>>> = {
  1: lazy(() => import('../pages/Page01Home')),
  2: lazy(() => import('../pages/Page02Briefing')),
  3: lazy(() => import('../pages/Page04Drone')),        // S1-a 드론 정찰
  4: lazy(() => import('../pages/Page03Mystery')),      // S1-b 증거판
  5: lazy(() => import('../pages/Page05ParrotCheck')),  // S2-a 건강 점검
  6: lazy(() => import('../pages/Page06Habitat')),      // S2-b 새 정원
  7: lazy(() => import('../pages/Page07Ecology')),      // S3 생태 조사
  8: lazy(() => import('../pages/Page08Broadcast')),    // S4 생방송
  9: lazy(() => import('../pages/Page08Crisis')),       // S5 연합 작전
  10: lazy(() => import('../pages/Page09DNA')),         // 폐기된 선택 화면 → 수료증 리디렉션
  11: lazy(() => import('../pages/Page10Certificate')), // 수료증
};

export function App() {
  const { page, navigate } = useHashRouter();
  const { save, setLastPage } = useGame();
  const Page = pages[page];

  useEffect(() => {
    if (page !== 1) setLastPage(page);
    audioService.configure(save.audio);
    audioService.playPageBgm(page);
    document.title = `${PAGE_META[page].title} · 미래 직업실`;
  }, [page, save.audio, setLastPage]);

  useEffect(() => {
    const unlock = () => audioService.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <AppErrorBoundary key={page}>
      <Suspense fallback={<div className="app-loader"><span className="loader-orbit" /><strong>미래 직업실을 준비하고 있어…</strong></div>}>
        <>
          <Page onNavigate={navigate} />
          <aside className="device-notice" role="status" aria-live="polite">
            <div className="device-notice__icon" aria-hidden="true">↻</div>
            <strong>더 큰 가로 화면에서 열어 줘</strong>
            <p>버튼을 편하게 누르려면 태블릿을 가로로 돌리거나 PC에서 열어 줘.</p>
            <small>권장 화면: 가로 1024px 이상</small>
          </aside>
        </>
      </Suspense>
    </AppErrorBoundary>
  );
}
