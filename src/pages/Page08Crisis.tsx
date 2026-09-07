import { useEffect, useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { SlotBoard } from '../components/v4/SlotBoard';
import { audioService } from '../services/audioService';
import { fallbackTo, homeAsset, pageAsset, v2Asset, v3Asset, v5Asset } from '../shared/assets';
import { JOB_LABELS, STAGE_META } from '../shared/constants';
import type { JobId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { JOB_BRINGS, JOB_ORDER, MISSIONS, isClean, isRightPair, type MissionId } from './page09AllianceModel';
import './page07-08.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const STAGE = STAGE_META[4]!;
/** 작전의 멘토는 탐험단장 — 넷을 한자리에 모은 사람. */
const MENTOR = homeAsset('mentor');
const SAVE_KEY = 'p9Alliance';

const BADGE_IMAGE: Record<JobId, string> = {
  drone: pageAsset(8, 5),
  care: pageAsset(8, 4),
  ecology: v2Asset('badge-ecology'),
  broadcast: v2Asset('badge-broadcast'),
};
/** 작전 전·후 장면. v6 그림이 없으면 앞 스테이지 사진 위에 색만 얹는다(.p9-scene[data-after]). */
const SCENE: Record<MissionId, { before: string; after: { src: string; fallback: string } }> = {
  trees: { before: v2Asset('photo-logging'), after: { src: v5Asset('scene-edge-trees'), fallback: v2Asset('photo-logging') } },
  water: { before: v2Asset('photo-stream'), after: { src: v5Asset('scene-edge-water'), fallback: v2Asset('photo-stream') } },
  quiet: { before: v2Asset('photo-construction'), after: { src: v5Asset('scene-edge-quiet'), fallback: v2Asset('photo-construction') } },
};

type SlotId = 'a' | 'b';
const SLOTS = [{ id: 'a' as const, label: '힘 1' }, { id: 'b' as const, label: '힘 2' }];
const EMPTY: Record<SlotId, JobId[]> = { a: [], b: [] };

interface Progress { index: number; attempts: number; showing: boolean }
function readProgress(value: unknown): Progress {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Record<keyof Progress, unknown>>;
  const index = typeof raw.index === 'number' ? Math.max(0, Math.min(MISSIONS.length - 1, Math.floor(raw.index))) : 0;
  const attempts = typeof raw.attempts === 'number' && raw.attempts >= 0 ? Math.floor(raw.attempts) : 0;
  return { index, attempts, showing: raw.showing === true };
}

export default function Page08Crisis({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, addBadge, addJobCard, grantReward, setArtifacts, setPageData } = useGame();
  const alreadyCompleted = save.stageProgress.completedPages.includes(9);
  const [stored] = useState(() => readProgress(save.pageData[SAVE_KEY]));
  const [index, setIndex] = useState(stored.index);
  const [attempts, setAttempts] = useState(stored.attempts);
  /** 출동 성공 뒤 "무슨 일이 생겼는지" 보여 주는 화면 */
  const [showing, setShowing] = useState(stored.showing);
  const [placed, setPlaced] = useState<Record<SlotId, JobId[]>>(EMPTY);
  const [ended, setEnded] = useState(alreadyCompleted);
  const [flash, setFlash] = useState<'ok' | 'no' | null>(null);
  const [react, setReact] = useState<string | null>(null);
  useEffect(() => { setPageData(SAVE_KEY, { index, attempts, showing } satisfies Progress); }, [index, attempts, showing, setPageData]);

  const mission = MISSIONS[index]!;
  const jobs = [...placed.a, ...placed.b];
  const ready = jobs.length === 2;

  const place = (job: JobId, slot: SlotId | null) => {
    if (flash) return;
    const next: Record<SlotId, JobId[]> = { a: placed.a.filter((j) => j !== job), b: placed.b.filter((j) => j !== job) };
    if (slot) next[slot] = [job];
    setPlaced(next);
    setReact(null);
  };

  const finish = () => {
    setEnded(true);
    setArtifacts({ allianceTurns: attempts });
    completePage(9);
    addBadge(STAGE.badgeName);
    addJobCard(STAGE.jobTitle);
    grantReward('stage5-alliance');
    logEvent({
      page: 9,
      type: 'alliance-clear',
      summary: `숲 살리기 작전 3개를 ${attempts}번 출동으로 끝냈어. 작전마다 필요한 두 직업이 가져온 것을 짝지었어.`,
      tags: ['직업 협업', '연합 대응', '협업'],
      traits: { collaboration: 2, analysis: 1, execution: 1 },
      contextRef: isClean(attempts) ? 'clean' : 'run-1',
    });
    audioService.playSfx('reward');
  };

  const dispatch = () => {
    setAttempts(attempts + 1);
    if (isRightPair(mission, jobs)) {
      audioService.playSfx('success');
      setFlash('ok');
      window.setTimeout(() => {
        setFlash(null);
        setPlaced(EMPTY);
        setShowing(true);
        audioService.playCue('parrotHappy', 1200);
      }, 700);
    } else {
      audioService.playSfx('warning');
      setFlash('no');
      setReact(mission.wrong);
      window.setTimeout(() => { setFlash(null); setPlaced(EMPTY); }, 500);
    }
  };

  const nextMission = () => {
    audioService.playSfx('tap');
    setShowing(false);
    if (index + 1 < MISSIONS.length) setIndex(index + 1);
    else finish();
  };

  const help = (
    <div className="p9-help">
      <p>작전 카드에 "필요한 것" 두 개가 적혀 있어. 그걸 가져온 직업 배지 두 개를 자리에 놓고 <b>출동!</b>을 눌러.</p>
      <ul>{JOB_ORDER.map((job) => <li key={job}><img src={BADGE_IMAGE[job]} alt="" /><span>{JOB_LABELS[job]}</span><small>{JOB_BRINGS[job]}</small></li>)}</ul>
      <p>끝내면 <b>{STAGE.reward}</b>을 받아. 헛 출동 없이 세 번에 끝내면 최고!</p>
    </div>
  );

  if (ended) {
    return (
      <StepShell page={9} step={3} steps={3} instruction="푸른솔 숲에 새소리가 돌아왔어" mentor={MENTOR} mentorName="탐험단장" bubble="넷이 각자 찾은 걸 합치니까 숲이 살아났지?" onNavigate={onNavigate} className="p9-page"
        next={{ label: '탐험 돌아보기', onClick: () => onNavigate(10) }}>
        <section className="v4-card p9-ending" aria-label="숲 살리기 작전 완료">
          <img className="p9-ending__scene" src={v3Asset('scene-reunion')} onError={fallbackTo(v2Asset('scene-restored'))} alt="새들이 돌아온 푸른솔 숲" />
          <div className="p9-ending__copy" role="status">
            <img src={pageAsset(8, 10)} alt={STAGE.badgeName} />
            <div>
              <strong>{STAGE.badgeName}을 얻었어</strong>
              <p>{isClean(attempts) ? '헛 출동 없이 세 작전을 다 끝냈어! 지구와 젤리도, 숲의 새들도 돌아왔어.' : '나무를 심고, 물길을 트고, 소음을 줄였어. 지구와 젤리도, 숲의 새들도 돌아왔어.'}</p>
            </div>
          </div>
        </section>
      </StepShell>
    );
  }

  if (showing) {
    return (
      <StepShell page={9} step={index + 1} steps={MISSIONS.length} instruction={`${mission.title} 성공!`} mentor={MENTOR} mentorName="탐험단장" bubble={index + 1 < MISSIONS.length ? '둘이 가져온 걸 합치니 풀렸어. 다음 작전!' : '마지막 작전까지 끝났어!'} onNavigate={onNavigate} className="p9-page"
        status={`작전 ${index + 1} / ${MISSIONS.length}`}
        next={{ label: index + 1 < MISSIONS.length ? '다음 작전' : '숲 보러 가기', onClick: nextMission }}>
        <div className="v4-card p9-result" role="status">
          <div className="p9-scene p9-scene--before">
            <img src={SCENE[mission.id].before} alt="작전 전" />
            <span>전</span>
          </div>
          <div className="p9-scene p9-scene--after" data-after={mission.id}>
            <img src={SCENE[mission.id].after.src} onError={fallbackTo(SCENE[mission.id].after.fallback)} alt="작전 후" />
            <span>후</span>
          </div>
          <div className="p9-result__copy">
            <ul className="p9-result__pair">{mission.needs.map((job) => <li key={job}><img src={BADGE_IMAGE[job]} alt="" />{JOB_LABELS[job]}의 {JOB_BRINGS[job]}</li>)}</ul>
            <strong>{mission.result}</strong>
          </div>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell page={9} step={index + 1} steps={MISSIONS.length} instruction="필요한 것을 가져온 직업 둘을 놓아" mentor={MENTOR} mentorName="탐험단장" bubble={mission.bubble} help={help} onNavigate={onNavigate} className="p9-page"
      status={`작전 ${index + 1} / ${MISSIONS.length}`}
      next={{ label: '출동!', disabled: !ready || flash !== null, hint: '배지 두 개를 자리에 놓아', onClick: dispatch }}>
      <div className={`v4-card p9-stage${flash === 'no' ? ' v4-shake' : ''}`}>
        <article className={`p9-mission${flash === 'ok' ? ' is-ok' : ''}`} aria-label={mission.title}>
          <h3>{mission.title}</h3>
          <div className="p9-scene p9-scene--card"><img src={SCENE[mission.id].before} alt="" /></div>
          <p className="p9-problem">{mission.problem}</p>
          <ul className="p9-hints" aria-label="필요한 것">
            {mission.needs.map((job) => <li key={job}>{mission.hints[job]}</li>)}
          </ul>
        </article>
        <SlotBoard<JobId, SlotId>
          chips={JOB_ORDER.map((job) => ({ id: job, image: BADGE_IMAGE[job], label: `${JOB_LABELS[job]} · ${JOB_BRINGS[job]}` }))}
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
