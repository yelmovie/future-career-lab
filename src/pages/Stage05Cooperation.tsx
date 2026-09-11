import { useMemo, useState, type PointerEvent } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { homeAsset, pageAsset, v3Asset, v5Asset, v8Asset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { JobId, PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { PlantingActivity, QuietWorkActivity, WaterMarkActivity } from './CooperationActivities';
import { adjustWorkNoise, canCompleteMission, completeCooperationMission, COOP_MISSIONS, finishCooperation, markBlockedWater, plantSapling, restoreCooperation, returnToCooperationMap, selectCooperationMission, startCooperation, type CooperationState, type MissionId } from './stage5CooperationModel';
import './cooperation.css';

const SAVE_KEY = 'p9Cooperation';
const STAGE = STAGE_META[4]!;
const MAP = v5Asset('drone-map-wide');
const RESTORED = '/assets/v9/cooperation-map-restored.png';
const SAPLING = '/assets/v9/cooperation-sapling.png';
const TEAM: Record<JobId, { name: string; image: string; action: string }> = {
  drone: { name: '드론 전문가', image: pageAsset(4, 2), action: '위치를 찾아 알려 줬어' },
  ecology: { name: '생태연구가', image: pageAsset(7, 1), action: '새에게 필요한 환경을 알아봤어' },
  care: { name: '사육사 하늘', image: v3Asset('keeper-haneul'), action: '새가 쉴 곳을 챙겼어' },
  broadcast: { name: '방송기술자', image: pageAsset(3, 3), action: '도움이 필요한 곳을 알렸어' },
};
const ORDER: JobId[] = ['drone', 'ecology', 'care', 'broadcast'];
type Link = { job: JobId; title: string; text: string; plan: string };
interface Mission {
  title: string; place: string; pin: {x: number; y: number}; job: JobId; instruction: string; bubble: string;
  before: string; after: string; action: string; resultTitle: string; result: string; time: string; links: Link[];
}
const MISSIONS: Record<MissionId, Mission> = {
  trees: {
    title: '새가 먹을 나무 심기', place: '나무가 베인 곳', pin: { x: 36, y: 40 }, job: 'ecology',
    instruction: '묘목을 끌어 두 자리에 심어 줘', bubble: '드론 팀이 빈자리를 찾아 줬어.\n열매나무가 자라면 새들의 먹이가 생겨.',
    before: v8Asset('ecology-compare-before'), after: v8Asset('ecology-compare-trees'), action: '함께 나무 돌보기',
    resultTitle: '우리가 심은 나무가 자라고 있어', result: '방송을 듣고 온 사람들이 물을 주며 돌봤어. 시간이 흐르며 새가 먹고 쉴 곳이 늘어날 거야.', time: '함께 심고, 꾸준히 돌본 뒤',
    links: [
      { job: 'drone', title: '드론 팀이 자리를 찾고', text: '하늘 사진으로 나무가 베인 곳을 알려 줬어.', plan: '사진에서 나무가 베인 곳을 찾았어.' },
      { job: 'ecology', title: '우리 팀이 묘목을 심고', text: '비교해 본 결과를 바탕으로 먹이나무를 골랐어.', plan: '새들의 먹이가 될 나무를 심어 줘.' },
      { job: 'broadcast', title: '방송을 듣고 사람들이 합류!', text: '심은 나무가 자라도록 계속 돌봐 주기로 했어.', plan: '심은 뒤 함께 돌볼 사람들을 모을게.' },
    ],
  },
  water: {
    title: '막힌 물길 알려 주기', place: '막힌 물길', pin: { x: 61, y: 66 }, job: 'drone',
    instruction: '물길을 막는 자재 위를 쓸어 표시해', bubble: '사진에 자재가 물길을 가로막고 있어.\n위치를 표시하면 물길 정비팀이 찾아갈 수 있어.',
    before: v8Asset('broadcast-photo-stream-blocked-v2'), after: '/assets/v9/cooperation-water-cleared.png', action: '물길 정비팀에 보내기',
    resultTitle: '위치를 알려 주니 물길이 열렸어', result: '정비팀이 표시한 곳의 자재를 안전하게 치웠어. 돌봄 팀은 새가 물을 마실 수 있는 조용한 물가를 살폈어.', time: '전문가들이 물길을 정리한 뒤',
    links: [
      { job: 'drone', title: '우리가 막힌 위치를 표시하고', text: '정비팀이 어디로 가야 할지 알 수 있어.', plan: '사진에서 막힌 위치를 표시해 줘.' },
      { job: 'broadcast', title: '방송 팀이 도움을 연결하고', text: '물길 정비팀에 정확한 위치를 전했어.', plan: '정비팀에 표시한 위치를 전할게.' },
      { job: 'care', title: '돌봄 팀이 물가를 살피고', text: '새들이 편히 마실 곳인지 확인했어.', plan: '정리가 끝나면 새들이 쉴 곳을 살필게.' },
    ],
  },
  quiet: {
    title: '조용한 작업 약속하기', place: '숲 옆 공사장', pin: { x: 80, y: 38 }, job: 'broadcast',
    instruction: '손잡이를 밀어 조용한 방법을 찾아', bubble: '조사 팀이 큰 소리를 줄여 보자고 했어.\n공사팀에 부탁할 조용한 방법을 골라 보자.',
    before: v8Asset('broadcast-photo-construction-v2'), after: '/assets/v9/cooperation-quiet-site.png', action: '공사팀에 약속 전하기',
    resultTitle: '공사팀도 새들을 위해 힘을 보탰어', result: '공사팀이 소리를 줄이는 가림벽을 세웠어. 시끄러운 작업을 쉬는 시간을 정하고, 돌봄 팀과 새들을 살폈어.', time: '공사팀이 조용한 방법으로 바꾼 뒤',
    links: [
      { job: 'ecology', title: '조사 팀이 소리를 비교하고', text: '소리가 달라졌을 때 새 수를 살펴봤어.', plan: '조사에서 큰 소리가 영향을 줬어.' },
      { job: 'broadcast', title: '우리 팀이 조용한 방법을 전하고', text: '무엇을 바꿀지 공사팀이 알 수 있게 부탁했어.', plan: '소리를 줄여 달라고 부탁할 거야.' },
      { job: 'care', title: '돌봄 팀이 새들을 살피고', text: '문제를 고친 뒤에도 잘 지내는지 확인해.', plan: '작업을 바꾼 뒤 새들이 잘 쉬는지 볼게.' },
    ],
  },
};

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
    logEvent({ page: 9, type: 'cooperation-help', summary: `${mission.title}: ${mission.result}`, tags: ['직업 협업', '도움 연결'], contextRef: `cooperation:${state.current}` });
  };
  const ended = state.phase === 'ending';
  const step = ended ? 5 : state.phase === 'welcome' ? 1 : Math.min(4, state.completed.length + (state.phase === 'result' ? 1 : 2));
  const instruction = ended ? '우리가 함께 바꾼 숲이야' : state.phase === 'welcome' ? '방송을 듣고 팀이 모였어!' : state.phase === 'map' ? '어느 곳부터 도와줄까?' : state.phase === 'result' ? mission?.resultTitle ?? '도움을 이어 줬어' : mission!.instruction;
  const bubble = ended ? '찾아낸 것을 나누고, 서로 잘하는 일을 보탰어.\n미래의 도시와 숲 문제도 이렇게 함께 풀 수 있어.' : state.phase === 'welcome' ? '앞에서 해낸 일들이 이제 한데 모였어.\n팀과 함께 숲을 돌보러 가자!' : state.phase === 'map' ? state.completed.length === 3 ? '세 곳에 필요한 도움을 모두 연결했어!\n시간이 흐른 뒤 숲이 어떻게 달라졌는지 보자.' : '먼저 도와주고 싶은 곳을 골라 봐.\n어디부터 시작해도 괜찮아.' : state.phase === 'result' ? state.completed.length === 3 ? '서로의 일을 이어 받아 세 곳을 모두 도왔어!\n우리가 함께 만든 변화를 보러 가자.' : '네가 한 일을 다음 팀이 이어 받았어!\n다른 곳에도 우리 팀의 도움이 필요해.' : mission!.bubble;
  const next = ended ? { label: '수료증 확인하기', onClick: () => onNavigate(11) } : state.phase === 'welcome' ? { label: '함께 숲으로 가기', onClick: () => commit(startCooperation(state)) } : state.phase === 'map' ? { label: state.completed.length === 3 ? '함께 바꾼 숲 보기' : '지도에서 곳을 골라 줘', disabled: state.completed.length !== 3, hint: '지도 위에 남은 장소를 눌러 줘', onClick: finish } : state.phase === 'result' ? { label: state.completed.length === 3 ? '함께 바꾼 숲 보기' : '다른 곳도 도와주기', onClick: state.completed.length === 3 ? finish : () => commit(returnToCooperationMap(state)) } : { label: mission!.action, disabled: !ready, hint: state.current === 'trees' ? `묘목을 두 자리에 심어 줘 (${state.planted.length}/2)` : state.current === 'water' ? '물길을 막는 자재를 표시해 줘' : '손잡이를 왼쪽으로 밀어 조용하게 해 줘', onClick: confirm };
  return <StepShell page={9} className="p9-coop" steps={5} step={step} instruction={instruction} mentor={activeJob ? TEAM[activeJob].image : homeAsset('mentor')} mentorName={activeJob ? TEAM[activeJob].name : '탐험단장'} bubble={bubble} status={`함께 도운 곳 ${state.completed.length} / 3`} next={{ ...next, disabledMode: 'lock' }} onNavigate={onNavigate} help={<div className="coop-help"><p>세 곳 중 돕고 싶은 곳부터 골라. 묘목을 끌어 심고, 물길을 쓸어 표시하고, 소리를 조절해 봐.</p><p>끌기나 쓸기가 어려우면 물건과 자리를 차례로 눌러도 돼. 키보드로도 할 수 있어.</p><p>다른 직업과 정보를 나누면 네가 한 일을 이어서 해결해 줘. 세 곳을 도우면 함께 바꾼 숲과 수료증을 볼 수 있어.</p></div>}>
    {state.phase === 'welcome' && <section className="coop-welcome"><ForestMap completed={[]} /><div className="coop-briefing"><h2>이번에는 우리 모두 함께!</h2><p>사진과 조사 결과를 나누고,<br />새와 숲에 필요한 도움을 이어 주자.</p><div className="coop-team-grid">{ORDER.map((job) => <article key={job}><img src={TEAM[job].image} alt="" /><strong>{TEAM[job].name}</strong><p>{facts[job]}</p></article>)}</div></div></section>}
    {state.phase === 'map' && <section className="coop-hub"><h2>사진에서 찾은 세 곳, 필요한 도움도 달라</h2><ForestMap completed={state.completed} onPick={(id) => { audioService.playSfx('tap'); commit(selectCooperationMission(state, id)); }} /><p>나무 심기 · 물길 알려 주기 · 조용한 작업 약속하기</p></section>}
    {state.phase === 'work' && mission && <section className="coop-work"><header className="coop-handoff"><img src={TEAM[mission.job].image} alt="" /><div><strong>{mission.title}</strong><p>{state.current === 'trees' ? facts.planting : state.current === 'water' ? facts.drone : facts.quiet}</p></div><button type="button" className="coop-back-map" onClick={() => commit(returnToCooperationMap(state))}>지도로</button></header><div className="coop-workspace">
      {state.current === 'trees' && <PlantingActivity planted={state.planted} onPlant={(site) => commit(plantSapling(state, site))} image={mission.before} sapling={SAPLING} />}
      {state.current === 'water' && <WaterMarkActivity marked={state.waterMarked} onMark={() => commit(markBlockedWater(state))} image={mission.before} />}
      {state.current === 'quiet' && <QuietWorkActivity level={state.noiseLevel} onLevel={(level) => commit(adjustWorkNoise(state, level))} image={mission.before} audioEnabled={!save.audio.muted && save.audio.sfxVolume > 0} />}
      <aside className="coop-work-notes"><h3>이렇게 힘을 보태</h3><TeamLinks links={mission.links} planned /></aside>
    </div></section>}
    {state.phase === 'result' && mission && <section className="coop-result"><img className="coop-result__image" src={mission.after} alt={mission.resultTitle} /><div className="coop-result__copy"><span>{mission.time}</span><h2>{mission.resultTitle}</h2><p>{mission.result}</p><TeamLinks links={mission.links} /></div></section>}
    {ended && <section className="coop-ending"><header><h2>서로의 도움이 모여 숲이 달라졌어</h2><p>함께 돌보고 시간이 흐른 뒤의 모습이야. 손잡이를 밀어 비교해 봐.</p></header><div className="coop-comparison"><div className="coop-comparison__pictures" onPointerDown={(event) => { if (!event.isPrimary || event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); compareAt(event); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) compareAt(event); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onDragStart={(event) => event.preventDefault()}><img className="coop-comparison__before" src={MAP} alt="도움을 주기 전 숲" /><img className="coop-comparison__after" src={RESTORED} style={{ clipPath: `inset(0 0 0 ${comparison}%)` }} alt="나무가 자라고 물길이 열린 숲" /><span className="coop-comparison__label coop-comparison__label--before" hidden={comparison < 25}>이전 모습</span><span className="coop-comparison__label coop-comparison__label--after" hidden={comparison > 75}>함께 바꾼 모습</span><span className="coop-comparison__divider" style={{ left: `${comparison}%` }} /><span className="coop-comparison__handle" style={{ left: `clamp(24px, ${comparison}%, calc(100% - 24px))` }} aria-hidden="true">↔</span></div><label><span>두 모습 비교하기</span><input className="coop-comparison__range" type="range" min="0" max="100" value={comparison} aria-label="숲의 전후 모습 비교" aria-valuetext={comparison === 100 ? '이전 모습 모두 보기' : comparison === 0 ? '함께 바꾼 모습 모두 보기' : '이전 모습은 왼쪽, 함께 바꾼 모습은 오른쪽'} onChange={(e) => setComparison(Number(e.target.value))} /></label></div><div className="coop-team-summary" aria-label="함께한 직업">{ORDER.map((job) => <article key={job}><img src={TEAM[job].image} alt="" /><strong>{TEAM[job].name}</strong><p>{TEAM[job].action}</p></article>)}</div></section>}
  </StepShell>;
}
