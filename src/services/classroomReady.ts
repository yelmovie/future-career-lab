export interface ClassroomState {
  state: 'checking' | 'idle' | 'preparing' | 'ready' | 'cancelled' | 'error' | 'unavailable';
  done: number;
  total: number;
  bytes: number;
  totalBytes: number;
  version?: string;
  error?: string;
  updateAvailable: boolean;
}

let current: ClassroomState = { state: 'checking', done: 0, total: 0, bytes: 0, totalBytes: 0, updateAvailable: false };
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | undefined;
let preparationPort: MessagePort | undefined;

function publish(patch: Partial<ClassroomState>): void {
  current = { ...current, error: undefined, ...patch };
  for (const listener of listeners) listener();
}

async function worker(): Promise<ServiceWorker> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) throw new Error('수업 자료 준비는 배포된 앱에서 사용할 수 있습니다.');
  registration = await navigator.serviceWorker.getRegistration();
  if (!registration) registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  await navigator.serviceWorker.ready;
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
    void registration?.update().then(() => publish({ updateAvailable: Boolean(registration?.waiting) })).catch(() => undefined);
  } catch (error) {
    publish({ state: 'unavailable', error: error instanceof Error ? error.message : '이 기기에서는 수업 자료 준비를 사용할 수 없습니다.' });
  }
}

export async function prepareClassroom(): Promise<void> {
  if (current.state === 'preparing') return;
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
    active.postMessage({ type: 'PREPARE_CLASSROOM' }, [channel.port2]);
  } catch (error) {
    publish({ state: 'error', error: error instanceof Error ? error.message : '자료 준비를 시작하지 못했습니다.' });
  }
}

export function cancelClassroom(): void {
  registration?.active?.postMessage({ type: 'CANCEL_CLASSROOM' });
}

export function applyClassroomUpdate(): void {
  if (!registration?.waiting) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
  registration.waiting.postMessage({ type: 'ACTIVATE_CLASSROOM_UPDATE' });
}
