import Phaser from 'phaser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { PhaserStage } from '../components/PhaserStage';
import { ProgressBar } from '../components/ProgressBar';
import { StageComplete } from '../components/StageComplete';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  MYSTERY_CANDIDATES,
  MYSTERY_CLUES,
  coreMysteryLinkKeys,
  normalizedPair,
  validMysteryLinkKeys,
  type CameraId,
} from './stage1-2-content';
import './stage1-2.css';

const CAMERA_LABELS: Record<CameraId, string> = {
  'cam-a': 'CAM A · 출입 구역',
  'cam-b': 'CAM B · 준비 구역',
  'cam-c': 'CAM C · 작업 구역',
};

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

class MysteryCameraScene extends Phaser.Scene {
  private activeCamera: CameraId = 'cam-a';
  private collected = new Set<string>();
  private ready = false;
  private readonly findClue: (id: string) => void;

  constructor(findClue: (id: string) => void) {
    super({ key: `MysteryCamera-${Date.now()}-${Math.round(performance.now())}` });
    this.findClue = findClue;
  }

  preload() {
    this.load.image('mystery-cam-a', pageAsset(3, 1));
    this.load.image('mystery-cam-b', pageAsset(3, 4));
    this.load.image('mystery-cam-c', pageAsset(3, 7));
  }

  create() {
    this.ready = true;
    this.drawCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.drawCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.drawCamera, this);
      this.ready = false;
    });
  }

  setCamera(camera: CameraId) {
    this.activeCamera = camera;
    if (this.ready) this.drawCamera();
  }

  setCollected(ids: readonly string[]) {
    this.collected = new Set(ids);
    if (this.ready) this.drawCamera();
  }

  private drawCamera() {
    if (!this.ready) return;
    this.tweens.killAll();
    this.children.removeAll(true);
    const width = Math.max(320, this.scale.width);
    const height = Math.max(300, this.scale.height);
    const texture = `mystery-${this.activeCamera}`;
    const background = this.add.image(width / 2, height / 2, texture).setDisplaySize(width, height).setAlpha(.72);
    background.setTint(0x8fc9cd);
    this.add.rectangle(width / 2, height / 2, width, height, 0x03101e, .28);

    const frame = this.add.graphics();
    frame.lineStyle(2, 0xf1cf83, .7).strokeRoundedRect(14, 14, width - 28, height - 28, 16);
    frame.lineStyle(1, 0x54d7d0, .32);
    for (let x = 0; x < width; x += 64) frame.lineBetween(x, 0, x, height);
    for (let y = 0; y < height; y += 64) frame.lineBetween(0, y, width, y);

    this.add.text(28, 25, CAMERA_LABELS[this.activeCamera], {
      fontFamily: 'Pretendard, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#f7e9c9',
      backgroundColor: '#061426cc', padding: { x: 10, y: 7 },
    });
    this.add.text(width - 28, 31, 'LIVE  ·  근거 탐색', {
      fontFamily: 'Pretendard, sans-serif', fontSize: '14px', fontStyle: 'bold', color: '#8af2e8',
    }).setOrigin(1, 0);

    MYSTERY_CLUES.filter((clue) => clue.camera === this.activeCamera).forEach((clue, index) => {
      const x = clue.x * width;
      const y = clue.y * height;
      const found = this.collected.has(clue.id);
      const ring = this.add.circle(x, y, found ? 25 : 31, found ? 0x3ab76b : 0xe4a63c, found ? .82 : .25)
        .setStrokeStyle(found ? 3 : 4, found ? 0xa9f2c1 : 0xffd37b, 1);
      this.add.text(x, y, found ? '확인' : `${index + 1}`, {
        fontFamily: 'Pretendard, sans-serif', fontSize: found ? '12px' : '18px', fontStyle: 'bold',
        color: found ? '#061426' : '#fff5dd',
      }).setOrigin(.5);
      if (!found) {
        ring.setInteractive({ useHandCursor: true });
        ring.on(Phaser.Input.Events.POINTER_DOWN, () => this.findClue(clue.id));
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          this.tweens.add({ targets: ring, scale: 1.18, alpha: .65, duration: 900, yoyo: true, repeat: -1 });
        }
      }
    });
  }
}

export default function Page03Mystery({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, addJobCard } = useGame();
  const [camera, setCamera] = useState<CameraId>('cam-a');
  const [clueIds, setClueIds] = useState<string[]>(() => stringList(save.pageData.p3Clues));
  const [links, setLinks] = useState<string[]>(() => stringList(save.pageData.p3Links));
  const [candidate, setCandidate] = useState(() => typeof save.pageData.p3Candidate === 'string' ? save.pageData.p3Candidate : '');
  const [gates, setGates] = useState<string[]>(() => stringList(save.pageData.p3Gates));
  const [firstLink, setFirstLink] = useState('');
  const [secondLink, setSecondLink] = useState('');
  const [hint, setHint] = useState('카메라를 바꾸며 서로 다른 종류의 근거를 모아 봐.');
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(3));
  const clueRef = useRef<(id: string) => void>(() => undefined);
  const scene = useMemo(() => new MysteryCameraScene((id) => clueRef.current(id)), []);

  const collectedClues = MYSTERY_CLUES.filter((clue) => clueIds.includes(clue.id));
  const typeCount = new Set(collectedClues.map((clue) => clue.type)).size;
  const coreLinkCount = links.filter((link) => coreMysteryLinkKeys.has(link)).length;

  const findClue = (id: string) => {
    if (clueIds.includes(id)) return;
    const clue = MYSTERY_CLUES.find((item) => item.id === id);
    if (!clue) return;
    audioService.playSfx('clue');
    const next = [...clueIds, id];
    setClueIds(next);
    setPageData('p3Clues', next);
    logEvent({
      page: 3, type: 'evidence-found', contextRef: `clue-${id}`,
      summary: `${clue.type} 근거 “${clue.title}”을 찾았어.`,
      tags: ['근거', clue.type, id], traits: { exploration: 1, analysis: 1 },
    });
    setHint(`${clue.type} 근거를 기록했어. 다른 카메라의 단서와 이어 볼 수 있을까?`);
  };
  clueRef.current = findClue;

  useEffect(() => { scene.setCamera(camera); }, [camera, scene]);
  useEffect(() => { scene.setCollected(clueIds); }, [clueIds, scene]);

  const addLink = () => {
    if (!firstLink || !secondLink || firstLink === secondLink) {
      setHint('서로 다른 근거 두 개를 골라 연결해 봐.');
      return;
    }
    const key = normalizedPair(firstLink, secondLink);
    if (!validMysteryLinkKeys.has(key)) {
      audioService.playSfx('warning');
      setHint('두 근거가 같은 업무 흐름을 설명하는지 다시 살펴봐. 다른 조합도 시험해 봐.');
      return;
    }
    if (links.includes(key)) {
      setHint('이미 기록한 연결이야. 다른 흐름을 한 번 더 찾아보자.');
      return;
    }
    const next = [...links, key];
    setLinks(next);
    setPageData('p3Links', next);
    audioService.playSfx('drop');
    const isCore = coreMysteryLinkKeys.has(key);
    setHint(isCore ? '목적과 결과가 이어지는 중요한 흐름을 찾았어.' : '안전한 준비 흐름을 잘 연결했어.');
    setFirstLink('');
    setSecondLink('');
  };

  const toggleGate = (gate: string) => {
    const next = gates.includes(gate) ? gates.filter((item) => item !== gate) : [...gates, gate];
    setGates(next);
    setPageData('p3Gates', next);
  };

  const testHypothesis = () => {
    if (clueIds.length < 4 || typeCount < 3) {
      setHint('한 카메라에 머물지 말고 영상·소리·도구처럼 다른 종류의 근거를 더 찾아봐.');
      return;
    }
    if (links.length < 2 || coreLinkCount < 1) {
      setHint('준비에서 결과까지 이어지는 흐름과, 목적이 결과물로 이어지는 흐름을 각각 찾아봐.');
      return;
    }
    if (!candidate) {
      setHint('세 직업 중 지금까지의 근거를 가장 많이 설명하는 가설을 골라 봐.');
      return;
    }
    if (gates.length < 3) {
      setHint('누구를 위한 일인지, 무엇을 남기는지, 어떻게 안전을 지켰는지 모두 확인해 봐.');
      return;
    }
    if (candidate !== 'drone-filmmaker') {
      audioService.playSfx('warning');
      setHint('도구 하나만 보지 말고 음성 지시와 완성된 결과물이 함께 가리키는 일을 다시 생각해 봐.');
      return;
    }
    setCompleted(true);
    completePage(3);
    addJobCard('드론 영상 촬영가');
    setPageData('p3Candidate', candidate);
    logEvent({
      page: 3, type: 'career-hypothesis', contextRef: 'p3-final-hypothesis',
      summary: '여러 종류의 근거와 업무 흐름을 연결해 드론 영상 촬영가를 찾아냈어.',
      tags: ['드론 영상 촬영가', '목적', '결과물', '안전'], traits: { analysis: 2, collaboration: 1 },
    });
    audioService.playSfx('success');
    setHint('근거가 가설을 튼튼하게 설명해. 직업 미스터리를 해결했어.');
  };

  const selectCandidate = (id: string) => {
    setCandidate(id);
    setPageData('p3Candidate', id);
  };

  const linkName = (key: string) => {
    const [a, b] = key.split('::');
    const first = MYSTERY_CLUES.find((item) => item.id === a)?.title ?? a;
    const second = MYSTERY_CLUES.find((item) => item.id === b)?.title ?? b;
    return `${first} ↔ ${second}`;
  };

  return (
    <GameShell
      page={3}
      eyebrow="STAGE 2 · 단서 조사"
      onNavigate={onNavigate}
      footer={completed ? (
        <StageComplete
          title="직업 미스터리를 해결했어"
          message="도구만 보지 않고 목적·결과물·안전까지 연결한 멋진 조사였어."
          nextLabel="드론 촬영 현장으로"
          onNext={() => onNavigate(4)}
        />
      ) : undefined}
    >
      <div className="game-grid game-grid--wide-center mystery-layout">
        <Panel title="카메라 전환" kicker="SECURITY CAM">
          <div className="mission-card">
            <strong>숨은 직업을 찾아라</strong>
            <p>6개 단서 중 4개 이상, 서로 다른 종류 3개 이상을 조사해.</p>
          </div>
          <div className="camera-tabs" role="tablist" aria-label="조사 카메라">
            {(Object.keys(CAMERA_LABELS) as CameraId[]).map((id) => (
              <button
                key={id}
                role="tab"
                aria-selected={camera === id}
                className={camera === id ? 'is-active' : ''}
                onClick={() => { setCamera(id); audioService.playSfx('tap'); }}
              >{CAMERA_LABELS[id]}</button>
            ))}
          </div>
          <ProgressBar value={(clueIds.length / 6) * 100} label={`근거 ${clueIds.length} / 6 · 종류 ${typeCount} / 3`} />
          <div className="keyboard-hotspots" aria-label="현재 카메라의 단서 위치">
            <strong>키보드 조사</strong>
            {MYSTERY_CLUES.filter((clue) => clue.camera === camera).map((clue, index) => (
              <button key={clue.id} className="button button--ghost" disabled={clueIds.includes(clue.id)} onClick={() => findClue(clue.id)}>
                {clueIds.includes(clue.id) ? `${clue.title} 확인됨` : `단서 위치 ${index + 1} 조사`}
              </button>
            ))}
          </div>
        </Panel>

        <div className="mystery-center stack">
          <div className="scene-card mystery-scene">
            <PhaserStage scene={scene} ariaLabel="세 카메라를 바꾸며 조사할 수 있는 현장 화면. 반짝이는 원을 누르면 근거를 찾을 수 있어." />
          </div>
          <Panel className="evidence-tray" title="수집한 근거" kicker="EVIDENCE BOARD">
            {collectedClues.length === 0 ? <p className="empty-copy">카메라 화면의 표시를 눌러 첫 근거를 찾아 봐.</p> : (
              <div className="evidence-chip-grid">
                {collectedClues.map((clue) => (
                  <article key={clue.id} className="evidence-chip">
                    <span>{clue.type}</span><strong>{clue.title}</strong><p>{clue.note}</p>
                  </article>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <Panel title="가설 보드" kicker="CONNECT & CHECK">
          <div className="hypothesis-section">
            <strong>1. 근거 연결</strong>
            <select aria-label="첫 번째 근거" value={firstLink} onChange={(event) => setFirstLink(event.target.value)}>
              <option value="">첫 근거 선택</option>
              {collectedClues.map((clue) => <option key={clue.id} value={clue.id}>{clue.title}</option>)}
            </select>
            <select aria-label="두 번째 근거" value={secondLink} onChange={(event) => setSecondLink(event.target.value)}>
              <option value="">둘째 근거 선택</option>
              {collectedClues.map((clue) => <option key={clue.id} value={clue.id}>{clue.title}</option>)}
            </select>
            <button className="button button--teal button--block" onClick={addLink}>두 근거 연결하기</button>
            <ul className="evidence-links">
              {links.map((link) => <li key={link}>{linkName(link)}<span>{coreMysteryLinkKeys.has(link) ? '핵심 흐름' : '준비 흐름'}</span></li>)}
            </ul>
          </div>

          <div className="hypothesis-section">
            <strong>2. 직업 가설</strong>
            <div className="candidate-list" role="radiogroup" aria-label="직업 가설">
              {MYSTERY_CANDIDATES.map((item) => (
                <button key={item.id} role="radio" aria-checked={candidate === item.id} className={candidate === item.id ? 'is-selected' : ''} onClick={() => selectCandidate(item.id)}>
                  <strong>{item.name}</strong><small>{item.description}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="hypothesis-section">
            <strong>3. 설명 확인</strong>
            <div className="gate-list">
              {([
                ['purpose', '일의 목적'], ['result', '남기는 결과물'], ['safety', '안전한 과정'],
              ] as const).map(([id, label]) => (
                <button key={id} aria-pressed={gates.includes(id)} className={gates.includes(id) ? 'is-checked' : ''} onClick={() => toggleGate(id)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="toast" role="status">{hint}</div>
          <button className="button button--primary button--large button--block" onClick={testHypothesis} disabled={completed}>가설 확인하기</button>
        </Panel>
      </div>
    </GameShell>
  );
}
