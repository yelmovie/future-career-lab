import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react';
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

function RouteLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);
  return <div className="app-loader" role="status">
    <span className="loader-orbit" />
    <strong>{slow ? '연결이 느려서 조금 더 걸리고 있어.' : '다음 탐험 화면을 준비하고 있어…'}</strong>
    {slow && <button className="button" onClick={() => window.location.reload()}>연결 확인 후 다시 열기</button>}
  </div>;
}

export function App() {
  const { page, navigate } = useHashRouter();
  const { save, setLastPage } = useGame();
  const Page = pages[page];
  const [mobileGameForced, setMobileGameForced] = useState(() => sessionStorage.getItem('future-career-lab.mobile-game-forced') === 'true');
  const [viewport, setViewport] = useState(() => ({ width: Math.round(window.visualViewport?.width ?? window.innerWidth), height: Math.round(window.visualViewport?.height ?? window.innerHeight) }));

  useEffect(() => {
    if (page !== 1) setLastPage(page);
    audioService.configure(save.audio);
    audioService.playPageBgm(page);
    document.title = `${PAGE_META[page].title} · 미래 직업실`;
  }, [page, save.audio, setLastPage]);

  useEffect(() => {
    if (document.documentElement.classList.contains('low-height-scroll')) window.scrollTo({ top: 0, behavior: 'auto' });
  }, [page]);

  useEffect(() => {
    const unlock = () => audioService.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const measure = () => setViewport({ width: Math.round(window.visualViewport?.width ?? window.innerWidth), height: Math.round(window.visualViewport?.height ?? window.innerHeight) });
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('force-mobile-game', mobileGameForced);
    window.dispatchEvent(new Event('resize'));
    return () => document.documentElement.classList.remove('force-mobile-game');
  }, [mobileGameForced]);

  const fillMobileScreen = () => {
    sessionStorage.setItem('future-career-lab.mobile-game-forced', 'true');
    setMobileGameForced(true);
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => undefined);
    }
  };

  return (
    <AppErrorBoundary key={page}>
      <Suspense fallback={<RouteLoading />}>
        <>
          <Page onNavigate={navigate} />
          <aside className="device-notice" role="region" aria-label="화면 크기 안내">
            <div className="device-notice__icon" aria-hidden="true">↻</div>
            <strong className="device-notice__rotate-title">가로 화면으로 돌려 줘</strong>
            <p className="device-notice__rotate-copy">휴대폰이나 태블릿을 가로로 돌리면 게임을 시작할 수 있어.</p>
            <strong className="device-notice__fill-title">브라우저 메뉴를 숨겨 볼까?</strong>
            <p className="device-notice__fill-copy">새로고침 대신 버튼을 눌러. 그래도 열리지 않으면 Chrome에서 열어 줘.</p>
            <small>현재 게임 영역: {viewport.width}×{viewport.height}px</small>
            <button type="button" className="device-notice__play" onClick={fillMobileScreen}>게임 화면 채우기</button>
          </aside>
        </>
      </Suspense>
    </AppErrorBoundary>
  );
}
