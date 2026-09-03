import { useMemo, useState } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { ArrowIcon, CheckIcon, LockIcon, SparkIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { homeAsset, pageAsset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { audioService } from '../services/audioService';
import { useGame } from '../state/GameContext';

const JOB_CARDS = STAGE_META.map((stage) => stage.jobTitle);

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
  const currentStage = useMemo(() => STAGE_META.find((stage) => !save.stageProgress.completed[stage.id]) ?? STAGE_META[4]!, [save.stageProgress.completed]);
  const allComplete = completedCount === STAGE_META.length;
  const nextLocked = STAGE_META.find((stage) => !save.stageProgress.completed[stage.id]);

  const begin = () => {
    audioService.playSfx('tap');
    if (hasProgress) onNavigate(save.lastPage === 1 ? currentStage.page : save.lastPage);
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
          <p className="home-tagline">숲의 앵무새가 사라졌어. 네 직업의 힘으로 원인을 찾고 되돌려 놓자.</p>
          <img className="home-keyart" src={homeAsset('keyart')} alt="학생과 진로 멘토, 두 앵무새와 드론이 미래 직업실에 모여 있는 모습" />
          <button className="button button--primary button--large home-cta" onClick={begin}>
            {hasProgress ? '이어하기' : '사건 접수하러 가기'} <ArrowIcon />
          </button>
          {hasProgress && <button className="text-button" onClick={() => setModal('reset')}>처음부터 새 탐험</button>}
        </section>

        <div className="stack">
          <Panel title={allComplete ? '탐험 결과가 준비됐어' : '지금 할 일'} className="daily-panel">
            <img src={allComplete ? pageAsset(9, 1) : currentStage.badge} alt="" />
            <span className="status-chip status-chip--info">{allComplete ? '모두 완료' : `스테이지 ${currentStage.id} · ${currentStage.jobTitle}`}</span>
            <h3>{allComplete ? '예측과 실제 비교하기' : currentStage.label}</h3>
            <p>{allComplete ? '처음 예측한 직업과 실제로 한 행동을 비교하고 수료증을 받아.' : currentStage.goal}</p>
            <p className="daily-reward"><b>끝내면</b> {allComplete ? '수료증 인쇄' : currentStage.reward}</p>
            <button className="button button--teal button--block" onClick={() => onNavigate(allComplete ? 10 : currentStage.page)}>{allComplete ? '결과 보기' : '이어서 하기'}</button>
          </Panel>
          <div className="home-side-actions">
            <button className="home-mini-card" onClick={() => setModal('atlas')}><img src={homeAsset('parrot-pair')} alt="" /><span><strong>직업도감</strong>{save.jobCards.length}장 발견</span></button>
            <button className="home-mini-card" onClick={() => setModal('badges')}><img src={homeAsset('badge')} alt="" /><span><strong>배지 보기</strong>{save.badges.length}개 획득</span></button>
          </div>
        </div>
      </div>

      <nav className="stage-map" aria-label="스테이지 선택">
        {STAGE_META.map((stage, index) => {
          const complete = save.stageProgress.completed[stage.id];
          const available = index === 0 || STAGE_META.slice(0, index).every((item) => save.stageProgress.completed[item.id]);
          const lockReason = !available && nextLocked ? `${nextLocked.label}를 끝내면 열려` : '';
          return <button key={stage.id} className={`stage-node${complete ? ' is-complete' : ''}${available ? '' : ' is-locked'}`} disabled={!available} title={lockReason} onClick={() => onNavigate(stage.page)}>
            <span className="stage-node__art"><img src={stage.badge} alt="" /><span className="stage-node__number">{complete ? <CheckIcon /> : available ? stage.id : <LockIcon />}</span></span>
            <span><strong>{stage.label}</strong><em>{available ? stage.subtitle : lockReason}</em></span>
          </button>;
        })}
        <button className={`stage-node stage-node--final${allComplete ? ' is-complete' : ' is-locked'}`} disabled={!allComplete} title={allComplete ? '' : '다섯 단계를 모두 끝내면 열려'} onClick={() => onNavigate(10)}>
          <span className="stage-node__art"><img src={pageAsset(10, 6)} alt="" /><span className="stage-node__number">{allComplete ? <CheckIcon /> : <LockIcon />}</span></span>
          <span><strong>돌아보기·수료증</strong><em>{allComplete ? '예측과 실제 비교' : '다섯 단계 완료 후'}</em></span>
        </button>
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
