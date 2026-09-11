import { useEffect, useSyncExternalStore } from 'react';
import { applyClassroomUpdate, cancelClassroom, getClassroomState, prepareClassroom, refreshClassroom, subscribeClassroom } from '../services/classroomReady';
import './classroom-ready.css';

const megabytes = (bytes: number) => `${(bytes / 1_000_000).toFixed(1)} MB`;

export function ClassroomReady() {
  const status = useSyncExternalStore(subscribeClassroom, getClassroomState);
  useEffect(() => { void refreshClassroom(); }, []);
  const busy = status.state === 'preparing';
  const percent = status.totalBytes ? Math.min(100, Math.round(status.bytes / status.totalBytes * 100)) : 0;
  return (
    <section className="classroom-ready" aria-labelledby="classroom-ready-title">
      <h4 id="classroom-ready-title">수업 자료 준비</h4>
      <p>수업 전에 그림과 소리를 이 기기에 준비해 두세요. 준비 완료 뒤에는 인터넷이 끊겨도 이어서 탐험할 수 있습니다.</p>
      <div className="classroom-ready__status" role="status" aria-live="polite">
        {status.state === 'ready' ? '✓ 이 버전의 수업 자료 준비 완료' : busy ? `자료 준비 중 · ${percent}%` : status.state === 'checking' ? '기기에 준비된 자료를 확인하고 있습니다.' : '준비를 완료한 뒤 수업을 시작해 주세요.'}
      </div>
      {status.total > 0 && <>
        <progress max={status.totalBytes || 1} value={status.bytes} aria-label="수업 자료 준비 진행률" />
        <p className="classroom-ready__amount">{megabytes(status.bytes)} / {megabytes(status.totalBytes)} · {status.done}/{status.total}개</p>
      </>}
      {status.error && <p className="classroom-ready__error" role="alert">{status.error}</p>}
      {status.state === 'cancelled' && <p>준비를 멈췄습니다. 다시 누르면 남은 자료부터 이어서 받습니다.</p>}
      <div className="classroom-ready__actions">
        {busy ? <button type="button" className="button" onClick={cancelClassroom}>준비 멈추기</button>
          : status.state !== 'unavailable' && <button type="button" className="button button--teal" onClick={() => void prepareClassroom()} disabled={status.state === 'checking' || status.state === 'ready'}>{status.state === 'error' || status.state === 'cancelled' ? '남은 자료 다시 준비' : '이 기기에 자료 준비'}</button>}
        {!busy && <button type="button" className="button button--ghost" onClick={() => void refreshClassroom()}>준비 상태 확인</button>}
      </div>
      {status.updateAvailable && <div className="classroom-ready__update">
        <p>새 자료가 있습니다. 수업이 끝난 뒤 적용하세요. 탐험 기록은 유지되며 새 자료를 다시 준비해야 합니다.</p>
        <button type="button" className="button" onClick={applyClassroomUpdate} disabled={busy}>새 자료 적용하고 다시 열기</button>
      </div>}
      <p className="classroom-ready__note">기기를 바꾸거나 브라우저 자료를 지우면 다시 준비해야 합니다. 업데이트 후에도 준비 상태를 확인하세요.</p>
    </section>
  );
}
