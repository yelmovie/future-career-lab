import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { CheckIcon, SoundIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { pageAsset, sample3d } from '../shared/assets';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { BIRDS, CARE_ZONES, getBird, TREATMENTS, type BirdId, type CareZoneId, type SoundVerdict, type TreatmentId } from './page05Data';
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
  soundCorrect,
  type CareState,
} from './page05CareModel';
import './page05.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const MENTOR = pageAsset(5, 1);
const MENTOR_NAME = '사육사 하늘';
const TREATMENT_IMAGE: Record<TreatmentId, string> = { water: sample3d(6), shelter: pageAsset(5, 10), puzzle: pageAsset(5, 8), feather: pageAsset(5, 9) };
const TREATMENT_OPTIONS = TREATMENTS.map((item) => ({ id: item.id, image: TREATMENT_IMAGE[item.id], label: item.name }));
const DRAG_TYPE = 'text/v4-treatment';
const INSTRUCTIONS = ['반짝이는 곳 3개를 눌러 봐', '소리를 듣고 골라 봐', '맞는 처치를 앵무에게 줘'];
const BUBBLES = ['어디가 이상해 보여?', '평소 소리랑 같을까?', '이 아이한테 지금 뭐가 필요할까?'];

/** 저장 상태에서 아직 안 끝난 첫 단계를 찾는다. 새로고침해도 하던 데서 이어진다. */
function firstOpenStep(state: CareState): { bird: BirdId; step: number } {
  for (const bird of BIRDS) {
    if (groundedCount(state, bird.id) < RECORDS_PER_BIRD) return { bird: bird.id, step: 1 };
    if (!soundCorrect(state, bird.id)) return { bird: bird.id, step: 2 };
    if (!isStable(state, bird.id)) return { bird: bird.id, step: 3 };
  }
  return { bird: 'red', step: 3 };
}

export default function Page05ParrotCheck({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, setArtifacts } = useGame();
  const [state, setState] = useState<CareState>(() => readCareState(save.pageData.page05Care));
  const [cursor, setCursor] = useState(() => firstOpenStep(state));
  const [card, setCard] = useState<CareZoneId | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [shake, setShake] = useState<'sound' | 'bird' | 'card' | null>(null);
  const [playing, setPlaying] = useState(false);
  const [held, setHeld] = useState<TreatmentId | null>(null);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(5));
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const bird = getBird(cursor.bird);
  const step = cursor.step;
  const zones = CARE_ZONES[bird.id].map((id) => bird.zones.find((zone) => zone.id === id)!);
  const seen = zones.filter((zone) => state.records[bird.id][zone.id]).length;
  const stable = isStable(state, bird.id);
  const gauge = birdGauge(state, bird.id);

  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const commit = (recipe: (current: CareState) => CareState) => setState(recipe);
  useEffect(() => { setPageData('page05Care', state); }, [state, setPageData]);
  const react = (text: string, target: 'sound' | 'bird' | 'card') => {
    setReaction(text);
    setShake(target);
    audioService.playSfx('warning');
    later(() => setShake(null), 450);
    later(() => setReaction(null), 2600);
  };

  const tapZone = (zone: CareZoneId) => {
    audioService.playSfx('tap');
    setCard(zone);
  };

  /** 카드의 진술 2개 중 하나를 고른다. 근거 있는 쪽만 기록되고, 짐작이면 되묻는다. */
  const pickStatement = (zone: CareZoneId, statementId: string) => {
    const result = chooseStatement(state, bird.id, zone, statementId);
    commit(() => result.state);
    if (result.grounded) audioService.playSfx('clue');
    else react('그게 정말 보여? 짐작 말고, 지금 보이는 걸 다시 찾아 봐.', 'card');
  };

  const playCall = () => {
    audioService.unlock();
    audioService.playCue(bird.cue);
    setPlaying(true);
    later(() => setPlaying(false), 2200);
  };

  const judgeSound = (verdict: SoundVerdict) => {
    commit((current) => ({ ...current, sound: { ...current.sound, [bird.id]: verdict } }));
    if (verdict === bird.soundAnswer) audioService.playSfx('success');
    else react(bird.soundFeedback[verdict], 'sound');
  };

  const giveTreatment = (treatment: TreatmentId) => {
    setHeld(null);
    const result = applyTreatment(state, bird.id, treatment);
    commit(() => result.state);
    if (result.matched) audioService.playSfx('success');
    else react(result.feedback, 'bird');
  };
  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const id = (event.dataTransfer.getData(DRAG_TYPE) || held) as TreatmentId | '';
    if (id) giveTreatment(id);
  };

  const finish = () => {
    const mission = evaluateCare(state);
    const careLog = buildCareLog(state);
    careLog.forEach((entry) => logEvent({
      page: 5, type: 'care-treatment', summary: `${getBird(entry.bird).name}: ${entry.issue} → ${entry.treatment}`,
      tags: ['동물·생명', '개체별 돌봄', entry.issue], traits: { care: 2, analysis: 1 }, contextRef: `treatment-${entry.bird}`,
    }));
    logEvent({
      page: 5, type: mission.perfect ? 'care-perfect' : 'care-recorded',
      summary: mission.perfect ? '헛 처치 없이 두 마리를 안정시켰어.' : `두 마리를 안정시켰어. (틀린 처치 ${state.wrongTreatments}번)`,
      tags: ['근거 관찰', '소리 분류'], traits: { analysis: 2, care: 1 }, contextRef: 'care-log',
    });
    setArtifacts({ careLog });
    completePage(5);
    setCompleted(true);
    audioService.playSfx('reward');
  };

  const stepDone = step === 1 ? seen >= zones.length : step === 2 ? soundCorrect(state, bird.id) : stable;
  const next = completed
    ? { label: '새 정원 다시 만들기', onClick: () => onNavigate(6) }
    : step < 3
      ? { label: '다음', disabled: !stepDone, hint: step === 1 ? `반짝이는 곳 ${zones.length - seen}개가 남았어` : '먼저 소리를 듣고 골라 봐', onClick: () => { setCard(null); setCursor({ bird: bird.id, step: step + 1 }); } }
      : bird.id === 'green'
        ? { label: '루비 살피기', disabled: !stepDone, hint: '맞는 처치를 찾아 줘', onClick: () => setCursor({ bird: 'red', step: 1 }) }
        : { label: '돌봄 끝내기', disabled: !stepDone, hint: '맞는 처치를 찾아 줘', onClick: finish };

  return (
    <StepShell
      page={5}
      step={step}
      steps={3}
      instruction={completed ? '모모와 루비가 안정됐어' : `${bird.name}: ${INSTRUCTIONS[step - 1]!}`}
      mentor={MENTOR}
      mentorName={MENTOR_NAME}
      bubble={completed ? '두 아이가 왜 달랐는지 기억해 둬.' : reaction ?? BUBBLES[step - 1]!}
      status={<span className="p5-status" style={{ '--g': `${gauge}%` } as CSSProperties}><i /><b>{bird.name} {gauge}%</b></span>}
      help={<p>앵무새마다 아픈 이유가 달라. 반짝이는 곳을 눌러 살피고, 소리를 듣고, 맞는 처치를 골라 줘. 틀려도 벌칙은 없어. 다시 하면 돼.</p>}
      done={completed ? { title: '모모와 루비 모두 안정됐어', message: '돌봄 기록을 새 정원 다시 만들기로 보냈어.' } : undefined}
      next={next}
      className="p5-page"
      onNavigate={onNavigate}
    >
      <div className="v4-card p5-stage">
        <div className="p5-tabs" aria-label="앵무새">
          {BIRDS.map((item) => (
            <span key={item.id} className={`p5-tab${item.id === bird.id ? ' is-current' : ''}${isStable(state, item.id) ? ' is-done' : ''}`}>
              <img src={isStable(state, item.id) ? item.recoveredImage : item.sickImage} alt="" />{item.name}
            </span>
          ))}
        </div>

        <div className={`p5-body p5-body--${step}`}>
          <div
            className={`p5-bird${shake === 'bird' ? ' v4-shake' : ''}${held ? ' is-target' : ''}${stable ? ' is-stable' : ''}`}
            data-bird={bird.id}
            role={step === 3 && !stable ? 'button' : undefined}
            tabIndex={step === 3 && !stable ? 0 : undefined}
            aria-label={step === 3 ? `${bird.name}에게 고른 처치 주기` : bird.name}
            onClick={() => held && giveTreatment(held)}
            onKeyDown={(event) => { if (held && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); giveTreatment(held); } }}
            onDragOver={(event) => { if (step === 3) event.preventDefault(); }}
            onDrop={onDrop}
          >
            <img src={stable ? bird.recoveredImage : bird.sickImage} alt="" draggable={false} />
            {step === 1 && zones.map((zone) => {
              const done = Boolean(state.records[bird.id][zone.id]);
              return (
                <button
                  key={zone.id}
                  type="button"
                  className={`v4-hotspot${done ? ' is-done' : ''}`}
                  style={{ left: `${zone.hotspot.x}%`, top: `${zone.hotspot.y}%` }}
                  aria-label={`${zone.title} 살펴보기${done ? ' (봤어)' : ''}`}
                  onClick={() => tapZone(zone.id)}
                >
                  {done ? <CheckIcon /> : zones.indexOf(zone) + 1}
                </button>
              );
            })}
            {held && <span className="p5-drop-hint">여기 놓기</span>}
          </div>

          {step === 1 && (
            <div className="p5-side">
              {card ? (() => {
                const zone = zones.find((item) => item.id === card)!;
                const recorded = state.records[bird.id][card];
                if (recorded) return <div className="p5-obs" role="status" key={card}><strong>{zone.title}</strong><p>{zone.statements.find((item) => item.id === recorded)!.text}</p></div>;
                // 근거 1 + 짐작 1. 원래 자리 순서를 그대로 써서 구역마다 위치가 달라진다.
                const options = [zone.statements.find((item) => item.grounded)!, zone.statements.find((item) => !item.grounded)!].sort((a, b) => zone.statements.indexOf(a) - zone.statements.indexOf(b));
                return (
                  <div className={`p5-obs${shake === 'card' ? ' v4-shake' : ''}`} key={card}>
                    <strong>{zone.title}: 뭐가 보여?</strong>
                    <div className="v4-big-buttons" role="group" aria-label="보이는 것 고르기">
                      {options.map((item) => <button key={item.id} type="button" className="v4-big-button" onClick={() => pickStatement(card, item.id)}>{item.text}</button>)}
                    </div>
                  </div>
                );
              })() : (
                <div className="p5-obs p5-obs--empty"><p>반짝이는 곳을 눌러 봐</p></div>
              )}
              <div className="p5-count" aria-label={`관찰 ${seen} / ${zones.length}`}>{zones.map((zone) => <i key={zone.id} className={state.records[bird.id][zone.id] ? 'is-on' : ''} />)}</div>
            </div>
          )}

          {step === 2 && (
            <div className={`p5-side p5-sound${shake === 'sound' ? ' v4-shake' : ''}`}>
              <button type="button" className={`p5-play${playing ? ' is-playing' : ''}`} onClick={playCall} aria-label={`${bird.name} 소리 듣기`}>
                <SoundIcon /><span>소리 듣기</span>
              </button>
              <div className={`p5-wave${playing ? ' is-playing' : ''}`} aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
              </div>
              {state.sound[bird.id] && state.sound[bird.id] !== bird.soundAnswer && <p className="p5-sound-hint">{bird.soundHint}</p>}
              <div className="v4-big-buttons">
                {(['normal', 'abnormal'] as const).map((verdict) => (
                  <button
                    key={verdict}
                    type="button"
                    className={`v4-big-button${state.sound[bird.id] === verdict ? (verdict === bird.soundAnswer ? ' is-selected' : ' is-wrong') : ''}`}
                    onClick={() => judgeSound(verdict)}
                    aria-pressed={state.sound[bird.id] === verdict}
                  >
                    {verdict === 'normal' ? '괜찮아' : '이상해'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p5-side p5-treat">
              {stable ? (
                <div className="p5-obs" role="status"><strong>앵무가 차분해졌어</strong><p>{TREATMENTS.find((item) => item.id === state.treatments[bird.id])?.name}: 딱 맞는 처치였어.</p></div>
              ) : (
                <>
                  <p className="p5-treat-hint">카드를 고르고 앵무를 눌러 봐</p>
                  <div className="p5-treat-cards" role="group" aria-label="처치 카드">
                    {TREATMENT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        draggable
                        className={`v4-choice${held === option.id ? ' is-selected' : ''}`}
                        aria-pressed={held === option.id}
                        onDragStart={(event) => { event.dataTransfer.setData(DRAG_TYPE, option.id); event.dataTransfer.effectAllowed = 'move'; setHeld(option.id); }}
                        onClick={() => { audioService.playSfx('tap'); setHeld(held === option.id ? null : option.id); }}
                      >
                        <span className="v4-choice__art v4-choice__art--contain"><img src={option.image} alt="" draggable={false} /></span>
                        <strong>{option.label}</strong>
                        {held === option.id && <i className="v4-choice__check" aria-hidden="true"><CheckIcon /></i>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}
