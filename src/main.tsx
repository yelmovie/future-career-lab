import { createRoot } from 'react-dom/client';
import { installStageScale } from './app/stageScale';
import { startAutomaticClassroom } from './services/classroomReady';
import './styles/index.css';
import './styles/pages.css';

installStageScale();

const BOOT_RECOVERY_KEY = 'future-career-lab.boot-recovery.v1';
const BOOT_RECOVERY_QUERY = 'app-recovery';

async function clearCachedAppShell() {
  if ('serviceWorker' in navigator) {
    const registrations = typeof navigator.serviceWorker.getRegistrations === 'function'
      ? await navigator.serviceWorker.getRegistrations()
      : [await navigator.serviceWorker.getRegistration()].filter((item): item is ServiceWorkerRegistration => Boolean(item));
    await Promise.allSettled(registrations
      .filter((registration) => new URL(registration.scope).origin === window.location.origin)
      .map((registration) => registration.unregister()));
  }
  if ('caches' in window) {
    const keys = await window.caches.keys();
    await Promise.allSettled(keys.filter((key) => key.startsWith('future-career-lab:')).map((key) => window.caches.delete(key)));
  }
}

async function reopenLatestApp() {
  await clearCachedAppShell();
  const url = new URL(window.location.href);
  url.searchParams.set(BOOT_RECOVERY_QUERY, Date.now().toString(36));
  window.location.replace(url.href);
}

function showBootRecovery() {
  const title = document.getElementById('boot-progress-label');
  if (title) title.textContent = '연결을 확인하고 화면을 다시 열어 줘.';
  const help = document.getElementById('boot-recovery-help');
  if (help) help.hidden = false;
  const retry = document.querySelector<HTMLButtonElement>('#boot-retry');
  if (retry) {
    retry.hidden = false;
    retry.addEventListener('click', () => {
      retry.disabled = true;
      retry.textContent = '새 화면 받는 중…';
      void reopenLatestApp().catch(() => {
        retry.disabled = false;
        retry.textContent = '다시 열기';
      });
    }, { once: true });
  }
}

let loadedModules = 0;
let bootFailed = false;
function completedModule<T>(module: T): T {
  loadedModules += 1;
  if (bootFailed) return module;
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
  sessionStorage.removeItem(BOOT_RECOVERY_KEY);
  const recoveredUrl = new URL(window.location.href);
  if (recoveredUrl.searchParams.has(BOOT_RECOVERY_QUERY)) {
    recoveredUrl.searchParams.delete(BOOT_RECOVERY_QUERY);
    window.history.replaceState(null, '', `${recoveredUrl.pathname}${recoveredUrl.search}${recoveredUrl.hash}`);
  }
  if (document.readyState === 'complete') startAutomaticClassroom();
  else window.addEventListener('load', startAutomaticClassroom, { once: true });
}).catch((error) => {
  bootFailed = true;
  console.error('Boot modules failed to load.', error);
  const alreadyTried = sessionStorage.getItem(BOOT_RECOVERY_KEY) === 'true';
  if (navigator.onLine && !alreadyTried) {
    sessionStorage.setItem(BOOT_RECOVERY_KEY, 'true');
    const title = document.getElementById('boot-progress-label');
    if (title) title.textContent = '새 화면을 다시 받는 중이야…';
    void reopenLatestApp().catch(showBootRecovery);
    return;
  }
  showBootRecovery();
});
