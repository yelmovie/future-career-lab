import { useMemo, useState } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { ArrowIcon, CheckIcon, LockIcon, SparkIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { homeAsset } from '../shared/assets';
import type { PageNumber, StageNumber } from '../shared/types';
import { audioService } from '../services/audioService';
import { useGame } from '../state/GameContext';

const DAILY_MISSIONS = {
  'daily-1': { title: '관찰 기록 찾기', copy: '오늘은 근거가 되는 기록을 세 번 찾아봐.', stage: 2 as StageNumber },
  'daily-2': { title: '안전 먼저 생각하기', copy: '오늘은 안전과 관련된 선택을 두 번 해봐.', stage: 4 as StageNumber },
  'daily-3': { title: '두 직업 연결하기', copy: '서로 다른 역할이 힘을 합치는 순간을 찾아봐.', stage: 5 as StageNumber },
};

const STAGES: Array<{ id: StageNumber; label: string; subtitle: string; page: PageNumber }> = [
  { id: 1, label: '나의 방식', subtitle: '선택으로 알아보기', page: 2 },
  { id: 2, label: '현장 탐색', subtitle: '단서와 드론', page: 3 },
  { id: 3, label: '생명 돌봄', subtitle: '관찰과 설계', page: 5 },
  { id: 4, label: '실시간 업무', subtitle: '우선순위 판단', page: 7 },
  { id: 5, label: '도시 연합', subtitle: '협업 전략', page: 8 },
];

export default function Page01Home({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, startNew, setPlayerName, loadIssue } = useGame();
  const [modal, setModal] = useState<'atlas' | 'badges' | 'guide' | null>(null);
  const hasProgress = save.logs.length > 0 || save.stageProgress.completedPages.length > 0 || save.lastPage > 1;
  const completedCount = Object.values(save.stageProgress.completed).filter(Boolean).length;
  const daily = DAILY_MISSIONS[save.dailyMissionId as keyof typeof DAILY_MISSIONS] ?? DAILY_MISSIONS['daily-1'];
  const currentStage = useMemo(() => STAGES.find((stage) => !save.stageProgress.completed[stage.id]) ?? STAGES[4], [save.stageProgress.completed]);

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
      <div className="home-layout">
        <Panel kicker="EXPLORER" title="탐험가 프로필" className="home-profile">
          <div className="avatar-frame"><img src={homeAsset('student')} alt="미래 직업실 학생 탐험가" /></div>
          <label className="name-field">탐험가 이름
            <input value={save.playerName} maxLength={12} placeholder="이름을 적어 봐" onChange={(event) => setPlayerName(event.target.value)} />
          </label>
          <div className="profile-stats">
            <span><b>{completedCount}</b> 완료한 스테이지</span>
            <span><b>{save.jobCards.length}</b> 발견한 직업 카드</span>
          </div>
          <button className="button button--ghost button--block" onClick={() => setModal('guide')}>게임 방법 보기</button>
        </Panel>

        <section className="home-hero" aria-labelledby="home-title">
          <img className="home-logo" src={homeAsset('logo')} alt="" />
          <h2 id="home-title" className="sr-only">미래 직업실</h2>
          <p className="home-tagline">직업 이름을 외우는 대신, 직접 일해 보며 나만의 탐험 지도를 만들어 봐.</p>
          <img className="home-keyart" src={homeAsset('keyart')} alt="학생과 진로 멘토, 두 앵무새와 드론이 미래 직업실에 모여 있는 모습" />
          <button className="button button--primary button--large home-cta" onClick={begin}>
            {hasProgress ? '이어하기' : '새로 시작하기'} <ArrowIcon />
          </button>
          {hasProgress && <button className="text-button" onClick={() => { startNew(); onNavigate(2); }}>처음부터 새 탐험</button>}
        </section>

        <div className="stack">
          <Panel kicker="TODAY" title="오늘의 미션" className="daily-panel">
            <img src={homeAsset('drone')} alt="작은 카메라 드론" />
            <span className="status-chip status-chip--info">하루 한 번</span>
            <h3>{daily.title}</h3>
            <p>{daily.copy}</p>
            <button className="button button--teal button--block" onClick={() => onNavigate(STAGES.find((stage) => stage.id === daily.stage)!.page)}>미션으로 이동</button>
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
            <span className="stage-node__number">{complete ? <CheckIcon /> : available ? stage.id : <LockIcon />}</span>
            <span><small>STAGE {stage.id}</small><strong>{stage.label}</strong><em>{stage.subtitle}</em></span>
          </button>;
        })}
      </nav>

      {modal === 'guide' && <Modal title="미래 직업실 탐험 방법" onClose={() => setModal(null)} actions={<button className="button button--primary" onClick={() => setModal(null)}>알겠어</button>}>
        <ol className="guide-steps"><li><b>선택해 봐.</b> 착한 답이나 틀린 답은 없어.</li><li><b>근거를 모아.</b> 한 장면만 보고 바로 정하지 않아.</li><li><b>결과를 고쳐 봐.</b> 처음 계획이 달라도 다시 시도할 수 있어.</li><li><b>함께 해결해.</b> 서로 다른 직업이 힘을 합칠 때를 찾아봐.</li></ol>
      </Modal>}
      {modal === 'atlas' && <Modal title="직업도감" onClose={() => setModal(null)} actions={<button className="button" onClick={() => setModal(null)}>닫기</button>}>
        <div className="atlas-grid">{['드론 영상 촬영가', '생태 현장 연구원', '동물 돌봄 전문가', '스마트 시설 기술자', '시민 안내 조정가', '데이터 연구원'].map((job, index) => {
          const unlocked = save.jobCards.includes(job) || index < save.jobCards.length;
          return <div key={job} className={`atlas-card${unlocked ? '' : ' is-locked'}`}>{unlocked ? <SparkIcon /> : <LockIcon />}<strong>{unlocked ? job : '아직 만나지 않은 직업'}</strong></div>;
        })}</div>
      </Modal>}
      {modal === 'badges' && <Modal title="나의 배지" onClose={() => setModal(null)} actions={<button className="button" onClick={() => setModal(null)}>닫기</button>}>
        {save.badges.length ? <ul className="badge-list">{save.badges.map((badge) => <li key={badge}><CheckIcon />{badge}</li>)}</ul> : <div className="empty-state"><img src={homeAsset('badge')} alt="미래 직업실 배지" /><p>스테이지를 완주하면 첫 배지를 받을 수 있어.</p></div>}
      </Modal>}
    </GameShell>
  );
}
