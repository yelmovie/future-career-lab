import { useMemo, useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { PictureChoice } from '../components/v4/PictureChoice';
import { ArrowIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { homeAsset, pageAsset, v2Asset } from '../shared/assets';
import { ABILITY_STATEMENTS, JOB_LABELS, STAGE_META } from '../shared/constants';
import type { JobId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { actualJob } from '../data/resultRules';
import './page09.css';

const MAX_STATEMENTS = 2;
/** 탐험단장은 브리핑(페이지 2)과 같은 한 사람. */
const MENTOR = homeAsset('mentor');
/** 직업 아이콘 = 스테이지 배지. 브리핑 3단계와 같은 그림이라 예측·실제를 바로 견줄 수 있다. */
const JOB_ICON = Object.fromEntries(STAGE_META.filter((stage) => stage.job !== 'alliance').map((stage) => [stage.job, stage.badge])) as Record<JobId, string>;
/** ABILITY_STATEMENTS 순서대로: 드론·증거판·돌봄·생태·방송·연합 */
const STATEMENT_IMAGES = [pageAsset(8, 5), v2Asset('photo-logging'), pageAsset(8, 4), v2Asset('badge-ecology'), v2Asset('badge-broadcast'), pageAsset(8, 10)];

export default function Page09DNA({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, setAbilityStatements, teacherMode } = useGame();
  const [step, setStep] = useState<1 | 2>(1);
  const [react, setReact] = useState<string | null>(null);

  const { job: actual, evidence } = useMemo(() => actualJob(save.artifacts, save.logs, save.traits), [save.artifacts, save.logs, save.traits]);
  const reason = evidence.find((entry) => entry.job === actual)?.reason ?? '아직 기록이 적어';
  const prediction = save.prediction;
  const matched = prediction !== null && actual !== null && prediction === actual;
  const compareBubble = prediction === null
    ? `브리핑 때 고른 직업이 없어. 실제로는 ${actual ? `“${JOB_LABELS[actual]}”로 제일 잘 움직였어` : '아직 기록이 적어'}.`
    : matched ? '예측이 맞았네. 왜 그랬을까?' : '예측과 달랐네. 어디서 달라졌을까?';

  const chosen = save.abilityStatements.filter((statement) => ABILITY_STATEMENTS.includes(statement));
  const ready = chosen.length >= MAX_STATEMENTS;
  const toggle = (statement: string) => {
    if (chosen.includes(statement)) { setAbilityStatements(chosen.filter((entry) => entry !== statement)); setReact(null); return; }
    if (ready) { setReact('두 개까지만 고를 수 있어'); return; }
    setReact(null);
    setAbilityStatements([...chosen, statement]);
  };

  if (step === 1) {
    return (
      <StepShell page={10} step={1} steps={2} instruction="예측과 실제를 비교해 봐" mentor={MENTOR} mentorName="탐험단장" bubble={compareBubble} onNavigate={onNavigate} className="page10-dna"
        next={{ label: '나는 이제 …', onClick: () => { audioService.playSfx('swipe'); setStep(2); } }}>
        <div className="v4-card p10-compare">
          <div className="p10-job">
            <span>처음 고른 직업</span>
            {prediction ? <img src={JOB_ICON[prediction]} alt="" /> : <i className="p10-job__none">?</i>}
            <strong>{prediction ? JOB_LABELS[prediction] : '예측 안 함'}</strong>
            <small>브리핑 때 골랐어</small>
          </div>
          <i className="p10-arrow" aria-hidden="true"><ArrowIcon /></i>
          <div className="p10-job is-actual">
            <span>제일 잘 움직인 직업</span>
            {actual ? <img src={JOB_ICON[actual]} alt="" /> : <i className="p10-job__none">?</i>}
            <strong>{actual ? JOB_LABELS[actual] : '아직 기록이 적어'}</strong>
            <small>{reason}</small>
          </div>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell page={10} step={2} steps={2} instruction="내가 해 낸 것 두 개를 골라" mentor={MENTOR} mentorName="탐험단장" bubble="수료증에 찍힐 문장이야. 어떤 게 진짜 네 힘이지?" onNavigate={onNavigate} className="page10-dna"
      status={`${chosen.length} / ${MAX_STATEMENTS}`}
      next={{ label: '수료증 확인하기', disabled: !ready && !teacherMode, hint: `문장을 ${MAX_STATEMENTS - chosen.length}개 더 골라`, onClick: () => { audioService.playSfx('swipe'); onNavigate(11); } }}>
      <div className="v4-card p10-ability">
        <PictureChoice
          options={ABILITY_STATEMENTS.map((statement, index) => ({ id: statement, image: STATEMENT_IMAGES[index]!, label: statement }))}
          selected={chosen}
          onSelect={toggle}
          size="lg"
          ariaLabel="능력 문장 고르기"
        />
        {react && <div className="v4-react" role="status">{react}</div>}
      </div>
    </StepShell>
  );
}
