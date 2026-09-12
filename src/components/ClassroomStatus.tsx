import { useState, useSyncExternalStore } from 'react';
import { applyClassroomUpdate, getClassroomState, prepareClassroom, refreshClassroom, subscribeClassroom } from '../services/classroomReady';
import { Modal } from './Modal';
import './classroom-status.css';

export function ClassroomStatus({ mode }: { mode: 'summary' | 'control' }) {
  const status = useSyncExternalStore(subscribeClassroom, getClassroomState);
  const [open, setOpen] = useState(false);
  if (!import.meta.env.PROD) return null;
  const ready = status.state === 'ready';
  const percent = status.totalBytes > 0 ? Math.min(100, Math.floor(status.bytes / status.totalBytes * 100)) : 0;
  const needsRetry = status.state === 'error' || status.state === 'unavailable' || status.state === 'cancelled';
  const line = ready ? '그림과 소리 준비 완료' : !status.online ? '인터넷 연결을 확인해 줘' : needsRetry ? '남은 그림과 소리를 다시 준비해' : `그림과 소리 준비 ${percent}%`;
  if (mode === 'summary') return <span className="classroom-status-summary" aria-live={ready || needsRetry ? 'polite' : 'off'}>{line}</span>;
  return <>
    <button type="button" className={`icon-button classroom-status-button${needsRetry || (!status.online && !ready) ? ' needs-attention' : ''}`} aria-label="수업 자료 상태" title={line} onClick={() => { setOpen(true); void refreshClassroom(); }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M7 18H5.5a4.5 4.5 0 0 1-.6-9A7 7 0 0 1 18 7a5.5 5.5 0 0 1 .5 11H17" /><path d={ready ? 'm8 16 3 3 5-6' : 'M12 11v10m-4-4 4 4 4-4'} /></svg>
    </button>
    {open && <Modal title="그림과 소리 준비" onClose={() => setOpen(false)} actions={<button className="button button--primary" onClick={() => setOpen(false)}>탐험으로 돌아가기</button>}>
      <div className="classroom-status-details">
        <strong>{line}</strong>
        <progress max={100} value={percent} aria-label="그림과 소리 준비" />
        <p>{ready ? '이 기기에서는 인터넷이 잠깐 끊겨도 끝까지 탐험할 수 있어.' : !status.online ? '아직 준비하지 못한 그림과 소리가 있어. 인터넷에 다시 연결하면 이어서 준비할게.' : '나중에 쓸 그림과 소리를 미리 챙기고 있어. 기다리지 않고 탐험해도 돼.'}</p>
        {needsRetry && <button type="button" className="button button--teal" disabled={!status.online} onClick={() => void prepareClassroom(true)}>남은 자료 다시 준비</button>}
        {status.updateAvailable && <button type="button" className="button button--ghost" onClick={applyClassroomUpdate}>기록을 유지하고 새 버전 열기</button>}
      </div>
    </Modal>}
  </>;
}
