import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { audioService } from '../services/audioService';
import { backgroundFor, fallbackTo, pageAsset, v2Asset, v6Asset, v7Asset, v8Asset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { CauseId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { confirmComparedVariable, restoreComparedVariables } from './ecologyComparisonModel';
import { useEcologyComparisonMedia } from './ecologyComparisonMedia';
import {
  ACTIONS,
  FIELD_TRACES,
  MIN_TRIALS,
  POINTS,
  POINT_STATS,
  VARIABLES,
  applyAction,
  buildGraphs,
  edgeBirds,
  evaluateConclusion,
  fewestTracePoint,
  getAction,
  getTrace,
  normalizeFoundTraces,
  subCause,
  type PointId,
  type Trial,
} from './page07EcologyModel';
import './page07.css';

const META = STAGE_META[2]!;
const MENTOR = pageAsset(7, 1);
const POINT_IMAGE: Record<PointId, string> = { A: v2Asset('trace-stump'), B: pageAsset(6, 7), C: v2Asset('trace-fruit') };
/** 지점 장면: v6 그림이 오면 그걸, 없으면 v2 사진·배경으로. */
const POINT_SCENE: Record<PointId, { src: string; fallback: string }> = {
  A: { src: v2Asset('photo-logging'), fallback: v2Asset('photo-logging') },
  B: { src: v2Asset('photo-stream'), fallback: v2Asset('photo-stream') },
  C: { src: backgroundFor(7), fallback: backgroundFor(7) },
};
const COMPARE_BEFORE = { src: v8Asset('ecology-compare-before'), fallback: v6Asset('ecology-compare-before') };
/** 같은 카메라에서 변수 하나만 바뀐 장면. 전후 슬라이더가 실험 조건을 그대로 보여 준다. */
const ACTION_SCENE: Record<CauseId, { src: string; fallback: string }> = {
  logging: { src: v8Asset('ecology-compare-trees'), fallback: v6Asset('ecology-compare-trees') },
  noise: { src: v8Asset('ecology-compare-quiet'), fallback: v6Asset('ecology-compare-quiet') },
  water: { src: v8Asset('ecology-compare-water'), fallback: v6Asset('ecology-compare-water') },
};
const ACTION_RESULT_COPY: Record<CauseId, string> = {
  logging: '열매와 숨을 곳이 생겼어.',
  noise: '기계가 멈춰 숲이 조용해졌어.',
  water: '마실 물과 목욕할 곳이 생겼어.',
};
const ACTION_ICON: Record<CauseId, { src: string; fallback: string }> = {
  logging: { src: v2Asset('trace-fruit'), fallback: v2Asset('trace-fruit') },
  noise: { src: pageAsset(7, 3), fallback: pageAsset(7, 3) },
  water: { src: pageAsset(6, 7), fallback: pageAsset(6, 7) },
};
const BIRDS = [
  v7Asset('forest-bird-1', 'png'), v7Asset('forest-bird-2', 'png'), v7Asset('forest-bird-3', 'png'),
  v7Asset('forest-bird-4', 'png'), v7Asset('forest-bird-5', 'png'), v7Asset('forest-bird-6', 'png'),
] as const;
const BIRD_FALLBACK = pageAsset(7, 4);
/** 새 아이콘이 앉는 자리(장면 안 %). 새 수만큼 앞에서부터 쓴다. */
const PERCHES: [number, number][] = [[18, 62], [70, 40], [46, 30], [82, 66], [30, 40], [58, 70], [12, 34], [90, 28], [40, 58], [64, 22], [24, 76], [76, 52], [52, 46], [8, 50], [86, 80], [34, 20]];
interface Stored {
  step: 1 | 2 | 3;
  point: PointId;
  found: string[];
  fewest: boolean;
  trials: Trial[];
  active: CauseId | null;
  lastTrial: Trial | null;
  main: CauseId | null;
  conclusionHistory: CauseId[];
  compared: CauseId[];
}

const isCause = (v: unknown): v is CauseId => VARIABLES.some((x) => x.id === v);
const readTrial = (v: unknown): Trial | null => {
  const t = v as Partial<Trial> | null;
  if (!t || typeof t !== 'object' || !isCause(t.variable) || ![t.from, t.to, t.before, t.after].every(Number.isFinite)) return null;
  return { variable: t.variable, from: t.from!, to: t.to!, before: t.before!, after: t.after! };
};

function readStored(value: unknown): Stored {
  const base: Stored = { step: 1, point: 'A', found: [], fewest: false, trials: [], active: null, lastTrial: null, main: null, conclusionHistory: [], compared: [] };
  if (!value || typeof value !== 'object') return base;
  const c = value as Omit<Partial<Stored>, 'step'> & { step?: unknown };
  const step = c.step === 2 ? 2 : c.step === 3 ? 3 : 1;
  // 이전 버전의 7마리 기준 기록도 같은 행동 기록으로 유지한다.
  const trials = Array.isArray(c.trials) ? [...new Map(c.trials.map(readTrial).filter((t): t is Trial => t !== null).map((trial) => [trial.variable, applyAction(trial.variable)])).values()] : [];
  const lastTrial = readTrial(c.lastTrial);
  return {
    step,
    point: POINTS.some((p) => p.id === c.point) ? (c.point as PointId) : 'A',
    found: normalizeFoundTraces(c.found),
    fewest: c.fewest === true || step === 3,
    trials,
    active: isCause(c.active) ? c.active : null,
    lastTrial: lastTrial ? applyAction(lastTrial.variable) : null,
    main: isCause(c.main) ? c.main : null,
    conclusionHistory: Array.isArray(c.conclusionHistory) ? c.conclusionHistory.filter(isCause) : [],
    compared: restoreComparedVariables(trials, lastTrial, c.compared),
  };
}

function ComparisonPictures({ trial, position, confirmed, onReady, onUnavailable, onConfirm }: {
  trial: Trial | null;
  position: number;
  confirmed: boolean;
  onReady: (ready: boolean) => void;
  onUnavailable: (unavailable: boolean) => void;
  onConfirm: () => void;
}) {
  const media = useEcologyComparisonMedia(COMPARE_BEFORE, trial ? ACTION_SCENE[trial.variable] : null);
  useEffect(() => { onReady(media.ready); }, [media.ready, onReady]);
  useEffect(() => { onUnavailable(media.failed); }, [media.failed, onUnavailable]);
  const { key: beforeKey, ...beforeImage } = media.before;
  const afterImage = media.after;
  return <>
    <img key={`before:${beforeKey}`} className="p7-edge__scene" {...beforeImage} alt="행동하기 전: 나무가 적고 기계가 움직이며 개울이 마른 숲 가장자리" />
    {trial && afterImage && <img key={`after:${afterImage.key}`} className="p7-edge__scene p7-edge__scene--after" src={afterImage.src} onLoad={afterImage.onLoad} onError={afterImage.onError} alt={`${getAction(trial.variable).label} 뒤의 숲 가장자리`} style={{ '--compare-position': `${position}%` } as CSSProperties} />}
    {trial && media.failed && <section className="p7-comparison-recovery" aria-label="숫자와 설명으로 비교하기">
      <h3>그림을 불러오지 못했어</h3>
      <p>숫자와 설명을 보고 전과 후를 비교해 봐.</p>
      <dl><div><dt>바꾸기 전</dt><dd>새 <b>{trial.before}</b>마리</dd></div><div><dt>{getAction(trial.variable).label} 뒤</dt><dd>새 <b>{trial.after}</b>마리</dd></div></dl>
      <p className="p7-comparison-recovery__change">{ACTION_RESULT_COPY[trial.variable]}<br />새가 {trial.after - trial.before}마리 늘었어.</p>
      <div className="p7-comparison-recovery__buttons">
        <button type="button" onClick={media.retry}>그림 다시 불러오기</button>
        {!confirmed && <button type="button" className="is-primary" onClick={onConfirm}>숫자를 비교했어</button>}
      </div>
      {confirmed && <p role="status">숫자 비교를 마쳤어.</p>}
    </section>}
    {trial && !media.ready && !media.failed && <p className="p7-comparison-loading" role="status">비교 그림을 불러오는 중…</p>}
  </>;
}

function Birds({ count, className, arrivingFrom }: { count: number; className?: string; arrivingFrom?: number }) {
  return (
    <span className={`p7-birds${className ? ` ${className}` : ''}`} aria-hidden="true">
      {PERCHES.slice(0, Math.min(count, PERCHES.length)).map(([x, y], i) => (
        <img
          key={i}
          className={arrivingFrom !== undefined && i >= arrivingFrom ? 'is-new' : undefined}
          src={BIRDS[i % BIRDS.length]}
          onError={fallbackTo(BIRD_FALLBACK)}
          alt=""
          style={{ left: `${x}%`, top: `${y}%`, '--bird-order': Math.max(0, i - (arrivingFrom ?? i)) } as CSSProperties}
        />
      ))}
    </span>
  );
}

export default function Page07Ecology({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const stored = useMemo(() => readStored(save.pageData.page07Ecology), []);
  // 이전 버전이 인정한 오답은 진행을 회수하지 않고 근거를 다시 살펴볼 기회로 연다.
  const needsConclusionReview = save.stageProgress.completedPages.includes(7) && stored.main !== null && stored.trials.length > 0 && !evaluateConclusion(stored.main, stored.trials).supported;
  const [step, setStep] = useState(stored.step);
  const [point, setPoint] = useState<PointId>(stored.point);
  const [found, setFound] = useState<string[]>(stored.found);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const [fewest, setFewest] = useState(stored.fewest);
  const [trials, setTrials] = useState<Trial[]>(stored.trials);
  const [compared, setCompared] = useState<CauseId[]>(stored.compared);
  const [active, setActive] = useState<CauseId | null>(stored.active);
  const [lastTrial, setLastTrial] = useState<Trial | null>(stored.lastTrial);
  const [main, setMain] = useState<CauseId | null>(stored.main);
  const [conclusionHistory, setConclusionHistory] = useState<CauseId[]>(needsConclusionReview && stored.main && stored.conclusionHistory.length === 0 ? [stored.main] : stored.conclusionHistory);
  const [conclusionFeedback, setConclusionFeedback] = useState(needsConclusionReview ? '예전 결론을 실험값과 다시 비교해 보자. 새가 가장 많이 돌아온 행동을 골라 줘.' : '');
  const [comparePosition, setComparePosition] = useState(stored.lastTrial ? stored.compared.includes(stored.lastTrial.variable) ? 100 : 0 : 50);
  const [animatedBirds, setAnimatedBirds] = useState(stored.lastTrial?.before ?? edgeBirds());
  const [comparisonReady, setComparisonReady] = useState(false);
  const [comparisonUnavailable, setComparisonUnavailable] = useState(false);
  const [isRevealing, setIsRevealing] = useState(Boolean(stored.lastTrial && !stored.compared.includes(stored.lastTrial.variable)));
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(7) && !needsConclusionReview);
  const [react, setReact] = useState<{ text: string; shake?: string } | null>(null);
  const [intro, setIntro] = useState(() => !completed && stored.step === 1 && stored.found.length === 0 && !(save.pageData.page07Intro === true));

  useEffect(() => {
    setPageData('page07Ecology', { step, point, found, fewest, trials, active, lastTrial, main, conclusionHistory, compared } satisfies Stored);
  }, [step, point, found, fewest, trials, active, lastTrial, main, conclusionHistory, compared]);

  useEffect(() => {
    if (save.artifacts.traces.includes('foot-boot')) setArtifacts({ traces: normalizeFoundTraces(save.artifacts.traces) });
  }, [save.artifacts.traces, setArtifacts]);

  useEffect(() => {
    if (!lastTrial) {
      setAnimatedBirds(edgeBirds());
      setIsRevealing(false);
      return;
    }
    if (compared.includes(lastTrial.variable)) {
      setAnimatedBirds(lastTrial.after);
      setIsRevealing(false);
      return;
    }
    if (!comparisonReady) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setComparePosition(100);
      setAnimatedBirds(lastTrial.after);
      setIsRevealing(false);
      setCompared((previous) => confirmComparedVariable(previous, lastTrial.variable));
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const duration = 2400;
    setComparePosition(0);
    setAnimatedBirds(lastTrial.before);
    setIsRevealing(true);

    const animate = (now: number) => {
      const elapsed = Math.min(1, (now - startedAt) / duration);
      const sceneProgress = 1 - Math.pow(1 - elapsed, 3);
      const birdProgress = Math.max(0, Math.min(1, (elapsed - 0.28) / 0.72));
      setComparePosition(Math.round(sceneProgress * 100));
      setAnimatedBirds(lastTrial.before + Math.round((lastTrial.after - lastTrial.before) * birdProgress));
      if (elapsed < 1) frame = window.requestAnimationFrame(animate);
      else {
        setComparePosition(100);
        setAnimatedBirds(lastTrial.after);
        setIsRevealing(false);
        setCompared((previous) => confirmComparedVariable(previous, lastTrial.variable));
      }
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [lastTrial, comparisonReady, compared]);

  const bounce = (text: string, shake?: string) => {
    audioService.playSfx('warning');
    setReact({ text, shake });
    window.setTimeout(() => setReact(null), 1800);
  };

  // ----- 1단계 흔적 -----
  const tapTrace = (id: string) => {
    const trace = getTrace(id);
    if (!trace) return;
    setSelectedTrace(id);
    if (trace.sound) audioService.playCue(trace.sound);
    if (found.includes(id)) { audioService.playSfx('tap'); return; }
    const next = [...found, id];
    setFound(next);
    setArtifacts({ traces: next });
    audioService.playSfx('clue');
  };
  const collectDone = found.length >= FIELD_TRACES.length;

  // ----- 2단계 새가 제일 적은 곳 -----
  const tapPlace = (id: PointId) => {
    if (fewest) return;
    if (id === fewestTracePoint()) {
      setReact(null);
      setFewest(true);
      setPoint(id);
      audioService.playSfx('success');
      logEvent({ page: 7, type: 'chart-pick', summary: `${id} ${POINTS.find((p) => p.id === id)?.title}에 새가 제일 적다는 걸 찾았어.`, tags: ['생태', '비교하기'], traits: { analysis: 1 }, contextRef: `fewest-${id}` });
    } else bounce('새가 제일 적은 곳은 어디야?', id);
  };

  // ----- 3단계 하나씩 바꿔 보기 -----
  const tried = (id: CauseId) => trials.find((t) => t.variable === id);
  const comparedVariables = new Set(trials.map((t) => t.variable));
  const trialsDone = comparedVariables.size >= MIN_TRIALS;
  const comparisonCount = compared.length;
  const comparisonsReady = comparisonCount >= MIN_TRIALS && !isRevealing;
  const confirmNumericComparison = () => {
    if (!lastTrial) return;
    setComparePosition(100);
    setAnimatedBirds(lastTrial.after);
    setCompared((previous) => confirmComparedVariable(previous, lastTrial.variable));
    setIsRevealing(false);
    audioService.playSfx('success');
  };
  const pickAction = (id: CauseId) => {
    if (isRevealing || completed) return;
    if (tried(id)) { bounce('이건 벌써 해 봤어. 다른 걸 골라 볼까?', id); return; }
    setReact(null);
    // 선택만 바꿀 때는 실험하지 않는다. 이전 비교가 끝났으면 같은 기준으로 다음 실험을 준비한다.
    if (lastTrial) {
      setLastTrial(null);
      setComparePosition(50);
      setAnimatedBirds(edgeBirds());
      setComparisonReady(false);
    }
    setActive(id);
    audioService.playSfx('tap');
  };
  const execute = () => {
    if (!active || lastTrial || completed || tried(active)) return;
    const trial = applyAction(active);
    setComparePosition(0);
    setAnimatedBirds(trial.before);
    setComparisonReady(false);
    setIsRevealing(true);
    setTrials([...trials, trial]);
    setLastTrial(trial);
    audioService.playSfx('record');
    if (trial.after - trial.before >= 4) audioService.playCue('forestBirdsong', 1200);
  };
  const resetScene = () => {
    if (isRevealing) return;
    setLastTrial(null);
    setActive(null);
    setComparePosition(50);
    setAnimatedBirds(edgeBirds());
    setComparisonReady(false);
    setIsRevealing(false);
    audioService.playSfx('tap');
  };

  const openConclusion = () => {
    if (!comparisonsReady) return;
    resetScene();
  };

  const finish = () => {
    if (!main || completed || !comparisonsReady || lastTrial) return;
    const history = conclusionHistory.at(-1) === main ? conclusionHistory : [...conclusionHistory, main];
    setConclusionHistory(history);
    const verdict = evaluateConclusion(main, trials);
    if (!verdict.supported) {
      setConclusionFeedback(verdict.complete
        ? `${getAction(main).label} 뒤에는 ${verdict.selectedGain}마리 늘었어. 다른 행동의 늘어난 수와 비교하고 다시 골라 봐.`
        : '세 행동을 같은 조건에서 모두 비교한 뒤 결론을 정해 줘.');
      audioService.playSfx('warning');
      return;
    }
    const sub = subCause(main, trials);
    const evidence = trials.map((trial) => `${getAction(trial.variable).label} ${trial.before}→${trial.after}마리`).join(', ');
    const first = history.find((choice) => choice !== main) ?? save.artifacts.hypothesis;
    if (first && first !== main) {
      logEvent({ page: 7, type: 'ecology-revision', summary: `처음에는 ${getAction(first).label}와 관련된 원인을 생각했지만, ${evidence}를 비교하고 ${getAction(main).label}의 영향이 가장 크다는 결론으로 고쳤어.`, tags: ['근거 비교', '생각 수정'], traits: { analysis: 2 }, contextRef: `revision-${first}-${main}` });
    }
    setArtifacts({ graphs: buildGraphs(main, sub), traces: found });
    logEvent({ page: 7, type: 'ecology-verdict', summary: `이번 숲 가장자리 모의실험: ${evidence}. ${getAction(main).label} 뒤에 가장 많이 늘었어.${save.artifacts.hypothesis === main ? ' 사진에서 세운 처음 가설을 실험 근거로 확인했어.' : ''}`, tags: ['생태', '근거 비교'], traits: { analysis: 2, exploration: 1 }, contextRef: `verdict-${main}-${sub}` });
    completePage(7);
    addBadge(META.badgeName);
    addJobCard(META.jobTitle);
    setCompleted(true);
    audioService.playSfx('reward');
  };

  // ----- 화면 -----
  const before = edgeBirds();
  const shownBirds = lastTrial ? animatedBirds : before;
  const activeAction = active ? getAction(active) : null;
  const stepDone = completed ? { title: `${META.badgeName}를 얻었어`, message: '같은 조건의 실험값으로 결론을 확인했어. 이번 숲의 결과를 시민에게 알리자.', badge: { src: META.badge, alt: META.badgeName } } : undefined;

  const instruction = completed ? '조사 끝!' :
    intro ? '꾸꾸와 앵자 말고, 숲의 다른 새들은?' :
    step === 1 ? '반짝이는 흔적을 눌러 봐' :
    step === 2 ? (fewest ? '숲 가장자리엔 새가 거의 없네' : '새가 제일 적은 곳은?') :
    trialsDone && !lastTrial ? '새를 제일 많이 돌아오게 한 건?' :
    lastTrial ? (isRevealing ? comparisonUnavailable ? '숫자로 전과 후를 비교해 봐' : '숲이 바뀌는 중…' : trialsDone ? '세 가지 비교 완료! 원인을 골라 보자' : '전과 후를 보고, 다음 행동을 골라 봐') :
    !active ? '하나만 골라서 비교해 보자' :
    '그림 안 파란 버튼으로 비교해 봐';

  const bubble = react?.text ?? (
    completed ? '숲의 새가 줄고 있어. 방송국에 알리자!' :
    intro ? '숲에 새소리가 줄었대. 왜 그런지 흔적부터 찾아보자.' :
    step === 1 ? (selectedTrace ? getTrace(selectedTrace)?.note : null) ?? `${found.length}개 찾았어. 지점을 바꿔 볼까?` :
    step === 2 ? (fewest ? '왜 여기만 새가 없을까? 하나씩 바꿔서 알아보자.' : '새가 많이 앉은 곳과 적은 곳을 비교해 봐.') :
    lastTrial ? (isRevealing ? comparisonUnavailable ? "숫자와 설명을 살펴보고,\n'숫자를 비교했어'를 눌러 줘." : '전과 후에 무엇이 달라지는지 살펴봐.' : trialsDone ? '세 가지 결과가 모였어.\n노란 버튼을 눌러 가장 효과가 컸던 행동을 골라 줘.' : `새가 ${lastTrial.after - lastTrial.before}마리 늘었어.\n그림 안 파란 버튼이나 아직 안 해 본 카드를 눌러 봐.`) :
    trialsDone ? '세 가지를 다 해 봤어. 어느 게 새를 제일 많이 불렀지?' :
    active ? '준비됐어! 그림 안 파란 버튼을 눌러 봐.\n다른 조건은 그대로 두고 하나만 바꿀 거야.' : found.includes('tree-cut') ? '잘린 열매나무를 찾았지.\n오른쪽에서 비교할 행동 하나를 골라 줘.' : '오른쪽에서 행동을 고르고,\n그림 안 파란 버튼으로 비교해 보자.'
  );

  const next = completed
    ? { label: '생방송으로', onClick: () => onNavigate(8) }
    : intro
      ? { label: '숲 둘러보기', onClick: () => { setIntro(false); setPageData('page07Intro', true); audioService.playSfx('success'); } }
    : step === 1
      ? { label: '새 세어 보기', disabled: !collectDone, hint: `흔적 ${FIELD_TRACES.length}개를 다 찾으면 켜져요`, onClick: () => { setStep(2); audioService.playSfx('success'); } }
      : step === 2
        ? { label: '왜 그럴까?', disabled: !fewest, hint: '새가 제일 적은 곳을 골라', onClick: () => { setStep(3); audioService.playSfx('success'); } }
        : !comparisonsReady || lastTrial
          ? { label: '원인 고르기', disabled: !comparisonsReady, hint: isRevealing ? comparisonUnavailable ? '숫자 비교를 마치면 이어갈 수 있어' : '변화를 살펴보는 중이야' : `비교 완료 ${comparisonCount}/3 · 3개를 마쳐 줘`, onClick: openConclusion }
          : { label: '결과 확정', disabled: !main, hint: '가장 효과가 컸던 행동을 골라 줘', onClick: finish };

  const help = (
    <ul className="p7-help">
      <li>지점 A·B·C를 돌며 반짝이는 흔적 6개를 눌러. 멘토의 설명을 읽고, 아래 도감에서도 다시 살펴봐.</li>
      <li>그림 속 새를 세어 제일 적은 곳을 찾아.</li>
      <li>행동 카드를 고르고 그림 안 파란 버튼을 눌러. 비교 뒤에는 같은 자리의 파란 버튼이나 아직 안 해 본 카드로 다음 행동을 골라.</li>
      <li>세 가지 비교의 변화가 모두 끝나면 노란 원인 고르기 버튼이 열려.</li>
    </ul>
  );
  const status = step === 1 ? `흔적 ${found.length}/${FIELD_TRACES.length}` :
    step === 3 ? `비교 완료 ${comparisonCount}/${MIN_TRIALS}` : undefined;

  return (
    <StepShell page={7} className="p7-page" step={completed ? 3 : step} steps={3} instruction={instruction} mentor={MENTOR} mentorName="생태연구가" bubble={bubble} status={status} next={{ ...next, disabledMode: step === 3 ? 'lock' : 'hint' }} help={help} done={stepDone} onNavigate={onNavigate}>
      {intro && (
        <div className="v4-card p7-intro">
          <img src={POINT_SCENE.C.src} onError={fallbackTo(POINT_SCENE.C.fallback)} alt="" className="p7-intro__scene" />
          <div className="p7-intro__copy">
            <strong>꾸꾸와 앵자는 돌아왔어. 그런데…</strong>
            <p>푸른솔 숲에 살던 다른 새들은 요즘 잘 안 보인대.<br />새소리도 줄었어.</p>
            <p>생태연구가가 되어 숲 세 곳을 둘러보고,<br />새가 왜 줄었는지 알아보자.</p>
          </div>
        </div>
      )}
      {step === 1 && !intro && (
        <div className="p7-field">
          <div className="p7-tabs" role="tablist" aria-label="지점">
            {POINTS.map((p) => {
              const count = FIELD_TRACES.filter((t) => t.point === p.id && found.includes(t.id)).length;
              return (
                <button key={p.id} type="button" role="tab" aria-selected={point === p.id} className={`p7-tab${point === p.id ? ' is-active' : ''}${count === 2 ? ' is-done' : ''}`} onClick={() => { setPoint(p.id); setSelectedTrace(null); audioService.playSfx('swipe'); }}>
                  <img src={POINT_IMAGE[p.id]} alt="" /><span>{p.id} {p.title}</span><small>{count}/2</small>
                </button>
              );
            })}
          </div>
          <div className="v4-card p7-scene" style={{ backgroundImage: `url(${POINT_SCENE[point].src})` }}>
            {FIELD_TRACES.filter((t) => t.point === point).map((t) => {
              const has = found.includes(t.id);
              return (
                <button key={t.id} type="button" className={`v4-hotspot${has ? ' is-done' : ''}`} style={{ left: `${t.x}%`, top: `${t.y}%` } as CSSProperties} onClick={() => tapTrace(t.id)} aria-label={t.kind === 'sound' ? `${t.title} 듣기` : t.title}>
                  <img src={t.image} alt="" data-trace-kind={t.kind} />
                </button>
              );
            })}
          </div>
          <ul className="p7-stamps" aria-label="흔적 도감">
            {FIELD_TRACES.map((t) => {
              const has = found.includes(t.id);
              return <li key={t.id} className={has ? 'is-found' : ''}>{has ? <button type="button" aria-label={`${t.title} 다시 살펴보기`} aria-pressed={selectedTrace === t.id} onClick={() => tapTrace(t.id)}><img src={t.image} alt="" data-trace-kind={t.kind} /><span>{t.title}</span></button> : <span>?</span>}</li>;
            })}
          </ul>
        </div>
      )}

      {step === 2 && (
        <div className="v4-card p7-places" role="group" aria-label="지점별 새">
          {POINTS.map((p) => {
            const birds = POINT_STATS[p.id].birdCount;
            const picked = fewest && p.id === fewestTracePoint();
            return (
              <button key={p.id} type="button" className={`p7-place${picked ? ' is-picked' : ''}${fewest && !picked ? ' is-dim' : ''}${react?.shake === p.id ? ' v4-shake' : ''}`} aria-pressed={picked} disabled={fewest} onClick={() => tapPlace(p.id)} aria-label={`${p.id} ${p.title} 새 ${birds}마리`}>
                <span className="p7-place__scene">
                  <img src={POINT_SCENE[p.id].src} onError={fallbackTo(POINT_SCENE[p.id].fallback)} alt="" />
                  <Birds count={birds} />
                </span>
                <strong>{p.id} {p.title}</strong>
                <em><img src={BIRDS[POINTS.indexOf(p) % BIRDS.length]} onError={fallbackTo(BIRD_FALLBACK)} alt="" />새 {birds}마리</em>
              </button>
            );
          })}
        </div>
      )}

      {step === 3 && (
        <div className="v4-card p7-lab">
          <div className={`p7-edge${lastTrial ? ' has-comparison' : ''}`} aria-live="polite">
            <ComparisonPictures key={lastTrial?.variable ?? 'before'} trial={lastTrial} position={comparePosition} confirmed={Boolean(lastTrial && compared.includes(lastTrial.variable))} onReady={setComparisonReady} onUnavailable={setComparisonUnavailable} onConfirm={confirmNumericComparison} />
            {lastTrial && (
              <>
                <span className="p7-edge__before-label">바꾸기 전</span>
                <span className="p7-edge__after-label">바꾼 뒤</span>
                <span className="p7-edge__divider" style={{ left: `${comparePosition}%` }} aria-hidden="true" />
                <span className="p7-edge__handle" style={{ left: `clamp(24px, ${comparePosition}%, calc(100% - 24px))` }} aria-hidden="true">↔</span>
                <input
                  className="p7-edge__range"
                  type="range"
                  min={0}
                  max={100}
                  value={comparePosition}
                  disabled={isRevealing || !comparisonReady}
                  aria-label="숲 변화 전후 비교 막대"
                  aria-valuetext={`복원 후 장면 ${comparePosition}% 보기`}
                  onChange={(event) => setComparePosition(Number(event.target.value))}
                />
              </>
            )}
            <Birds count={shownBirds} className={lastTrial ? 'is-arriving' : ''} arrivingFrom={lastTrial?.before} />
            {lastTrial && (
              <span className={`p7-edge__phase${isRevealing ? ' is-running' : ' is-done'}`} role="status">
                <i aria-hidden="true" />
                {isRevealing ? `서식지 회복 중 · 새 ${shownBirds}마리` : ACTION_RESULT_COPY[lastTrial.variable]}
              </span>
            )}
            <span className="p7-edge__count">
              <img src={BIRDS[0]} onError={fallbackTo(BIRD_FALLBACK)} alt="" />
              {lastTrial ? <><s>{lastTrial.before}</s> → <b>{shownBirds}</b>마리</> : <><b>{before}</b>마리</>}
            </span>
            {lastTrial
              ? isRevealing
                ? <span className="p7-edge__tag">비교하는 중…</span>
                : trialsDone
                  ? <span className="p7-edge__tag p7-edge__tag--complete">✓ 세 가지 비교 완료</span>
                  : <button type="button" className="p7-edge__tag p7-edge__tag--button" onClick={resetScene}>다음 행동 고르기 <span aria-hidden="true">→</span></button>
              : activeAction
                ? <button type="button" className="p7-edge__tag p7-edge__tag--button" onClick={execute}><span aria-hidden="true">▶</span> {activeAction.label} 해 보기</button>
                : !trialsDone && <span className="p7-edge__tag p7-edge__tag--guide">오른쪽에서 행동을 골라 줘 →</span>
            }
          </div>

          <div className="p7-side">
            <p className="p7-evidence-note"><strong>① 행동 고르기 → ② 그림에서 비교하기</strong>매번 새 {edgeBirds()}마리, 같은 조건에서 시작해.</p>
            {!trialsDone || lastTrial ? (
              <>
                <div className="p7-actions" role="group" aria-label="행동 카드">
                  {ACTIONS.map((action) => {
                    const done = tried(action.id);
                    const isActive = active === action.id;
                    return (
                      <button key={action.id} type="button" disabled={isRevealing || Boolean(done)} className={`p7-action${isActive ? ' is-active' : ''}${done && !(isRevealing && isActive) ? ' is-done' : ''}${isRevealing && isActive ? ' is-running' : ''}${react?.shake === action.id ? ' v4-shake' : ''}`} aria-pressed={isActive} onClick={() => pickAction(action.id)} aria-label={`${action.label}${done ? isRevealing && isActive ? ' 비교 중' : ` 해 봄, 새 ${done.after}마리` : ''}`}>
                        <img src={ACTION_ICON[action.id].src} onError={fallbackTo(ACTION_ICON[action.id].fallback)} alt="" />
                        <span>{action.label}</span>
                        <small>{done
                          ? isRevealing && lastTrial?.variable === action.id
                            ? '비교 중'
                            : <>✓ {done.after}마리</>
                          : isActive ? '선택' : '해 보기'}</small>
                      </button>
                    );
                  })}
                </div>
                {lastTrial ? (
                  <div className={`p7-result${isRevealing ? ' is-running' : ''}`} role="status">
                    <strong>{isRevealing && !comparisonUnavailable ? `새가 돌아오는 중 · ${shownBirds}마리` : `새 ${lastTrial.before}마리 → ${lastTrial.after}마리`}</strong>
                    <span>{isRevealing ? comparisonUnavailable ? '왼쪽 숫자와 설명으로 비교할 수 있어.' : '바꾸기 전과 바꾼 뒤를 관찰해 봐.' : trialsDone ? '세 가지를 다 봤어! 노란 버튼으로 원인을 골라 줘.' : '비교 막대를 움직여 보고, 다음 행동을 골라 줘.'}</span>
                  </div>
                ) : (
                  <div className="p7-compare-prompt" role="status">
                    {activeAction ? <><strong>← 그림 안 파란 버튼</strong><span>{activeAction.label} 전과 후를 비교해 보자.</span></> : <span>위에서 아직 안 해 본 행동을 골라.</span>}
                  </div>
                )}
              </>
            ) : (
              <div className="p7-verdict" role="group" aria-label="가장 큰 원인">
                {save.artifacts.hypothesis && <p className="p7-evidence-note">처음 가설: {VARIABLES.find((variable) => variable.id === save.artifacts.hypothesis)?.label} 때문. 실험 뒤에도 같은 생각이야?</p>}
                {ACTIONS.map((action) => {
                  const done = tried(action.id)!;
                  const isMain = main === action.id;
                  return (
                    <button key={action.id} type="button" className={`p7-action p7-action--verdict${isMain ? ' is-active' : ''}`} aria-pressed={isMain} onClick={() => { if (!completed) { setMain(action.id); setConclusionFeedback(''); audioService.playSfx('tap'); } }} aria-label={`${action.label} 새 ${done.after}마리`}>
                      <img src={ACTION_ICON[action.id].src} onError={fallbackTo(ACTION_ICON[action.id].fallback)} alt="" />
                      <span>{action.label}</span>
                      <Birds count={done.after} className="p7-birds--row" />
                      <small><b>{done.after}</b>마리</small>
                    </button>
                  );
                })}
                {conclusionFeedback && <p className="p7-conclusion-feedback" role="status">{conclusionFeedback}</p>}
              </div>
            )}
          </div>
        </div>
      )}
      {react && <span className="v4-react" role="status">{react.text}</span>}
    </StepShell>
  );
}
