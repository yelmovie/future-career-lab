import { useMemo, useState } from 'react';
import { GameShell, Panel, TaskCue } from '../components/GameShell';
import { ArrowIcon, CheckIcon, SparkIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import { ABILITY_STATEMENTS, JOB_LABELS, PAGE_META, TRAIT_KEYS, TRAIT_LABELS } from '../shared/constants';
import type { JobId, PageNumber, TraitKey } from '../shared/types';
import { useGame } from '../state/GameContext';
import { CAREER_FIELDS, PREDICTION_NOTE, RESULT_DISCLAIMER, TRANSFER_SITUATION, actualJob } from '../data/resultRules';
import './page09.css';

const JOB_ORDER: JobId[] = ['drone', 'care', 'ecology', 'broadcast'];
const MAX_STATEMENTS = 2;
const MAX_CUSTOM_LENGTH = 40;
const PLAN_KEY = 'p10Plan';

type Tab = 'play' | 'compare' | 'ability';
const TABS: { id: Tab; label: string; image: string }[] = [
  { id: 'play', label: '내 탐험', image: pageAsset(9, 3) },
  { id: 'compare', label: '예측과 우리 동네', image: pageAsset(9, 7) },
  { id: 'ability', label: '나는 이제 …', image: pageAsset(10, 7) },
];

function radarPoints(values: number[]): string {
  const center = 120;
  const radius = 88;
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / values.length);
    const distance = radius * (.28 + value * .72);
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
  }).join(' ');
}

function isJobList(raw: unknown): raw is JobId[] {
  return Array.isArray(raw) && raw.length === 4 && JOB_ORDER.every((job) => raw.includes(job));
}

export default function Page09DNA({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, logEvent, setPageData, setAbilityStatements, teacherMode } = useGame();
  const [tab, setTab] = useState<Tab>('play');
  const completedStages = Object.values(save.stageProgress.completed).filter(Boolean).length;
  const distinctPages = new Set(save.logs.map((log) => log.page)).size;
  const insufficient = save.logs.length < 12 || distinctPages < 4 || completedStages < 3;

  const maxTrait = Math.max(1, ...Object.values(save.traits));
  const traitValues = TRAIT_KEYS.map((key) => save.traits[key] / maxTrait);
  const activeTraits = [...TRAIT_KEYS].filter((key) => save.traits[key] > 0).sort((a, b) => save.traits[b] - save.traits[a]).slice(0, 6);
  const logTags = new Set(save.logs.flatMap((log) => log.tags));

  const recommended = useMemo(() => CAREER_FIELDS.map((field) => {
    const matchedTags = field.tags.filter((tag) => logTags.has(tag));
    const traitFit = TRAIT_KEYS.reduce((sum, key) => sum + (save.traits[key] / maxTrait) * field.weights[key], 0);
    const evidencePages = new Set(save.logs.filter((log) => log.tags.some((tag) => field.tags.includes(tag))).map((log) => log.page));
    return { ...field, matchedTags, evidencePages: evidencePages.size, score: traitFit + matchedTags.length * .16 + evidencePages.size * .08 };
  }).filter((field) => field.matchedTags.length >= 2 && field.evidencePages >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5), [logTags, maxTrait, save.logs, save.traits]);

  const fieldCards = !insufficient && recommended.length >= 3 ? recommended : [];

  const evidence = [...save.logs].reverse().reduce<Array<{ page: PageNumber; copy: string }>>((items, log) => {
    if (items.length >= 3 || items.some((item) => item.page === log.page)) return items;
    return [...items, { page: log.page, copy: log.summary }];
  }, []);

  // (1) 예측 vs 실제
  const { job: actual, evidence: jobReasons } = useMemo(() => actualJob(save.artifacts, save.logs, save.traits), [save.artifacts, save.logs, save.traits]);
  const actualReason = jobReasons.find((entry) => entry.job === actual)?.reason ?? null;
  const prediction = save.prediction;
  const matched = prediction !== null && actual !== null && prediction === actual;

  // (2) 생활 전이 — 내 계획 순서
  const [plan, setPlan] = useState<JobId[]>(() => isJobList(save.pageData[PLAN_KEY]) ? save.pageData[PLAN_KEY] : JOB_ORDER);
  const [planSaved, setPlanSaved] = useState(() => isJobList(save.pageData[PLAN_KEY]));
  const movePlan = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= plan.length) return;
    const next = [...plan];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setPlan(next);
    setPlanSaved(false);
    audioService.playSfx('tap');
  };
  const savePlan = () => {
    setPageData(PLAN_KEY, plan);
    setPlanSaved(true);
    logEvent({
      page: 10,
      type: 'transfer-plan',
      summary: `우리 동네 상황에 ${plan.map((job) => JOB_LABELS[job]).join(' → ')} 순서로 계획을 세웠어.`,
      tags: ['생활 전이', '내 계획', '직업 협업'],
      traits: { collaboration: 1, execution: 1 },
      contextRef: `${TRANSFER_SITUATION.id}:${plan.join('-')}`,
    });
    audioService.playSfx('success');
  };

  // (3) 능력 진술
  const chosen = save.abilityStatements;
  const [custom, setCustom] = useState('');
  const customChosen = chosen.find((statement) => !ABILITY_STATEMENTS.includes(statement));
  const toggleStatement = (statement: string) => {
    const next = chosen.includes(statement) ? chosen.filter((entry) => entry !== statement) : [...chosen, statement];
    if (next.length > MAX_STATEMENTS) return;
    setAbilityStatements(next);
    audioService.playSfx('tap');
  };
  const addCustom = () => {
    const text = custom.trim().slice(0, MAX_CUSTOM_LENGTH);
    if (!text || chosen.length >= MAX_STATEMENTS) return;
    setAbilityStatements([...chosen.filter((entry) => ABILITY_STATEMENTS.includes(entry)), text]);
    setCustom('');
    audioService.playSfx('success');
  };
  const ready = chosen.length >= MAX_STATEMENTS;
  const tabDone: Record<Tab, boolean> = { play: true, compare: planSaved, ability: ready };
  const reflectionReady = planSaved && ready;
  const footerTask = teacherMode
    ? { action: '교사용 해금으로 수료증 화면을 바로 확인할 수 있어', target: '수료증 확인하기', done: true }
    : tab === 'play'
    ? { action: '내 탐험 기록을 확인했어. 우리 동네에 적용해 봐', target: '예측과 우리 동네 보기', done: true }
    : tab === 'compare'
      ? planSaved
        ? { action: '우리 동네 계획을 저장했어. 내 능력을 골라', target: '나는 이제 문장 고르기', done: true }
        : { action: '직업 순서를 정하고 내 계획으로 저장해', target: '이 순서로 내 계획 저장' }
      : !planSaved
        ? { action: '수료증 전에 우리 동네 계획을 먼저 저장해', target: '2단계로 돌아가기' }
        : !ready
          ? { action: `내가 해 낸 능력 문장을 ${MAX_STATEMENTS - chosen.length}개 더 골라`, target: '가운데 능력 문장' }
          : { action: '돌아보기 완료! 수료증을 확인해', target: '수료증 확인하기', done: true };
  const footerAction = () => {
    audioService.playSfx('swipe');
    if (teacherMode) onNavigate(11);
    else if (tab === 'play') setTab('compare');
    else if (tab === 'compare' && planSaved) setTab('ability');
    else if (tab === 'ability' && !planSaved) setTab('compare');
    else if (tab === 'ability' && (reflectionReady || teacherMode)) onNavigate(11);
  };
  const footerLabel = teacherMode
    ? '수료증 확인하기'
    : tab === 'play'
    ? '예측과 우리 동네 보기'
    : tab === 'compare'
      ? planSaved ? '나는 이제 문장 고르기' : '내 계획 저장 먼저'
      : !planSaved ? '2단계 계획 저장하기' : '수료증 확인하기';
  const footerEnabled = teacherMode || tab === 'play' || (tab === 'compare' && planSaved) || (tab === 'ability' && (!planSaved || reflectionReady));

  return (
    <GameShell page={10} eyebrow="PLAY REFLECTION" onNavigate={onNavigate} className="dna-page" footer={
      <div className="p10-footer">
        <TaskCue {...footerTask} />
        <button className={`button button--primary button--large${footerEnabled ? ' is-next-action' : ''}`} onClick={footerAction} disabled={!footerEnabled}>{footerLabel} <ArrowIcon /></button>
      </div>
    }>
      <div className="p10-tabs" role="tablist" aria-label="돌아보기 단계">
        {TABS.map((item, index) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`p10-tab${tab === item.id ? ' is-active' : ''}${tabDone[item.id] ? ' is-done' : ''}`} onClick={() => { setTab(item.id); audioService.playSfx('tap'); }}>
            <span className="p10-tab__art"><img src={item.image} alt="" aria-hidden="true" /><b>{index + 1}</b></span>{item.label}{item.id === 'ability' && <small>{chosen.length}/{MAX_STATEMENTS}</small>}
          </button>
        ))}
      </div>

      {tab === 'play' && (
        <div className="p10-pane p10-pane--play" role="tabpanel">
          <Panel kicker="MY PLAY" title="이번 탐험 요약" className="dna-profile">
            <img src={pageAsset(9, 1)} alt="나의 일하기 지도를 살펴보는 탐험가" />
            <h3>{save.playerName || '미래 탐험가'}</h3>
            <p>{completedStages}개의 스테이지에서 {save.logs.length}개의 선택·행동 장면을 남겼어.</p>
            {insufficient && <p className="p10-note">아직 장면이 조금 부족해. 한두 미션을 더 하면 흐름이 더 잘 보여.</p>}
            <button className="button button--ghost button--block" onClick={() => onNavigate(1)}>다른 미션 더 탐험하기</button>
          </Panel>

          <Panel kicker="ACTION PATTERN" title="내가 자주 쓴 방법" className="radar-panel">
            <div className="radar-wrap">
              <svg viewBox="0 0 240 240" aria-label="여섯 가지 행동 경향을 비교한 도형">
                {[1, .75, .5, .25].map((scale) => <polygon key={scale} points={radarPoints(TRAIT_KEYS.map(() => scale))} className="radar-gridline" />)}
                <polygon points={radarPoints(traitValues)} className="radar-shape" />
                {TRAIT_KEYS.map((_, index) => {
                  const angle = -Math.PI / 2 + index * Math.PI * 2 / 6;
                  return <circle key={index} cx={120 + Math.cos(angle) * 88 * (.28 + traitValues[index]! * .72)} cy={120 + Math.sin(angle) * 88 * (.28 + traitValues[index]! * .72)} r="4" className="radar-dot" />;
                })}
              </svg>
              <ul className="trait-list">{activeTraits.map((key: TraitKey) => <li key={key}><span />{TRAIT_LABELS[key]}</li>)}</ul>
            </div>
            <p className="radar-note">{RESULT_DISCLAIMER}</p>
          </Panel>

          <Panel kicker="EVIDENCE" title="내가 실제로 한 일" className="evidence-panel">
            <ol className="evidence-list">{evidence.length ? evidence.map((item, index) => <li key={item.page}><span>{index + 1}</span><div><small>{PAGE_META[item.page].title}</small><p>{item.copy}</p></div></li>) : <li className="empty-evidence">미션에서 행동하면 실제 기록이 여기에 모여.</li>}</ol>
          </Panel>
        </div>
      )}

      {tab === 'compare' && (
        <div className="p10-pane p10-pane--compare" role="tabpanel">
          <Panel kicker="PREDICTION" title="예측 vs 실제" className="p10-predict">
            <div className="p10-compare">
              <div><span>브리핑 때 예측</span><strong>{prediction ? JOB_LABELS[prediction] : '예측 안 함'}</strong></div>
              <i aria-hidden="true"><ArrowIcon /></i>
              <div><span>이번 탐험에서 가장 잘 움직인 직업</span><strong>{actual ? JOB_LABELS[actual] : '아직 기록이 적어'}</strong>{actualReason && <small className="p10-reason">{actualReason}</small>}</div>
            </div>
            {prediction && actual && <p className={`p10-verdict${matched ? ' is-match' : ''}`}>{matched ? '예측이 실제와 같았어.' : '예측과 실제가 달랐어.'}</p>}
            <p className="p10-note">{PREDICTION_NOTE}</p>
            <section className="field-section" aria-labelledby="field-title">
              <div className="field-heading"><span>EXPLORE NEXT</span><h2 id="field-title">더 탐험해볼 분야</h2></div>
              {fieldCards.length ? <div className="field-grid">{fieldCards.slice(0, 3).map((field) => <article key={field.id} className="field-card">
                <img src={pageAsset(9, field.assetSlot)} alt="" />
                <div><h3>{field.title}</h3><p>{field.copy}</p><ul>{field.jobs.map((job) => <li key={job}>{job}</li>)}</ul></div>
              </article>)}</div> : <div className="field-empty"><SparkIcon /><p>여러 미션에서 선택하고 고친 장면을 더 남기면 탐험 분야 카드가 열려.</p></div>}
            </section>
          </Panel>

          <Panel kicker="MY TOWN" title="우리 동네라면?" className="p10-transfer">
            <h3>우리 학교 옆 공원 공사로 새가 안 온다면?</h3>
            <p className="p10-note">{TRANSFER_SITUATION.copy}</p>
            <ol className="p10-plan" aria-label="내 계획 순서">
              {plan.map((job, index) => (
                <li key={job}>
                  <b>{index + 1}</b>
                  <span>{JOB_LABELS[job]}</span>
                  <div className="p10-plan-move">
                    <button className="button button--ghost" onClick={() => movePlan(index, -1)} disabled={index === 0} aria-label={`${JOB_LABELS[job]} 위로`}>위로</button>
                    <button className="button button--ghost" onClick={() => movePlan(index, 1)} disabled={index === plan.length - 1} aria-label={`${JOB_LABELS[job]} 아래로`}>아래로</button>
                  </div>
                </li>
              ))}
            </ol>
            <button className="button button--teal button--block" onClick={savePlan} disabled={planSaved}>{planSaved ? <><CheckIcon />내 계획 저장됨</> : '이 순서로 내 계획 저장'}</button>
          </Panel>
        </div>
      )}

      {tab === 'ability' && (
        <div className="p10-pane p10-pane--ability" role="tabpanel">
          <Panel kicker="I CAN NOW" title="나는 이제 …" className="p10-ability">
            <p className="p10-note">{MAX_STATEMENTS}개를 골라. 고른 문장은 수료증에 그대로 찍혀.</p>
            <ul className="p10-statements" aria-label="능력 문장 고르기">
              {ABILITY_STATEMENTS.map((statement) => {
                const selected = chosen.includes(statement);
                return (
                  <li key={statement}>
                    <button className={`p10-statement${selected ? ' is-selected' : ''}`} onClick={() => toggleStatement(statement)} aria-pressed={selected} disabled={!selected && ready}>
                      <span className="p10-statement__mark">{selected && <CheckIcon />}</span>{statement}
                    </button>
                  </li>
                );
              })}
              {customChosen && (
                <li>
                  <button className="p10-statement is-selected" onClick={() => toggleStatement(customChosen)} aria-pressed="true">
                    <span className="p10-statement__mark"><CheckIcon /></span>{customChosen}
                  </button>
                </li>
              )}
            </ul>
          </Panel>
          <Panel kicker="WRITE" title="직접 쓰기" className="p10-custom-panel">
            <form className="p10-custom" onSubmit={(event) => { event.preventDefault(); addCustom(); }}>
              <label htmlFor="p10-custom-input">내 말로 쓰기 (최대 {MAX_CUSTOM_LENGTH}자)</label>
              <div>
                <input id="p10-custom-input" type="text" value={custom} maxLength={MAX_CUSTOM_LENGTH} placeholder="예: 친구와 역할을 나눠 문제를 풀 수 있다" onChange={(event) => setCustom(event.target.value)} disabled={ready} />
                <button type="submit" className="button button--ghost" disabled={ready || !custom.trim()}>추가</button>
              </div>
            </form>
            <p className="p10-count" role="status">고른 문장 {chosen.length}/{MAX_STATEMENTS}</p>
            <p className="p10-note">문장은 "나는 이제 …" 뒤에 붙어 수료증에 인쇄돼. 미션에서 실제로 해 본 것을 골라. 모든 직업은 이어져 있고, 미래엔 함께 일하는 힘이 더 중요해져.</p>
          </Panel>
        </div>
      )}
    </GameShell>
  );
}
