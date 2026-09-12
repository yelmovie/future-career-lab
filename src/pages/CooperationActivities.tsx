import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { MutedIcon, SoundIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import type { PlantSite } from './stage5CooperationModel';

export function PlantingActivity({ planted, onPlant, image, sapling }: { planted: readonly PlantSite[]; onPlant: (site: PlantSite) => void; image: string; sapling: string }) {
  const root = useRef<HTMLDivElement>(null);
  const palette = useRef<HTMLButtonElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number; moved: boolean; element: HTMLElement; scale: number } | null>(null);
  const suppress = useRef(false);
  const [selected, setSelected] = useState(false);
  const [ghost, setGhost] = useState<{ x: number; y: number; scale: number } | null>(null);
  const [hover, setHover] = useState<PlantSite | null>(null);
  const [notice, setNotice] = useState('묘목을 초록 자리에 끌어 놓아 봐.');
  const cancel = () => {
    const drag = pointer.current; pointer.current = null;
    if (drag?.element.hasPointerCapture(drag.id)) drag.element.releasePointerCapture(drag.id);
    suppress.current = Boolean(drag?.moved); setGhost(null); setHover(null);
  };
  useEffect(() => {
    const stop = (event: KeyboardEvent) => { if (event.key === 'Escape') { cancel(); setSelected(false); } };
    const blur = () => cancel();
    window.addEventListener('keydown', stop); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', stop); window.removeEventListener('blur', blur); const drag = pointer.current; pointer.current = null; if (drag?.element.hasPointerCapture(drag.id)) drag.element.releasePointerCapture(drag.id); };
  }, []);
  const target = (x: number, y: number): PlantSite | null => {
    const hits = [...(root.current?.querySelectorAll<HTMLElement>('[data-plant-site]') ?? [])];
    const match = hits.find((el) => { const r = el.getBoundingClientRect(); return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8 && !planted.includes(el.dataset.plantSite as PlantSite); });
    return match ? match.dataset.plantSite as PlantSite : null;
  };
  const plant = (site: PlantSite) => { if (planted.includes(site)) return; onPlant(site); setSelected(false); setNotice('묘목을 심었어! 팀이 물을 주며 돌볼 거야.'); audioService.playSfx('drop'); };
  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || pointer.current) return;
    suppress.current = false;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, element: event.currentTarget, scale: root.current!.getBoundingClientRect().width / root.current!.offsetWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = pointer.current; if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
    event.preventDefault(); drag.moved = true;
    setGhost({ x: event.clientX, y: event.clientY, scale: drag.scale }); setHover(target(event.clientX, event.clientY));
  };
  const end = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = pointer.current; if (!drag || drag.id !== event.pointerId) return;
    const site = target(event.clientX, event.clientY); cancel();
    if (drag.moved) { if (site) plant(site); else setNotice('초록 자리 안에 놓으면 심을 수 있어.'); }
    else if (event.pointerType !== 'mouse') { suppress.current = true; setSelected((v) => !v); }
  };
  return <div ref={root} className="coop-activity coop-plant">
    <div className="coop-scene">
      <img className="coop-scene__image" src={image} alt="나무가 베인 숲 가장자리" draggable={false} />
      {(['left', 'right'] as const).map((site, i) => <button key={site} type="button" data-plant-site={site} className={`coop-plant-site${planted.includes(site) ? ' is-planted' : ''}${hover === site || selected ? ' is-ready' : ''}`} style={{ left: `${i ? 67 : 32}%`, top: '65%' }} disabled={planted.includes(site)} aria-label={`${i + 1}번 자리에 묘목 심기`} onClick={(event) => {
        if (selected) {
          plant(site);
          if (event.detail === 0) requestAnimationFrame(() => {
            if (planted.length === 0) palette.current?.focus();
            else root.current?.closest('.v4-shell')?.querySelector<HTMLButtonElement>('.v4-next')?.focus();
          });
        } else setNotice('먼저 아래 묘목을 잡아 줘.');
      }}>
        {planted.includes(site) ? <img src={sapling} alt="심은 묘목" /> : <span>{i + 1}<small>여기에 심기</small></span>}
      </button>)}
    </div>
    <div className="coop-palette"><button ref={palette} type="button" className="coop-sapling" disabled={planted.length === 2} aria-pressed={selected} aria-label="열매나무 묘목" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={() => { if (pointer.current) cancel(); }} onDragStart={(e) => e.preventDefault()} onClick={(e) => {
      if (e.detail && suppress.current) { suppress.current = false; return; }
      setSelected((v) => !v);
      if (e.detail === 0 && !selected) root.current?.querySelector<HTMLButtonElement>('[data-plant-site]:not(:disabled)')?.focus();
    }}><img src={sapling} alt="" draggable={false} /><span>열매나무 묘목</span></button><p role="status">{selected ? '놓을 자리를 눌러도 돼.' : notice}</p></div>
    {ghost && createPortal(<img className="coop-sapling-ghost" src={sapling} alt="" style={{ left: ghost.x, top: Math.max(8, ghost.y - 120 * ghost.scale), width: 96 * ghost.scale, height: 112 * ghost.scale }} />, document.body)}
  </div>;
}

export function WaterMarkActivity({ marked, onMark, image }: { marked: boolean; onMark: () => void; image: string }) {
  const pointer = useRef<{ id: number; touched: boolean; moved: boolean; x: number; y: number; element: HTMLElement } | null>(null);
  const suppress = useRef(false);
  const [points, setPoints] = useState<string[]>([]);
  const [notice, setNotice] = useState('통나무와 자재가 모인 곳을 쓸어 표시해 줘.');
  const position = (event: PointerEvent<HTMLElement>) => { const r = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - r.left) / r.width * 100, y: (event.clientY - r.top) / r.height * 100 }; };
  const inTarget = (p: {x: number; y: number}) => p.x >= 22 && p.x <= 80 && p.y >= 35 && p.y <= 78;
  const cancel = () => { const drag = pointer.current; pointer.current = null; if (drag?.element.hasPointerCapture(drag.id)) drag.element.releasePointerCapture(drag.id); suppress.current = Boolean(drag?.moved); setPoints([]); };
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); }; const blur = () => cancel();
    window.addEventListener('keydown', escape); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', escape); window.removeEventListener('blur', blur); const drag = pointer.current; pointer.current = null; if (drag?.element.hasPointerCapture(drag.id)) drag.element.releasePointerCapture(drag.id); };
  }, []);
  const mark = () => { if (marked) return; onMark(); audioService.playSfx('clue'); setNotice('위치 표시 완료! 물길 정비팀에 보낼 수 있어.'); };
  return <div className="coop-activity coop-water"><div className="coop-scene" onPointerDown={(event) => {
    if (marked || !event.isPrimary || event.button !== 0 || pointer.current) return;
    suppress.current = false; const p = position(event);
    pointer.current = { id: event.pointerId, touched: inTarget(p), moved: false, x: event.clientX, y: event.clientY, element: event.currentTarget };
    event.currentTarget.setPointerCapture(event.pointerId); setPoints([`${p.x},${p.y}`]);
  }} onPointerMove={(event) => {
    const drag = pointer.current; if (!drag || drag.id !== event.pointerId) return;
    const p = position(event); drag.touched ||= inTarget(p); drag.moved ||= Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 6;
    setPoints((old) => [...old.slice(-100), `${p.x},${p.y}`]);
  }} onPointerUp={(event) => {
    const drag = pointer.current; if (!drag || drag.id !== event.pointerId) return;
    const good = drag.touched && drag.moved; cancel();
    if (good) mark(); else if (drag.moved) setNotice('사진 가운데 통나무가 모인 곳을 찾아 줘.');
  }} onPointerCancel={cancel} onLostPointerCapture={() => { if (pointer.current) cancel(); }}>
    <img className="coop-scene__image" src={image} alt="개울을 가로막고 있는 통나무와 자재" draggable={false} />
    <svg className="coop-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={points.join(' ')} /></svg>
    <button type="button" className={`coop-water-target${marked ? ' is-marked' : ''}`} disabled={marked} onPointerDown={(e) => { suppress.current = false; e.stopPropagation(); }} onClick={(e) => { if (e.detail && suppress.current) { suppress.current = false; return; } mark(); }}>{marked ? '✓ 위치 표시 완료' : '막힌 곳 표시하기'}</button>
  </div><p className="coop-activity-hint" role="status">{marked ? '표시한 위치를 보고 작업팀이 안전하게 정리할 거야.' : notice}</p></div>;
}

const QUIET_BAND = { low: 100, high: 100 };
export function QuietWorkActivity({ level, onLevel, image, audioEnabled }: { level: number; onLevel: (level: number) => void; image: string; audioEnabled: boolean }) {
  const [listening, setListening] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  useEffect(() => () => audioService.stopLevelDemo(), []);
  useEffect(() => { if (!audioEnabled) { audioService.stopLevelDemo(); setListening(false); } }, [audioEnabled]);
  useEffect(() => { if (listening) audioService.setLevelDemo(level, QUIET_BAND); }, [level, listening]);
  const toggleListening = () => {
    if (listening) { audioService.stopLevelDemo(); setListening(false); return; }
    if (!audioEnabled) return;
    setAudioFailed(false);
    audioService.unlock();
    // Start inside the tap/keyboard gesture so tablet browsers can unlock playback.
    audioService.startLevelDemo('/audio/v9/construction-site-loop.wav', level, QUIET_BAND, () => { setListening(false); setAudioFailed(true); });
    setListening(true);
  };
  const hint = !audioEnabled ? '소리가 꺼져 있어. 소리 없이 손잡이를 움직여도 돼.'
    : audioFailed ? '소리를 불러오지 못했어. 다시 듣거나 손잡이를 움직여 봐.'
    : listening ? '손잡이를 왼쪽으로 밀면 기계 소리도 작아져.'
    : '공사 소리를 듣고, 손잡이를 왼쪽으로 밀어 봐.';
  return <div className={`coop-activity coop-quiet${level <= 35 ? ' is-quiet' : ''}`}>
    <div className="coop-scene"><img className="coop-scene__image" src={image} alt="숲 옆에서 일하는 공사팀" /><div className="coop-sound-waves" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} style={{ height: `${10 + level * n / 6}%` }} />)}</div><span className="coop-quiet-status">{level <= 35 ? '작아진 소리 미리 듣기' : '지금은 기계 소리가 커'}</span>
      <button type="button" className="coop-listen" disabled={!audioEnabled} aria-pressed={listening && audioEnabled} onClick={toggleListening}>{!audioEnabled ? <MutedIcon /> : <SoundIcon />}<span>{listening && audioEnabled ? '공사 소리 멈추기' : '공사 소리 듣기'}</span></button>
    </div>
    <label className="coop-noise-slider"><span>공사 소리 줄이기</span><input type="range" min="0" max="100" step="5" value={level} aria-valuetext={level === 0 ? '기계 소리 없음' : level <= 35 ? '작아진 소리' : '큰 소리'} onChange={(e) => onLevel(Number(e.target.value))} /><output>{level === 0 ? '소리 없음' : level <= 35 ? '조용해' : '시끄러워'}</output></label>
    <p className="coop-activity-hint" role="status">{hint}</p>
  </div>;
}
