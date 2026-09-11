import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { Modal } from '../components/Modal';
import { CheckIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { v3Asset, v5Asset, v8Asset } from '../shared/assets';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { BIRDS, CARE_ZONES, getBird, TREATMENTS, type BirdId, type CareZoneId, type TreatmentId } from './page05Data';
import {
  applyTreatment,
  birdGauge,
  buildCareLog,
  chooseStatement,
  evaluateCare,
  groundedCount,
  isStable,
  readCareState,
  RECORDS_PER_BIRD,
  type CareState,
} from './page05CareModel';
import './page05.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const MENTOR = v3Asset('keeper-haneul');
const MENTOR_NAME = '사육사 하늘';
const TREATMENT_IMAGE: Record<TreatmentId, string> = {
  water: v5Asset('treat-water', 'png'),
  shelter: v5Asset('treat-shelter', 'png'),
  puzzle: v5Asset('treat-puzzle', 'png'),
  feather: v5Asset('treat-feather', 'png'),
};
const CLOSEUP_IMAGE: Record<BirdId, Partial<Record<CareZoneId, string>>> = {
  green: {
    eyes: v5Asset('closeup-green-eyes'),
    feathers: v5Asset('closeup-green-feathers'),
    behavior: v5Asset('closeup-green-behavior'),
  },
  red: {
    eyes: v5Asset('closeup-red-eyes'),
    water: v8Asset('closeup-red-water'),
    posture: v5Asset('closeup-red-posture'),
  },
};
const RECOVERY_IMAGE: Partial<Record<BirdId, string>> = {
  green: v8Asset('recovery-green-shelter'),
  red: v8Asset('recovery-red-water'),
};
const DRAG_TYPE = 'text/v4-treatment';
const ParrotModelPreview = lazy(() => import('../components/ParrotModelPreview').catch(() => ({
  default: ({ initialBird, stableBirds, onClose }: { initialBird: BirdId; stableBirds: BirdId[]; onClose: () => void }) => {
    const previewBird = getBird(initialBird);
    return <Modal title="그림으로 살펴보기" onClose={onClose} actions={<button type="button" className="button button--primary" onClick={onClose}>관찰로 돌아가기</button>}>
      <p>입체 관찰을 열지 못했어. 그림으로 계속 살펴볼 수 있어.</p>
      <img className="p5-model-fallback" src={stableBirds.includes(initialBird) ? previewBird.recoveredImage : previewBird.sickImage} alt={`${previewBird.name}의 모습`} />
    </Modal>;
  },
})));
/**
 * 앵무 병원 놀이 — 한 마리당 2단계.
 * 1 돋보기로 살펴보고 증상 스티커 3장 모으기 → 2 기록판을 보고 처치 고르기.
 */
const INSTRUCTIONS = ['반짝이는 곳 3개를 눌러 봐', '처치 카드를 고르고 앵무를 눌러 줘'];
const BUBBLES = ['돋보기로 보면 뭐가 보여?', '관찰한 기록과 맞춰 봐. 아이콘을 앵무에게 끌어 놓아도 돼.'];

/** 저장 상태에서 아직 안 끝난 첫 단계를 찾는다. 새로고침해도 하던 데서 이어진다. */
function firstOpenStep(state: CareState): { bird: BirdId; step: number } {
  for (const bird of BIRDS) {
    if (groundedCount(state, bird.id) < RECORDS_PER_BIRD) return { bird: bird.id, step: 1 };
    if (!isStable(state, bird.id)) return { bird: bird.id, step: 2 };
  }
  return { bird: 'red', step: 2 };
}

/** 구역 아이콘 — 기록판 스티커. 이미지 없이 SVG 로 그린다. */
function ZoneIcon({ zone }: { zone: CareZoneId }) {
  const common = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  switch (zone) {
    case 'eyes': return <svg {...common}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
    case 'feathers': return <svg {...common}><path d="M20 4c-6 0-12 5-13 13l-3 3" /><path d="M7 17c5 0 10-4 12-9" /><path d="M11 13l4 1M9 16l3 2" /></svg>;
    case 'posture': return <svg {...common}><path d="M3 14c4 0 6-3 9-3s5 3 9 3" /><path d="M12 11V6l3 2" /><path d="M6 20h12" /></svg>;
    case 'water': return <svg {...common}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /></svg>;
    case 'behavior': return <svg {...common}><path d="M4 21V9l8-6 8 6v12" /><path d="M9 21v-6h6v6" /><path d="M16 4l4-2" /></svg>;
  }
}

export default function Page05ParrotCheck({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, setArtifacts } = useGame();
  const [state, setState] = useState<CareState>(() => readCareState(save.pageData.page05Care));
  const [cursor, setCursor] = useState(() => firstOpenStep(state));
  const [card, setCard] = useState<CareZoneId | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [shake, setShake] = useState<'bird' | 'card' | null>(null);
  const [held, setHeld] = useState<TreatmentId | null>(null);
  const [justRecorded, setJustRecorded] = useState<CareZoneId | null>(null);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(5));
  const [previewOpen, setPreviewOpen] = useState(false);
  const shakeTimer = useRef(0);
  const recordTimer = useRef(0);
  const touchDrag = useRef<{ id: TreatmentId; x: number; y: number } | null>(null);
  useEffect(() => () => {
    window.clearTimeout(shakeTimer.current);
    window.clearTimeout(recordTimer.current);
  }, []);

  const bird = getBird(cursor.bird);
  const step = cursor.step;
  const zones = CARE_ZONES[bird.id].map((id) => bird.zones.find((zone) => zone.id === id)!);
  const seen = zones.filter((zone) => state.records[bird.id][zone.id]).length;
  const stable = isStable(state, bird.id);
  const gauge = birdGauge(state, bird.id);
  const hearts = Math.max(1, Math.min(5, Math.round(gauge / 20)));

  const commit = (recipe: (current: CareState) => CareState) => setState(recipe);
  useEffect(() => { setPageData('page05Care', state); }, [state, setPageData]);
  const clearFeedback = () => {
    window.clearTimeout(shakeTimer.current);
    setReaction(null);
    setShake(null);
  };
  const react = (text: string, target: 'bird' | 'card') => {
    window.clearTimeout(shakeTimer.current);
    setReaction(text);
    setShake(target);
    audioService.playSfx('warning');
    shakeTimer.current = window.setTimeout(() => setShake(null), 450);
    // 피드백은 다음 관찰·수정까지 남겨 충분히 읽게 한다. 이전 새의 타이머가 새 피드백을 지우지 않는다.
  };

  const tapZone = (zone: CareZoneId) => {
    audioService.playSfx('tap');
    clearFeedback();
    setCard(zone);
  };

  /** 돋보기 카드의 진술 2개 중 하나. 보이는 쪽만 기록되고, 짐작이면 되묻는다. */
  const pickStatement = (zone: CareZoneId, statementId: string) => {
    const result = chooseStatement(state, bird.id, zone, statementId);
    commit(() => result.state);
    if (result.grounded) {
      clearFeedback();
      audioService.playSfx('clue');
      window.clearTimeout(recordTimer.current);
      setJustRecorded(zone);
      recordTimer.current = window.setTimeout(() => setJustRecorded(null), 700);
    } else react('그게 정말 보여? 돋보기 안을 다시 봐.', 'card');
  };

  const giveTreatment = (treatment: TreatmentId) => {
    if (step !== 2 || stable || !TREATMENTS.some((item) => item.id === treatment)) return;
    setHeld(null);
    const result = applyTreatment(state, bird.id, treatment);
    commit(() => result.state);
    if (result.matched) { clearFeedback(); audioService.playSfx('success'); audioService.playCue('parrotHappy', 1400); }
    else react(result.feedback, 'bird');
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const id = (event.dataTransfer.getData(DRAG_TYPE) || held) as TreatmentId | '';
    if (id) giveTreatment(id);
  };
  const touchStart = (event: PointerEvent<HTMLDivElement>, id: TreatmentId) => {
    if (event.pointerType === 'mouse') return;
    touchDrag.current = { id, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const touchEnd = (event: PointerEvent<HTMLDivElement>) => {
    const drag = touchDrag.current;
    touchDrag.current = null;
    if (!drag || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
    if (document.elementFromPoint(event.clientX, event.clientY)?.closest('.p5-bird')) giveTreatment(drag.id);
  };

  const finish = () => {
    const mission = evaluateCare(state);
    if (!mission.ready) return;
    const careLog = buildCareLog(state);
    careLog.forEach((entry) => logEvent({
      page: 5, type: 'care-treatment', summary: `${getBird(entry.bird).name}: ${entry.issue} → ${entry.treatment}`,
      tags: ['동물·생명', '개체별 돌봄', entry.issue], traits: { care: 2, analysis: 1 }, contextRef: `treatment-${entry.bird}`,
    }));
    logEvent({
      page: 5, type: 'care-recorded',
      summary: state.wrongTreatments || state.wrongRecords
        ? '관찰을 다시 확인하고 처치를 고쳐 두 마리를 안정시켰어.'
        : '관찰한 근거에 맞춰 두 마리를 각각 돌봤어.',
      tags: ['근거 관찰', '맞춤 처치'], traits: { analysis: 2, care: 1 }, contextRef: 'care-log',
    });
    setArtifacts({ careLog });
    completePage(5);
    setCompleted(true);
    audioService.playSfx('reward');
  };

  const stepDone = step === 1 ? seen >= zones.length : stable;
  const moveTo = (nextBird: BirdId, nextStep: number) => {
    clearFeedback();
    window.clearTimeout(recordTimer.current);
    setJustRecorded(null);
    setCard(null);
    setHeld(null);
    setCursor({ bird: nextBird, step: nextStep });
  };
  const next = completed
    ? { label: '새 정원 다시 만들기', onClick: () => onNavigate(6) }
    : step < 2
      ? { label: '다음', disabled: !stepDone, hint: `반짝이는 곳 ${zones.length - seen}개가 남았어`, onClick: () => moveTo(bird.id, 2) }
      : bird.id === 'green'
        ? { label: '젤리 살피기', disabled: !stepDone, hint: '기록판과 맞는 처치를 찾아 줘', onClick: () => moveTo('red', 1) }
        : { label: '돌봄 끝내기', disabled: !stepDone, hint: '기록판과 맞는 처치를 찾아 줘', onClick: finish };

  const openZone = card ? zones.find((item) => item.id === card) ?? null : null;
  const recordedStatement = openZone ? state.records[bird.id][openZone.id] : undefined;
  const selectedTreatment = held ? TREATMENTS.find((item) => item.id === held) ?? null : null;

  /** 진료 기록판 — 두 단계에 같은 모양으로 나온다. 관찰이 처치의 근거라는 걸 눈에 보이게. */
  const board = (
    <section className="p5-board" aria-label={`진료 기록판 ${seen} / ${zones.length}`}>
      <header className="p5-board__head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4.5V3h6v1.5M8.5 10h7M8.5 14h7M8.5 18h4" />
        </svg>
        <span><strong>진료 기록판</strong><small>{bird.name} 관찰 기록 {seen}/{zones.length}</small></span>
      </header>
      <ol className="p5-board__list">
        {zones.map((zone, index) => {
          const recorded = Boolean(state.records[bird.id][zone.id]);
          return (
            <li key={zone.id} className={`${recorded ? 'is-on' : ''}${justRecorded === zone.id ? ' is-new' : ''}${card === zone.id ? ' is-open' : ''}`}>
              <b>{recorded ? <ZoneIcon zone={zone.id} /> : index + 1}</b>
              <span>{recorded ? zone.sticker : `${zone.title} 살펴보기`}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );

  return (<>
    <StepShell
      page={5}
      step={step}
      steps={2}
      instruction={completed ? '지구와 젤리가 안정됐어' : `${bird.name}: ${INSTRUCTIONS[step - 1]!}`}
      mentor={MENTOR}
      mentorName={MENTOR_NAME}
      bubble={completed ? '두 아이가 왜 달랐는지 기억해 둬.' : reaction ?? BUBBLES[step - 1]!}
      status={<span className="p5-hearts" role="img" aria-label={`${bird.name} 기운 ${hearts} / 5`}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < hearts ? 'is-on' : ''} />)}<b>{bird.name}</b></span>}
      stageAction={<button type="button" className="p5-model-launch" onClick={() => setPreviewOpen(true)}>3D로 살펴보기</button>}
      help={<ul className="p5-help"><li>반짝이는 곳을 누르면 돋보기가 열려. 돋보기에 <b>정말 보이는 것</b>을 골라 기록판에 붙여.</li><li>처치 카드를 고른 다음 앵무를 눌러 줘. 아이콘을 손가락이나 마우스로 끌어 놓아도 돼. 키보드는 Tab으로 앵무를 찾아 Enter를 눌러.</li><li>처음 생각이 달라도 괜찮아. 기록을 다시 보고 돌봄 방법을 고치는 것도 중요한 일이야.</li><li>여기서는 수의사와 사육사가 함께 돌보는 상황을 연습해. 실제 아픈 새를 만나면 직접 처치하지 말고 어른에게 관찰한 것을 알려 줘.</li></ul>}
      done={completed ? { title: '지구와 젤리 모두 안정됐어' } : undefined}
      next={next}
      className="p5-page"
      onNavigate={onNavigate}
    >
      <div className="v4-card p5-stage">
        <div className="p5-tabs" aria-label="앵무새">
          {BIRDS.map((item) => (
            <span key={item.id} className={`p5-tab${item.id === bird.id ? ' is-current' : ''}${isStable(state, item.id) ? ' is-done' : ''}`}>
              <img src={isStable(state, item.id) ? item.recoveredImage : item.sickImage} alt="" />{item.name}{isStable(state, item.id) && <CheckIcon />}
            </span>
          ))}
        </div>

        <div className={`p5-body p5-body--${step}`}>
          <div
            className={`p5-bird${shake === 'bird' ? ' v4-shake' : ''}${held ? ' is-target' : ''}${stable ? ' is-stable' : ''}`}
            data-bird={bird.id}
            role={step === 2 && !stable ? 'button' : undefined}
            tabIndex={step === 2 && !stable && held ? 0 : undefined}
            aria-label={step === 2 ? `${bird.name} 처치 아이콘 놓는 곳` : bird.name}
            onDragOver={(event) => { if (step === 2) event.preventDefault(); }}
            onDrop={onDrop}
            onClick={() => { if (held) giveTreatment(held); }}
            onKeyDown={(event) => { if (held && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); giveTreatment(held); } }}
          >
            <img src={stable ? bird.recoveredImage : bird.sickImage} alt="" draggable={false} />
            {step === 1 && zones.map((zone, index) => {
              const done = Boolean(state.records[bird.id][zone.id]);
              return (
                <button
                  key={zone.id}
                  type="button"
                  className={`v4-hotspot${done ? ' is-done' : ''}${card === zone.id ? ' is-open' : ''}`}
                  style={{ left: `${zone.hotspot.x}%`, top: `${zone.hotspot.y}%` }}
                  aria-label={`${zone.title} 살펴보기${done ? ' (봤어)' : ''}`}
                  onClick={() => tapZone(zone.id)}
                >
                  {done ? <CheckIcon /> : index + 1}
                </button>
              );
            })}
            {held && <span className="p5-drop-hint">여기를 눌러 돌봐 주기</span>}
            {stable && step === 2 && <span className="p5-recovered">회복!</span>}
          </div>

          {step === 1 && (
            <div className="p5-side">
              {board}
              {openZone ? (
                recordedStatement ? (
                  <div className="p5-obs is-done" role="status" key={openZone.id}>
                    <span className="p5-closeup" style={{ backgroundImage: `url(${CLOSEUP_IMAGE[bird.id][openZone.id] ?? bird.sickImage})`, backgroundPosition: 'center', backgroundSize: 'cover' } as CSSProperties} aria-hidden="true"><i><CheckIcon /></i></span>
                    <div><strong>{openZone.title}: 기록했어</strong><p>{openZone.statements.find((item) => item.id === recordedStatement)!.text}</p></div>
                  </div>
                ) : (() => {
                  // 보이는 것 1 + 보이지 않는 것 1. 원래 자리 순서를 그대로 써서 구역마다 위치가 달라진다.
                  const options = [openZone.statements.find((item) => item.grounded)!, openZone.statements.find((item) => !item.grounded)!].sort((a, b) => openZone.statements.indexOf(a) - openZone.statements.indexOf(b));
                  return (
                    <div className={`p5-obs${shake === 'card' ? ' v4-shake' : ''}`} key={openZone.id}>
                      <span className="p5-closeup" style={{ backgroundImage: `url(${CLOSEUP_IMAGE[bird.id][openZone.id] ?? bird.sickImage})`, backgroundPosition: 'center', backgroundSize: 'cover' } as CSSProperties} aria-hidden="true" />
                      <div>
                        <strong>{openZone.title}: 여기 보이는 건?</strong>
                        <div className="v4-big-buttons" role="group" aria-label="보이는 것 고르기">
                          {options.map((item) => <button key={item.id} type="button" className="v4-big-button" onClick={() => pickStatement(openZone.id, item.id)}>{item.text}</button>)}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p5-obs p5-obs--empty"><span className="p5-closeup p5-closeup--empty" aria-hidden="true"><i>?</i></span><p>반짝이는 곳을 누르면 돋보기가 열려</p></div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="p5-side p5-treat">
              {board}
              {stable ? (
                <div className="p5-obs is-done" role="status"><span className="p5-closeup" style={{ backgroundImage: `url(${RECOVERY_IMAGE[bird.id] ?? bird.recoveredImage})`, backgroundPosition: 'center', backgroundSize: 'cover' } as CSSProperties} aria-hidden="true"><i><CheckIcon /></i></span><div><strong>{bird.name}이(가) 차분해졌어</strong><p>{TREATMENTS.find((item) => item.id === state.treatments[bird.id])?.name}: 딱 맞는 처치였어.</p></div></div>
              ) : (
                <div className="p5-treatment-picker">
                  <div className="p5-treat-cards" role="group" aria-label="처치 카드">
                    {TREATMENTS.map((treatment) => (
                      <button
                        key={treatment.id}
                        type="button"
                        className={`p5-treat-card${held === treatment.id ? ' is-selected' : ''}`}
                        aria-pressed={held === treatment.id}
                        aria-label={treatment.name}
                        onClick={() => { audioService.playSfx('tap'); setHeld(held === treatment.id ? null : treatment.id); }}
                      >
                        <img src={TREATMENT_IMAGE[treatment.id]} alt="" draggable={false} />
                        <strong>{treatment.name}</strong>
                        <small>{treatment.when}</small>
                      </button>
                    ))}
                  </div>
                  {selectedTreatment && (
                    <div
                      className="p5-treatment-token"
                      role="button"
                      tabIndex={0}
                      draggable
                      aria-label={`${selectedTreatment.name} 아이콘. ${bird.name}에게 끌어 놓기`}
                      onDragStart={(event) => { event.dataTransfer.setData(DRAG_TYPE, selectedTreatment.id); event.dataTransfer.effectAllowed = 'move'; }}
                      onPointerDown={(event) => touchStart(event, selectedTreatment.id)}
                      onPointerUp={touchEnd}
                      onPointerCancel={() => { touchDrag.current = null; }}
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); giveTreatment(selectedTreatment.id); } }}
                    >
                      <img src={TREATMENT_IMAGE[selectedTreatment.id]} alt="" draggable={false} />
                    </div>
                  )}
                </div>
              )}
              {!stable && <p className="p5-treat-hint">{held ? `${bird.name}를 누르거나 아이콘을 끌어 줘` : '먼저 처치 카드를 눌러 봐'}</p>}
            </div>
          )}
        </div>
      </div>
    </StepShell>
    {previewOpen && <Suspense fallback={<Modal title="입체 관찰을 준비하고 있어" onClose={() => setPreviewOpen(false)} actions={<button type="button" className="button button--primary" onClick={() => setPreviewOpen(false)}>관찰로 돌아가기</button>}><p>잠시만 기다려 줘.</p></Modal>}>
      <ParrotModelPreview initialBird={bird.id} stableBirds={BIRDS.filter((item) => isStable(state, item.id)).map((item) => item.id)} onClose={() => setPreviewOpen(false)} />
    </Suspense>}
  </>);
}
