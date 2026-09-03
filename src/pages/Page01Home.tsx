import { useMemo, useState } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { ArrowIcon, CheckIcon, LockIcon, SparkIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { homeAsset, pageAsset } from '../shared/assets';
import type { PageNumber, StageNumber } from '../shared/types';
import { audioService } from '../services/audioService';
import { useGame } from '../state/GameContext';

const STAGES: Array<{ id: StageNumber; label: string; subtitle: string; goal: string; image: string; page: PageNumber }> = [
  { id: 1, label: '나의 방식', subtitle: '8번 고르기', goal: '마음이 가는 방법을 8번 골라요.', image: pageAsset(2, 10), page: 2 },
  { id: 2, label: '직업 찾기', subtitle: '찾고 찍기', goal: '단서를 찾고 드론으로 찍어요.', image: pageAsset(3, 10), page: 3 },
  { id: 3, label: '앵무새 돌봄', subtitle: '살피고 고치기', goal: '앵무새를 살피고 집을 고쳐요.', image: pageAsset(5, 3), page: 5 },
  { id: 4, label: '일의 순서', subtitle: '3개 해내기', goal: '중요한 일부터 세 가지를 해요.', image: pageAsset(7, 10), page: 7 },
  { id: 5, label: '도시 협력', subtitle: '4곳 돕기', goal: '직업의 힘으로 도시 네 곳을 도와요.', image: pageAsset(8, 10), page: 8 },
];

const JOB_CARDS = ['드론 영상 촬영가', '앵무새 돌봄 전문가', '동물 생활 공간 설계가', '생태 현장 운영 조정가', '미래도시 협력 해결사'];

export default function Page01Home({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, startNew, setPlayerName, loadIssue, saveFailed } = useGame();
  const [modal, setModal] = useState<'atlas' | 'badges' | 'reset' | null>(null);
  const hasProgress = save.logs.length > 0 || save.stageProgress.completedPages.length > 0 || save.lastPage > 1;
  const completedCount = Object.values(save.stageProgress.completed).filter(Boolean).length;
  const resetLoss = [
    save.badges.length && `모은 배지 ${save.badges.length}개`,
    save.jobCards.length && `직업 카드 ${save.jobCards.length}장`,
    completedCount && `완료한 스테이지 ${completedCount}개`,
  ].filter(Boolean).join(', ');
  const currentStage = useMemo(() => STAGES.find((stage) => !save.stageProgress.completed[stage.id]) ?? STAGES[4]!, [save.stageProgress.completed]);
  const allComplete = completedCount === STAGES.length;

  const begin = () => {
    audioService.playSfx('tap');
    if (hasProgress) onNavigate(save.lastPage === 1 ? currentStage!.page : save.lastPage);
    else {
      startNew();
      onNavigate(2);
    }
  };

  return (
    <GameShell page={1} eyebrow="CAREER EXPLORATION LAB" onNavigate={onNavigate} className="home-page">
      {loadIssue === 'corrupt' && <div className="toast toast--warning home-save-warning" role="alert">저장 기록 일부를 읽지 못해서 안전하게 새 탐험판을 열었어.</div>}
      {saveFailed && <div className="toast toast--warning home-save-warning" role="alert">기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.</div>}
      <div className="home-layout">
        <Panel kicker="EXPLORER" title="탐험가 프로필" className="home-profile">
          <div className="avatar-frame"><img src={homeAsset('student')} alt="미래 직업실 학생 탐험가" /></div>
          <label className="name-field">탐험가 이름
            <input value={save.playerName} maxLength={12} placeholder="이름을 적어 봐" onChange={(event) => setPlayerName(event.target.value)} />
          </label>
        </Panel>

        <section className="home-hero" aria-labelledby="home-title">
          <img className="home-logo" src={homeAsset('logo')} alt="" />
          <h2 id="home-title" className="sr-only">미래 직업실</h2>
          <p className="home-tagline">해 보고 고르며, 나에게 맞는 일하는 방법을 찾아봐.</p>
          <img className="home-keyart" src={homeAsset('keyart')} alt="학생과 진로 멘토, 두 앵무새와 드론이 미래 직업실에 모여 있는 모습" />
          <button className="button button--primary button--large home-cta" onClick={begin}>
            {hasProgress ? '이어하기' : '새로 시작하기'} <ArrowIcon />
          </button>
          {hasProgress && <button className="text-button" onClick={() => setModal('reset')}>처음부터 새 탐험</button>}
        </section>

        <div className="stack">
          <Panel title={allComplete ? '탐험 결과가 준비됐어' : '지금 할 일'} className="daily-panel">
            <img src={allComplete ? pageAsset(9, 1) : currentStage.image} alt="지금 할 일을 보여 주는 그림" />
            <span className="status-chip status-chip--info">{allComplete ? '모두 완료' : `스테이지 ${currentStage.id}`}</span>
            <h3>{allComplete ? '나의 일하기 지도 보기' : currentStage.label}</h3>
            <p>{allComplete ? '내가 실제로 한 선택과 행동을 한곳에서 돌아봐.' : currentStage.goal}</p>
            <button className="button button--teal button--block" onClick={() => onNavigate(allComplete ? 9 : currentStage.page)}>{allComplete ? '결과 보기' : '이어서 하기'}</button>
          </Panel>
          <div className="home-side-actions">
            <button className="home-mini-card" onClick={() => setModal('atlas')}><img src={homeAsset('parrot-pair')} alt="" /><span><strong>직업도감</strong>{save.jobCards.length}장 발견</span></button>
            <button className="home-mini-card" onClick={() => setModal('badges')}><img src={homeAsset('badge')} alt="" /><span><strong>배지 보기</strong>{save.badges.length}개 획득</span></button>
          </div>
        </div>
      </div>

      <nav className="stage-map" aria-label="스테이지 선택">
        {STAGES.map((stage, index) => {
          const complete = save.stageProgress.completed[stage.id];
          const available = index === 0 || STAGES.slice(0, index).every((item) => save.stageProgress.completed[item.id]);
          return <button key={stage.id} className={`stage-node${complete ? ' is-complete' : ''}${available ? '' : ' is-locked'}`} disabled={!available} onClick={() => onNavigate(stage.page)}>
            <span className="stage-node__art"><img src={stage.image} alt="" /><span className="stage-node__number">{complete ? <CheckIcon /> : available ? stage.id : <LockIcon />}</span></span>
            <span><strong>{stage.label}</strong><em>{stage.subtitle}</em></span>
          </button>;
        })}
      </nav>

      {modal === 'reset' && <Modal title="처음부터 새 탐험" onClose={() => setModal(null)} actions={<>
        <button className="button" autoFocus onClick={() => setModal(null)}>취소</button>
        <button className="button button--primary" onClick={() => { setModal(null); startNew(); onNavigate(2); }}>처음부터 시작</button>
      </>}>
        <p>{resetLoss ? `지금까지 ${resetLoss} 모두 사라져요.` : '지금까지 진행한 기록이 모두 사라져요.'} 정말 처음부터 시작할까요?</p>
        <p>한 번 지우면 되돌릴 수 없어요. 이어서 하고 싶으면 취소를 눌러 주세요.</p>
      </Modal>}
      {modal === 'atlas' && <Modal title="직업도감" onClose={() => setModal(null)} actions={<button className="button" onClick={() => setModal(null)}>닫기</button>}>
        <div className="atlas-grid">{JOB_CARDS.map((job) => {
          const unlocked = save.jobCards.includes(job);
          return <div key={job} className={`atlas-card${unlocked ? '' : ' is-locked'}`}>{unlocked ? <SparkIcon /> : <LockIcon />}<strong>{unlocked ? job : '아직 만나지 않은 직업'}</strong></div>;
        })}</div>
      </Modal>}
      {modal === 'badges' && <Modal title="나의 배지" onClose={() => setModal(null)} actions={<button className="button" onClick={() => setModal(null)}>닫기</button>}>
        {save.badges.length ? <ul className="badge-list">{save.badges.map((badge) => <li key={badge}><CheckIcon />{badge}</li>)}</ul> : <div className="empty-state"><img src={homeAsset('badge')} alt="미래 직업실 배지" /><p>스테이지를 완주하면 첫 배지를 받을 수 있어.</p></div>}
      </Modal>}
    </GameShell>
  );
}
