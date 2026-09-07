import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { CheckIcon, SoundIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { v3Asset, v5Asset } from '../shared/assets';
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
    water: v5Asset('closeup-red-water'),
    posture: v5Asset('closeup-red-posture'),
  },
};
const DRAG_TYPE = 'text/v4-treatment';
/**
 * 앵무 병원 놀이 — 한 마리당 3단계.
 * 1 돋보기로 살펴보고 증상 스티커 3장 모으기 → 2 건강한 소리와 비교 → 3 기록판을 보고 처치 고르기.
 */
const INSTRUCTIONS = ['반짝이는 곳 3개를 눌러 봐', '소리를 비교해 봐', '맞는 처치를 골라 줘'];
const BUBBLES = ['돋보기로 보면 뭐가 보여?', '건강한 소리랑 같을까, 다를까?', '기록판을 보고 골라 봐. 뭐가 필요할까?'];
/** 소리 비교: 건강한 앵무 소리(기준)는 항상 parrotCall. 같으면 "같아요"(=normal), 다르면 "달라요"(=abnormal). */
const VERDICT_LABEL: Record<SoundVerdict, string> = { normal: '같아요', abnormal: '달라요' };
const WAVE_SHAPE: Record<'normal' | 'abnormal', number[]> = {
  normal: [.3, .45, .6, .5, .35, .55, .65, .5, .4, .55, .45, .3],
  abnormal: [.9, .2, 1, .25, .95, .2, 1, .3, .9, .25, 1, .2],
};

/** 저장 상태에서 아직 안 끝난 첫 단계를 찾는다. 새로고침해도 하던 데서 이어진다. */
function firstOpenStep(state: CareState): { bird: BirdId; step: number } {
  for (const bird of BIRDS) {
    if (groundedCount(state, bird.id) < RECORDS_PER_BIRD) return { bird: bird.id, step: 1 };
    if (!soundCorrect(state, bird.id)) return { bird: bird.id, step: 2 };
    if (!isStable(state, bird.id)) return { bird: bird.id, step: 3 };
  }
  return { bird: 'red', step: 3 };
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

function Wave({ kind, playing }: { kind: 'normal' | 'abnormal'; playing: boolean }) {
  return (
    <span className={`p5-wave p5-wave--${kind}${playing ? ' is-playing' : ''}`} aria-hidden="true">
      {WAVE_SHAPE[kind].map((height, index) => <i key={index} style={{ '--h': `${Math.round(height * 100)}%` } as CSSProperties} />)}
    </span>
  );
}

export default function Page05ParrotCheck({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, setArtifacts, setAudio } = useGame();
  const [state, setState] = useState<CareState>(() => readCareState(save.pageData.page05Care));
  const [cursor, setCursor] = useState(() => firstOpenStep(state));
  const [card, setCard] = useState<CareZoneId | null>(null);
  const [reaction, setReaction] = useState<string | null>(null);
  const [shake, setShake] = useState<'sound' | 'bird' | 'card' | null>(null);
  const [playing, setPlaying] = useState<'ref' | 'bird' | null>(null);
  const [held, setHeld] = useState<TreatmentId | null>(null);
  const [justRecorded, setJustRecorded] = useState<CareZoneId | null>(null);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(5));
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const bird = getBird(cursor.bird);
  const step = cursor.step;
  const zones = CARE_ZONES[bird.id].map((id) => bird.zones.find((zone) => zone.id === id)!);
  const seen = zones.filter((zone) => state.records[bird.id][zone.id]).length;
  const stable = isStable(state, bird.id);
  const gauge = birdGauge(state, bird.id);
  const hearts = Math.max(1, Math.min(5, Math.round(gauge / 20)));
  const birdWave: 'normal' | 'abnormal' = bird.cue === 'parrotAlarm' ? 'abnormal' : 'normal';

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

  /** 돋보기 카드의 진술 2개 중 하나. 보이는 쪽만 기록되고, 짐작이면 되묻는다. */
  const pickStatement = (zone: CareZoneId, statementId: string) => {
    const result = chooseStatement(state, bird.id, zone, statementId);
    commit(() => result.state);
    if (result.grounded) {
      audioService.playSfx('clue');
      setJustRecorded(zone);
      later(() => setJustRecorded(null), 700);
    } else react('그게 정말 보여? 돋보기 안을 다시 봐.', 'card');
  };

  const playCall = (which: 'ref' | 'bird') => {
    // "듣기"는 사용자가 소리를 요청한 명시적인 동작이다. 저장된 음소거/0 볼륨
    // 때문에 버튼만 움직이고 아무 소리도 안 나는 상태가 되지 않게 즉시 복구한다.
    if (save.audio.muted || save.audio.sfxVolume === 0) {
      const sfxVolume = save.audio.sfxVolume > 0 ? save.audio.sfxVolume : 0.7;
      audioService.configure({ ...save.audio, muted: false, sfxVolume });
      setAudio({ muted: false, sfxVolume });
    }
    audioService.unlock();
    audioService.playCue(which === 'ref' ? 'parrotCall' : bird.cue);
    setPlaying(which);
    later(() => setPlaying(null), 2200);
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
    if (result.matched) { audioService.playSfx('success'); audioService.playCue('parrotHappy', 1400); }
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
      ? { label: '다음', disabled: !stepDone, hint: step === 1 ? `반짝이는 곳 ${zones.length - seen}개가 남았어` : '먼저 두 소리를 듣고 골라 봐', onClick: () => { setCard(null); setCursor({ bird: bird.id, step: step + 1 }); } }
      : bird.id === 'green'
        ? { label: '젤리 살피기', disabled: !stepDone, hint: '기록판과 맞는 처치를 찾아 줘', onClick: () => setCursor({ bird: 'red', step: 1 }) }
        : { label: '돌봄 끝내기', disabled: !stepDone, hint: '기록판과 맞는 처치를 찾아 줘', onClick: finish };

  const openZone = card ? zones.find((item) => item.id === card) ?? null : null;
  const recordedStatement = openZone ? state.records[bird.id][openZone.id] : undefined;
  const soundVerdict = state.sound[bird.id];

  /** 진료 기록판 — 1·3단계에 같은 모양으로 나온다. 관찰이 처치의 근거라는 걸 눈에 보이게. */
  const board = (
    <ol className="p5-board" aria-label={`진료 기록판 ${seen} / ${zones.length}`}>
      {zones.map((zone, index) => {
        const recorded = Boolean(state.records[bird.id][zone.id]);
        return (
          <li key={zone.id} className={`${recorded ? 'is-on' : ''}${justRecorded === zone.id ? ' is-new' : ''}${card === zone.id ? ' is-open' : ''}`}>
            <b>{recorded ? <ZoneIcon zone={zone.id} /> : index + 1}</b>
            <span>{recorded ? zone.sticker : `${zone.title} 살펴보기`}</span>
          </li>
        );
      })}
      {step === 3 && soundVerdict && (
        <li className="is-on is-sound"><b><SoundIcon /></b><span>소리 {VERDICT_LABEL[soundVerdict]}</span></li>
      )}
    </ol>
  );

  return (
    <StepShell
      page={5}
      step={step}
      steps={3}
      instruction={completed ? '지구와 젤리가 안정됐어' : `${bird.name}: ${INSTRUCTIONS[step - 1]!}`}
      mentor={MENTOR}
      mentorName={MENTOR_NAME}
      bubble={completed ? '두 아이가 왜 달랐는지 기억해 둬.' : reaction ?? BUBBLES[step - 1]!}
      status={<span className="p5-hearts" role="img" aria-label={`${bird.name} 기운 ${hearts} / 5`}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < hearts ? 'is-on' : ''} />)}<b>{bird.name}</b></span>}
      help={<ul className="p5-help"><li>반짝이는 곳을 누르면 돋보기가 열려. 돋보기에 <b>정말 보이는 것</b>을 골라 기록판에 붙여.</li><li>건강한 앵무 소리와 {bird.name} 소리를 듣고 같은지 다른지 골라.</li><li>기록판의 증상과 카드의 "언제 쓰나"를 맞춰 처치를 골라 앵무에게 줘. 틀려도 벌칙은 없어.</li></ul>}
      done={completed ? { title: '지구와 젤리 모두 안정됐어', message: '돌봄 기록을 새 정원 다시 만들기로 보냈어.' } : undefined}
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
            role={step === 3 && !stable ? 'button' : undefined}
            tabIndex={step === 3 && !stable ? 0 : undefined}
            aria-label={step === 3 ? `${bird.name}에게 고른 처치 주기` : bird.name}
            onClick={() => held && giveTreatment(held)}
            onKeyDown={(event) => { if (held && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); giveTreatment(held); } }}
            onDragOver={(event) => { if (step === 3) event.preventDefault(); }}
            onDrop={onDrop}
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
            {held && <span className="p5-drop-hint">여기 놓기</span>}
            {stable && step === 3 && <span className="p5-recovered">회복!</span>}
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
            <div className={`p5-side p5-sound${shake === 'sound' ? ' v4-shake' : ''}`}>
              <div className="p5-sound-pair">
                <button type="button" className={`p5-sound-card${playing === 'ref' ? ' is-playing' : ''}`} onClick={() => playCall('ref')} aria-label="건강한 앵무 소리 듣기">
                  <span className="p5-sound-card__who">건강한 앵무</span>
                  <Wave kind="normal" playing={playing === 'ref'} />
                  <span className="p5-sound-card__play"><SoundIcon />듣기</span>
                </button>
                <button type="button" className={`p5-sound-card is-bird${playing === 'bird' ? ' is-playing' : ''}`} onClick={() => playCall('bird')} aria-label={`${bird.name} 소리 듣기`}>
                  <span className="p5-sound-card__who"><img src={bird.sickImage} alt="" />{bird.name}</span>
                  <Wave kind={birdWave} playing={playing === 'bird'} />
                  <span className="p5-sound-card__play"><SoundIcon />듣기</span>
                </button>
              </div>
              <strong className="p5-sound-q">두 소리가 같아, 달라?</strong>
              {soundVerdict && soundVerdict !== bird.soundAnswer && <p className="p5-sound-hint">{bird.soundHint}</p>}
              <div className="v4-big-buttons" role="group" aria-label="소리 비교">
                {(['normal', 'abnormal'] as const).map((verdict) => (
                  <button
                    key={verdict}
                    type="button"
                    className={`v4-big-button${soundVerdict === verdict ? (verdict === bird.soundAnswer ? ' is-selected' : ' is-wrong') : ''}`}
                    onClick={() => judgeSound(verdict)}
                    aria-pressed={soundVerdict === verdict}
                  >
                    {VERDICT_LABEL[verdict]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p5-side p5-treat">
              {board}
              {stable ? (
                <div className="p5-obs is-done" role="status"><span className="p5-closeup" style={{ backgroundImage: `url(${bird.recoveredImage})`, backgroundPosition: '50% 30%' } as CSSProperties} aria-hidden="true"><i><CheckIcon /></i></span><div><strong>{bird.name}이(가) 차분해졌어</strong><p>{TREATMENTS.find((item) => item.id === state.treatments[bird.id])?.name}: 딱 맞는 처치였어.</p></div></div>
              ) : (
                <div className="p5-treat-cards" role="group" aria-label="처치 카드">
                  {TREATMENTS.map((treatment) => (
                    <button
                      key={treatment.id}
                      type="button"
                      draggable
                      className={`p5-treat-card${held === treatment.id ? ' is-selected' : ''}`}
                      aria-pressed={held === treatment.id}
                      aria-label={treatment.name}
                      onDragStart={(event) => { event.dataTransfer.setData(DRAG_TYPE, treatment.id); event.dataTransfer.effectAllowed = 'move'; setHeld(treatment.id); }}
                      onClick={() => { audioService.playSfx('tap'); setHeld(held === treatment.id ? null : treatment.id); }}
                    >
                      <img src={TREATMENT_IMAGE[treatment.id]} alt="" draggable={false} />
                      <strong>{treatment.name}</strong>
                      <small>{treatment.when}</small>
                      {held === treatment.id && <i className="v4-choice__check" aria-hidden="true"><CheckIcon /></i>}
                    </button>
                  ))}
                </div>
              )}
              {!stable && <p className="p5-treat-hint">{held ? `${bird.name}를 눌러서 처치를 줘` : '카드를 누르고 앵무를 눌러 봐'}</p>}
            </div>
          )}
        </div>
      </div>
    </StepShell>
  );
}
