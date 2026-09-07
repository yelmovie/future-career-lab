import { useEffect, useRef, useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { SlotBoard } from '../components/v4/SlotBoard';
import { audioService } from '../services/audioService';
import { v3Asset, v5Asset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { gardenHint, gardenStars, placedCount, readGarden, type GardenItem, type GardenPlaced, type GardenResult, type GardenSlot } from './gardenModel';
import './page06.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const STAGE = STAGE_META[1]!;
const MENTOR = v3Asset('keeper-haneul');
const MENTOR_NAME = '사육사 하늘';
const CHIPS = [
  { id: 'water', image: v5Asset('garden-water', 'png'), label: '물그릇' },
  { id: 'hideout', image: v5Asset('garden-hideout', 'png'), label: '숨는 집' },
  { id: 'rope', image: v5Asset('garden-play-rope', 'png'), label: '놀이 줄' },
  { id: 'feeder', image: v5Asset('garden-food-tree', 'png'), label: '먹이 나무' },
] as const satisfies readonly { id: GardenItem; image: string; label: string }[];
const SLOTS = [
  { id: 'shade', label: '조용히 쉬는 곳', hint: '물 마시고 숨는 자리', scene: v5Asset('garden-zone-rest'), capacity: 2 },
  { id: 'perch', label: '먹고 노는 곳', hint: '밝고 넓은 놀이 자리', scene: v5Asset('garden-zone-play'), capacity: 2 },
  { id: 'path', label: '사람이 지나는 길', hint: '발소리와 말소리가 들려', scene: v5Asset('garden-zone-path'), capacity: 2 },
] as const satisfies readonly { id: GardenSlot; label: string; hint: string; scene: string; capacity: number }[];
const INSTRUCTIONS = ['필요한 물건 놓기', '앵무새 불러 보기'];
const BIRD_SLOT_X: Record<GardenSlot, string> = { shade: '17%', perch: '50%', path: '83%' };

/** 시험 결과에 따라 하늘이 주는 힌트. 정답을 그대로 말하지 않고 앵무새 입장에서 묻는다. */
function resultHint(result: GardenResult): string {
  if (!result.waterQuiet) return '젤리가 물을 못 찾고 서성여. 젤리는 어디서 쉬고 싶어 할까?';
  if (!result.hideoutQuiet) return '지구가 숨을 곳을 못 찾았어. 사람 소리가 안 들리는 곳이 어디였지?';
  return '놀 물건이 엉뚱한 데 있거나 사람 길이 막혔어. 밝고 넓은 곳은 어디였지?';
}

export default function Page06Habitat({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const [placed, setPlaced] = useState<GardenPlaced>(() => readGarden(save.pageData.page06Draft));
  const [step, setStep] = useState(1);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<GardenResult | null>(null);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(6));
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const count = placedCount(placed);

  useEffect(() => { setPageData('page06Draft', placed); }, [placed, setPageData]);

  const place = (chip: GardenItem, slot: GardenSlot | null) => setPlaced((current) => {
    const next: GardenPlaced = { shade: current.shade.filter((id) => id !== chip), perch: current.perch.filter((id) => id !== chip), path: current.path.filter((id) => id !== chip) };
    if (slot) next[slot] = [...next[slot], chip];
    return next;
  });

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
      if (outcome.stars === 3) audioService.playCue('parrotHappy', 1400);
    }, 1400);
  };

  const finish = () => {
    if (!result) return;
    setPageData('page06Design', { placed, result });
    logEvent({
      page: 6, type: 'habitat-simulation',
      summary: `만족도 ${result.stars}별. 지구와 젤리에게 맞는 자리를 찾았어.`,
      tags: ['시험해 보기', '공간 설계'], traits: { analysis: 1, creation: 1, care: 2 }, contextRef: `simulation-${result.stars}-stars`,
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
    ? { label: '숲의 다른 새들 보러 가기', onClick: () => onNavigate(7) }
    : step === 1
      ? { label: '다음', disabled: count < 4, hint: `물건을 ${4 - count}개 더 놓아 봐`, onClick: () => setStep(2) }
      : perfect
        ? { label: '새 정원 완성', onClick: finish }
        : { label: result ? '옮겨서 다시' : '시험하기', disabled: testing, hint: '잠깐만, 보는 중이야', onClick: result ? () => { setResult(null); setStep(1); } : runTest };

  const bubble = completed
    ? '지구와 젤리는 괜찮아졌어. 그런데 숲에 살던 다른 새들은? 요즘 새소리가 줄었대.'
    : step === 1
      ? gardenHint(placed)
      : result
        ? perfect ? '둘 다 편해 보여! 새 정원 완성이야.' : resultHint(result)
        : testing ? '지구와 젤리가 어디로 가는지 잘 봐.' : '정말 편한지 불러서 살펴보자.';

  /** 시험 화면에서 새가 가는 자리: 젤리는 물그릇, 지구는 숨는 집을 찾아간다. 없으면 사람 길에서 서성인다. */
  const slotOf = (item: GardenItem): GardenSlot => (Object.keys(placed) as GardenSlot[]).find((slot) => placed[slot].includes(item)) ?? 'path';
  const birdX = (item: GardenItem) => (testing || result ? BIRD_SLOT_X[slotOf(item)] : '50%');

  return (
    <StepShell
      page={6}
      step={step}
      steps={2}
      instruction={completed ? '지구와 젤리가 새 정원에서 쉬어' : INSTRUCTIONS[step - 1]!}
      mentor={MENTOR}
      mentorName={MENTOR_NAME}
      bubble={bubble}
      status={result ? <span aria-label={`별 ${result.stars}개`}>{'★'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}</span> : `물건 ${count}/4`}
      help={<p>지구와 젤리에게는 조용히 숨고 물 마실 곳, 먹고 놀 곳이 필요해. 물건 네 개를 어울리는 곳에 놓고, 사람이 지나는 길은 비워 두자.</p>}
      done={completed ? { title: `${STAGE.badgeName}를 얻었어`, message: '지구와 젤리는 새 정원에서 쉬어. 이제 숲의 다른 새들을 둘러보자.', badge: { src: STAGE.badge, alt: STAGE.badgeName } } : undefined}
      next={next}
      className="p6-page"
      onNavigate={onNavigate}
    >
      <div className="v4-card p6-stage">
        {step === 1 && (
          <SlotBoard chips={CHIPS} slots={SLOTS} placed={placed} onPlace={place} chipsLabel="앵무새에게 필요한 물건" board={<div className="p6-garden" aria-hidden="true" />} />
        )}

        {step === 2 && (
          <div className="p6-test">
            <div className="p6-garden p6-garden--test">
              {SLOTS.map((slot) => (
                <div key={slot.id} className="p6-zone" data-slot={slot.id}>
                  <img className="p6-zone__scene" src={slot.scene} alt="" />
                  <strong>{slot.label}</strong>
                  <div className="p6-zone__items">{placed[slot.id].map((id) => { const chip = CHIPS.find((item) => item.id === id)!; return <img key={id} src={chip.image} alt={chip.label} />; })}</div>
                </div>
              ))}
              <img className={`p6-fly p6-fly--green${testing ? ' is-moving' : ''}`} style={{ left: birdX('hideout') }} src={v5Asset('parrot-well-green')} alt="지구" />
              <img className={`p6-fly p6-fly--red${testing ? ' is-moving' : ''}`} style={{ left: birdX('water') }} src={v5Asset('parrot-well-red')} alt="젤리" />
            </div>
            <div className="p6-result" aria-live="polite">
              {result ? (
                <>
                  <div className="p6-stars" aria-label={`별 ${result.stars}개`}>
                    {[result.waterQuiet, result.hideoutQuiet, result.pathClear].map((on, index) => <span key={index} className={on ? 'is-on' : ''}>★</span>)}
                  </div>
                  <ul className="p6-checks">
                    <li className={result.waterQuiet ? 'is-on' : ''}>{result.waterQuiet ? '젤리가 쉬면서 물을 마셨어' : '물그릇을 조용히 쉬는 곳으로 옮겨 줘'}</li>
                    <li className={result.hideoutQuiet ? 'is-on' : ''}>{result.hideoutQuiet ? '지구가 숨는 집에서 편히 쉬었어' : '숨는 집을 조용히 쉬는 곳에 놓아 줘'}</li>
                    <li className={result.pathClear ? 'is-on' : ''}>{result.pathClear ? '놀이 물건도 제자리, 사람 길도 비었어' : '놀이 물건은 먹고 노는 곳에 두고, 사람 길은 비워 줘'}</li>
                  </ul>
                </>
              ) : (
                <p className="p6-waiting">{testing ? '지구와 젤리를 보는 중…' : '시험하기를 눌러 봐'}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
}
