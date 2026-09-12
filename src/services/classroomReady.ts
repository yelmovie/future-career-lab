export interface ClassroomState {
  state: 'checking' | 'idle' | 'preparing' | 'ready' | 'cancelled' | 'error' | 'unavailable';
  done: number;
  total: number;
  bytes: number;
  totalBytes: number;
  version?: string;
  error?: string;
  updateAvailable: boolean;
  online: boolean;
}

let current: ClassroomState = { state: 'checking', done: 0, total: 0, bytes: 0, totalBytes: 0, updateAvailable: false, online: typeof navigator === 'undefined' || navigator.onLine };
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | undefined;
let preparationPort: MessagePort | undefined;
let automaticStarted = false;
let automaticTimer: number | undefined;
let retryTimer: number | undefined;
let retryCount = 0;

function publish(patch: Partial<ClassroomState>): void {
  current = { ...current, error: undefined, ...patch };
  for (const listener of listeners) listener();
  if (patch.state === 'ready') retryCount = 0;
  if (automaticStarted && patch.state === 'error' && current.online && retryCount < 3) {
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => scheduleAutomaticPreparation(0), 5000 * 2 ** retryCount++);
  }
}

async function worker(): Promise<ServiceWorker> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) throw new Error('수업 자료 준비는 배포된 앱에서 사용할 수 있습니다.');
  registration = await navigator.serviceWorker.getRegistration();
  if (!registration) registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('연결을 확인하고 남은 자료를 다시 준비해 줘.')), 12000);
    void navigator.serviceWorker.ready.then(() => { window.clearTimeout(timeout); resolve(); }, (error) => { window.clearTimeout(timeout); reject(error); });
  });
  publish({ updateAvailable: Boolean(registration.waiting) });
  const active = registration.active;
  if (!active) throw new Error('앱 준비를 마치지 못했습니다. 잠시 뒤 다시 확인해 주세요.');
  return active;
}

export const getClassroomState = () => current;
export function subscribeClassroom(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshClassroom(): Promise<void> {
  if (current.state === 'preparing') return;
  try {
    const active = await worker();
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      publish({ state: 'error', error: '준비 상태를 확인하지 못했습니다. 다시 확인해 주세요.' });
    }, 10000);
    channel.port1.onmessage = (event: MessageEvent<Partial<ClassroomState>>) => {
      window.clearTimeout(timeout);
      publish(event.data);
      if (event.data.state === 'preparing') preparationPort = channel.port1;
      else {
        channel.port1.close();
        if (preparationPort === channel.port1) preparationPort = undefined;
      }
    };
    active.postMessage({ type: 'CLASSROOM_STATUS' }, [channel.port2]);
    if (navigator.onLine) void registration?.update().then(() => publish({ updateAvailable: Boolean(registration?.waiting) })).catch(() => undefined);
  } catch (error) {
    publish({ state: 'unavailable', error: error instanceof Error ? error.message : '이 기기에서는 수업 자료 준비를 사용할 수 없습니다.' });
  }
}

export async function prepareClassroom(background = false): Promise<void> {
  if (current.state === 'preparing') return;
  if (!navigator.onLine) { publish({ online: false, state: 'error', error: '인터넷에 다시 연결하면 남은 그림과 소리를 이어서 준비할게.' }); return; }
  publish({ state: 'preparing' });
  try {
    const active = await worker();
    preparationPort?.close();
    const channel = new MessageChannel();
    preparationPort = channel.port1;
    channel.port1.onmessage = (event: MessageEvent<Partial<ClassroomState>>) => {
      publish(event.data);
      if (event.data.state !== 'preparing') {
        channel.port1.close();
        preparationPort = undefined;
      }
    };
    active.postMessage({ type: 'PREPARE_CLASSROOM', background }, [channel.port2]);
  } catch (error) {
    publish({ state: 'error', error: error instanceof Error ? error.message : '자료 준비를 시작하지 못했습니다.' });
  }
}

/** The first screen stays interactive. Later resources arrive one at a time after it has settled. */
function scheduleAutomaticPreparation(delay = 4500): void {
  window.clearTimeout(automaticTimer);
  automaticTimer = window.setTimeout(() => {
    if (!navigator.onLine || document.visibilityState === 'hidden' || current.state === 'preparing' || current.state === 'ready') return;
    const begin = () => {
      if (navigator.onLine && document.visibilityState !== 'hidden') void prepareClassroom(true);
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(begin, { timeout: 1500 });
    else begin();
  }, delay);
}

export function startAutomaticClassroom(): void {
  if (automaticStarted || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  automaticStarted = true;
  const reconnect = () => {
    publish({ online: navigator.onLine });
    if (navigator.onLine) { retryCount = 0; scheduleAutomaticPreparation(600); }
    else cancelClassroom();
  };
  window.addEventListener('online', reconnect);
  window.addEventListener('offline', reconnect);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cancelClassroom();
    else { void refreshClassroom().then(() => scheduleAutomaticPreparation(600)); }
  });
  // On a first visit, even the small worker shell waits for the visible screen.
  // An existing worker can report already prepared resources immediately.
  if (navigator.serviceWorker.controller) void refreshClassroom().then(() => scheduleAutomaticPreparation());
  else window.setTimeout(() => { void refreshClassroom().then(() => scheduleAutomaticPreparation(600)); }, 4500);
}

export function cancelClassroom(): void {
  registration?.active?.postMessage({ type: 'CANCEL_CLASSROOM' });
}

export function applyClassroomUpdate(): void {
  if (!registration?.waiting) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  registration.waiting.postMessage({ type: 'ACTIVATE_CLASSROOM_UPDATE' });
}
