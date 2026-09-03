import { useEffect, useMemo, useRef, useState } from 'react';
import { GameShell, MissionGuide, Panel } from '../components/GameShell';
import { PhaserStage } from '../components/PhaserStage';
import { StageComplete } from '../components/StageComplete';
import { CheckIcon, GripIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { HabitatScene } from './HabitatScene';
import {
  BEHAVIOR_LABELS,
  checkConditions,
  conditionsFromCareLog,
  evaluateHabitat,
  HABITAT_ITEM_IDS,
  HABITAT_ITEMS,
  HABITAT_STRATEGIES,
  layoutSignature,
  WATER_REACH,
  type Behavior,
  type HabitatItemId,
  type HabitatPlacement,
  type HabitatSimulationResult,
} from './habitatModel';
import './page06.css';

interface PageProps {
  onNavigate: (page: PageNumber) => void;
}

type Prediction = Behavior | 'none';
const PREDICTIONS: { id: Prediction; label: string }[] = [
  { id: 'eat', label: '먹기가 안 보일 거야' },
  { id: 'play', label: '놀기가 안 보일 거야' },
  { id: 'rest', label: '쉬기가 안 보일 거야' },
  { id: 'none', label: '셋 다 보일 거야' },
];
const isPrediction = (value: unknown): value is Prediction => value === 'eat' || value === 'play' || value === 'rest' || value === 'none';
const STAGE = STAGE_META[1]!;

function readDraftPlacements(value: unknown): HabitatPlacement[] {
  if (!value || typeof value !== 'object') return [];
  const candidate = (value as { placements?: unknown }).placements;
  if (!Array.isArray(candidate)) return [];
  return candidate.slice(0, 4).filter((item): item is HabitatPlacement => {
    if (!item || typeof item !== 'object') return false;
    const placement = item as Partial<HabitatPlacement>;
    return typeof placement.instanceId === 'string'
      && typeof placement.itemId === 'string'
      && HABITAT_ITEM_IDS.includes(placement.itemId as HabitatItemId)
      && typeof placement.x === 'number' && Number.isFinite(placement.x)
      && typeof placement.y === 'number' && Number.isFinite(placement.y)
      && typeof placement.rotation === 'number' && Number.isFinite(placement.rotation);
  });
}

function readStoredPrediction(value: unknown): Prediction | null {
  const candidate = value && typeof value === 'object' ? (value as { prediction?: unknown }).prediction : null;
  return isPrediction(candidate) ? candidate : null;
}

const KEEP_REASONS = [
  '출입 동선과 각 활동 지점 사이에 충분한 간격이 있어.',
  '휴식·활동·급수 선택지가 서로 겹치지 않고 이어져.',
  '관찰 결과 안전성과 이동 흐름이 모두 안정적이었어.',
] as const;

export default function Page06Habitat({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const storedDraft = useMemo(() => readDraftPlacements(save.pageData.page06Draft), []);
  const [placements, setPlacements] = useState<HabitatPlacement[]>(storedDraft);
  const [prediction, setPrediction] = useState<Prediction | null>(() => readStoredPrediction(save.pageData.page06Draft));
  const conditions = useMemo(() => conditionsFromCareLog(save.artifacts.careLog), [save.artifacts.careLog]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<HabitatSimulationResult | null>(null);
  const [simulationSnapshot, setSimulationSnapshot] = useState('');
  const [keepReason, setKeepReason] = useState<string | null>(null);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(6));
  const changeHandler = useRef<(next: HabitatPlacement[]) => void>(() => undefined);
  const selectionHandler = useRef<(instanceId: string | null) => void>(() => undefined);

  changeHandler.current = (next) => {
    setPlacements(next);
    setKeepReason(null);
    setPageData('page06Draft', { placements: next, prediction });
  };
  selectionHandler.current = setSelectedId;

  const scene = useMemo(() => new HabitatScene({
    onChange: (next) => changeHandler.current(next),
    onSelect: (instanceId) => selectionHandler.current(instanceId),
  }), []);

  useEffect(() => {
    if (storedDraft.length > 0) scene.loadPlacements(storedDraft);
  }, [scene, storedDraft]);

  const evaluation = useMemo(() => evaluateHabitat(placements), [placements]);
  const conditionCheck = useMemo(() => checkConditions(placements, conditions), [placements, conditions]);
  const currentSignature = useMemo(() => layoutSignature(placements), [placements]);
  const redesigned = Boolean(simulation) && currentSignature !== simulationSnapshot;
  const canFinish = Boolean(simulation) && evaluation.valid && (redesigned || Boolean(keepReason));
  const selected = placements.find((placement) => placement.instanceId === selectedId) ?? null;
  const placedIds = new Set(placements.map((placement) => placement.itemId));

  const loadStrategy = (strategyId: (typeof HABITAT_STRATEGIES)[number]['id']) => {
    const strategy = HABITAT_STRATEGIES.find((item) => item.id === strategyId);
    if (!strategy) return;
    scene.loadPlacements(strategy.placements);
    audioService.playSfx('drop');
  };

  const addItem = (itemId: HabitatItemId) => {
    scene.addItem(itemId);
    audioService.playSfx('drop');
  };

  const choosePrediction = (next: Prediction) => {
    setPrediction(next);
    setPageData('page06Draft', { placements, prediction: next });
    audioService.playSfx('tap');
  };

  const startSimulation = async () => {
    if (!evaluation.valid || simulating || !prediction) return;
    setSimulating(true);
    setKeepReason(null);
    setSimulationSnapshot(currentSignature);
    audioService.playSfx('record');
    const result = await scene.runSimulation(conditions);
    setSimulation(result);
    setSimulating(false);
    setArtifacts({ habitatStars: result.stars });
    audioService.playSfx(result.stars === 3 ? 'success' : 'warning');
  };

  const missingBehaviors = simulation ? (Object.keys(simulation.behaviors) as Behavior[]).filter((key) => !simulation.behaviors[key]) : [];
  const actual: Prediction = missingBehaviors[0] ?? 'none';
  const predictionHit = Boolean(simulation) && prediction === actual;

  const finishMission = () => {
    if (!canFinish || !simulation) return;
    const revisionChoice = redesigned ? '시험해 본 뒤 배치를 실제로 다시 조정했어.' : `배치를 그대로 둔 까닭: ${keepReason}`;
    setPageData('page06Design', { placements, evaluation, simulation, revisionChoice, prediction, conditions });
    logEvent({
      page: 6,
      type: 'habitat-layout-strategy',
      summary: `${evaluation.strategyName}으로 예산 ${evaluation.budget}/8 안에서 휴식·활동·급수 동선을 설계했어.`,
      tags: ['동물·생명', '기술·제작', '공간 설계'],
      traits: { creation: 2, execution: 1 },
      contextRef: `layout-${evaluation.strategyId}`,
    });
    logEvent({
      page: 6,
      type: 'habitat-simulation',
      summary: `만족도 ${simulation.stars}별. 예측(${PREDICTIONS.find((item) => item.id === prediction)?.label ?? '없음'})은 ${predictionHit ? '맞았어' : '빗나갔어'}. ${simulation.summary}`,
      tags: ['시험해 보기', '예측 검증'],
      traits: { analysis: 2, care: 1 },
      contextRef: `simulation-${simulation.stars}-stars`,
    });
    logEvent({
      page: 6,
      type: redesigned ? 'habitat-redesign' : 'habitat-keep-with-reason',
      summary: revisionChoice,
      tags: ['재설계', '의사결정'],
      traits: redesigned ? { creation: 2, execution: 1 } : { analysis: 1, execution: 1 },
      contextRef: redesigned ? `redesign-${currentSignature}` : 'keep-with-evidence',
    });
    setArtifacts({ habitatStars: simulation.stars });
    completePage(6);
    addBadge(STAGE.badgeName);
    addJobCard(STAGE.jobTitle);
    setCompleted(true);
    audioService.playSfx('reward');
  };

  const footer = completed ? (
    <StageComplete
      title={simulation?.stars === 3 ? '만족도 3별! 회복 공간 완성' : '회복 공간을 완성했어'}
      message={simulation?.stars === 3 ? `${STAGE.badgeName}를 얻었어. 두 마리 모두 먹고 놀고 쉬었어.` : `${STAGE.badgeName}를 얻었어. 3별을 노린다면 배치를 바꿔 다시 시험해 봐.`}
      nextLabel="숲 생태 조사로 가기"
      onNext={() => onNavigate(7)}
    />
  ) : (
    <div className="p6-footer" aria-live="polite">
      <span className={evaluation.valid ? 'is-ready' : ''}>{evaluation.valid ? '집 만들기 완료' : '집 만들기'}</span>
      <span className={prediction ? 'is-ready' : ''}>{prediction ? '예측 완료' : '예측하기'}</span>
      <span className={simulation ? 'is-ready' : ''}>{simulation ? `만족도 ${simulation.stars}/3별` : '시험하기'}</span>
      <span className={redesigned || keepReason ? 'is-ready' : ''}>{redesigned || keepReason ? '다시 생각하기 완료' : '다시 생각하기'}</span>
      <button className="button button--primary button--large" type="button" disabled={!canFinish} onClick={finishMission}>
        생활 공간 완성
        <CheckIcon />
      </button>
    </div>
  );

  const ruleRows = [
    { label: '물건 3~4개 놓기', ready: evaluation.enoughElements && evaluation.withinCount },
    { label: '쓴 힘이 8을 넘지 않기', ready: evaluation.withinBudget },
    { label: '물·쉼·놀이 모두 놓기', ready: evaluation.hasWater && evaluation.hasRest && evaluation.hasActivity },
    { label: '빨간 문 앞 비우기', ready: evaluation.entranceClear },
    { label: '물건 겹치지 않기', ready: evaluation.noCollisions },
    { label: '모든 곳을 오가는 길 만들기', ready: evaluation.connected },
  ];
  const birdRows = [
    ...(conditions.dehydrated ? [{ label: `빨강(탈수): 물그릇을 쉬는 곳에서 ${WATER_REACH}칸 안에`, ready: conditionCheck.waterNearRest }] : []),
    ...(conditions.stressed ? [{ label: '초록(스트레스): 숨을 곳을 놓고, 시끄러운 위쪽에서 떨어뜨리기', ready: conditionCheck.shelterQuiet }] : []),
  ];

  return (
    <GameShell page={6} eyebrow="STAGE 2 · HABITAT DESIGN" onNavigate={onNavigate} footer={footer} className="p6-shell">
      <div className="p6-layout">
        <Panel title="이번에 할 일" kicker="BUILD KIT" className="p6-palette-panel">
          <MissionGuide
            image={pageAsset(6, 1)}
            imageAlt="태블릿으로 앵무새 집을 만드는 어린이"
            action="두 마리에 맞는 회복 공간을 만들어요"
            goals={['물건 3~4개 놓고 개체 조건 채우기', '안 보일 행동 예측하고 시험하기', '고치거나 까닭 고르기']}
          />
          <div className="p6-reward">
            <span>끝내면 얻는 것</span>
            <strong>{STAGE.reward}</strong>
            <small>갱신 목표: 먹기·놀기·쉬기 다 보이는 만족도 3별</small>
          </div>
          <div className="p6-budget" aria-label={`예산 ${evaluation.budget} / 8, 물체 ${evaluation.count} / 4`}>
            <div><span>쓴 힘</span><strong className={evaluation.withinBudget ? '' : 'is-over'}>{evaluation.budget}<small>/8</small></strong></div>
            <div><span>놓은 물건</span><strong className={evaluation.withinCount ? '' : 'is-over'}>{evaluation.count}<small>/4</small></strong></div>
          </div>

          <div className="p6-handoff">
            <strong>돌봄 기록에서 온 조건</strong>
            <p>{save.artifacts.careLog.length > 0 ? save.artifacts.careLog.map((entry) => `${entry.bird === 'green' ? '초록' : '빨강'} ${entry.issue} → ${entry.treatment}`).join(' · ') : '기록이 없어 두 마리 조건을 모두 켰어.'}</p>
          </div>

          <div className="p6-item-palette" aria-label="배치할 물체">
            {HABITAT_ITEM_IDS.map((itemId) => {
              const item = HABITAT_ITEMS[itemId];
              const alreadyPlaced = placedIds.has(itemId);
              const unavailable = alreadyPlaced || placements.length >= 4 || evaluation.budget + item.cost > 8;
              return (
                <button key={itemId} type="button" disabled={unavailable} onClick={() => addItem(itemId)} aria-label={`${item.name}, 비용 ${item.cost}${alreadyPlaced ? ', 이미 배치됨' : ''}`}>
                  <img src={item.image} alt="" />
                  <span><strong>{item.shortName}</strong><small>힘 {item.cost}</small></span>
                  <b>{alreadyPlaced ? '배치됨' : '추가'}</b>
                </button>
              );
            })}
          </div>
        </Panel>

        <section className="p6-workbench" aria-labelledby="p6-board-title">
          <header className="p6-workbench__header">
            <h2 id="p6-board-title">물건을 골라 집에 놓아 봐</h2>
            <button className="button button--ghost" type="button" disabled={placements.length === 0} onClick={() => scene.clearLayout()}>모두 치우기</button>
          </header>
          <div className="p6-board scene-card">
            <PhaserStage scene={scene} ariaLabel="물건을 끌어 놓아 생활 공간을 만드는 화면. 왼쪽 붉은 곳은 비워야 하는 출입 안전선이야." />
            <div className="p6-board-hint">물건을 끌어 놓거나 눌러서 선택해.</div>
          </div>
          <div className="p6-strategies" aria-label="빠르게 시작할 수 있는 예시">
            <span>빠른 시작</span>
            {HABITAT_STRATEGIES.map((strategy) => (
              <button key={strategy.id} type="button" onClick={() => loadStrategy(strategy.id)} title={strategy.description}>{strategy.name}</button>
            ))}
          </div>

          <div className="p6-selection-tools" aria-label="선택한 물체 조절">
            <div className="p6-selected-name">
              <GripIcon />
              <span>{selected ? <><small>선택한 물체</small><strong>{HABITAT_ITEMS[selected.itemId].name}</strong></> : <strong>보드나 목록에서 물체를 선택해</strong>}</span>
            </div>
            <div className="p6-nudge-pad">
              <button type="button" disabled={!selected} onClick={() => scene.nudgeSelected(0, -5)} aria-label="선택 물체 위로 5칸 이동">위</button>
              <button type="button" disabled={!selected} onClick={() => scene.nudgeSelected(-5, 0)} aria-label="선택 물체 왼쪽으로 5칸 이동">왼쪽</button>
              <button type="button" disabled={!selected} onClick={() => scene.nudgeSelected(5, 0)} aria-label="선택 물체 오른쪽으로 5칸 이동">오른쪽</button>
              <button type="button" disabled={!selected} onClick={() => scene.nudgeSelected(0, 5)} aria-label="선택 물체 아래로 5칸 이동">아래</button>
            </div>
            <button className="button" type="button" disabled={!selected} onClick={() => { scene.rotateSelected(); audioService.playSfx('tap'); }}>90° 회전</button>
            <button className="button button--danger" type="button" disabled={!selected} onClick={() => { scene.removeSelected(); audioService.playSfx('tap'); }}>선택 삭제</button>
          </div>
          {placements.length > 0 && (
            <div className="p6-placed-list" aria-label="배치된 물체 목록">
              {placements.map((placement) => (
                <button key={placement.instanceId} type="button" className={selectedId === placement.instanceId ? 'is-selected' : ''} onClick={() => scene.selectInstance(placement.instanceId)}>
                  {HABITAT_ITEMS[placement.itemId].shortName}
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="p6-review-column">
          <Panel title="다 됐나 보기" kicker="LIVE CHECK" className="p6-rules-panel">
            <ul className="p6-rule-list">
              {ruleRows.map((rule) => (
                <li key={rule.label} className={rule.ready ? 'is-ready' : ''}>
                  <span>{rule.ready ? '충족' : '확인'}</span><strong>{rule.label}</strong>
                </li>
              ))}
            </ul>
            <ul className="p6-rule-list p6-rule-list--bird" aria-label="개체별 조건">
              {birdRows.map((rule) => (
                <li key={rule.label} className={rule.ready ? 'is-ready' : ''}>
                  <span>{rule.ready ? '충족' : '확인'}</span><strong>{rule.label}</strong>
                </li>
              ))}
            </ul>
            {!evaluation.noCollisions && <div className="toast toast--warning">겹친 물체가 {evaluation.collisionPairs.length}쌍 있어. 붉게 표시된 물체를 옮겨.</div>}
            <div className="p6-strategy-result">
              <span>지금 만든 방법</span><strong>{evaluation.strategyName}</strong><small>물건을 많이 놓기보다 필요한 물건을 잘 이어 주는 게 중요해.</small>
            </div>
          </Panel>

          <Panel title="앵무새 길 보기" kicker="OBSERVE · REVISE" className="p6-simulation-panel">
            {!simulation ? (
              <>
                <p>시험하기 전에 예측해. 지금 배치에서 어떤 행동이 안 보일까?</p>
                <div className="p6-predictions" role="group" aria-label="예측 고르기">
                  {PREDICTIONS.map((item) => (
                    <button key={item.id} type="button" className={prediction === item.id ? 'is-selected' : ''} onClick={() => choosePrediction(item.id)} aria-pressed={prediction === item.id}>{item.label}</button>
                  ))}
                </div>
                <button className="button button--teal button--large button--block" type="button" disabled={!evaluation.valid || simulating || !prediction} onClick={startSimulation}>
                  {simulating ? '앵무새를 보는 중…' : '회복 공간 시험하기'}
                </button>
                {!evaluation.valid && <small className="p6-sim-hint">왼쪽 완료 조건을 모두 채우면 시험할 수 있어.</small>}
                {evaluation.valid && !prediction && <small className="p6-sim-hint">먼저 예측을 하나 골라.</small>}
              </>
            ) : (
              <div className="p6-simulation-result" aria-live="polite">
                <div className="p6-stars" aria-label={`만족도 ${simulation.stars}점 만점 3점`}>
                  {(['eat', 'play', 'rest'] as const).map((key) => (
                    <span key={key} className={simulation.behaviors[key] ? 'is-on' : ''}>{BEHAVIOR_LABELS[key]}</span>
                  ))}
                  <strong>{simulation.stars}/3별</strong>
                </div>
                <div className={`toast ${predictionHit ? 'toast--success' : 'toast--warning'}`}>
                  {predictionHit ? '예측이 맞았어. ' : '예측과 달랐어. 무엇이 달랐을까? '}
                  실제로 {actual === 'none' ? '셋 다 보였어.' : `${BEHAVIOR_LABELS[actual]}가 안 보였어.`}
                </div>
                <p>{simulation.summary}</p>
                {redesigned ? (
                  <div className="toast toast--success"><CheckIcon />시험한 뒤 실제 배치를 바꾼 것을 확인했어.</div>
                ) : (
                  <div className="p6-keep-reasons">
                    <strong>그대로 둔다면 까닭을 골라</strong>
                    {KEEP_REASONS.map((reason) => (
                      <button key={reason} type="button" className={keepReason === reason ? 'is-selected' : ''} onClick={() => setKeepReason(reason)} aria-pressed={keepReason === reason}>{reason}</button>
                    ))}
                  </div>
                )}
                <div className="p6-predictions" role="group" aria-label="다시 예측하기">
                  {PREDICTIONS.map((item) => (
                    <button key={item.id} type="button" className={prediction === item.id ? 'is-selected' : ''} onClick={() => choosePrediction(item.id)} aria-pressed={prediction === item.id}>{item.label}</button>
                  ))}
                </div>
                <button className="button button--ghost button--block" type="button" disabled={simulating || !evaluation.valid} onClick={startSimulation}>현재 배치 다시 시험하기</button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </GameShell>
  );
}
