import { useEffect, useRef, useState } from 'react';
import content from '../data/schoolGarden.json';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { chooseSchoolHelp, fillSchoolWater, restoreSchoolGarden, type SchoolChoice, type SchoolGardenState } from './schoolGardenModel';
import './school-garden.css';

const KEY = 'schoolGarden';
/** 선택형 후일담. 수료증 해금 조건과 분리하고, 고른 도움과 수정만 기록한다. */
export function SchoolGardenActivity({ onBack }: { onBack: () => void }) {
  const { save, setPageData, logEvent } = useGame();
  const [state, setState] = useState(() => restoreSchoolGarden(save.pageData[KEY]));
  const [water, setWater] = useState(state.water);
  const hold = useRef<{ start: number; base: number; frame: number } | null>(null);
  const latest = useRef(state);
  const success = useRef<HTMLDivElement>(null);
  const commit = (next: SchoolGardenState) => {
    const wasDone = latest.current.completed;
    latest.current = next; setState(next); setPageData(KEY, next);
    if (next.completed && !wasDone) {
      requestAnimationFrame(() => success.current?.focus());
      audioService.playSfx('success');
      logEvent({ page: 9, type: 'school-garden-help', contextRef: 'school-garden', summary: `학교 화단의 빈 물그릇을 살펴 깨끗한 물을 채웠어.${next.attempts.some((id) => id !== 'water') ? ' 처음 고른 도움을 다시 살펴보고 바꿨어.' : ''} 사육사·선생님·방송 팀과 계속 돌보기로 했어.`, tags: ['새 장소 살피기', '생각 바꾸기', '직업 협업'] });
    }
  };
  const stop = (tap = false) => {
    const active = hold.current; if (!active) return;
    cancelAnimationFrame(active.frame); hold.current = null;
    const elapsed = performance.now() - active.start;
    const level = Math.min(100, active.base + (tap && elapsed < 180 ? 25 : elapsed / 18));
    const next = fillSchoolWater(latest.current, level); setWater(next.water); commit(next);
  };
  const start = () => {
    if (hold.current || latest.current.completed || latest.current.choice !== 'water') return;
    const active = { start: performance.now(), base: latest.current.water, frame: 0 };
    hold.current = active;
    const tick = () => {
      if (hold.current !== active) return;
      const value = Math.min(100, active.base + (performance.now() - active.start) / 18);
      setWater(value);
      if (value >= 100) { hold.current = null; commit(fillSchoolWater(latest.current, 100)); }
      else active.frame = requestAnimationFrame(tick);
    };
    active.frame = requestAnimationFrame(tick);
  };
  useEffect(() => {
    const cancel = () => { if (hold.current) cancelAnimationFrame(hold.current.frame); hold.current = null; setWater(latest.current.water); };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel); document.addEventListener('visibilitychange', visibility);
    return () => { if (hold.current) cancelAnimationFrame(hold.current.frame); hold.current = null; window.removeEventListener('blur', cancel); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const selected = content.choices.find((choice) => choice.id === state.choice);
  const tried = state.attempts.some((id) => id !== 'water');
  const previous = save.artifacts.graphs.find((graph) => graph.verdict === 'main');
  const cue = state.completed ? content.result : selected?.hint ?? (previous?.variable === 'logging' ? '숲에서는 먹이나무가 필요했지. 이 학교 화단에서는 무엇이 필요할까?' : content.scene);
  return <section className="school-garden" aria-label="학교 화단 도와주기">
    <header><div><span>더 해보기 · 건너뛰어도 괜찮아</span><h2>{content.title}</h2></div><button type="button" onClick={onBack}>숲으로 돌아가기</button></header>
    <div className="school-garden__body">
      <div className="school-garden__picture"><img src={state.completed ? content.after : content.before} alt={state.completed ? '물을 채운 그릇에서 새가 물을 마시는 학교 화단' : content.scene} /><span>{state.completed ? '우리가 함께 돌본 화단' : '열매와 그늘은 충분해'}</span></div>
      <div className="school-garden__tools">
        <p className="school-garden__cue" role="status">{cue}</p>
        {state.choice !== 'water' && <div className="school-garden__choices" aria-label="학교 화단에 필요한 도움">{content.choices.map((choice) => <button key={choice.id} type="button" aria-pressed={state.choice === choice.id} onClick={() => { commit(chooseSchoolHelp(state, choice.id as SchoolChoice)); audioService.playSfx('tap'); }}><img src={choice.image} alt="" /><span>{choice.label}</span></button>)}</div>}
        {state.choice === 'water' && !state.completed && <div className="school-garden__pour">
          <div className="school-garden__water" role="progressbar" aria-label="물그릇 채우기" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(water)}><span style={{ height: `${water}%` }} /><b>{Math.round(water)}%</b></div>
          <button type="button" className="school-garden__hold" onPointerDown={(e) => { if (!e.isPrimary || e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); start(); }} onPointerUp={(e) => { stop(true); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => stop()} onLostPointerCapture={() => stop()} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(); } }} onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); stop(true); } }} onBlur={() => stop()} onClick={(e) => { if (e.detail === 0 && !hold.current && !latest.current.completed) { const next = fillSchoolWater(latest.current, latest.current.water + 25); setWater(next.water); commit(next); } }}>꾹 눌러 물 주기</button>
          <p>길게 누르거나 짧게 여러 번 눌러도 돼.</p>
        </div>}
        {state.completed && <div ref={success} tabIndex={-1} className="school-garden__success"><strong>{tried ? '다시 살펴보고 도움을 바꿨어!' : '새 장소에 필요한 도움을 찾았어!'}</strong><p>{content.teamwork}</p><p>우리 주변에 도움이 필요한 곳은 또 어디일까?</p></div>}
      </div>
    </div>
  </section>;
}
