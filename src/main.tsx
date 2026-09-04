import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { installStageScale } from './app/stageScale';
import { GameProvider } from './state/GameContext';
import './styles/index.css';
import './styles/pages.css';

installStageScale();

createRoot(document.getElementById('root')!).render(
  <div className="stage" id="stage">
    <GameProvider>
      <App />
    </GameProvider>
  </div>,
);

// 교실 와이파이가 끊겨도 이어서 진행되도록 정적 자원을 캐시한다. 개발 서버에서는 켜지 않는다.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
