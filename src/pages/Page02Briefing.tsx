import { useState } from 'react';
import { GameShell, Panel, TaskCue } from '../components/GameShell';
import { ArrowIcon, CheckIcon, SparkIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { audioService } from '../services/audioService';
import { fallbackTo, homeAsset, pageAsset, v3Asset } from '../shared/assets';
import { JOB_LABELS, STAGE_META } from '../shared/constants';
import type { JobId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import './page02.css';

const BRIEF_LINES = [
  '하늘숲 동물원 새 정원 그물이 태풍에 찢어져서, 앵무새 모모와 루비가 푸른솔 숲으로 날아갔어. 사육사 혼자선 넓은 숲을 다 뒤질 수 없어.',
  '한 직업만으로는 못 찾아. 하늘에서 보고, 살피고, 조사하고, 알리는 네 사람이 필요해.',
  '네가 네 직업을 차례로 맡아 봐. 마지막엔 넷을 한 팀으로 묶어야 풀리는 일이 기다리고 있어.',
];

const JOB_CARDS: { id: JobId; icon: string; mentor: string; tools: string[]; does: string }[] = [
  { id: 'drone', icon: pageAsset(2, 7), mentor: pageAsset(4, 2), tools: ['드론', '조종기', '바람 센서'], does: '바람을 읽고 경로를 짜서 하늘에서 현장을 찍어' },
  { id: 'care', icon: pageAsset(2, 8), mentor: pageAsset(5, 1), tools: ['돌봄 기록판', '먹이 세트', '이동장'], does: '동물을 한 마리씩 살피고 그 동물에 맞게 돌봐' },
  { id: 'ecology', icon: pageAsset(2, 9), mentor: pageAsset(7, 1), tools: ['녹음기', '연구 태블릿', '환경 측정기'], does: '흔적을 모으고 조건을 하나씩 바꿔 원인을 찾아' },
  { id: 'broadcast', icon: pageAsset(2, 10), mentor: pageAsset(3, 3), tools: ['방송 카메라', '송출 모니터', '큐시트'], does: '근거 있는 정보만 골라 사람들에게 정확히 알려' },
];

export default function Page02Briefing({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, setPlayerName, setPrediction, logEvent } = useGame();
  const [line, setLine] = useState(0);
  const [flipped, setFlipped] = useState<JobId[]>([]);
  const [rewardOpen, setRewardOpen] = useState(false);
  const briefed = line >= BRIEF_LINES.length - 1;
  const allFlipped = flipped.length === JOB_CARDS.length;
  const ready = briefed && allFlipped && Boolean(save.prediction) && save.playerName.trim().length > 0;
  const nextTask = !briefed
    ? { action: '사건 이야기를 끝까지 읽어', target: '왼쪽 이야기의 다음' }
    : !allFlipped
      ? { action: `직업 카드 ${JOB_CARDS.length - flipped.length}장을 더 확인해`, target: '가운데 직업 카드' }
      : save.playerName.trim().length === 0
        ? { action: '탐험가 이름을 적어', target: '오른쪽 이름 칸' }
        : !save.prediction
          ? { action: '가장 해 보고 싶은 직업 하나를 골라', target: '오른쪽 직업 선택' }
          : { action: '준비 완료! 첫 정찰로 출발해', target: '출발 버튼', done: true };

  const flip = (id: JobId) => {
    if (flipped.includes(id)) return;
    audioService.playSfx('clue');
    setFlipped([...flipped, id]);
  };

  const join = () => {
    if (!ready || !save.prediction) return;
    audioService.playSfx('success');
    logEvent({
      page: 2, type: 'prediction', contextRef: 'p2-prediction',
      summary: `탐험을 시작하기 전에 “${JOB_LABELS[save.prediction]}”가 제일 잘 맞을 것 같다고 예측했어.`,
      tags: ['예측', '자기이해'],
    });
    onNavigate(3);
  };

  return (
    <GameShell page={2} eyebrow="CASE BRIEFING" onNavigate={onNavigate} className="briefing-page" footer={
      <div className="guided-footer">
        <TaskCue {...nextTask} />
        <button className={`button button--primary button--large${ready ? ' is-next-action' : ''}`} disabled={!ready} onClick={join}>탐험단 입단하고 출발 <ArrowIcon /></button>
      </div>
    }>
      <div className="briefing-layout">
        <Panel kicker="CASE" title="사건 접수" className="briefing-case">
          <img className="briefing-keyart" src={v3Asset('scene-escape')} onError={fallbackTo(homeAsset('parrot-pair'))} alt="저녁 하늘, 푸른솔 숲 쪽으로 날아가는 초록·빨강 앵무 두 마리와 멀리 보이는 공사장" />
          <div className="briefing-dialog" aria-live="polite">
            <img src={homeAsset('mentor')} alt="" />
            <div>
              <span>탐험단장</span>
              <p>{BRIEF_LINES[line]}</p>
              {!briefed && <button className="button button--ghost is-next-action" onClick={() => { audioService.playSfx('tap'); setLine(line + 1); }}>이야기 계속 읽기 <ArrowIcon /></button>}
            </div>
          </div>
          <button type="button" className="briefing-reward-button" onClick={() => { audioService.playSfx('tap'); setRewardOpen(true); }}><SparkIcon />끝내면 얻는 것 보기</button>
        </Panel>

        <Panel kicker="JOBS" title="네 직업 카드를 뒤집어 봐" className="briefing-jobs">
          <p className="briefing-hint">카드를 눌러 도구와 하는 일을 확인해. 네 장을 다 봐야 예측할 수 있어.</p>
          <div className="job-card-grid">
            {JOB_CARDS.map((job) => {
              const open = flipped.includes(job.id);
              return (
                <button key={job.id} className={`job-card${open ? ' is-open' : ''}`} aria-pressed={open} onClick={() => flip(job.id)}>
                  <span className="job-card__face job-card__front"><img src={job.icon} alt="" /><strong>{JOB_LABELS[job.id]}</strong><em>눌러서 뒤집기</em></span>
                  <span className="job-card__face job-card__back"><img src={job.mentor} alt="" /><strong>{JOB_LABELS[job.id]}</strong><p>{job.does}</p><ul>{job.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul></span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel kicker="EXPLORER" title="탐험단 명찰" className={`briefing-badge${allFlipped ? '' : ' is-waiting'}`}>
          <label className="name-field">탐험가 이름
            <input value={save.playerName} maxLength={12} placeholder="이름을 적어 봐" onChange={(event) => setPlayerName(event.target.value)} />
          </label>
          <fieldset className="prediction" disabled={!allFlipped}>
            <legend>지금 생각엔 어떤 직업이 제일 잘 맞을 것 같아?</legend>
            <p className="briefing-hint">정답은 없어. 끝나고 실제 플레이와 비교해 볼 거야.</p>
            {JOB_CARDS.map((job) => (
              <button key={job.id} type="button" className={`prediction__option${save.prediction === job.id ? ' is-selected' : ''}`} aria-pressed={save.prediction === job.id} onClick={() => { audioService.playSfx('tap'); setPrediction(job.id); }}>
                <img src={job.icon} alt="" /><span>{JOB_LABELS[job.id]}</span>{save.prediction === job.id && <CheckIcon />}
              </button>
            ))}
          </fieldset>
          {!allFlipped && <p className="briefing-lock">카드 {flipped.length} / 4 확인</p>}
        </Panel>
      </div>

      {rewardOpen && (
        <Modal title="끝내면 얻는 것" onClose={() => setRewardOpen(false)} actions={<button className="button button--primary" onClick={() => setRewardOpen(false)}>알겠어</button>}>
          <div className="briefing-reward">
            <ul>{STAGE_META.map((stage) => <li key={stage.id}><img src={stage.badge} alt="" />{stage.reward}</li>)}</ul>
            <p>그리고 모모와 루비가 새 정원으로 건강하게 돌아가. 수료증도 인쇄할 수 있어.</p>
          </div>
        </Modal>
      )}
    </GameShell>
  );
}
