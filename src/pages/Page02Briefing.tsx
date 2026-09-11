import { useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { PictureChoice } from '../components/v4/PictureChoice';
import { audioService } from '../services/audioService';
import { homeAsset, pageAsset, v3Asset } from '../shared/assets';
import { JOB_LABELS, STAGE_META } from '../shared/constants';
import type { JobId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import './page02.css';

const MENTOR = homeAsset('mentor');
const MENTOR_NAME = '탐험단장';

const BRIEF_LINES = [
  '새 정원 그물이 태풍에 찢어져서 지구와 젤리가 푸른솔 숲으로 날아갔어.',
  '사육사 혼자선 넓은 숲을 다 뒤질 수 없어.',
  '하늘에서 보고, 살피고, 조사하고, 알리는 넷이 필요해. 네가 차례로 맡아 줘.',
];

const JOBS: { id: JobId; character: string; says: string; tools: { image: string; label: string }[] }[] = [
  { id: 'drone', character: pageAsset(4, 1), says: '나는 하늘에서 숲을 찍어.', tools: [{ image: pageAsset(4, 3), label: '드론' }, { image: pageAsset(4, 4), label: '조종기' }, { image: pageAsset(4, 9), label: '바람 센서' }] },
  { id: 'care', character: v3Asset('keeper-haneul'), says: '나는 아픈 동물을 살펴.', tools: [{ image: pageAsset(5, 5), label: '돌봄 기록판' }, { image: pageAsset(5, 6), label: '먹이 세트' }, { image: pageAsset(5, 9), label: '건강 태블릿' }] },
  { id: 'ecology', character: pageAsset(7, 1), says: '나는 흔적으로 원인을 찾아.', tools: [{ image: pageAsset(3, 9), label: '녹음기' }, { image: pageAsset(7, 7), label: '환경 측정기' }, { image: pageAsset(3, 6), label: '돋보기' }] },
  { id: 'broadcast', character: pageAsset(3, 3), says: '나는 정확한 소식을 알려.', tools: [{ image: pageAsset(4, 5), label: '방송 카메라' }, { image: pageAsset(4, 7), label: '송출 모니터' }, { image: pageAsset(3, 4), label: '현장 카메라' }] },
];
const JOB_IDS = new Set<string>(JOBS.map((job) => job.id));

/** 저장된 진행(말풍선 줄·만난 캐릭터). 새로고침해도 처음부터 다시 누르지 않게. */
function readProgress(value: unknown): { line: number; met: JobId[] } {
  const data = (value ?? {}) as { line?: unknown; met?: unknown };
  const line = typeof data.line === 'number' ? Math.min(Math.max(0, Math.floor(data.line)), BRIEF_LINES.length - 1) : 0;
  const met = Array.isArray(data.met) ? data.met.filter((id): id is JobId => typeof id === 'string' && JOB_IDS.has(id)) : [];
  return { line, met };
}

const STEP_TEXT = [
  { instruction: '말풍선을 눌러 이야기를 들어', bubble: '지구와 젤리에게 무슨 일이 생겼을까?' },
  { instruction: '직업 캐릭터를 하나씩 눌러 봐', bubble: '누가 어떤 일을 할 수 있을까?' },
] as const;

export default function Page02Briefing({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, setPageData } = useGame();
  const [progress] = useState(() => readProgress(save.pageData.p2Progress));
  const [step, setStep] = useState(() => (progress.line >= BRIEF_LINES.length - 1 ? 2 : 1));
  const [line, setLine] = useState(progress.line);
  const [met, setMet] = useState<JobId[]>(progress.met);
  const [talking, setTalking] = useState<JobId | null>(null);

  const briefed = line >= BRIEF_LINES.length - 1;
  const allMet = met.length === JOBS.length;
  const stepDone = [briefed, allMet][step - 1]!;
  const hint = [
    '이야기 3줄을 다 들으면 켜져요',
    `캐릭터 ${JOBS.length - met.length}명을 더 눌러 보면 켜져요`,
  ][step - 1]!;

  const nextLine = () => {
    if (briefed) return;
    audioService.playSfx('tap');
    setLine(line + 1);
    setPageData('p2Progress', { line: line + 1, met });
  };

  const meet = (id: JobId) => {
    setTalking(id);
    if (met.includes(id)) return;
    audioService.playSfx('clue');
    const next = [...met, id];
    setMet(next);
    setPageData('p2Progress', { line, met: next });
  };

  const join = () => {
    audioService.playSfx('success');
    onNavigate(3);
  };

  const advance = () => {
    if (step < 2) { audioService.playSfx('swipe'); setStep(2); return; }
    join();
  };

  const speaker = JOBS.find((job) => job.id === talking) ?? null;

  return (
    <StepShell
      page={2}
      step={step}
      steps={2}
      instruction={STEP_TEXT[step - 1]!.instruction}
      mentor={MENTOR}
      mentorName={MENTOR_NAME}
      bubble={STEP_TEXT[step - 1]!.bubble}
      onNavigate={onNavigate}
      next={{ label: step < 2 ? '다음' : '출발!', disabled: !stepDone, hint, onClick: advance }}
      help={
        <div className="brief-reward">
          <p>끝내면 얻는 것</p>
          <ul>{STAGE_META.map((stage) => <li key={stage.id}><img src={stage.badge} alt="" />{stage.reward}</li>)}</ul>
          <p>그리고 지구와 젤리가 새 정원으로 건강하게 돌아가. 수료증도 저장하거나 인쇄할 수 있어.</p>
        </div>
      }
    >
      {step === 1 && (
        <div className="brief-story v4-card">
          <img className="brief-story__art" src={homeAsset('parrot-pair')} alt="초록 앵무 지구와 빨강 앵무 젤리" />
          <button type="button" className={`brief-line${briefed ? ' is-last' : ''}`} onClick={nextLine} aria-live="polite">
            <span className="brief-line__who">{MENTOR_NAME}</span>
            <strong>{BRIEF_LINES[line]}</strong>
            <em>{briefed ? '이야기 끝' : `눌러서 다음 ${line + 1}/${BRIEF_LINES.length}`}</em>
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="brief-jobs">
          <PictureChoice
            size="md"
            ariaLabel="직업 캐릭터"
            options={JOBS.map((job) => ({ id: job.id, image: job.character, label: JOB_LABELS[job.id], done: met.includes(job.id) }))}
            selected={talking}
            onSelect={meet}
          />
          <div className={`brief-talk v4-card${speaker ? '' : ' is-empty'}`} aria-live="polite">
            {speaker ? (
              <>
                <strong className="brief-talk__says">{speaker.says}</strong>
                <ul className="brief-tools">
                  {speaker.tools.map((tool) => <li key={tool.label}><img src={tool.image} alt="" /><span>{tool.label}</span></li>)}
                </ul>
              </>
            ) : <strong className="brief-talk__says">캐릭터를 누르면 말을 걸어 와</strong>}
          </div>
        </div>
      )}

    </StepShell>
  );
}
