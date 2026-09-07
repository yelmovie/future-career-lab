import { useMemo, useState } from 'react';
import { GameShell } from '../components/GameShell';
import { ArrowIcon, SparkIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { homeAsset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { audioService } from '../services/audioService';
import { useGame } from '../state/GameContext';

export default function Page01Home({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, startNew, loadIssue, saveFailed } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);
  const hasProgress = save.logs.length > 0 || save.stageProgress.completedPages.length > 0 || save.lastPage > 1;
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
        <span className="sr-only">신입 탐험가와 탐험단장이 앵무새 지구·젤리, 드론과 함께 서 있어요.</span>

        <div className="home-asset-scenery" aria-hidden="true">
          <div className="home-ground" />
          <img className="home-keyart" src={homeAsset('keyart')} alt="" />
        </div>

        <aside className="home-dialog home-dialog--student" aria-label="신입 탐험가의 말">
          <span>신입 탐험가</span>
          <p>숲의 새들이 자꾸 사라진대. 나 혼자서 찾을 수 있을까?</p>
        </aside>
        <aside className="home-dialog home-dialog--mentor" aria-label="탐험단장의 말">
          <span>탐험단장</span>
          <p>하늘에서 찾고, 돌보고, 조사하고, 알려야 해. 네 직업이 힘을 모아야 풀려!</p>
        </aside>

        <div className="home-lockup">
          <span className="home-kicker"><SparkIcon /> FUTURE CAREER LAB</span>
          <div className="home-logo-frame">
            <h1 id="home-title" aria-label="미래 직업실"><img src={homeAsset('logo')} alt="" /></h1>
          </div>
          <p>네 직업의 힘을 모아 사라진 새들을 찾아라</p>
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
