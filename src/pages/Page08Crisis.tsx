import { useEffect, useMemo, useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { SlotBoard } from '../components/v4/SlotBoard';
import { audioService } from '../services/audioService';
import { fallbackTo, homeAsset, pageAsset, v2Asset, v3Asset } from '../shared/assets';
import { JOB_LABELS, STAGE_META } from '../shared/constants';
import type { JobId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { CRISES, HINT_BY_JOB, JOB_ORDER, cardQualities, ecologyTrials, pairVerdict, type CrisisId } from './page08CrisisModel';
import './page07-08.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const STAGE = STAGE_META[4]!;
/** 연합 작전의 멘토는 탐험단장 — 넷을 한자리에 모은 사람. */
const MENTOR = homeAsset('mentor');
const SAVE_KEY = 'p9Crisis';

function readProgress(value: unknown): { index: number; attempts: number } {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Record<'index' | 'attempts', unknown>>;
  const index = typeof raw.index === 'number' ? Math.max(0, Math.min(CRISES.length - 1, Math.floor(raw.index))) : 0;
  const attempts = typeof raw.attempts === 'number' && raw.attempts >= 0 ? Math.floor(raw.attempts) : 0;
  return { index, attempts };
}
const BADGE_IMAGE: Record<JobId, string> = {
  drone: pageAsset(8, 5),
  care: pageAsset(8, 4),
  ecology: v2Asset('badge-ecology'),
  broadcast: v2Asset('badge-broadcast'),
};
const CRISIS_IMAGE: Record<CrisisId, string> = { fire: pageAsset(8, 9), flock: pageAsset(8, 7), citizens: pageAsset(8, 3) };
const BUBBLE: Record<CrisisId, string> = {
  fire: '불이 어디까지 번졌는지 누가 볼 수 있지?',
  flock: '다친 새를 받아 줄 사람은 누구지?',
  citizens: '소문을 잠재우려면 뭐가 필요하지?',
};

type SlotId = 'a' | 'b';
const SLOTS = [{ id: 'a' as const, label: '힘 1' }, { id: 'b' as const, label: '힘 2' }];
const EMPTY: Record<SlotId, JobId[]> = { a: [], b: [] };

/** 힌트 아이콘 — 직업 이름 대신 "무엇이 필요한지"를 그림으로. */
function HintIcon({ job }: { job: JobId }) {
  const common = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (job) {
    case 'drone': return <svg {...common}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'ecology': return <svg {...common}><path d="M4 20V4M4 20h16" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></svg>;
    case 'care': return <svg {...common}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></svg>;
    case 'broadcast': return <svg {...common}><path d="M3 10v4h3l8 4V6l-8 4H3Z" /><path d="M17 9a4 4 0 0 1 0 6" /></svg>;
  }
}

export default function Page08Crisis({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, addBadge, addJobCard, grantReward, setArtifacts, setPageData } = useGame();
  const alreadyCompleted = save.stageProgress.completedPages.includes(9);
  const cards = useMemo(() => cardQualities(save.artifacts, ecologyTrials(save.pageData)), [save.artifacts, save.pageData]);
  const [stored] = useState(() => readProgress(save.pageData[SAVE_KEY]));
  const [index, setIndex] = useState(stored.index);
  const [placed, setPlaced] = useState<Record<SlotId, JobId[]>>(EMPTY);
  const [attempts, setAttempts] = useState(stored.attempts);
  useEffect(() => { setPageData(SAVE_KEY, { index, attempts }); }, [index, attempts, setPageData]);
  const [ended, setEnded] = useState(alreadyCompleted);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [react, setReact] = useState<string | null>(null);

  const crisis = CRISES[index]!;
  const jobs = [...placed.a, ...placed.b];
  const ready = jobs.length === 2;

  const place = (job: JobId, slot: SlotId | null) => {
    if (flash) return;
    const next: Record<SlotId, JobId[]> = { a: placed.a.filter((j) => j !== job), b: placed.b.filter((j) => j !== job) };
    if (slot) next[slot] = [job];
    setPlaced(next);
    setReact(null);
  };

  const finish = (turns: number) => {
    setEnded(true);
    setArtifacts({ allianceTurns: turns });
    completePage(9);
    addBadge(STAGE.badgeName);
    addJobCard(STAGE.jobTitle);
    grantReward('stage5-alliance');
    logEvent({
      page: 9,
      type: 'alliance-clear',
      summary: `위기 3개를 ${turns}번 출동으로 다 지켰어. 각 위기에 필요한 두 직업의 힘을 짝지었어.`,
      tags: ['직업 협업', '연합 대응', '협업'],
      traits: { collaboration: 2, analysis: 1, execution: 1 },
      contextRef: 'run-1',
    });
    audioService.playSfx('reward');
  };

  const dispatch = () => {
    const turns = attempts + 1;
    setAttempts(turns);
    if (pairVerdict(crisis, jobs) === 'pair') {
      audioService.playSfx('success');
      setFlash('ok');
      window.setTimeout(() => {
        setFlash(null);
        setPlaced(EMPTY);
        if (index + 1 < CRISES.length) setIndex(index + 1);
        else finish(turns);
      }, 900);
    } else {
      audioService.playSfx('warning');
      setFlash('no');
      setReact('이 힌트는 누구 힘이지?');
      window.setTimeout(() => { setFlash(null); setPlaced(EMPTY); }, 500);
    }
  };

  const help = (
    <div className="p9-help">
      <p>위기 카드의 힌트 두 개를 보고, 그 힘을 가진 배지 두 개를 자리에 놓고 <b>출동!</b>을 눌러.</p>
      <ul>{cards.map((card) => <li key={card.job}><img src={BADGE_IMAGE[card.job]} alt="" /><span>{JOB_LABELS[card.job]}</span><small>{card.chip}</small></li>)}</ul>
      <p>끝내면 <b>{STAGE.reward}</b>을 받아.</p>
    </div>
  );

  if (ended) {
    return (
      <StepShell page={9} step={3} steps={3} instruction="푸른솔 숲에 새소리가 돌아왔어" mentor={MENTOR} mentorName="탐험단장" bubble="넷이 함께라서 셋을 다 막았지?" onNavigate={onNavigate} className="page09-alliance"
        next={{ label: '탐험 돌아보기', onClick: () => onNavigate(10) }}>
        <section className="v4-card p9-ending" aria-label="연합 작전 완료">
          <img className="p9-ending__scene" src={v3Asset('scene-reunion')} onError={fallbackTo(homeAsset('parrot-pair'))} alt="숲에 새들이 돌아온 장면" />
          <div className="p9-ending__copy">
            <img src={pageAsset(8, 10)} alt="연합 엠블럼" />
            <strong>혼자였다면 하나도 못 막았어. 넷이 이어 붙어서 셋을 다 지켰어.</strong>
          </div>
        </section>
      </StepShell>
    );
  }

  return (
    <StepShell page={9} step={index + 1} steps={CRISES.length} instruction="힌트에 맞는 힘 두 개를 놓아" mentor={MENTOR} mentorName="탐험단장" bubble={BUBBLE[crisis.id]} help={help} onNavigate={onNavigate} className="page09-alliance"
      status={`위기 ${index + 1} / ${CRISES.length}`}
      next={{ label: '출동!', disabled: !ready || flash !== null, hint: '배지 두 개를 자리에 놓아', onClick: dispatch }}>
      <div className={`v4-card p9-stage${flash === 'no' ? ' v4-shake' : ''}`}>
        <article className={`p9-crisis${flash === 'ok' ? ' is-ok' : ''}`} aria-label={crisis.title}>
          <h3>{crisis.title}</h3>
          <img src={CRISIS_IMAGE[crisis.id]} alt="" />
          <ul className="p9-hints" aria-label="필요한 힘">
            {crisis.needs.map((job) => <li key={job}><HintIcon job={job} />{HINT_BY_JOB[job]}</li>)}
          </ul>
        </article>
        <SlotBoard<JobId, SlotId>
          chips={JOB_ORDER.map((job) => ({ id: job, image: BADGE_IMAGE[job], label: JOB_LABELS[job] }))}
          slots={SLOTS}
          placed={placed}
          onPlace={place}
          chipsLabel="배지"
        />
        {react && <div className="v4-react" role="status">{react}</div>}
      </div>
    </StepShell>
  );
}
