import { useState } from 'react';
import { asRecord, CAUSE_LABEL, isCause, transferCase, transferVerdict, type TransferReason } from '../data/learningRecord';
import { homeAsset, v5Asset } from '../shared/assets';
import type { CauseId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { StepShell } from './v4/StepShell';
import '../pages/learning-record.css';

const ACTIONS: { id: CauseId; label: string; image: string }[] = [
  { id: 'logging', label: '열매 나무 심기', image: v5Asset('garden-food-tree', 'png') },
  { id: 'noise', label: '소리 줄이기', image: v5Asset('garden-hideout', 'png') },
  { id: 'water', label: '깨끗한 물 채우기', image: v5Asset('garden-water', 'png') },
];
const REASONS: { id: TransferReason; label: string }[] = [
  { id: 'repeat', label: '모든 공원에 같은 도움이 필요해서' },
  { id: 'compare', label: '이 공원에서 새가 가장 많이 늘어서' },
  { id: 'guess', label: '내가 가장 좋아하는 방법이라서' },
];

export function TransferMission({ onNavigate, onComplete }: { onNavigate: (page: PageNumber) => void; onComplete: () => void }) {
  const { save, setPageData, logEvent } = useGame();
  const scenario = transferCase(save.sessionSeed);
  const [initial] = useState(() => asRecord(save.pageData.p9Transfer));
  const [action, setAction] = useState<CauseId | null>(isCause(initial.action) ? initial.action : null);
  const [reason, setReason] = useState<TransferReason | null>(initial.reason === 'compare' || initial.reason === 'repeat' || initial.reason === 'guess' ? initial.reason : null);
  const [attempts, setAttempts] = useState(typeof initial.attempts === 'number' && Number.isFinite(initial.attempts) ? Math.max(0, initial.attempts) : 0);
  const [complete, setComplete] = useState(initial.complete === true);
  const [feedback, setFeedback] = useState('');
  const store = (patch: Record<string, unknown>) => setPageData('p9Transfer', { scenario: scenario.id, action, reason, attempts, complete, ...patch });
  const confirm = () => {
    if (complete) { onComplete(); return; }
    if (!action || !reason) return;
    const nextAttempts = attempts + 1;
    const correct = transferVerdict(scenario, action, reason);
    setAttempts(nextAttempts);
    setComplete(correct);
    store({ attempts: nextAttempts, complete: correct });
    if (correct) {
      logEvent({ page: 9, type: 'transfer-clear', summary: `${scenario.title}의 모습을 살펴보고 ${CAUSE_LABEL[action]}이 필요하다는 걸 알아냈어. ${nextAttempts > 1 ? `${nextAttempts - 1}번 선택을 고친 뒤 ` : ''}새가 2마리에서 ${scenario.counts[action]}마리로 가장 많이 늘어난 방법을 골랐어.`, contextRef: scenario.id, tags: ['새 상황 적용', '증거 비교'], traits: { analysis: 1, exploration: 1 } });
      audioService.playSfx('success');
    } else {
      logEvent({ page: 9, type: 'transfer-revision', summary: `${scenario.title}에서 ${CAUSE_LABEL[action]}과 고른 이유를 다시 살펴봤어.`, contextRef: `${scenario.id}-${nextAttempts}`, tags: ['수정'] });
      setFeedback(action !== scenario.best ? '공원마다 필요한 도움이 달라. 새가 가장 많이 돌아온 방법을 찾아봐.' : '방법은 잘 골랐어! 새가 얼마나 늘었는지 보고, 고른 이유도 말해 줘.');
      audioService.playSfx('warning');
    }
  };
  return <StepShell page={9} step={5} steps={6} instruction={complete ? `${scenario.title}에도 새들이 돌아왔어!` : '새 공원의 새들도 도와주자'} mentor={homeAsset('mentor')} mentorName="탐험단장"
    bubble={complete ? '공원에 필요한 도움을 잘 찾았어! 다른 곳에서도 그곳의 모습을 먼저 살펴보자.' : '이번에는 새 공원이야. 공원의 모습을 살펴보고, 새가 가장 많이 돌아온 방법과 그 이유를 골라 줘.'}
    className="p9-page transfer-page" onNavigate={onNavigate} status="마지막 도전 · 새 공원 도와주기"
    next={{ label: complete ? '되살아난 숲 보러 가기' : '이 방법으로 도와주기', disabled: !complete && (!action || !reason), hint: !action ? '새들을 도울 방법을 골라 줘' : '이 방법을 고른 이유도 골라 줘', onClick: confirm }}>
    <div className="v4-card transfer-board">
      <section className="transfer-context">
        <span className="record-eyebrow">새 공원 도와주기</span><h2>{scenario.title}</h2><p>{scenario.scene}</p>
        <p className="transfer-rule">어떤 도움을 받았을 때<br />새가 가장 많이 돌아왔을까?</p>
      </section>
      <section className="transfer-decision" aria-label="새 공원 해결책">
        <div className="transfer-actions" role="group" aria-label="먼저 바꿀 조건">
          {ACTIONS.map((item) => <button key={item.id} disabled={complete} className={`transfer-option${action === item.id ? ' is-selected' : ''}`} aria-pressed={action === item.id} onClick={() => { setAction(item.id); setFeedback(''); store({ action: item.id }); }}>
            <img src={item.image} alt="" /><strong>{item.label}</strong><span>새 2 → <b>{scenario.counts[item.id]}</b>마리</span>
            <span className="transfer-bar" aria-hidden="true"><i style={{ width: `${scenario.counts[item.id] * 10}%` }} /></span>
          </button>)}
        </div>
        <fieldset className="transfer-reasons"><legend>이 방법을 먼저 고른 이유는?</legend>{REASONS.map((item) => <button key={item.id} disabled={complete} className={reason === item.id ? 'is-selected' : ''} aria-pressed={reason === item.id} onClick={() => { setReason(item.id); setFeedback(''); store({ reason: item.id }); }}>{item.label}</button>)}</fieldset>
        {feedback && <p className="transfer-feedback" role="status">{feedback}</p>}
        {complete && <p className="transfer-feedback is-success" role="status">새가 2마리에서 {scenario.counts[scenario.best]}마리로 늘었어! 이 공원에 꼭 필요한 도움이었어.</p>}
      </section>
    </div>
  </StepShell>;
}
