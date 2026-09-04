import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { PictureChoice } from '../components/v4/PictureChoice';
import { SoundIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { backgroundFor, pageAsset, v2Asset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { CauseId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  BASE_LEVELS,
  FIELD_TRACES,
  LEVEL_MAX,
  MIN_TRIALS,
  POINTS,
  POINT_STATS,
  PREDICTIONS,
  VARIABLES,
  VARIABLE_LABEL,
  actualDirection,
  buildGraphs,
  changeLevel,
  createExperiment,
  fewestTracePoint,
  getTrace,
  population,
  runTrial,
  subCause,
  type ExperimentState,
  type Levels,
  type PointId,
  type Prediction,
  type Trial,
} from './page07EcologyModel';
import './page07.css';

const META = STAGE_META[2]!;
const MENTOR = pageAsset(7, 1);
const POINT_IMAGE: Record<PointId, string> = { A: v2Asset('trace-stump'), B: pageAsset(6, 7), C: v2Asset('trace-fruit') };
const CAUSE_IMAGE: Record<CauseId, string> = { logging: v2Asset('trace-fruit'), noise: pageAsset(7, 3), water: pageAsset(6, 7) };
const BIRD = pageAsset(7, 4);
/** 지점 A 에서 제일 큰 값: 소음(9) 하나만 정답. */
const OUTLIER: CauseId = 'noise';

interface Stored {
  step: 1 | 2 | 3;
  point: PointId;
  found: string[];
  fewest: boolean;
  outlier: CauseId | null;
  exp: ExperimentState;
  trials: Trial[];
  prediction: Prediction | null;
  lastTrial: Trial | null;
  main: CauseId | null;
}

const isCause = (v: unknown): v is CauseId => VARIABLES.some((x) => x.id === v);
const isPrediction = (v: unknown): v is Prediction => PREDICTIONS.some((p) => p.id === v);
const isLevels = (v: unknown): v is Levels => Boolean(v) && typeof v === 'object' && VARIABLES.every(({ id }) => Number.isFinite((v as Record<string, unknown>)[id]));
const isTrial = (v: unknown): v is Trial => {
  const t = v as Partial<Trial> | null;
  return Boolean(t) && typeof t === 'object' && isCause(t!.variable) && isPrediction(t!.prediction) && [t!.from, t!.to, t!.before, t!.after].every(Number.isFinite);
};

function readStored(value: unknown): Stored {
  const base: Stored = { step: 1, point: 'A', found: [], fewest: false, outlier: null, exp: createExperiment(), trials: [], prediction: null, lastTrial: null, main: null };
  if (!value || typeof value !== 'object') return base;
  const c = value as Omit<Partial<Stored>, 'step'> & { step?: unknown };
  // 예전 저장(step: 'collect' | 'tablet' | 'experiment')도 받아 준다
  const step = c.step === 'tablet' || c.step === 2 ? 2 : c.step === 'experiment' || c.step === 3 ? 3 : 1;
  return {
    step,
    point: POINTS.some((p) => p.id === c.point) ? (c.point as PointId) : 'A',
    found: Array.isArray(c.found) ? c.found.filter((id): id is string => typeof id === 'string' && FIELD_TRACES.some((t) => t.id === id)) : [],
    fewest: c.fewest === true || step === 3,
    outlier: isCause(c.outlier) ? c.outlier : step === 3 ? 'noise' : null,
    exp: c.exp && isLevels(c.exp.levels) ? { baseline: BASE_LEVELS, levels: c.exp.levels, active: isCause(c.exp.active) ? c.exp.active : null } : base.exp,
    trials: Array.isArray(c.trials) ? c.trials.filter(isTrial) : [],
    prediction: isPrediction(c.prediction) ? c.prediction : null,
    lastTrial: isTrial(c.lastTrial) ? c.lastTrial : null,
    main: isCause(c.main) ? c.main : null,
  };
}

export default function Page07Ecology({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const stored = useMemo(() => readStored(save.pageData.page07Ecology), []);
  const [step, setStep] = useState(stored.step);
  const [point, setPoint] = useState<PointId>(stored.point);
  const [found, setFound] = useState<string[]>(stored.found);
  const [fewest, setFewest] = useState(stored.fewest);
  const [outlier, setOutlier] = useState<CauseId | null>(stored.outlier);
  const [exp, setExp] = useState<ExperimentState>(stored.exp);
  const [trials, setTrials] = useState<Trial[]>(stored.trials);
  const [prediction, setPrediction] = useState<Prediction | null>(stored.prediction);
  const [lastTrial, setLastTrial] = useState<Trial | null>(stored.lastTrial);
  const [main, setMain] = useState<CauseId | null>(stored.main);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(7));
  const [react, setReact] = useState<{ text: string; shake?: string } | null>(null);

  useEffect(() => {
    setPageData('page07Ecology', { step, point, found, fewest, outlier, exp, trials, prediction, lastTrial, main } satisfies Stored);
  }, [step, point, found, fewest, outlier, exp, trials, prediction, lastTrial, main]);

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

  // ----- 2단계 그래프 -----
  const tapBar = (id: PointId) => {
    if (fewest) return;
    if (id === fewestTracePoint()) { setFewest(true); setPoint(id); audioService.playSfx('success'); }
    else bounce('막대가 제일 짧은 곳은 어디야?', id);
  };
  const tapOutlier = (id: CauseId) => {
    if (outlier) return;
    if (id === OUTLIER) {
      setOutlier(id);
      audioService.playSfx('success');
      logEvent({ page: 7, type: 'chart-pick', summary: `${fewestTracePoint()} 지점의 ${VARIABLE_LABEL[id]} 값을 제일 큰 값으로 골랐어.`, tags: ['생태', '그래프 읽기'], traits: { analysis: 1 }, contextRef: `chart-${id}` });
    } else bounce('숫자가 제일 큰 그림은 뭐야?', id);
  };

  // ----- 3단계 실험 -----
  const onSlide = (variable: CauseId, value: number) => {
    if (lastTrial) return;
    const result = changeLevel(exp, variable, value);
    if (result.locked) { bounce('하나만 바꿔 볼까?', variable); return; }
    setExp(result.state);
    if (!result.state.active) setPrediction(null);
  };
  const execute = () => {
    if (!prediction) return;
    const result = runTrial(exp, prediction);
    if (!result) return;
    setTrials([...trials, result.trial]);
    setLastTrial(result.trial);
    setPrediction(null);
    setExp(result.state);
    audioService.playSfx(actualDirection(result.trial.before, result.trial.after) === prediction ? 'success' : 'record');
  };
  const clearTrial = () => { setLastTrial(null); audioService.playSfx('tap'); };
  /** 세 값을 각각 한 번씩은 바꿔 봐야 원인을 고를 수 있다. 같은 값만 반복하면 안 센다. */
  const triedVariables = new Set(trials.map((t) => t.variable));
  const untried = VARIABLES.filter((v) => !triedVariables.has(v.id)).map((v) => v.label);
  const trialsDone = triedVariables.size >= MIN_TRIALS;

  const finish = () => {
    if (!main) return;
    const sub = subCause(main, trials);
    setArtifacts({ graphs: buildGraphs(main, sub), traces: found });
    logEvent({ page: 7, type: 'ecology-verdict', summary: `주원인 ${VARIABLE_LABEL[main]}, 보조원인 ${VARIABLE_LABEL[sub]}. 실험 ${trials.length}회.`, tags: ['생태', '변인 통제'], traits: { analysis: 2, exploration: 1 }, contextRef: `verdict-${main}-${sub}` });
    completePage(7);
    addBadge(META.badgeName);
    addJobCard(META.jobTitle);
    setCompleted(true);
    audioService.playSfx('reward');
  };

  // ----- 화면 -----
  const basePop = population(exp.baseline);
  const shownPop = lastTrial ? lastTrial.after : basePop;
  const stepDone = completed ? { title: '숲 생태 조사 완료', message: '숲의 새가 줄고 있어. 시민에게 알려야 해.' } : undefined;

  const instruction = completed ? '조사 끝!' :
    step === 1 ? '반짝이는 흔적을 눌러 봐' :
    step === 2 ? (fewest ? '여기서 제일 큰 값은?' : '새가 제일 적은 곳은?') :
    trialsDone && !lastTrial ? '가장 큰 원인은?' :
    lastTrial ? '결과를 보고 다음 실험' :
    !exp.active ? '슬라이더 하나만 움직여' :
    !prediction ? '새는 어떻게 될까?' : '실행을 눌러';

  const bubble = react?.text ?? (
    completed ? '숲의 새가 줄고 있어. 방송국에 알리자!' :
    step === 1 ? `${found.length}개 찾았어. 지점을 바꿔 볼까?` :
    step === 2 ? (fewest ? '어떤 값이 제일 커?' : '막대가 짧을수록 새가 적어.') :
    lastTrial ? (actualDirection(lastTrial.before, lastTrial.after) === lastTrial.prediction ? '예측대로야!' : '예측이랑 달랐네. 왜일까?') :
    trialsDone ? '어느 값이 새를 제일 크게 움직였어?' :
    trials.length >= MIN_TRIALS ? `${untried.join(', ')}도 바꿔 봐야 비교가 되지.` : '한 번에 하나만 바꾸는 게 실험이야.'
  );

  const next = completed
    ? { label: '생방송으로', onClick: () => onNavigate(8) }
    : step === 1
      ? { label: '그래프 보기', disabled: !collectDone, hint: `흔적 ${FIELD_TRACES.length}개를 다 찾으면 켜져요`, onClick: () => { setStep(2); audioService.playSfx('success'); } }
      : step === 2
        ? { label: '실험하기', disabled: !outlier, hint: '막대 하나, 그림 하나를 골라', onClick: () => { setStep(3); audioService.playSfx('success'); } }
        : lastTrial
          ? { label: trialsDone ? '원인 고르기' : '다음 실험', onClick: clearTrial }
          : trialsDone
            ? { label: '결과 확정', disabled: !main, hint: '가장 큰 원인을 골라', onClick: finish }
            : { label: '실행!', disabled: !(exp.active && prediction), hint: !exp.active ? (trials.length >= MIN_TRIALS ? '아직 안 바꿔 본 값이 있어' : '슬라이더 하나를 움직여') : '새가 어떻게 될지 골라', onClick: execute };

  const help = (
    <ul className="p7-help">
      <li>1 지점 A·B·C를 돌며 반짝이는 흔적 6개를 눌러.</li>
      <li>2 막대가 짧은 곳에서 제일 큰 값을 찾아.</li>
      <li>3 슬라이더를 하나만 움직이고, 새가 늘지 줄지 맞혀 봐. 세 값을 다 한 번씩!</li>
    </ul>
  );
  const status = step === 1 ? `흔적 ${found.length}/${FIELD_TRACES.length}` :
    step === 3 ? `실험 ${triedVariables.size}/${MIN_TRIALS}${untried.length ? ` · 남은: ${untried.join(', ')}` : ''}` : undefined;

  return (
    <StepShell page={7} step={completed ? 3 : step} steps={3} instruction={instruction} mentor={MENTOR} mentorName="생태 멘토" bubble={bubble} status={status} next={next} help={help} done={stepDone} onNavigate={onNavigate}>
      {step === 1 && (
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
                  {t.kind === 'sound' ? <SoundIcon /> : <img src={t.image} alt="" className={t.tint ? `tint-${t.tint}` : ''} />}
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
        <div className={`v4-card p7-chart-card${fewest ? ' has-pick' : ''}`}>
          <div className="p7-chart" role="group" aria-label="지점별 새 흔적 막대">
            {POINTS.map((p) => {
              const stats = POINT_STATS[p.id];
              const picked = fewest && p.id === fewestTracePoint();
              return (
                <button key={p.id} type="button" className={`p7-bar${picked ? ' is-picked' : ''}${react?.shake === p.id ? ' v4-shake' : ''}`} aria-pressed={picked} disabled={fewest} onClick={() => tapBar(p.id)} aria-label={`${p.id} ${p.title} 새 흔적 ${stats.traces}`}>
                  <span className="p7-bar__birds" aria-hidden="true">{Array.from({ length: stats.traces }, (_, i) => <img key={i} src={BIRD} alt="" />)}</span>
                  <i style={{ '--h': `${(stats.traces / LEVEL_MAX) * 100}%` } as CSSProperties}><b>{stats.traces}</b></i>
                  <strong><img src={POINT_IMAGE[p.id]} alt="" />{p.id} {p.title}</strong>
                  <span className="p7-bar__env" aria-hidden="true">
                    {VARIABLES.map((v) => <img key={v.id} src={CAUSE_IMAGE[v.id]} alt="" style={{ '--s': `${0.5 + stats[v.id] / LEVEL_MAX}` } as CSSProperties} />)}
                  </span>
                </button>
              );
            })}
          </div>
          {fewest && (
            <div className={`p7-outliers${react?.shake && isCause(react.shake) ? ' v4-shake' : ''}`}>
              <PictureChoice
                size="lg"
                ariaLabel={`${fewestTracePoint()} 지점 값`}
                selected={outlier}
                onSelect={tapOutlier}
                options={VARIABLES.map((v) => ({ id: v.id, image: CAUSE_IMAGE[v.id], label: v.label, caption: `${POINT_STATS[fewestTracePoint()][v.id]} / ${LEVEL_MAX}`, disabled: Boolean(outlier) && outlier !== v.id }))}
              />
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="v4-card p7-lab">
          <div className="p7-pop" aria-live="polite">
            <span>숲의 새</span>
            <b>{shownPop}</b>
            <span className="p7-pop__birds" aria-hidden="true">{Array.from({ length: Math.max(1, Math.round(shownPop / 4)) }, (_, i) => <img key={i} src={BIRD} alt="" />)}</span>
            {lastTrial && <em>{lastTrial.before} → {lastTrial.after}</em>}
          </div>

          {!trialsDone || lastTrial ? (
            <>
              <div className="p7-sliders">
                {VARIABLES.map((v) => {
                  const isActive = exp.active === v.id;
                  const isLocked = Boolean(exp.active) && !isActive;
                  return (
                    <label key={v.id} className={`p7-slider${isActive ? ' is-active' : ''}${isLocked ? ' is-locked' : ''}${react?.shake === v.id ? ' v4-shake' : ''}`}>
                      <img src={CAUSE_IMAGE[v.id]} alt="" />
                      <span>{v.label}</span>
                      <input type="range" min={0} max={LEVEL_MAX} step={1} value={exp.levels[v.id]} onChange={(e) => onSlide(v.id, Number(e.target.value))} disabled={Boolean(lastTrial) || completed} aria-label={`${v.label} 조절`} />
                      <output>{exp.levels[v.id]}</output>
                    </label>
                  );
                })}
              </div>
              {lastTrial ? (
                <div className={`p7-result${actualDirection(lastTrial.before, lastTrial.after) === lastTrial.prediction ? ' is-match' : ' is-miss'}`} role="status">
                  <strong>{VARIABLE_LABEL[lastTrial.variable]} {lastTrial.from} → {lastTrial.to}</strong>
                  <span>예측 {PREDICTIONS.find((p) => p.id === lastTrial.prediction)?.label} · 결과 {PREDICTIONS.find((p) => p.id === actualDirection(lastTrial.before, lastTrial.after))?.label}</span>
                </div>
              ) : (
                <div className="p7-predict v4-big-buttons" role="group" aria-label="예측">
                  {PREDICTIONS.map((p) => <button key={p.id} type="button" className={`v4-big-button${prediction === p.id ? ' is-selected' : ''}`} aria-pressed={prediction === p.id} disabled={!exp.active} onClick={() => { setPrediction(p.id); audioService.playSfx('tap'); }}>{p.label}</button>)}
                </div>
              )}
            </>
          ) : (
            <PictureChoice
              size="lg"
              ariaLabel="가장 큰 원인"
              selected={main}
              onSelect={(id) => { if (!completed) { setMain(id); audioService.playSfx('tap'); } }}
              options={VARIABLES.map((v) => {
                const best = trials.filter((t) => t.variable === v.id).reduce((m, t) => Math.max(m, Math.abs(t.after - t.before)), 0);
                return { id: v.id, image: CAUSE_IMAGE[v.id], label: v.label, caption: best ? `새 ${best}마리 움직임` : '실험 안 함' };
              })}
            />
          )}
        </div>
      )}
      {react && <span className="v4-react" role="status">{react.text}</span>}
    </StepShell>
  );
}
