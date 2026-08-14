import { useEffect, useMemo, useRef, useState } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { PhaserStage } from '../components/PhaserStage';
import { StageComplete } from '../components/StageComplete';
import { CheckIcon, GripIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { HabitatScene } from './HabitatScene';
import {
  evaluateHabitat,
  HABITAT_ITEM_IDS,
  HABITAT_ITEMS,
  HABITAT_STRATEGIES,
  layoutSignature,
  recommendedItemsFor,
  type HabitatItemId,
  type HabitatPlacement,
  type HabitatSimulationResult,
} from './habitatModel';
import './page06.css';

interface PageProps {
  onNavigate: (page: PageNumber) => void;
}

function readHandoffFlags(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const flags = (value as { flags?: unknown }).flags;
  return Array.isArray(flags) ? flags.filter((flag): flag is string => typeof flag === 'string') : [];
}

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

const KEEP_REASONS = [
  '출입 동선과 각 활동 지점 사이에 충분한 간격이 있어.',
  '휴식·활동·급수 선택지가 서로 겹치지 않고 이어져.',
  '관찰 결과 안전성과 이동 흐름이 모두 안정적이었어.',
] as const;

export default function Page06Habitat({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard } = useGame();
  const storedDraft = useMemo(() => readDraftPlacements(save.pageData.page06Draft), []);
  const [placements, setPlacements] = useState<HabitatPlacement[]>(storedDraft);
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
    setPageData('page06Draft', { placements: next });
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
  const currentSignature = useMemo(() => layoutSignature(placements), [placements]);
  const redesigned = Boolean(simulation) && currentSignature !== simulationSnapshot;
  const canFinish = Boolean(simulation) && evaluation.valid && (redesigned || Boolean(keepReason));
  const selected = placements.find((placement) => placement.instanceId === selectedId) ?? null;
  const handoffFlags = useMemo(() => readHandoffFlags(save.pageData.page05Handoff), [save.pageData.page05Handoff]);
  const recommendations = useMemo(() => recommendedItemsFor(handoffFlags), [handoffFlags]);
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

  const startSimulation = async () => {
    if (!evaluation.valid || simulating) return;
    setSimulating(true);
    setKeepReason(null);
    setSimulationSnapshot(currentSignature);
    audioService.playSfx('record');
    const result = await scene.runSimulation();
    setSimulation(result);
    setSimulating(false);
    audioService.playSfx('success');
  };

  const finishMission = () => {
    if (!canFinish || !simulation) return;
    const revisionChoice = redesigned ? '시뮬레이션 뒤 배치를 실제로 다시 조정했어.' : `배치를 유지한 근거: ${keepReason}`;
    setPageData('page06Design', {
      placements,
      evaluation,
      simulation,
      revisionChoice,
      sourceHandoffFlags: handoffFlags,
    });
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
      summary: `동선 ${simulation.route}, 편안함 ${simulation.comfort}, 안전 ${simulation.safety}. ${simulation.summary}`,
      tags: ['시뮬레이션', '근거 확인'],
      traits: { analysis: 2, care: 1 },
      contextRef: 'first-environment-simulation',
    });
    logEvent({
      page: 6,
      type: redesigned ? 'habitat-redesign' : 'habitat-keep-with-reason',
      summary: revisionChoice,
      tags: ['재설계', '의사결정'],
      traits: redesigned ? { creation: 2, execution: 1 } : { analysis: 1, execution: 1 },
      contextRef: redesigned ? `redesign-${currentSignature}` : 'keep-with-evidence',
    });
    completePage(6);
    addBadge('서식지 동선 설계자');
    addJobCard('동물 서식지 설계가');
    setCompleted(true);
    audioService.playSfx('reward');
  };

  const footer = completed ? (
    <StageComplete
      title="STAGE 3 돌봄·설계 완료"
      message="관찰 근거를 공간 설계와 재검토까지 연결했어."
      nextLabel="실시간 업무 도전"
      onNext={() => onNavigate(7)}
    />
  ) : (
    <div className="p6-footer" aria-live="polite">
      <span className={evaluation.valid ? 'is-ready' : ''}>{evaluation.valid ? '설계 규칙 충족' : '설계 규칙을 확인해'}</span>
      <span className={simulation ? 'is-ready' : ''}>{simulation ? '시뮬레이션 관찰 완료' : '시뮬레이션 필요'}</span>
      <span className={redesigned || keepReason ? 'is-ready' : ''}>{redesigned ? '재설계 확인' : keepReason ? '유지 근거 확인' : '재설계 또는 유지 근거 필요'}</span>
      <button className="button button--primary button--large" type="button" disabled={!canFinish} onClick={finishMission}>
        최종 설계 확정
        <CheckIcon />
      </button>
    </div>
  );

  const ruleRows = [
    { label: '3개 이상, 최대 4개', ready: evaluation.enoughElements && evaluation.withinCount },
    { label: '예산 8 안쪽', ready: evaluation.withinBudget },
    { label: '물·휴식·활동 모두 포함', ready: evaluation.hasWater && evaluation.hasRest && evaluation.hasActivity },
    { label: '출입 안전선 비우기', ready: evaluation.entranceClear },
    { label: '물체가 겹치지 않기', ready: evaluation.noCollisions },
    { label: '모든 지점 동선 연결', ready: evaluation.connected },
  ];

  return (
    <GameShell page={6} eyebrow="STAGE 3 · HABITAT DESIGN" onNavigate={onNavigate} footer={footer} className="p6-shell">
      <div className="p6-layout">
        <Panel title="설계 도구" kicker="BUILD KIT" className="p6-palette-panel">
          <div className="p6-budget" aria-label={`예산 ${evaluation.budget} / 8, 물체 ${evaluation.count} / 4`}>
            <div><span>사용 예산</span><strong className={evaluation.withinBudget ? '' : 'is-over'}>{evaluation.budget}<small>/8</small></strong></div>
            <div><span>배치 수</span><strong className={evaluation.withinCount ? '' : 'is-over'}>{evaluation.count}<small>/4</small></strong></div>
          </div>

          {recommendations.length > 0 && (
            <div className="p6-handoff">
              <strong>P5 관찰 기록에서 온 제안</strong>
              <p>{recommendations.map((id) => HABITAT_ITEMS[id].shortName).join(' · ')}</p>
              <small>추천은 힌트일 뿐, 여러 설계가 가능해.</small>
            </div>
          )}

          <div className="p6-item-palette" aria-label="배치할 물체">
            {HABITAT_ITEM_IDS.map((itemId) => {
              const item = HABITAT_ITEMS[itemId];
              const alreadyPlaced = placedIds.has(itemId);
              const unavailable = alreadyPlaced || placements.length >= 4 || evaluation.budget + item.cost > 8;
              return (
                <button key={itemId} type="button" disabled={unavailable} onClick={() => addItem(itemId)} aria-label={`${item.name}, 비용 ${item.cost}${alreadyPlaced ? ', 이미 배치됨' : ''}`}>
                  <img src={item.image} alt="" />
                  <span><strong>{item.shortName}</strong><small>비용 {item.cost}</small></span>
                  <b>{alreadyPlaced ? '배치됨' : '추가'}</b>
                </button>
              );
            })}
          </div>
        </Panel>

        <section className="p6-workbench" aria-labelledby="p6-board-title">
          <header className="p6-workbench__header">
            <div><span>100 × 70 CARE BOARD</span><h2 id="p6-board-title">안전한 서식지 동선 설계</h2></div>
            <button className="button button--ghost" type="button" disabled={placements.length === 0} onClick={() => scene.clearLayout()}>모두 치우기</button>
          </header>
          <div className="p6-board scene-card">
            <PhaserStage scene={scene} ariaLabel="물체를 드래그해 배치하는 100 곱하기 70 서식지 설계 보드. 왼쪽 붉은 영역은 비워야 하는 출입 안전선이야." />
            <div className="p6-board-hint">5칸 격자에 자동 맞춤 · 물체를 눌러 선택</div>
          </div>
          <div className="p6-strategies" aria-label="서로 다른 설계 시작점">
            <span>설계 시작점</span>
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
                  {HABITAT_ITEMS[placement.itemId].shortName}<small>{Math.round(placement.x)}, {Math.round(placement.y)} · {placement.rotation}°</small>
                </button>
              ))}
            </div>
          )}
        </section>

        <div className="p6-review-column">
          <Panel title="설계 규칙" kicker="LIVE CHECK" className="p6-rules-panel">
            <ul className="p6-rule-list">
              {ruleRows.map((rule) => (
                <li key={rule.label} className={rule.ready ? 'is-ready' : ''}>
                  <span>{rule.ready ? '충족' : '확인'}</span><strong>{rule.label}</strong>
                </li>
              ))}
            </ul>
            {!evaluation.noCollisions && <div className="toast toast--warning">겹친 물체가 {evaluation.collisionPairs.length}쌍 있어. 붉게 표시된 물체를 옮겨.</div>}
            <div className="p6-strategy-result">
              <span>현재 설계 방식</span><strong>{evaluation.strategyName}</strong><small>물체를 많이 놓는 것보다 필요한 선택지와 연결이 중요해.</small>
            </div>
          </Panel>

          <Panel title="환경 시뮬레이션" kicker="OBSERVE · REVISE" className="p6-simulation-panel">
            {!simulation ? (
              <>
                <p>앵무새의 이동 경로를 돌려 본 뒤, 배치를 고치거나 그대로 둘 근거를 남겨.</p>
                <button className="button button--teal button--large button--block" type="button" disabled={!evaluation.valid || simulating} onClick={startSimulation}>
                  {simulating ? '이동 경로 관찰 중…' : '환경 시뮬레이션 시작'}
                </button>
                {!evaluation.valid && <small className="p6-sim-hint">왼쪽 설계 규칙을 모두 충족하면 실행할 수 있어.</small>}
              </>
            ) : (
              <div className="p6-simulation-result" aria-live="polite">
                <div className="p6-sim-metrics">
                  <span>동선 <strong>{simulation.route}</strong></span>
                  <span>편안함 <strong>{simulation.comfort}</strong></span>
                  <span>안전 <strong>{simulation.safety}</strong></span>
                </div>
                <p>{simulation.summary}</p>
                {redesigned ? (
                  <div className="toast toast--success"><CheckIcon />시뮬레이션 뒤 실제 배치 변경을 확인했어.</div>
                ) : (
                  <div className="p6-keep-reasons">
                    <strong>그대로 유지한다면 근거를 골라</strong>
                    {KEEP_REASONS.map((reason) => (
                      <button key={reason} type="button" className={keepReason === reason ? 'is-selected' : ''} onClick={() => setKeepReason(reason)} aria-pressed={keepReason === reason}>{reason}</button>
                    ))}
                  </div>
                )}
                <button className="button button--ghost button--block" type="button" disabled={simulating || !evaluation.valid} onClick={startSimulation}>현재 배치 다시 시뮬레이션</button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </GameShell>
  );
}
