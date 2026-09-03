import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { GameShell, MissionGuide, Panel } from '../components/GameShell';
import { StageComplete } from '../components/StageComplete';
import { ArrowIcon, CheckIcon, LockIcon, SoundIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { CauseId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  ENV_SPOTS,
  LEVEL_MAX,
  LOCK_MESSAGE,
  MIN_TRIALS,
  POINTS,
  POINT_STATS,
  PREDICTIONS,
  SOUND_CHOICES,
  TRACES,
  UNLOCK_SPOT,
  VARIABLES,
  VARIABLE_LABEL,
  actualDirection,
  buildGraphs,
  changeLevel,
  createExperiment,
  getTrace,
  nextPoint,
  population,
  runTrial,
  sensitivity,
  visibleTraces,
  type ExperimentState,
  type PointId,
  type Prediction,
  type SoundKind,
  type Trial,
} from './page07EcologyModel';
import './page07.css';

type Step = 'collect' | 'tablet' | 'experiment';
const STEPS: { id: Step; label: string }[] = [
  { id: 'collect', label: '흔적 수집' },
  { id: 'tablet', label: '연구 태블릿' },
  { id: 'experiment', label: '변인 실험' },
];
const HYPOTHESIS_LABEL: Record<CauseId, string> = { logging: '벌목', noise: '소음', water: '물' };
const PREDICTION_LABEL = Object.fromEntries(PREDICTIONS.map((p) => [p.id, p.label])) as Record<Prediction, string>;
const META = STAGE_META[2]!;

interface Stored {
  step: Step;
  point: PointId;
  found: string[];
  envSeen: string[];
  chartPick: { point: PointId; variable: CauseId } | null;
  exp: ExperimentState;
  trials: Trial[];
}

function readStored(value: unknown): Stored {
  const base: Stored = { step: 'collect', point: 'A', found: [], envSeen: [], chartPick: null, exp: createExperiment(), trials: [] };
  if (!value || typeof value !== 'object') return base;
  const c = value as Partial<Stored>;
  return {
    step: STEPS.some((s) => s.id === c.step) ? (c.step as Step) : base.step,
    point: POINTS.some((p) => p.id === c.point) ? (c.point as PointId) : base.point,
    found: Array.isArray(c.found) ? c.found.filter((id): id is string => typeof id === 'string' && Boolean(getTrace(id))) : [],
    envSeen: Array.isArray(c.envSeen) ? c.envSeen.filter((id): id is string => typeof id === 'string') : [],
    chartPick: c.chartPick && typeof c.chartPick === 'object' ? c.chartPick : null,
    exp: c.exp && typeof c.exp === 'object' && c.exp.levels ? c.exp : base.exp,
    trials: Array.isArray(c.trials) ? c.trials : [],
  };
}

const causeLabel = (id: CauseId) => `${VARIABLE_LABEL[id]}${id === 'logging' ? '(벌목)' : ''}`;

export default function Page07Ecology({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const stored = useMemo(() => readStored(save.pageData.page07Ecology), []);
  const [step, setStep] = useState<Step>(stored.step);
  const [point, setPoint] = useState<PointId>(stored.point);
  const [found, setFound] = useState<string[]>(stored.found);
  const [envSeen, setEnvSeen] = useState<string[]>(stored.envSeen);
  const [focus, setFocus] = useState<{ type: 'trace' | 'env'; id: string } | null>(null);
  const [soundMiss, setSoundMiss] = useState<string | null>(null);
  const [chartPick, setChartPick] = useState(stored.chartPick);
  const [exp, setExp] = useState<ExperimentState>(stored.exp);
  const [trials, setTrials] = useState<Trial[]>(stored.trials);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [locked, setLocked] = useState(false);
  const [lastTrial, setLastTrial] = useState<Trial | null>(null);
  const [shownPop, setShownPop] = useState(() => population(stored.exp.baseline));
  const [main, setMain] = useState<CauseId | null>(null);
  const [sub, setSub] = useState<CauseId | null>(null);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(7));
  const swipe = useRef<{ x: number } | null>(null);
  const swiped = useRef(false);

  const meterTapped = envSeen.includes(UNLOCK_SPOT);
  const hypothesis = save.artifacts.hypothesis;

  useEffect(() => {
    setPageData('page07Ecology', { step, point, found, envSeen, chartPick, exp, trials } satisfies Stored);
  }, [step, point, found, envSeen, chartPick, exp, trials]);

  // 개체수 숫자 애니메이션
  useEffect(() => {
    const target = population(exp.baseline);
    const start = shownPop;
    if (start === target) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 700);
      setShownPop(Math.round(start + (target - start) * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [exp.baseline]);

  // ----- 1단계 -----
  const movePoint = (dir: 1 | -1) => {
    setPoint((p) => nextPoint(p, dir));
    setFocus(null);
    setSoundMiss(null);
    audioService.playSfx('swipe');
  };
  const onScenePointerDown = (e: PointerEvent<HTMLDivElement>) => { swipe.current = { x: e.clientX }; swiped.current = false; };
  const onScenePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 60) { swiped.current = true; movePoint(dx < 0 ? 1 : -1); }
  };

  const stamp = (id: string) => {
    if (found.includes(id)) return;
    const next = [...found, id];
    setFound(next);
    setArtifacts({ traces: next });
    audioService.playSfx('clue');
  };

  const tapTrace = (id: string) => {
    const trace = getTrace(id);
    if (!trace) return;
    setFocus({ type: 'trace', id });
    setSoundMiss(null);
    if (trace.sound) {
      audioService.playCue(trace.sound);
      if (found.includes(id)) audioService.playSfx('tap');
      return;
    }
    stamp(id);
  };

  const classifySound = (id: string, choice: SoundKind) => {
    const trace = getTrace(id);
    if (!trace?.sound) return;
    if (choice === trace.sound) {
      stamp(id);
      setSoundMiss(null);
      logEvent({ page: 7, type: 'sound-classified', summary: `${trace.title}를 ${SOUND_CHOICES.find((c) => c.id === choice)?.label}로 분류했어.`, tags: ['생태', '소리 분류'], traits: { analysis: 1 }, contextRef: id });
    } else {
      audioService.playSfx('warning');
      setSoundMiss(`그 소리였을까? 다시 들어봐. ${trace.soundHint}`);
    }
  };

  const tapEnv = (id: string) => {
    setFocus({ type: 'env', id });
    setSoundMiss(null);
    if (!envSeen.includes(id)) {
      setEnvSeen([...envSeen, id]);
      audioService.playSfx(id === UNLOCK_SPOT ? 'success' : 'tap');
    } else audioService.playSfx('tap');
  };

  const collectDone = found.length >= TRACES.filter((t) => !t.hidden).length;

  // ----- 2단계 -----
  const seedExperiment = () => {
    if (!chartPick) return;
    logEvent({ page: 7, type: 'chart-pick', summary: `${chartPick.point} 지점의 ${VARIABLE_LABEL[chartPick.variable]} 값을 첫 실험 변수로 골랐어.`, tags: ['생태', '그래프 읽기'], traits: { analysis: 1 }, contextRef: `chart-${chartPick.point}-${chartPick.variable}` });
    setStep('experiment');
    audioService.playSfx('success');
  };

  // ----- 3단계 -----
  const onSlide = (variable: CauseId, value: number) => {
    if (lastTrial) return;
    const result = changeLevel(exp, variable, value);
    setLocked(result.locked);
    if (result.locked) { audioService.playSfx('warning'); return; }
    setExp(result.state);
    if (!result.state.active) setPrediction(null);
  };

  const execute = () => {
    if (!prediction) return;
    const result = runTrial(exp, prediction);
    if (!result) return;
    setExp(result.state);
    setTrials([...trials, result.trial]);
    setLastTrial(result.trial);
    setPrediction(null);
    audioService.playSfx(actualDirection(result.trial.before, result.trial.after) === prediction ? 'success' : 'record');
  };

  const finish = () => {
    if (!main || !sub) return;
    const graphs = buildGraphs(main, sub);
    setArtifacts({ graphs, traces: found });
    logEvent({ page: 7, type: 'ecology-verdict', summary: `주원인 ${causeLabel(main)}, 보조원인 ${causeLabel(sub)}. 실험 ${trials.length}회.`, tags: ['생태', '변인 통제'], traits: { analysis: 2, exploration: 1 }, contextRef: `verdict-${main}-${sub}` });
    completePage(7);
    addBadge(META.badgeName);
    addJobCard(META.jobTitle);
    setCompleted(true);
    audioService.playSfx('reward');
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const currentPoint = POINTS.find((p) => p.id === point)!;
  const focusTrace = focus?.type === 'trace' ? getTrace(focus.id) : undefined;
  const focusEnv = focus?.type === 'env' ? ENV_SPOTS.find((s) => s.id === focus.id) : undefined;
  const sens = sensitivity(trials);
  const hypothesisMatch = hypothesis && main ? (hypothesis === main ? `네 첫 가설(${HYPOTHESIS_LABEL[hypothesis]})과 같아.` : `네 첫 가설(${HYPOTHESIS_LABEL[hypothesis]})과 달라. 실험이 생각을 바꿨네.`) : '';

  const footer = completed ? (
    <StageComplete title="숲 생태 조사 완료" message={`주원인 ${main ? causeLabel(main) : ''}. ${hypothesisMatch} 그래프 카드를 방송국으로 보냈어.`} nextLabel="생방송 컨트롤룸으로" onNext={() => onNavigate(8)} />
  ) : (
    <div className="p7-footer">
      <p className="p7-footer__note">실제 숲은 더 복잡해요. 이 실험은 '하나씩 바꿔 보기'를 연습하는 거예요.</p>
      <span className={found.length === TRACES.length ? 'p7-goal is-done' : 'p7-goal'}>갱신 목표 · 도감 {found.length}/{TRACES.length}</span>
    </div>
  );

  return (
    <GameShell page={7} eyebrow="STAGE 3 · ECOLOGY" onNavigate={onNavigate} footer={footer} className="p7-shell">
      <div className="p7-layout">
        <Panel title="이번에 할 일" kicker="MISSION" className="p7-mission">
          <MissionGuide image={pageAsset(7, 1)} imageAlt="카키색 옷을 입은 생태 연구원" action="흔적을 모으고 조건을 하나씩 바꿔 봐" goals={['지점 A·B·C에서 흔적 찾기', '태블릿에서 튀는 값 고르기', '슬라이더 하나씩 바꿔 실험 3번']} />
          <p className="p7-reward">끝내면 얻는 것 · {META.reward}</p>
          <ol className="p7-steps" aria-label="진행 단계">
            {STEPS.map((s, i) => <li key={s.id} className={i < stepIndex ? 'is-done' : i === stepIndex ? 'is-current' : ''}><b>{i + 1}</b>{s.label}</li>)}
          </ol>
          <h3 className="p7-h3">흔적 도감 {found.length}/{TRACES.length}</h3>
          <ul className="p7-dex" aria-label="흔적 도감">
            {TRACES.map((t) => {
              const has = found.includes(t.id);
              return <li key={t.id} className={has ? 'is-found' : t.hidden ? 'is-hidden' : ''} title={has ? t.title : t.hidden ? '숨은 흔적' : '아직 못 찾음'}>{has ? <img src={t.image} alt={t.title} className={t.tint ? `tint-${t.tint}` : ''} /> : <span>{t.hidden ? '?' : ''}</span>}</li>;
            })}
          </ul>
        </Panel>

        {step === 'collect' && (
          <>
            <section className="p7-scene-wrap" aria-labelledby="p7-title">
              <header className="p7-scene-head">
                <button type="button" className="p7-arrow" onClick={() => movePoint(-1)} aria-label="이전 지점"><ArrowIcon /></button>
                <div><span>지점 {currentPoint.id}</span><h2 id="p7-title">{currentPoint.title}</h2><p>{currentPoint.blurb}</p></div>
                <button type="button" className="p7-arrow" onClick={() => movePoint(1)} aria-label="다음 지점"><ArrowIcon /></button>
              </header>
              <div className="p7-scene" data-point={point} onPointerDown={onScenePointerDown} onPointerUp={onScenePointerUp} onPointerCancel={() => { swipe.current = null; }}>
                {ENV_SPOTS.filter((s) => s.point === point).map((s) => (
                  <button key={s.id} type="button" className={`p7-spot p7-spot--env ${envSeen.includes(s.id) ? 'is-seen' : ''} ${focus?.id === s.id ? 'is-focus' : ''}`} style={{ '--x': `${s.x}%`, '--y': `${s.y}%` } as CSSProperties} onClick={() => { if (!swiped.current) tapEnv(s.id); }} aria-label={`${s.title} 살펴보기`}>
                    <img src={s.image} alt="" draggable={false} />
                  </button>
                ))}
                {visibleTraces(point, meterTapped).map((t) => (
                  <button key={t.id} type="button" className={`p7-spot ${found.includes(t.id) ? 'is-found' : ''} ${t.hidden ? 'is-revealed' : ''} ${focus?.id === t.id ? 'is-focus' : ''}`} style={{ '--x': `${t.x}%`, '--y': `${t.y}%` } as CSSProperties} onClick={() => { if (!swiped.current) tapTrace(t.id); }} aria-label={`${t.kind === 'sound' ? '소리 단서 듣기' : t.title}`}>
                    <img src={t.image} alt="" draggable={false} className={t.tint ? `tint-${t.tint}` : ''} />
                    {t.kind === 'sound' && <i className="p7-spot__wave"><SoundIcon /></i>}
                    {found.includes(t.id) && <i className="p7-spot__check"><CheckIcon /></i>}
                  </button>
                ))}
                <p className="p7-scene-hint">화면을 옆으로 밀거나 화살표로 지점을 옮겨</p>
              </div>
            </section>
            <Panel title="살펴본 것" kicker="FIELD NOTE" className="p7-side">
              {!focus && <p className="p7-muted">반짝이는 곳을 눌러 봐. 녹음기는 소리 단서야.</p>}
              {focusEnv && (
                <article className="p7-note">
                  <img src={focusEnv.image} alt="" />
                  <h3>{focusEnv.title}</h3>
                  <p>{focusEnv.note}</p>
                  {focusEnv.id === UNLOCK_SPOT && <p className="p7-mentor">측정기가 알려준 조건이면 숨은 흔적이 보일지도 몰라. 지점을 다시 살펴봐.</p>}
                </article>
              )}
              {focusTrace && !focusTrace.sound && (
                <article className="p7-note">
                  <img src={focusTrace.image} alt="" className={focusTrace.tint ? `tint-${focusTrace.tint}` : ''} />
                  <h3>{focusTrace.title}</h3>
                  <p>{focusTrace.note}</p>
                  <p className="p7-stamp"><CheckIcon /> 도감에 담았어</p>
                </article>
              )}
              {focusTrace?.sound && (
                <article className="p7-note">
                  <button type="button" className="p7-replay" onClick={() => audioService.playCue(focusTrace.sound!)}><SoundIcon /> 다시 듣기</button>
                  <p className="p7-sound-hint">{focusTrace.soundHint}</p>
                  {found.includes(focusTrace.id) ? (
                    <><h3>{focusTrace.title}</h3><p>{focusTrace.note}</p><p className="p7-stamp"><CheckIcon /> 도감에 담았어</p></>
                  ) : (
                    <>
                      <h3>무슨 소리야?</h3>
                      <div className="p7-choices">
                        {SOUND_CHOICES.map((c) => <button key={c.id} type="button" onClick={() => classifySound(focusTrace.id, c.id)}>{c.label}</button>)}
                      </div>
                      {soundMiss && <p className="p7-mentor" role="alert">{soundMiss}</p>}
                    </>
                  )}
                </article>
              )}
              <button type="button" className="button button--primary button--block p7-next" disabled={!collectDone} onClick={() => { setStep('tablet'); audioService.playSfx('success'); }}>
                연구 태블릿 열기 <ArrowIcon />
              </button>
              {!collectDone && <p className="p7-muted">흔적 {TRACES.filter((t) => !t.hidden).length}개를 찾으면 열려. 숨은 흔적 2개는 도감 갱신 목표야.</p>}
            </Panel>
          </>
        )}

        {step === 'tablet' && (
          <>
            <section className="p7-tablet" aria-labelledby="p7-tablet-title">
              <header className="p7-scene-head p7-scene-head--center"><div><span>연구 태블릿</span><h2 id="p7-tablet-title">지점별 측정값</h2></div></header>
              <div className="p7-chart" role="group" aria-label="지점별 막대 그래프">
                {POINTS.map((p) => {
                  const stats = POINT_STATS[p.id];
                  return (
                    <div key={p.id} className="p7-chart__group">
                      <h3>지점 {p.id} · {p.title}</h3>
                      <ul>
                        {VARIABLES.map((v) => {
                          const picked = chartPick?.point === p.id && chartPick.variable === v.id;
                          return (
                            <li key={v.id}>
                              <button type="button" className={`p7-bar p7-bar--${v.id} ${picked ? 'is-picked' : ''}`} style={{ '--h': `${(stats[v.id] / LEVEL_MAX) * 100}%` } as CSSProperties} onClick={() => { setChartPick({ point: p.id, variable: v.id }); audioService.playSfx('tap'); }} aria-pressed={picked} aria-label={`${p.id} 지점 ${v.label} ${stats[v.id]}`}>
                                <i /><b>{stats[v.id]}</b>
                              </button>
                              <span>{v.label}</span>
                            </li>
                          );
                        })}
                        <li>
                          <div className="p7-bar p7-bar--traces" style={{ '--h': `${(stats.traces / LEVEL_MAX) * 100}%` } as CSSProperties} aria-label={`${p.id} 지점 앵무 흔적 ${stats.traces}`}><i /><b>{stats.traces}</b></div>
                          <span>앵무 흔적</span>
                        </li>
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
            <Panel title="그래프 읽기" kicker="QUESTION" className="p7-side">
              <p className="p7-mentor">앵무 흔적이 가장 적은 지점은 어디야? 그 지점에서 유난히 튀는 값 하나를 막대로 눌러 골라.</p>
              {chartPick ? <p className="p7-pick">고른 것 · 지점 {chartPick.point}의 <b>{VARIABLE_LABEL[chartPick.variable]}</b></p> : <p className="p7-muted">막대를 누르면 여기에 표시돼.</p>}
              <p className="p7-muted">정답은 없어. 고른 값이 첫 실험의 출발점이 돼.</p>
              <button type="button" className="button button--primary button--block p7-next" disabled={!chartPick} onClick={seedExperiment}>이 값으로 실험 시작 <ArrowIcon /></button>
            </Panel>
          </>
        )}

        {step === 'experiment' && (
          <>
            <section className="p7-lab" aria-labelledby="p7-lab-title">
              <header className="p7-scene-head p7-scene-head--center"><div><span>변인 실험</span><h2 id="p7-lab-title">한 번에 하나만 바꿔</h2></div></header>
              <div className="p7-pop" aria-live="polite">
                <span>앵무 개체수</span>
                <b>{shownPop}</b>
                <div className="p7-pop__bar"><i style={{ '--w': `${Math.min(100, (shownPop / 60) * 100)}%` } as CSSProperties} /></div>
              </div>
              <div className="p7-sliders">
                {VARIABLES.map((v) => {
                  const isActive = exp.active === v.id;
                  const isLocked = Boolean(exp.active) && !isActive;
                  return (
                    <label key={v.id} className={`p7-slider ${isActive ? 'is-active' : ''} ${isLocked ? 'is-locked' : ''}`}>
                      <span className="p7-slider__name">{v.label}{chartPick?.variable === v.id && trials.length === 0 && <em>먼저</em>}{isLocked && <LockIcon />}</span>
                      <input type="range" min={0} max={LEVEL_MAX} step={1} value={exp.levels[v.id]} onChange={(e) => onSlide(v.id, Number(e.target.value))} disabled={Boolean(lastTrial) || completed} aria-label={`${v.label} 조절`} />
                      <output>{exp.levels[v.id]}</output>
                    </label>
                  );
                })}
              </div>
              {locked && <p className="p7-mentor" role="alert">{LOCK_MESSAGE}</p>}
              {exp.active && !lastTrial && (
                <div className="p7-predict">
                  <h3>{VARIABLE_LABEL[exp.active]}을 {exp.baseline[exp.active]} → {exp.levels[exp.active]}로 바꾸면 개체수는?</h3>
                  <div className="p7-choices">
                    {PREDICTIONS.map((p) => <button key={p.id} type="button" className={prediction === p.id ? 'is-picked' : ''} aria-pressed={prediction === p.id} onClick={() => { setPrediction(p.id); audioService.playSfx('tap'); }}>{p.label}</button>)}
                  </div>
                  <button type="button" className="button button--teal button--large" disabled={!prediction} onClick={execute}>실행</button>
                </div>
              )}
              {lastTrial && (
                <div className={`p7-result ${actualDirection(lastTrial.before, lastTrial.after) === lastTrial.prediction ? 'is-match' : 'is-miss'}`} role="status">
                  <h3>대조</h3>
                  <p>예측 <b>{PREDICTION_LABEL[lastTrial.prediction]}</b> · 결과 <b>{PREDICTION_LABEL[actualDirection(lastTrial.before, lastTrial.after)]}</b> ({lastTrial.before} → {lastTrial.after})</p>
                  <p className="p7-mentor">{actualDirection(lastTrial.before, lastTrial.after) === lastTrial.prediction ? '예측대로야. 이 변수가 얼마나 세게 작용했는지 기억해 둬.' : `무엇이 달랐을까? ${VARIABLE_LABEL[lastTrial.variable]}만 바꿨는데 개체수가 이렇게 움직였어.`}</p>
                  <button type="button" className="button button--ghost" onClick={() => setLastTrial(null)}>다음 실험 <ArrowIcon /></button>
                </div>
              )}
            </section>
            <Panel title={`실험 기록 ${trials.length}/${MIN_TRIALS}`} kicker="LOG" className="p7-side">
              <ul className="p7-trials">
                {trials.map((t, i) => <li key={i}><b>{i + 1}</b>{VARIABLE_LABEL[t.variable]} {t.from}→{t.to} · 개체수 {t.before}→{t.after}</li>)}
                {trials.length === 0 && <li className="p7-muted">아직 실험이 없어. 슬라이더 하나를 움직여 봐.</li>}
              </ul>
              {trials.length >= MIN_TRIALS && !completed && (
                <div className="p7-verdict">
                  <h3>레벨 1당 개체수 변화</h3>
                  <ul className="p7-sens">{VARIABLES.map((v) => <li key={v.id}>{v.label} <b>{sens[v.id] ?? '실험 안 함'}</b></li>)}</ul>
                  <h3>주원인은?</h3>
                  <div className="p7-choices">{VARIABLES.map((v) => <button key={v.id} type="button" className={main === v.id ? 'is-picked' : ''} aria-pressed={main === v.id} onClick={() => { setMain(v.id); if (sub === v.id) setSub(null); audioService.playSfx('tap'); }}>{v.label}</button>)}</div>
                  {main && (
                    <>
                      <h3>보조원인은?</h3>
                      <div className="p7-choices">{VARIABLES.filter((v) => v.id !== main).map((v) => <button key={v.id} type="button" className={sub === v.id ? 'is-picked' : ''} aria-pressed={sub === v.id} onClick={() => { setSub(v.id); audioService.playSfx('tap'); }}>{v.label}</button>)}</div>
                    </>
                  )}
                  {hypothesis && main && <p className="p7-mentor">{hypothesisMatch}</p>}
                  <button type="button" className="button button--primary button--block p7-next" disabled={!main || !sub} onClick={finish}>연구 결과 확정 <CheckIcon /></button>
                </div>
              )}
              {trials.length < MIN_TRIALS && <p className="p7-muted">실험 {MIN_TRIALS}번을 마치면 주원인을 정할 수 있어. 값을 원래대로 되돌리면 다른 슬라이더가 풀려.</p>}
            </Panel>
          </>
        )}
      </div>
    </GameShell>
  );
}
