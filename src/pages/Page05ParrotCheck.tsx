import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { StageComplete } from '../components/StageComplete';
import { CheckIcon, SearchIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { sample3d } from '../shared/assets';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  buildCareHandoff,
  CARE_ZONES,
  evaluateCareMission,
  getObservation,
  STATUS_META,
  type CareZoneId,
} from './page05Data';
import './page05.css';

interface PageProps {
  onNavigate: (page: PageNumber) => void;
}

interface CameraState {
  yaw: number;
  pitch: number;
  zoom: number;
  panX: number;
  panY: number;
}

interface StoredObservations {
  recordIds: string[];
  safetyChecked: boolean;
  expertShared: boolean;
}

function readStoredObservations(value: unknown): StoredObservations {
  if (!value || typeof value !== 'object') return { recordIds: [], safetyChecked: false, expertShared: false };
  const candidate = value as Partial<StoredObservations>;
  return {
    recordIds: Array.isArray(candidate.recordIds) ? candidate.recordIds.filter((id): id is string => typeof id === 'string' && Boolean(getObservation(id))) : [],
    safetyChecked: candidate.safetyChecked === true,
    expertShared: candidate.expertShared === true,
  };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function Page05ParrotCheck({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard } = useGame();
  const stored = useMemo(() => readStoredObservations(save.pageData.page05Observations), []);
  const [selectedZoneId, setSelectedZoneId] = useState<CareZoneId>('water-feed');
  const [recordIds, setRecordIds] = useState<Set<string>>(() => new Set(stored.recordIds));
  const [safetyChecked, setSafetyChecked] = useState(stored.safetyChecked);
  const [expertShared, setExpertShared] = useState(stored.expertShared);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(5));
  const [camera, setCamera] = useState<CameraState>({ yaw: -7, pitch: 4, zoom: 1, panX: 0, panY: 0 });
  const dragState = useRef<{ pointerId: number; x: number; y: number; pan: boolean } | null>(null);

  const selectedZone = CARE_ZONES.find((zone) => zone.id === selectedZoneId) ?? CARE_ZONES[0]!;
  const mission = evaluateCareMission(recordIds, safetyChecked, expertShared);

  const persist = (ids: Set<string>, nextSafety = safetyChecked, nextExpert = expertShared) => {
    setPageData('page05Observations', { recordIds: [...ids], safetyChecked: nextSafety, expertShared: nextExpert });
  };

  const selectZone = (zoneId: CareZoneId) => {
    setSelectedZoneId(zoneId);
    audioService.playSfx('tap');
  };

  const toggleObservation = (id: string) => {
    setRecordIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
        audioService.playSfx('tap');
      } else {
        next.add(id);
        audioService.playSfx('clue');
      }
      persist(next);
      return next;
    });
  };

  const markSafety = () => {
    const next = !safetyChecked;
    setSafetyChecked(next);
    persist(recordIds, next);
    audioService.playSfx(next ? 'success' : 'tap');
  };

  const shareWithExpert = () => {
    setExpertShared(true);
    persist(recordIds, safetyChecked, true);
    audioService.playSfx('success');
  };

  const updateCamera = (change: Partial<CameraState>) => setCamera((current) => ({
    yaw: clamp(change.yaw ?? current.yaw, -35, 35),
    pitch: clamp(change.pitch ?? current.pitch, -18, 18),
    zoom: clamp(change.zoom ?? current.zoom, 0.85, 1.6),
    panX: clamp(change.panX ?? current.panX, -18, 18),
    panY: clamp(change.panY ?? current.panY, -14, 14),
  }));

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, pan: event.shiftKey };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (drag.pan) {
      setCamera((current) => ({ ...current, panX: clamp(current.panX + dx / 12, -18, 18), panY: clamp(current.panY + dy / 12, -14, 14) }));
    } else {
      setCamera((current) => ({ ...current, yaw: clamp(current.yaw + dx / 7, -35, 35), pitch: clamp(current.pitch - dy / 9, -18, 18) }));
    }
  };

  const endPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === event.pointerId) dragState.current = null;
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateCamera({ zoom: camera.zoom + (event.deltaY < 0 ? 0.1 : -0.1) });
  };

  const handleStageKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 3 : 4;
    if (event.key === 'ArrowLeft') updateCamera(event.shiftKey ? { panX: camera.panX - amount } : { yaw: camera.yaw - amount });
    else if (event.key === 'ArrowRight') updateCamera(event.shiftKey ? { panX: camera.panX + amount } : { yaw: camera.yaw + amount });
    else if (event.key === 'ArrowUp') updateCamera(event.shiftKey ? { panY: camera.panY - amount } : { pitch: camera.pitch + amount });
    else if (event.key === 'ArrowDown') updateCamera(event.shiftKey ? { panY: camera.panY + amount } : { pitch: camera.pitch - amount });
    else if (event.key === '+' || event.key === '=') updateCamera({ zoom: camera.zoom + 0.1 });
    else if (event.key === '-') updateCamera({ zoom: camera.zoom - 0.1 });
    else return;
    event.preventDefault();
  };

  const finishMission = () => {
    if (!mission.ready) return;
    const records = [...recordIds].map(getObservation).filter((item) => Boolean(item));
    records.forEach((record) => {
      if (!record) return;
      logEvent({
        page: 5,
        type: `care-observation-${record.status}`,
        summary: `${record.title}: ${record.evidence}`,
        tags: ['동물·생명', '근거 관찰', STATUS_META[record.status].label],
        traits: record.status === 'normal' ? { care: 1 } : { analysis: 1, care: 1 },
        contextRef: record.id,
      });
    });
    logEvent({
      page: 5,
      type: 'care-safety-check',
      summary: '출입문 이중 잠금과 비상 동선을 먼저 확인했어.',
      tags: ['동물·생명', '안전', '실행'],
      traits: { execution: 2, care: 1 },
      contextRef: 'entry-safety-action',
    });
    if (mission.expertShareRequired) {
      logEvent({
        page: 5,
        type: 'care-expert-handoff',
        summary: '반복 행동 기록을 단정하지 않고 담당 전문가에게 공유했어.',
        tags: ['협업', '판단 보류'],
        traits: { collaboration: 2, care: 1 },
        contextRef: 'expert-share',
      });
    }
    setPageData('page05Handoff', buildCareHandoff(recordIds));
    completePage(5);
    addBadge('돌봄 근거 관찰자');
    addJobCard('앵무새 돌봄 전문가');
    setCompleted(true);
    audioService.playSfx('success');
  };

  const footer = completed ? (
    <StageComplete
      title="앵무새 돌봄 관찰 완료"
      message="관찰 근거와 개선 신호를 다음 서식지 설계실로 보냈어."
      nextLabel="서식지 설계하기"
      onNext={() => onNavigate(6)}
    />
  ) : (
    <div className="p5-footer-progress" aria-live="polite">
      <span className={mission.zonesVisited >= 4 ? 'is-done' : ''}>구역 {mission.zonesVisited}/4</span>
      <span className={mission.observationCount >= 7 ? 'is-done' : ''}>기록 {mission.observationCount}/7</span>
      <span className={mission.concernCount >= 2 ? 'is-done' : ''}>추가 확인·보류 {mission.concernCount}/2</span>
      <span className={mission.safetyReady ? 'is-done' : ''}>출입 안전</span>
      {mission.expertShareRequired && <span className={mission.expertReady ? 'is-done' : ''}>전문가 공유</span>}
      <button className="button button--primary button--large" type="button" disabled={!mission.ready} onClick={finishMission}>
        관찰 기록 확정
        <CheckIcon />
      </button>
    </div>
  );

  return (
    <GameShell page={5} eyebrow="STAGE 3 · CARE LAB" onNavigate={onNavigate} footer={footer} className="p5-shell">
      <div className="p5-layout">
        <Panel title="오늘의 돌봄 미션" kicker="MISSION" className="p5-mission-panel">
          <div className="mission-card">
            <strong>보이는 근거로 돌봄 환경을 확인해</strong>
            <p>4개 이상 구역에서 7개 이상 기록하고, 상태를 단정하지 않은 채 다음 설계에 필요한 신호를 남겨.</p>
          </div>
          <ol className="p5-zone-list" aria-label="돌봄 관찰 구역">
            {CARE_ZONES.map((zone) => {
              const count = zone.observations.filter((item) => recordIds.has(item.id)).length;
              return (
                <li key={zone.id}>
                  <button className={selectedZoneId === zone.id ? 'is-selected' : ''} type="button" onClick={() => selectZone(zone.id)} aria-pressed={selectedZoneId === zone.id}>
                    <span>{zone.number}</span>
                    <strong>{zone.title}</strong>
                    <small>{count}/{zone.observations.length} 기록</small>
                  </button>
                </li>
              );
            })}
          </ol>
          <button className={`p5-safety-action ${safetyChecked ? 'is-done' : ''}`} type="button" onClick={markSafety} aria-pressed={safetyChecked}>
            <span className="p5-check-box">{safetyChecked && <CheckIcon />}</span>
            <span><strong>출입 전 안전 행동</strong><small>문 이중 잠금과 비상 동선 확인</small></span>
          </button>
        </Panel>

        <section className="p5-viewer" aria-labelledby="p5-viewer-title">
          <header className="p5-viewer__header">
            <div><span>2.5D CARE VIEW</span><h2 id="p5-viewer-title">앵무새 생활 공간 관찰</h2></div>
            <div className="p5-camera-readout" aria-live="polite">회전 {Math.round(camera.yaw)}° · 확대 {Math.round(camera.zoom * 100)}%</div>
          </header>
          <div
            className="p5-viewport"
            tabIndex={0}
            role="application"
            aria-label="생활 공간 보기. 드래그하거나 방향키로 회전하고, Shift와 방향키로 화면을 이동하며, 더하기와 빼기로 확대할 수 있어."
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onWheel={handleWheel}
            onKeyDown={handleStageKey}
          >
            <div className="p5-perspective-floor" aria-hidden="true" />
            <div
              className="p5-model-rig"
              style={{ transform: `translate3d(${camera.panX}%, ${camera.panY}%, 0) rotateX(${camera.pitch}deg) rotateY(${camera.yaw}deg) scale(${camera.zoom})` } as CSSProperties}
              aria-hidden="true"
            >
              <img className="p5-cage-model" src={sample3d(7)} alt="" draggable={false} />
              <img className="p5-zone-model" key={selectedZone.id} src={selectedZone.image} alt="" draggable={false} />
            </div>
            <div className="p5-hotspots" aria-label="관찰 지점">
              {CARE_ZONES.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  className={selectedZoneId === zone.id ? 'p5-hotspot is-selected' : 'p5-hotspot'}
                  style={{ '--hotspot-x': `${zone.hotspot.x}%`, '--hotspot-y': `${zone.hotspot.y}%` } as CSSProperties}
                  onClick={() => selectZone(zone.id)}
                  aria-label={`${zone.number}번 ${zone.title} 관찰`}
                >
                  <span>{zone.number}</span>
                </button>
              ))}
            </div>
            <div className="p5-view-hint">드래그: 회전 · Shift+드래그: 이동 · 휠: 확대</div>
          </div>
          <div className="p5-camera-controls" aria-label="화면 보기 조절">
            <button type="button" onClick={() => updateCamera({ yaw: camera.yaw - 8 })}>왼쪽 회전</button>
            <button type="button" onClick={() => updateCamera({ yaw: camera.yaw + 8 })}>오른쪽 회전</button>
            <button type="button" onClick={() => updateCamera({ panX: camera.panX - 4 })}>왼쪽 이동</button>
            <button type="button" onClick={() => updateCamera({ panX: camera.panX + 4 })}>오른쪽 이동</button>
            <button type="button" onClick={() => updateCamera({ zoom: camera.zoom + 0.12 })}>확대</button>
            <button type="button" onClick={() => updateCamera({ zoom: camera.zoom - 0.12 })}>축소</button>
            <button type="button" onClick={() => setCamera({ yaw: -7, pitch: 4, zoom: 1, panX: 0, panY: 0 })}>보기 초기화</button>
          </div>
        </section>

        <Panel title="관찰 저널" kicker={`ZONE ${selectedZone.number}`} className="p5-journal-panel">
          <div className="p5-zone-summary">
            <img src={selectedZone.image} alt="선택한 관찰 구역의 샘플 이미지" />
            <div><strong>{selectedZone.title}</strong><p>{selectedZone.prompt}</p></div>
          </div>
          <div className="p5-observation-list">
            {selectedZone.observations.map((observation) => {
              const selected = recordIds.has(observation.id);
              return (
                <article key={observation.id} className={`p5-observation is-${observation.status} ${selected ? 'is-recorded' : ''}`}>
                  <div className="p5-observation__top">
                    <span>{STATUS_META[observation.status].label}</span>
                    <button type="button" onClick={() => toggleObservation(observation.id)} aria-pressed={selected}>
                      {selected ? '기록 취소' : '저널에 기록'}
                    </button>
                  </div>
                  <h3>{observation.title}</h3>
                  <p><SearchIcon /><span><b>관찰 근거</b>{observation.evidence}</span></p>
                </article>
              );
            })}
          </div>
          {mission.expertShareRequired && (
            <div className="p5-expert-card">
              <strong>전문가와 함께 볼 기록이 있어</strong>
              <p>반복 행동은 원인을 단정하지 않고 시간·상황 기록과 함께 공유해.</p>
              <button className="button button--teal button--block" type="button" disabled={expertShared} onClick={shareWithExpert}>
                {expertShared ? '담당 전문가에게 공유 완료' : '기록을 담당 전문가에게 공유'}
              </button>
            </div>
          )}
        </Panel>
      </div>
    </GameShell>
  );
}
