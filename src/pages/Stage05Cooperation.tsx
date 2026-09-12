import { useMemo, useState, type PointerEvent } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { homeAsset, v5Asset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { PlantingActivity, QuietWorkActivity, WaterMarkActivity } from './CooperationActivities';
import { adjustWorkNoise, chooseQuietPromise, QUIET_PROMISES, canCompleteMission, completeCooperationMission, COOP_MISSIONS, finishCooperation, markBlockedWater, plantSapling, restoreCooperation, returnToCooperationMap, selectCooperationMission, startCooperation, type CooperationState, type MissionId } from './stage5CooperationModel';
import { SchoolGardenActivity } from './SchoolGardenActivity';
import { restoreSchoolGarden } from './schoolGardenModel';
import { TEAM, ORDER, MISSIONS, type Link } from './cooperationContent';
import './cooperation.css';

const SAVE_KEY = 'p9Cooperation';
const STAGE = STAGE_META[4]!;
const MAP = v5Asset('drone-map-wide');
const RESTORED = '/assets/v9/cooperation-map-restored.webp';
const SAPLING = '/assets/v9/cooperation-sapling.webp';
function TeamLinks({ links, planned = false }: { links: Link[]; planned?: boolean }) {
  return <ol className="coop-team-link">{links.map((link) => <li key={link.job}><img src={TEAM[link.job].image} alt="" /><div><strong>{planned ? TEAM[link.job].name : link.title}</strong><p>{planned ? link.plan : link.text}</p></div></li>)}</ol>;
}

function ForestMap({ completed, onPick }: { completed: MissionId[]; onPick?: (id: MissionId) => void }) {
  return <div className="coop-map" aria-label="함께 살릴 숲 지도"><img className="coop-map__image" src={completed.length === 3 ? RESTORED : MAP} alt="숲 가장자리, 물길, 공사장이 보이는 하늘 지도" />
    {COOP_MISSIONS.map((id, i) => <button key={id} type="button" className={`coop-map__pin${completed.includes(id) ? ' is-done' : ''}`} style={{ left: `${MISSIONS[id].pin.x}%`, top: `${MISSIONS[id].pin.y}%` }} disabled={!onPick || completed.includes(id)} onClick={() => onPick?.(id)} aria-label={`${MISSIONS[id].place}${completed.includes(id) ? ' 도움 완료' : ' 도와주기'}`}><span className="coop-map__mark">{completed.includes(id) ? '✓' : i + 1}</span><span className="coop-map__label">{MISSIONS[id].place}</span></button>)}
  </div>;
}

export default function Stage05Cooperation({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, setPageData, setArtifacts, completePage, addBadge, addJobCard, grantReward, logEvent } = useGame();
  const [state, setState] = useState(() => restoreCooperation(save.pageData[SAVE_KEY], save.pageData.p9Alliance, save.stageProgress.completedPages.includes(9)));
  const [comparison, setComparison] = useState(50);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const compareAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setComparison(Math.max(0, Math.min(100, Math.round((event.clientX - rect.left) / rect.width * 100))));
  };
  const mission = state.current ? MISSIONS[state.current] : null;
  const activeJob = state.phase === 'work' && mission ? mission.job : null;
  const commit = (next: CooperationState) => { if (next === state) return; setState(next); setPageData(SAVE_KEY, next); };
  const ready = canCompleteMission(state);
  const facts = useMemo(() => {
    const ecology = save.pageData.page07Ecology as { trials?: unknown } | undefined;
    const trials = Array.isArray(ecology?.trials) ? ecology.trials.filter((t) => t && typeof t === 'object' && typeof t.before === 'number' && typeof t.after === 'number') : [];
    const trees = trials.find((t) => t.variable === 'logging' && t.to > t.from && t.after > t.before);
    const quiet = trials.find((t) => t.variable === 'noise' && t.to < t.from && t.after > t.before);
    return {
      drone: save.artifacts.photos.length ? `네가 찍은 사진 ${save.artifacts.photos.length}장이 도착했어.` : '하늘 사진으로 도움이 필요한 곳을 찾았어.',
      ecology: trials.length ? `네가 비교한 ${trials.length}번의 결과를 가져왔어.` : '새들이 살기 좋은 환경을 함께 알아볼게.',
      care: save.artifacts.careLog.length ? '지구와 젤리를 돌본 경험을 나눌게.' : '새가 안전하게 쉴 곳을 살필게.',
      broadcast: save.artifacts.clip ? '네 방송을 듣고 도움을 주러 모였어!' : '팀 소식을 전하고 도움을 모을게.',
      planting: trees ? `먹이나무를 늘리자 새가 ${trees.before}마리에서 ${trees.after}마리로 늘었지.` : '조사에서 새들의 먹이가 될 나무가 필요했어.',
      quiet: quiet ? `소리를 줄이자 새가 ${quiet.before}마리에서 ${quiet.after}마리로 늘었지.` : '큰 소리를 줄이면 새들이 쉬기 편할 거야.',
    };
  }, [save.artifacts, save.pageData.page07Ecology]);
  const finish = () => {
    const final = finishCooperation(state); if (final.phase !== 'ending') return;
    commit(final);
    if (!save.stageProgress.completedPages.includes(9)) {
      setArtifacts({ allianceTurns: state.actions }); completePage(9); addBadge(STAGE.badgeName); addJobCard(STAGE.jobTitle); grantReward('stage5-alliance');
      logEvent({ page: 9, type: 'alliance-clear', summary: `드론 사진, 생태 조사, 돌봄 경험, 방송을 연결해 ${state.completed.map((id) => MISSIONS[id].place).join(' → ')} 순서로 도왔어. 묘목 심기·물길 표시·조용한 작업 약속을 팀과 이어서 해결했어.`, tags: ['직업 협업', '정보 나누기', '함께 문제 해결'], traits: { collaboration: 2, analysis: 1, execution: 1 }, contextRef: 'cooperation-forest' });
      audioService.playSfx('reward'); audioService.playCue('forestBirdsong', 1400);
    }
  };
  const confirm = () => {
    const next = completeCooperationMission(state); if (next === state || !mission) return;
    commit(next); audioService.playSfx('success');
    logEvent({ page: 9, type: 'cooperation-help', summary: `${mission.title}: ${state.current === 'quiet' && state.quietPromise ? QUIET_PROMISES[state.quietPromise].result : mission.result}`, tags: ['직업 협업', '도움 연결'], contextRef: `cooperation:${state.current}` });
  };
  const ended = state.phase === 'ending';
  const step = ended ? 5 : state.phase === 'welcome' ? 1 : Math.min(4, state.completed.length + (state.phase === 'result' ? 1 : 2));
  const schoolDone = restoreSchoolGarden(save.pageData.schoolGarden).completed;
  const instruction = ended ? schoolOpen ? schoolDone ? '새 장소에 맞는 도움을 찾았어!' : '학교 화단에는 어떤 도움이 필요할까?' : '우리가 함께 바꾼 숲이야' : state.phase === 'welcome' ? '방송을 듣고 팀이 모였어!' : state.phase === 'map' ? '어느 곳부터 도와줄까?' : state.phase === 'result' ? mission?.resultTitle ?? '도움을 이어 줬어' : mission!.instruction;
  const bubble = ended ? schoolOpen ? schoolDone ? '그곳을 살펴보고 필요한 도움을 골랐어.\n우리 학교에서는 누구와 힘을 모으면 좋을까?' : '장소가 바뀌면 필요한 도움도 달라져.\n그림을 살펴보고 새에게 필요한 것을 골라 봐.' : '찾아낸 것을 나누고, 서로 잘하는 일을 보탰어.\n미래의 도시와 숲 문제도 이렇게 함께 풀 수 있어.' : state.phase === 'welcome' ? '앞에서 해낸 일들이 이제 한데 모였어.\n팀과 함께 숲을 돌보러 가자!' : state.phase === 'map' ? state.completed.length === 3 ? '세 곳에 필요한 도움을 모두 연결했어!\n시간이 흐른 뒤 숲이 어떻게 달라졌는지 보자.' : '먼저 도와주고 싶은 곳을 골라 봐.\n어디부터 시작해도 괜찮아.' : state.phase === 'result' ? state.completed.length === 3 ? '서로의 일을 이어 받아 세 곳을 모두 도왔어!\n우리가 함께 만든 변화를 보러 가자.' : '네가 한 일을 다음 팀이 이어 받았어!\n다른 곳에도 우리 팀의 도움이 필요해.' : mission!.bubble;
  const next = ended ? { label: '수료증 확인하기', onClick: () => onNavigate(11) } : state.phase === 'welcome' ? { label: '함께 숲으로 가기', onClick: () => commit(startCooperation(state)) } : state.phase === 'map' ? { label: state.completed.length === 3 ? '함께 바꾼 숲 보기' : '지도에서 곳을 골라 줘', disabled: state.completed.length !== 3, hint: '지도 위에 남은 장소를 눌러 줘', onClick: finish } : state.phase === 'result' ? { label: state.completed.length === 3 ? '함께 바꾼 숲 보기' : '다른 곳도 도와주기', onClick: state.completed.length === 3 ? finish : () => commit(returnToCooperationMap(state)) } : { label: mission!.action, disabled: !ready, hint: state.current === 'trees' ? `묘목을 두 자리에 심어 줘 (${state.planted.length}/2)` : state.current === 'water' ? '물길을 막는 자재를 표시해 줘' : !state.quietPromise ? '공사팀에 전할 부탁을 골라 줘' : '손잡이를 왼쪽으로 밀어 소리를 줄여 봐', onClick: confirm };
  return <StepShell page={9} className="p9-coop" steps={5} step={step} instruction={instruction} mentor={activeJob ? TEAM[activeJob].image : homeAsset('mentor')} mentorName={activeJob ? TEAM[activeJob].name : '탐험단장'} bubble={bubble} status={`함께 도운 곳 ${state.completed.length} / 3`} next={{ ...next, disabledMode: 'lock' }} onNavigate={onNavigate} help={<div className="coop-help"><p>세 곳 중 돕고 싶은 곳부터 골라. 묘목을 끌어 심고, 물길을 쓸어 표시하고, 소리를 조절해 봐.</p><p>끌기나 쓸기가 어려우면 물건과 자리를 차례로 눌러도 돼. 키보드로도 할 수 있어.</p><p>다른 직업과 정보를 나누면 네가 한 일을 이어서 해결해 줘. 세 곳을 도우면 함께 바꾼 숲과 수료증을 볼 수 있어.</p></div>}>
    {state.phase === 'welcome' && <section className="coop-welcome"><ForestMap completed={[]} /><div className="coop-briefing"><h2>이번에는 우리 모두 함께!</h2><p>사진과 조사 결과를 나누고,<br />새와 숲에 필요한 도움을 이어 주자.</p><div className="coop-team-grid">{ORDER.map((job) => <article key={job}><img src={TEAM[job].image} alt="" /><strong>{TEAM[job].name}</strong><p>{facts[job]}</p></article>)}</div></div></section>}
    {state.phase === 'map' && <section className="coop-hub"><h2>사진에서 찾은 세 곳, 필요한 도움도 달라</h2><ForestMap completed={state.completed} onPick={(id) => { audioService.playSfx('tap'); commit(selectCooperationMission(state, id)); }} /><p>나무 심기 · 물길 알려 주기 · 조용한 작업 약속하기</p></section>}
    {state.phase === 'work' && mission && <section className="coop-work"><header className="coop-handoff"><img src={TEAM[mission.job].image} alt="" /><div><strong>{mission.title}</strong><p>{state.current === 'trees' ? facts.planting : state.current === 'water' ? facts.drone : facts.quiet}</p></div><button type="button" className="coop-back-map" onClick={() => commit(returnToCooperationMap(state))}>지도로</button></header><div className="coop-workspace">
      {state.current === 'trees' && <PlantingActivity planted={state.planted} onPlant={(site) => commit(plantSapling(state, site))} image={mission.before} sapling={SAPLING} />}
      {state.current === 'water' && <WaterMarkActivity marked={state.waterMarked} onMark={() => commit(markBlockedWater(state))} image={mission.before} />}
      {state.current === 'quiet' && <QuietWorkActivity level={state.noiseLevel} onLevel={(level) => commit(adjustWorkNoise(state, level))} image={mission.before} audioEnabled={!save.audio.muted && save.audio.sfxVolume > 0} />}
      <aside className="coop-work-notes">{state.current === 'quiet' ? <><h3>공사팀에 전할 부탁</h3><div className="coop-promises">{(['barrier', 'break'] as const).map((id) => <article key={id}><button type="button" aria-pressed={state.quietPromise === id} onClick={() => { commit(chooseQuietPromise(state, id)); audioService.playSfx('tap'); }}>{state.quietPromise === id && '✓ '}{QUIET_PROMISES[id].label}</button></article>)}</div><p className="coop-promise-note">{state.quietPromise ? QUIET_PROMISES[state.quietPromise].detail : '두 방법 모두 도움이 돼. 먼저 전할 부탁을 골라 줘.'}</p></> : <><h3>이렇게 힘을 보태</h3><TeamLinks links={mission.links} planned /></>}</aside>
    </div></section>}
    {state.phase === 'result' && mission && <section className="coop-result"><img className="coop-result__image" src={mission.after} alt={mission.resultTitle} /><div className="coop-result__copy"><span>{mission.time}</span><h2>{mission.resultTitle}</h2><p>{state.current === 'quiet' && state.quietPromise ? QUIET_PROMISES[state.quietPromise].result : mission.result}</p><TeamLinks links={mission.links} /></div></section>}
    {ended && !schoolOpen && <section className="coop-ending"><header><h2>서로의 도움이 모여 숲이 달라졌어</h2><button type="button" className="coop-school-link" onClick={() => setSchoolOpen(true)}>학교 화단도 도와볼까?</button></header><div className="coop-comparison"><div className="coop-comparison__pictures" onPointerDown={(event) => { if (!event.isPrimary || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); compareAt(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) compareAt(event); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onDragStart={(event) => event.preventDefault()}><img className="coop-comparison__before" src={MAP} alt="도움을 주기 전 숲" /><img className="coop-comparison__after" src={RESTORED} style={{ clipPath: `inset(0 0 0 ${comparison}%)` }} alt="나무가 자라고 물길이 열린 숲" /><span className="coop-comparison__label coop-comparison__label--before" hidden={comparison < 25}>이전 모습</span><span className="coop-comparison__label coop-comparison__label--after" hidden={comparison > 75}>함께 바꾼 모습</span><span className="coop-comparison__divider" style={{ left: `${comparison}%` }} /><span className="coop-comparison__handle" style={{ left: `clamp(24px, ${comparison}%, calc(100% - 24px))` }} aria-hidden="true">↔</span></div><label><span>두 모습 비교하기</span><input className="coop-comparison__range" type="range" min="0" max="100" value={comparison} aria-label="숲의 전후 모습 비교" aria-valuetext={comparison === 100 ? '이전 모습 모두 보기' : comparison === 0 ? '함께 바꾼 모습 모두 보기' : '이전 모습은 왼쪽, 함께 바꾼 모습은 오른쪽'} onChange={(e) => setComparison(Number(e.target.value))} /></label></div><div className="coop-team-summary" aria-label="함께한 직업">{ORDER.map((job) => <article key={job}><img src={TEAM[job].image} alt="" /><strong>{TEAM[job].name}</strong><p>{TEAM[job].action}</p></article>)}</div></section>}
    {ended && schoolOpen && <SchoolGardenActivity onBack={() => setSchoolOpen(false)} />}
  </StepShell>;
}
