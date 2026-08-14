import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react';
import { PAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { useHashRouter } from './router';

const pages: Record<PageNumber, LazyExoticComponent<ComponentType<{ onNavigate: (page: PageNumber) => void }>>> = {
  1: lazy(() => import('../pages/Page01Home')),
  2: lazy(() => import('../pages/Page02WorkStyle')),
  3: lazy(() => import('../pages/Page03Mystery')),
  4: lazy(() => import('../pages/Page04Drone')),
  5: lazy(() => import('../pages/Page05ParrotCheck')),
  6: lazy(() => import('../pages/Page06Habitat')),
  7: lazy(() => import('../pages/Page07LiveWork')),
  8: lazy(() => import('../pages/Page08Crisis')),
  9: lazy(() => import('../pages/Page09DNA')),
  10: lazy(() => import('../pages/Page10Certificate')),
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
    <Suspense fallback={<div className="app-loader"><span className="loader-orbit" /><strong>미래 직업실을 준비하고 있어…</strong></div>}>
      <Page onNavigate={navigate} />
    </Suspense>
  );
}
