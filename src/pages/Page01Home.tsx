import { useMemo, useState } from 'react';
import { GameShell } from '../components/GameShell';
import { ArrowIcon, SparkIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { homeAsset, pageAsset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { audioService } from '../services/audioService';
import { useGame } from '../state/GameContext';

export default function Page01Home({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, startNew, loadIssue, saveFailed } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);
  const hasProgress = save.logs.length > 0 || save.stageProgress.completedPages.length > 0 || save.lastPage > 1;
  const completedCount = Object.values(save.stageProgress.completed).filter(Boolean).length;
  const currentStage = useMemo(() => STAGE_META.find((stage) => !save.stageProgress.completed[stage.id]) ?? STAGE_META[4]!, [save.stageProgress.completed]);
  const resumeTarget = save.lastPage > 1 ? save.lastPage : currentStage.page;

  const continueGame = () => {
    if (!hasProgress) return;
    audioService.playSfx('tap');
    onNavigate(resumeTarget);
  };

  const startFresh = () => {
    audioService.playSfx('tap');
    if (hasProgress) setConfirmReset(true);
    else {
      startNew();
      onNavigate(2);
    }
  };

  return (
    <GameShell page={1} eyebrow="CAREER EXPLORATION LAB" onNavigate={onNavigate} className="home-page">
      {loadIssue === 'corrupt' && <div className="toast toast--warning home-save-warning" role="alert">저장 기록 일부를 읽지 못해서 안전하게 새 탐험판을 열었어.</div>}
      {saveFailed && <div className="toast toast--warning home-save-warning" role="alert">기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.</div>}
      <section className="home-intro" aria-labelledby="home-title">
        <span className="sr-only">미래 직업 연구실에 드론 탐험가와 현장 탐사 멘토가 서 있어요.</span>

        <div className="home-asset-scenery" aria-hidden="true">
          <img className="home-character home-character--student" src={pageAsset(4, 1)} alt="" />
          <img className="home-character home-character--mentor" src={pageAsset(4, 2)} alt="" />
        </div>

        <aside className="home-dialog home-dialog--student" aria-label="학생 탐험가의 말">
          <span>드론 탐험가</span>
          <p>하늘에서 첫 단서를 찾아볼까?</p>
        </aside>
        <aside className="home-dialog home-dialog--mentor" aria-label="진로 연구 멘토의 말">
          <span>현장 탐사 멘토</span>
          <p>관찰하고 기록하면 직업의 힘이 보여.</p>
        </aside>

        <div className="home-lockup">
          <span className="home-kicker"><SparkIcon /> FUTURE CAREER LAB</span>
          <div className="home-logo-frame">
            <h1 id="home-title" aria-label="미래 직업실"><img src={homeAsset('logo')} alt="" /></h1>
          </div>
          <p>다섯 가지 직업의 힘으로 숲의 사건을 해결해 봐.</p>
          <div className="home-mission-brief">
            <img src={homeAsset('badge')} alt="" />
            <div><span>MISSION 01</span><strong>사라진 앵무새의 단서를 찾아라</strong></div>
          </div>
        </div>

        <div className="home-actions">
          <div className="home-action-buttons">
            <button className={`button button--large home-start${hasProgress ? '' : ' button--primary'}`} onClick={startFresh}>
              <SparkIcon /> 시작하기
            </button>
            <button className={`button button--large home-continue${hasProgress ? ' button--primary' : ''}`} onClick={continueGame} disabled={!hasProgress} title={hasProgress ? '저장된 탐험을 이어서 시작해요' : '아직 이어갈 기록이 없어요'}>
              이어하기 <ArrowIcon />
            </button>
          </div>
          <p>{hasProgress ? `저장된 탐험 · ${completedCount}/5단계 완료 · ${currentStage.label}` : '진행 기록은 이 기기에 자동으로 저장돼.'}</p>
        </div>
      </section>

      {confirmReset && <Modal title="새 탐험을 시작할까?" onClose={() => setConfirmReset(false)} actions={<>
        <button className="button" autoFocus onClick={() => setConfirmReset(false)}>돌아가기</button>
        <button className="button button--danger" onClick={() => { setConfirmReset(false); startNew(); onNavigate(2); }}>기록 지우고 시작하기</button>
      </>}>
        <p>지금까지 모은 기록과 배지가 모두 사라져. 이어서 하고 싶으면 돌아가기를 눌러 줘.</p>
      </Modal>}
    </GameShell>
  );
}
