import { useEffect, useRef, useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { SlotBoard } from '../components/v4/SlotBoard';
import { audioService } from '../services/audioService';
import { pageAsset, sample3d } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { gardenStars, placedCount, readGarden, type GardenItem, type GardenPlaced, type GardenResult, type GardenSlot } from './gardenModel';
import './page06.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const STAGE = STAGE_META[1]!;
const MENTOR = pageAsset(5, 1);
const MENTOR_NAME = '사육사 하늘';
const CHIPS = [
  { id: 'water', image: sample3d(6), label: '물그릇' },
  { id: 'hideout', image: sample3d(5), label: '숨숨 상자' },
  { id: 'rope', image: sample3d(4), label: '놀이 로프' },
  { id: 'feeder', image: sample3d(3), label: '먹이 나무' },
] as const satisfies readonly { id: GardenItem; image: string; label: string }[];
const SLOTS = [
  { id: 'shade', label: '조용한 나무 그늘', capacity: 2 },
  { id: 'perch', label: '쉬는 횃대', capacity: 2 },
  { id: 'path', label: '관람로 쪽 (시끄러움)', capacity: 2 },
] as const satisfies readonly { id: GardenSlot; label: string; capacity: number }[];
const QUESTIONS = [
  { id: 'ruby', text: '루비(탈수)는 물을 마실까?', check: (result: GardenResult) => result.waterQuiet },
  { id: 'momo', text: '모모(스트레스)는 쉴까?', check: (result: GardenResult) => result.hideoutQuiet },
] as const;
type QuestionId = (typeof QUESTIONS)[number]['id'];
type Answers = Partial<Record<QuestionId, boolean>>;
const INSTRUCTIONS = ['물건을 정원에 놓아 봐', '예측해 봐', '시험해 봐'];
const BUBBLES = ['어디가 조용하고, 어디가 시끄러울까?', '지금 정원이면 어떻게 될까?', '예측이 맞는지 볼까?'];
const BIRD_SLOT_X: Record<GardenSlot, string> = { shade: '17%', perch: '50%', path: '83%' };

function readAnswers(value: unknown): Answers {
  const raw = value && typeof value === 'object' ? (value as { answers?: Record<string, unknown> }).answers : null;
  const answers: Answers = {};
  for (const question of QUESTIONS) if (typeof raw?.[question.id] === 'boolean') answers[question.id] = raw[question.id] as boolean;
  return answers;
}

export default function Page06Habitat({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const [placed, setPlaced] = useState<GardenPlaced>(() => readGarden(save.pageData.page06Draft));
  const [answers, setAnswers] = useState<Answers>(() => readAnswers(save.pageData.page06Draft));
  const [step, setStep] = useState(1);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<GardenResult | null>(null);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(6));
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const count = placedCount(placed);
  const answered = QUESTIONS.every((question) => answers[question.id] !== undefined);

  useEffect(() => { setPageData('page06Draft', { ...placed, answers }); }, [placed, answers, setPageData]);

  const place = (chip: GardenItem, slot: GardenSlot | null) => setPlaced((current) => {
    const next: GardenPlaced = { shade: current.shade.filter((id) => id !== chip), perch: current.perch.filter((id) => id !== chip), path: current.path.filter((id) => id !== chip) };
    if (slot) next[slot] = [...next[slot], chip];
    return next;
  });
  const answer = (id: QuestionId, value: boolean) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    audioService.playSfx('tap');
  };

  const runTest = () => {
    if (testing) return;
    setTesting(true);
    setResult(null);
    audioService.playSfx('record');
    const outcome = gardenStars(placed);
    timer.current = window.setTimeout(() => {
      setResult(outcome);
      setTesting(false);
      setArtifacts({ habitatStars: outcome.stars });
      audioService.playSfx(outcome.stars === 3 ? 'success' : 'warning');
    }, 1400);
  };

  const finish = () => {
    if (!result) return;
    const hits = QUESTIONS.filter((question) => answers[question.id] === question.check(result)).length;
    setPageData('page06Design', { placed, result, answers });
    logEvent({
      page: 6, type: 'habitat-simulation',
      summary: `만족도 ${result.stars}별. 예측 ${hits}/${QUESTIONS.length} 맞음.`,
      tags: ['시험해 보기', '예측 검증', '공간 설계'], traits: { analysis: 2, creation: 1, care: 1 }, contextRef: `simulation-${result.stars}-stars`,
    });
    setArtifacts({ habitatStars: result.stars });
    completePage(6);
    addBadge(STAGE.badgeName);
    addJobCard(STAGE.jobTitle);
    setCompleted(true);
    audioService.playSfx('reward');
  };

  const perfect = result?.stars === 3;
  const next = completed
    ? { label: '숲 생태 조사로 가기', onClick: () => onNavigate(7) }
    : step === 1
      ? { label: '다음', disabled: count < 3, hint: `물건을 ${3 - count}개 더 놓아 봐`, onClick: () => setStep(2) }
      : step === 2
        ? { label: '다음', disabled: !answered, hint: '두 질문에 다 답해 봐', onClick: () => setStep(3) }
        : perfect
          ? { label: '새 정원 완성', onClick: finish }
          : { label: result ? '옮겨서 다시' : '시험하기', disabled: testing, hint: '잠깐만, 보는 중이야', onClick: result ? () => { setResult(null); setStep(1); } : runTest };

  /** 시험 화면에서 새가 가는 자리: 루비는 물그릇, 모모는 숨숨 상자를 찾아간다. 없으면 관람로 쪽에서 서성인다. */
  const slotOf = (item: GardenItem): GardenSlot => (Object.keys(placed) as GardenSlot[]).find((slot) => placed[slot].includes(item)) ?? 'path';
  const birdX = (item: GardenItem) => (testing || result ? BIRD_SLOT_X[slotOf(item)] : '50%');

  return (
    <StepShell
      page={6}
      step={step}
      steps={3}
      instruction={completed ? '모모와 루비가 새 정원에서 쉬어' : INSTRUCTIONS[step - 1]!}
      mentor={MENTOR}
      mentorName={MENTOR_NAME}
      bubble={completed ? '그런데 숲 가장자리엔 왜 새소리가 없었지?' : result && !perfect ? '별이 빠진 자리는 어디일까?' : BUBBLES[step - 1]!}
      status={result ? <span aria-label={`별 ${result.stars}개`}>{'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}</span> : `물건 ${count}/4`}
      help={<p>물그릇·숨숨 상자·놀이 로프·먹이 나무를 세 구역에 놓아. 관람로 쪽은 시끄러워. 모모와 루비가 편히 지내면 별 3개야. 별이 모자라면 옮겨서 다시 시험하면 돼.</p>}
      done={completed ? { title: `${STAGE.badgeName}를 얻었어`, message: '모모와 루비가 새 정원에서 쉬고 있어.' } : undefined}
      next={next}
      className="p6-page"
      onNavigate={onNavigate}
    >
      <div className="v4-card p6-stage">
        {step === 1 && (
          <SlotBoard chips={CHIPS} slots={SLOTS} placed={placed} onPlace={place} chipsLabel="여기서 골라" board={<div className="p6-garden" aria-hidden="true" />} />
        )}

        {step === 2 && (
          <div className="p6-predict">
            {QUESTIONS.map((question) => (
              <div key={question.id} className="p6-question">
                <strong>{question.text}</strong>
                <div className="v4-big-buttons">
                  {[true, false].map((value) => (
                    <button key={String(value)} type="button" className={`v4-big-button${answers[question.id] === value ? ' is-selected' : ''}`} aria-pressed={answers[question.id] === value} onClick={() => answer(question.id, value)}>
                      {value ? '예' : '아니오'}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="p6-test">
            <div className="p6-garden p6-garden--test">
              {SLOTS.map((slot) => (
                <div key={slot.id} className="p6-zone">
                  <strong>{slot.label}</strong>
                  <div className="p6-zone__items">{placed[slot.id].map((id) => { const chip = CHIPS.find((item) => item.id === id)!; return <img key={id} src={chip.image} alt={chip.label} />; })}</div>
                </div>
              ))}
              <img className={`p6-fly p6-fly--green${testing ? ' is-moving' : ''}`} style={{ left: birdX('hideout') }} src={sample3d(1)} alt="모모" />
              <img className={`p6-fly p6-fly--red${testing ? ' is-moving' : ''}`} style={{ left: birdX('water') }} src={sample3d(2)} alt="루비" />
            </div>
            <div className="p6-result" aria-live="polite">
              {result ? (
                <>
                  <div className="p6-stars" aria-label={`별 ${result.stars}개`}>
                    {[result.waterQuiet, result.hideoutQuiet, result.pathClear].map((on, index) => <span key={index} className={on ? 'is-on' : ''}>★</span>)}
                  </div>
                  <ul className="p6-checks">
                    <li className={result.waterQuiet ? 'is-on' : ''}>루비가 물을 {result.waterQuiet ? '마셨어' : '못 찾았어 (물그릇은 루비가 쉬는 쪽에)'}</li>
                    <li className={result.hideoutQuiet ? 'is-on' : ''}>모모가 {result.hideoutQuiet ? '조용히 쉬었어' : '못 쉬었어'}</li>
                    <li className={result.pathClear ? 'is-on' : ''}>관람로 쪽이 {result.pathClear ? '조용해' : '시끄러워'}</li>
                  </ul>
                  <p className="p6-hit">{QUESTIONS.map((question) => `${question.id === 'ruby' ? '루비' : '모모'} 예측 ${answers[question.id] === question.check(result) ? '맞음' : '빗나감'}`).join(' · ')}</p>
                </>
              ) : (
                <p className="p6-waiting">{testing ? '모모와 루비를 보는 중…' : '시험하기를 눌러 봐'}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
}
