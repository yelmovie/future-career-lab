import { useState } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { ArrowIcon, CheckIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { homeAsset, pageAsset, v2Asset } from '../shared/assets';
import { JOB_LABELS, STAGE_META } from '../shared/constants';
import type { JobId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import './page02.css';

const BRIEF_LINES = [
  '도시 옆 숲에서 앵무새가 한 달 사이에 절반으로 줄었어. 아무도 이유를 몰라.',
  '한 직업만으로는 못 풀어. 하늘에서 보고, 살피고, 조사하고, 알리는 네 사람이 필요해.',
  '네가 네 직업을 차례로 맡아 봐. 마지막엔 넷을 한 팀으로 묶어서 숲을 되돌려 놓자.',
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
  const briefed = line >= BRIEF_LINES.length - 1;
  const allFlipped = flipped.length === JOB_CARDS.length;
  const ready = allFlipped && Boolean(save.prediction) && save.playerName.trim().length > 0;

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
      <button className="button button--primary button--large" disabled={!ready} onClick={join}>탐험단 입단하고 출발 <ArrowIcon /></button>
    }>
      <div className="briefing-layout">
        <Panel kicker="CASE" title="사건 접수" className="briefing-case">
          <img className="briefing-keyart" src={v2Asset('scene-incident')} alt="저녁 하늘 아래 숲을 떠나는 앵무새들과 멀리 보이는 공사장" />
          <div className="briefing-dialog" aria-live="polite">
            <img src={homeAsset('mentor')} alt="" />
            <div>
              <span>탐험단장</span>
              <p>{BRIEF_LINES[line]}</p>
              {!briefed && <button className="button button--ghost" onClick={() => { audioService.playSfx('tap'); setLine(line + 1); }}>다음 <ArrowIcon /></button>}
            </div>
          </div>
          <div className="briefing-reward">
            <strong>끝내면 얻는 것</strong>
            <ul>{STAGE_META.map((stage) => <li key={stage.id}><img src={stage.badge} alt="" />{stage.reward}</li>)}</ul>
            <p>그리고 앵무새가 숲으로 돌아가. 수료증도 인쇄할 수 있어.</p>
          </div>
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
    </GameShell>
  );
}
