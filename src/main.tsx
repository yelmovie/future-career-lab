import { createRoot } from 'react-dom/client';
import { installStageScale } from './app/stageScale';
import { startAutomaticClassroom } from './services/classroomReady';
import './styles/index.css';
import './styles/pages.css';

installStageScale();

let loadedModules = 0;
function completedModule<T>(module: T): T {
  loadedModules += 1;
  const progress = document.querySelector<HTMLProgressElement>('#boot-progress');
  if (progress) progress.value = loadedModules;
  const label = document.getElementById('boot-progress-label');
  if (label) label.textContent = `탐험 화면 준비 ${loadedModules}/2`;
  return module;
}

void Promise.all([
  import('./app/App').then(completedModule),
  import('./state/GameContext').then(completedModule),
]).then(([{ App }, { GameProvider }]) => {
  createRoot(document.getElementById('root')!).render(
    <div className="stage" id="stage"><GameProvider><App /></GameProvider></div>,
  );
  if (document.readyState === 'complete') startAutomaticClassroom();
  else window.addEventListener('load', startAutomaticClassroom, { once: true });
}).catch(() => {
  const title = document.getElementById('boot-progress-label');
  if (title) title.textContent = '연결을 확인하고 화면을 다시 열어 줘.';
  const retry = document.getElementById('boot-retry');
  if (retry) { retry.hidden = false; retry.addEventListener('click', () => window.location.reload(), { once: true }); }
});
