import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { audioService } from '../services/audioService';
import { backgroundFor, fallbackTo, pageAsset, v2Asset, v5Asset, v6Asset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { CauseId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  ACTIONS,
  FIELD_TRACES,
  MIN_TRIALS,
  POINTS,
  POINT_STATS,
  VARIABLES,
  actualDirection,
  applyAction,
  buildGraphs,
  edgeBirds,
  fewestTracePoint,
  getAction,
  getTrace,
  subCause,
  type PointId,
  type Prediction,
  type Trial,
} from './page07EcologyModel';
import './page07.css';

const META = STAGE_META[2]!;
const MENTOR = pageAsset(7, 1);
const POINT_IMAGE: Record<PointId, string> = { A: v2Asset('trace-stump'), B: pageAsset(6, 7), C: v2Asset('trace-fruit') };
/** 지점 장면: v6 그림이 오면 그걸, 없으면 v2 사진·배경으로. */
const POINT_SCENE: Record<PointId, { src: string; fallback: string }> = {
  A: { src: v5Asset('scene-edge-before'), fallback: v2Asset('photo-logging') },
  B: { src: v5Asset('scene-stream'), fallback: v2Asset('photo-stream') },
  C: { src: v5Asset('scene-deep'), fallback: backgroundFor(7) },
};
const COMPARE_BEFORE = v6Asset('ecology-compare-before');
/** 같은 카메라에서 변수 하나만 바뀐 장면. 전후 슬라이더가 실험 조건을 그대로 보여 준다. */
const ACTION_SCENE: Record<CauseId, string> = {
  logging: v6Asset('ecology-compare-trees'),
  noise: v6Asset('ecology-compare-quiet'),
  water: v6Asset('ecology-compare-water'),
};
const ACTION_ICON: Record<CauseId, { src: string; fallback: string }> = {
  logging: { src: v5Asset('act-plant-tree', 'png'), fallback: v2Asset('trace-fruit') },
  noise: { src: v5Asset('act-quiet', 'png'), fallback: pageAsset(7, 3) },
  water: { src: v5Asset('act-fill-water', 'png'), fallback: pageAsset(6, 7) },
};
const BIRDS = [
  v6Asset('forest-bird-1', 'png'), v6Asset('forest-bird-2', 'png'), v6Asset('forest-bird-3', 'png'),
  v6Asset('forest-bird-4', 'png'), v6Asset('forest-bird-5', 'png'), v6Asset('forest-bird-6', 'png'),
] as const;
const BIRD_FALLBACK = pageAsset(7, 4);
/** 새 아이콘이 앉는 자리(장면 안 %). 새 수만큼 앞에서부터 쓴다. */
const PERCHES: [number, number][] = [[18, 62], [70, 40], [46, 30], [82, 66], [30, 40], [58, 70], [12, 34], [90, 28], [40, 58], [64, 22], [24, 76], [76, 52], [52, 46], [8, 50], [86, 80], [34, 20]];
const GUESSES: { id: Prediction; label: string }[] = [
  { id: 'up', label: '새가 돌아올 거야' },
  { id: 'same', label: '그대로일 거야' },
];

interface Stored {
  step: 1 | 2 | 3;
  point: PointId;
  found: string[];
  fewest: boolean;
  trials: Trial[];
  active: CauseId | null;
  prediction: Prediction | null;
  lastTrial: Trial | null;
  main: CauseId | null;
}

const isCause = (v: unknown): v is CauseId => VARIABLES.some((x) => x.id === v);
const isPrediction = (v: unknown): v is Prediction => v === 'up' || v === 'down' || v === 'same';
const isTrial = (v: unknown): v is Trial => {
  const t = v as Partial<Trial> | null;
  return Boolean(t) && typeof t === 'object' && isCause(t!.variable) && isPrediction(t!.prediction) && [t!.from, t!.to, t!.before, t!.after].every(Number.isFinite);
};

function readStored(value: unknown): Stored {
  const base: Stored = { step: 1, point: 'A', found: [], fewest: false, trials: [], active: null, prediction: null, lastTrial: null, main: null };
  if (!value || typeof value !== 'object') return base;
  const c = value as Omit<Partial<Stored>, 'step'> & { step?: unknown };
  const step = c.step === 2 ? 2 : c.step === 3 ? 3 : 1;
  const trials = Array.isArray(c.trials) ? c.trials.filter(isTrial).filter((t) => t.before === edgeBirds()) : [];
  return {
    step,
    point: POINTS.some((p) => p.id === c.point) ? (c.point as PointId) : 'A',
    found: Array.isArray(c.found) ? c.found.filter((id): id is string => typeof id === 'string' && FIELD_TRACES.some((t) => t.id === id)) : [],
    fewest: c.fewest === true || step === 3,
    trials,
    active: isCause(c.active) ? c.active : null,
    prediction: isPrediction(c.prediction) ? c.prediction : null,
    lastTrial: isTrial(c.lastTrial) ? c.lastTrial : null,
    main: isCause(c.main) ? c.main : null,
  };
}

function Birds({ count, className }: { count: number; className?: string }) {
  return (
    <span className={`p7-birds${className ? ` ${className}` : ''}`} aria-hidden="true">
      {PERCHES.slice(0, Math.min(count, PERCHES.length)).map(([x, y], i) => (
        <img key={i} src={BIRDS[i % BIRDS.length]} onError={fallbackTo(BIRD_FALLBACK)} alt="" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${(i % 5) * 0.3}s` } as CSSProperties} />
      ))}
    </span>
  );
}

export default function Page07Ecology({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const stored = useMemo(() => readStored(save.pageData.page07Ecology), []);
  const [step, setStep] = useState(stored.step);
  const [point, setPoint] = useState<PointId>(stored.point);
  const [found, setFound] = useState<string[]>(stored.found);
  const [fewest, setFewest] = useState(stored.fewest);
  const [trials, setTrials] = useState<Trial[]>(stored.trials);
  const [active, setActive] = useState<CauseId | null>(stored.active);
  const [prediction, setPrediction] = useState<Prediction | null>(stored.prediction);
  const [lastTrial, setLastTrial] = useState<Trial | null>(stored.lastTrial);
  const [main, setMain] = useState<CauseId | null>(stored.main);
  const [comparePosition, setComparePosition] = useState(50);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(7));
  const [react, setReact] = useState<{ text: string; shake?: string } | null>(null);
  const [intro, setIntro] = useState(() => !completed && stored.step === 1 && stored.found.length === 0 && !(save.pageData.page07Intro === true));

  useEffect(() => {
    setPageData('page07Ecology', { step, point, found, fewest, trials, active, prediction, lastTrial, main } satisfies Stored);
  }, [step, point, found, fewest, trials, active, prediction, lastTrial, main]);

  const bounce = (text: string, shake?: string) => {
    audioService.playSfx('warning');
    setReact({ text, shake });
    window.setTimeout(() => setReact(null), 1800);
  };

  // ----- 1단계 흔적 -----
  const tapTrace = (id: string) => {
    const trace = getTrace(id);
    if (!trace) return;
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
      setFewest(true);
      setPoint(id);
      audioService.playSfx('success');
      logEvent({ page: 7, type: 'chart-pick', summary: `${id} ${POINTS.find((p) => p.id === id)?.title}에 새가 제일 적다는 걸 찾았어.`, tags: ['생태', '비교하기'], traits: { analysis: 1 }, contextRef: `fewest-${id}` });
    } else bounce('새가 제일 적은 곳은 어디야?', id);
  };

  // ----- 3단계 하나씩 바꿔 보기 -----
  const tried = (id: CauseId) => trials.find((t) => t.variable === id);
  const trialsDone = new Set(trials.map((t) => t.variable)).size >= MIN_TRIALS;
  const pickAction = (id: CauseId) => {
    if (lastTrial || completed) return;
    if (tried(id)) { bounce('이건 벌써 해 봤어. 다른 걸 골라 볼까?', id); return; }
    if (active && active !== id) { bounce('한 번에 하나만! 먼저 고른 걸 해 보자.', id); return; }
    setActive(id);
    audioService.playSfx('tap');
  };
  const execute = () => {
    if (!active || !prediction) return;
    const trial = applyAction(active, prediction);
    setComparePosition(50);
    setTrials([...trials, trial]);
    setLastTrial(trial);
    audioService.playSfx(actualDirection(trial.before, trial.after) === prediction ? 'success' : 'record');
    if (trial.after - trial.before >= 4) audioService.playCue('parrotHappy', 1200);
  };
  const resetScene = () => {
    setLastTrial(null);
    setActive(null);
    setPrediction(null);
    audioService.playSfx('tap');
  };

  const finish = () => {
    if (!main) return;
    const sub = subCause(main, trials);
    setArtifacts({ graphs: buildGraphs(main, sub), traces: found });
    logEvent({ page: 7, type: 'ecology-verdict', summary: `숲 가장자리에 새가 돌아오게 한 가장 큰 일: ${getAction(main).label}. 실험 ${trials.length}회.`, tags: ['생태', '변인 통제'], traits: { analysis: 2, exploration: 1 }, contextRef: `verdict-${main}-${sub}` });
    completePage(7);
    addBadge(META.badgeName);
    addJobCard(META.jobTitle);
    setCompleted(true);
    audioService.playSfx('reward');
  };

  // ----- 화면 -----
  const before = edgeBirds();
  const shownBirds = lastTrial ? lastTrial.after : before;
  const activeAction = active ? getAction(active) : null;
  const matched = lastTrial ? actualDirection(lastTrial.before, lastTrial.after) === lastTrial.prediction : false;
  const stepDone = completed ? { title: `${META.badgeName}를 얻었어`, message: '나무가 사라져서 새가 줄었어. 시민에게 알려야 해.', badge: { src: META.badge, alt: META.badgeName } } : undefined;

  const instruction = completed ? '조사 끝!' :
    intro ? '지구와 젤리 말고, 숲의 다른 새들은?' :
    step === 1 ? '반짝이는 흔적을 눌러 봐' :
    step === 2 ? (fewest ? '숲 가장자리엔 새가 거의 없네' : '새가 제일 적은 곳은?') :
    trialsDone && !lastTrial ? '새를 제일 많이 돌아오게 한 건?' :
    lastTrial ? (matched ? '예측대로야!' : '예측이랑 달랐네') :
    !active ? '하나만 골라서 해 보자' :
    !prediction ? activeAction!.ask : '해 보기를 눌러';

  const bubble = react?.text ?? (
    completed ? '숲의 새가 줄고 있어. 방송국에 알리자!' :
    intro ? '숲에 새소리가 줄었대. 왜 그런지 흔적부터 찾아보자.' :
    step === 1 ? `${found.length}개 찾았어. 지점을 바꿔 볼까?` :
    step === 2 ? (fewest ? '왜 여기만 새가 없을까? 하나씩 바꿔서 알아보자.' : '새가 많이 앉은 곳과 적은 곳을 비교해 봐.') :
    lastTrial ? (lastTrial.after - lastTrial.before >= 4 ? `새가 ${lastTrial.after - lastTrial.before}마리나 돌아왔어!` : '새가 별로 안 돌아오네. 이건 큰 이유가 아닌가 봐.') :
    trialsDone ? '세 가지를 다 해 봤어. 어느 게 새를 제일 많이 불렀지?' :
    active ? '다른 건 그대로 두고 이것만 바꿔 볼게.' : '한 번에 하나만 바꿔야 뭐 때문인지 알 수 있어.'
  );

  const next = completed
    ? { label: '생방송으로', onClick: () => onNavigate(8) }
    : intro
      ? { label: '숲 둘러보기', onClick: () => { setIntro(false); setPageData('page07Intro', true); audioService.playSfx('success'); } }
    : step === 1
      ? { label: '새 세어 보기', disabled: !collectDone, hint: `흔적 ${FIELD_TRACES.length}개를 다 찾으면 켜져요`, onClick: () => { setStep(2); audioService.playSfx('success'); } }
      : step === 2
        ? { label: '왜 그럴까?', disabled: !fewest, hint: '새가 제일 적은 곳을 골라', onClick: () => { setStep(3); audioService.playSfx('success'); } }
        : lastTrial
          ? { label: trialsDone ? '원인 고르기' : '원래대로', onClick: resetScene }
          : trialsDone
            ? { label: '결과 확정', disabled: !main, hint: '카드 하나를 골라', onClick: finish }
            : { label: '해 보기!', disabled: !(active && prediction), hint: !active ? '행동 카드 하나를 골라' : '새가 어떻게 될지 골라', onClick: execute };

  const help = (
    <ul className="p7-help">
      <li>1 지점 A·B·C를 돌며 반짝이는 흔적 6개를 눌러.</li>
      <li>2 그림 속 새를 세어 제일 적은 곳을 찾아.</li>
      <li>3 행동 카드를 하나만 골라 해 보고, 새가 돌아오는지 봐. 세 가지를 다 해 보면 원인을 고를 수 있어.</li>
    </ul>
  );
  const status = step === 1 ? `흔적 ${found.length}/${FIELD_TRACES.length}` :
    step === 3 ? `해 본 것 ${new Set(trials.map((t) => t.variable)).size}/${MIN_TRIALS}` : undefined;

  return (
    <StepShell page={7} step={completed ? 3 : step} steps={3} instruction={instruction} mentor={MENTOR} mentorName="생태 멘토" bubble={bubble} status={status} next={next} help={help} done={stepDone} onNavigate={onNavigate}>
      {intro && (
        <div className="v4-card p7-intro">
          <img src={POINT_SCENE.C.src} onError={fallbackTo(POINT_SCENE.C.fallback)} alt="" className="p7-intro__scene" />
          <div className="p7-intro__copy">
            <strong>지구와 젤리는 돌아왔어. 그런데…</strong>
            <p>푸른솔 숲에 살던 다른 새들은 요즘 잘 안 보인대. 새소리도 줄었어.</p>
            <p>생태연구가가 되어 숲 세 곳을 둘러보고, 새가 왜 줄었는지 알아보자.</p>
          </div>
        </div>
      )}
      {step === 1 && !intro && (
        <div className="p7-field">
          <div className="p7-tabs" role="tablist" aria-label="지점">
            {POINTS.map((p) => {
              const count = FIELD_TRACES.filter((t) => t.point === p.id && found.includes(t.id)).length;
              return (
                <button key={p.id} type="button" role="tab" aria-selected={point === p.id} className={`p7-tab${point === p.id ? ' is-active' : ''}${count === 2 ? ' is-done' : ''}`} onClick={() => { setPoint(p.id); audioService.playSfx('swipe'); }}>
                  <img src={POINT_IMAGE[p.id]} alt="" /><span>{p.id} {p.title}</span><small>{count}/2</small>
                </button>
              );
            })}
          </div>
          <div className="v4-card p7-scene" style={{ backgroundImage: `url(${backgroundFor(7)})` }}>
            {FIELD_TRACES.filter((t) => t.point === point).map((t) => {
              const has = found.includes(t.id);
              return (
                <button key={t.id} type="button" className={`v4-hotspot${has ? ' is-done' : ''}`} style={{ left: `${t.x}%`, top: `${t.y}%` } as CSSProperties} onClick={() => tapTrace(t.id)} aria-label={t.kind === 'sound' ? `${t.title} 듣기` : t.title}>
                  <img src={t.image} alt="" className={t.tint ? `tint-${t.tint}` : ''} />
                </button>
              );
            })}
          </div>
          <ul className="p7-stamps" aria-label="흔적 도감">
            {FIELD_TRACES.map((t) => {
              const has = found.includes(t.id);
              return <li key={t.id} className={has ? 'is-found' : ''}>{has ? <><img src={t.image} alt="" className={t.tint ? `tint-${t.tint}` : ''} /><span>{t.title}</span></> : <span>?</span>}</li>;
            })}
          </ul>
        </div>
      )}

      {step === 2 && (
        <div className="v4-card p7-places" role="group" aria-label="지점별 새">
          {POINTS.map((p) => {
            const birds = POINT_STATS[p.id].traces;
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
            <img className="p7-edge__scene" src={COMPARE_BEFORE} alt="행동하기 전: 나무가 적고 기계가 움직이며 개울이 마른 숲 가장자리" />
            {lastTrial && (
              <>
                <img
                  key={lastTrial.variable}
                  className="p7-edge__scene p7-edge__scene--after"
                  src={ACTION_SCENE[lastTrial.variable]}
                  alt={`${getAction(lastTrial.variable).label} 뒤의 숲 가장자리`}
                  style={{ '--compare-position': `${comparePosition}%` } as CSSProperties}
                />
                <span className="p7-edge__before-label">전</span>
                <span className="p7-edge__after-label">후</span>
                <span className="p7-edge__divider" style={{ left: `${comparePosition}%` }} aria-hidden="true"><b>↔</b></span>
                <input
                  className="p7-edge__range"
                  type="range"
                  min={0}
                  max={100}
                  value={comparePosition}
                  aria-label="숲 변화 전후 비교 막대"
                  aria-valuetext={`복원 후 장면 ${comparePosition}% 보기`}
                  onChange={(event) => setComparePosition(Number(event.target.value))}
                />
              </>
            )}
            <Birds count={shownBirds} className={lastTrial ? 'is-arriving' : ''} />
            <span className="p7-edge__count">
              <img src={BIRDS[0]} onError={fallbackTo(BIRD_FALLBACK)} alt="" />
              {lastTrial ? <><s>{lastTrial.before}</s> → <b>{lastTrial.after}</b>마리</> : <><b>{before}</b>마리</>}
            </span>
            {activeAction && <span className="p7-edge__tag">{activeAction.label}{lastTrial ? ' 했더니' : ' 해 보기'}</span>}
          </div>

          <div className="p7-side">
            {!trialsDone || lastTrial ? (
              <>
                <div className="p7-actions" role="group" aria-label="행동 카드">
                  {ACTIONS.map((action) => {
                    const done = tried(action.id);
                    const isActive = active === action.id;
                    return (
                      <button key={action.id} type="button" className={`p7-action${isActive ? ' is-active' : ''}${done ? ' is-done' : ''}${active && !isActive ? ' is-dim' : ''}${react?.shake === action.id ? ' v4-shake' : ''}`} aria-pressed={isActive} onClick={() => pickAction(action.id)} aria-label={`${action.label}${done ? ` 해 봄, 새 ${done.after}마리` : ''}`}>
                        <img src={ACTION_ICON[action.id].src} onError={fallbackTo(ACTION_ICON[action.id].fallback)} alt="" />
                        <span>{action.label}</span>
                        {done && <small><img src={BIRDS[ACTIONS.indexOf(action) % BIRDS.length]} onError={fallbackTo(BIRD_FALLBACK)} alt="" />{done.after}마리</small>}
                      </button>
                    );
                  })}
                </div>
                {lastTrial ? (
                  <div className={`p7-result${matched ? ' is-match' : ' is-miss'}`} role="status">
                    <strong>새 {lastTrial.before}마리 → {lastTrial.after}마리</strong>
                    <span>{matched ? '예측이 맞았어!' : '예측이랑 달랐네. 그림에서 뭐가 달라졌는지 봐.'}</span>
                  </div>
                ) : (
                  <div className="p7-predict v4-big-buttons" role="group" aria-label="예측">
                    {GUESSES.map((g) => <button key={g.id} type="button" className={`v4-big-button${prediction === g.id ? ' is-selected' : ''}`} aria-pressed={prediction === g.id} disabled={!active} onClick={() => { setPrediction(g.id); audioService.playSfx('tap'); }}>{g.label}</button>)}
                  </div>
                )}
              </>
            ) : (
              <div className="p7-verdict" role="group" aria-label="가장 큰 원인">
                {ACTIONS.map((action) => {
                  const done = tried(action.id)!;
                  const isMain = main === action.id;
                  return (
                    <button key={action.id} type="button" className={`p7-action p7-action--verdict${isMain ? ' is-active' : ''}`} aria-pressed={isMain} onClick={() => { if (!completed) { setMain(action.id); audioService.playSfx('tap'); } }} aria-label={`${action.label} 새 ${done.after}마리`}>
                      <img src={ACTION_ICON[action.id].src} onError={fallbackTo(ACTION_ICON[action.id].fallback)} alt="" />
                      <span>{action.label}</span>
                      <Birds count={done.after} className="p7-birds--row" />
                      <small><b>{done.after}</b>마리</small>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {react && <span className="v4-react" role="status">{react.text}</span>}
    </StepShell>
  );
}
