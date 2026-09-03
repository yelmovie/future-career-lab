import { useMemo } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { ArrowIcon, SparkIcon } from '../components/Icons';
import { pageAsset } from '../shared/assets';
import { PAGE_META, TRAIT_KEYS, TRAIT_LABELS } from '../shared/constants';
import type { PageNumber, TraitKey } from '../shared/types';
import { useGame } from '../state/GameContext';
import { CAREER_FIELDS, RESULT_DISCLAIMER } from '../data/resultRules';

function radarPoints(values: number[]): string {
  const center = 120;
  const radius = 88;
  return values.map((value, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / values.length);
    const distance = radius * (.28 + value * .72);
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
  }).join(' ');
}

export default function Page09DNA({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save } = useGame();
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

  return (
    <GameShell page={9} eyebrow="PLAY REFLECTION" onNavigate={onNavigate} className="dna-page" footer={<button className="button button--primary button--large" onClick={() => onNavigate(10)}>수료증 확인하기 <ArrowIcon /></button>}>
      <div className="result-disclaimer"><SparkIcon /><p>{RESULT_DISCLAIMER}</p></div>
      {insufficient && <div className="toast toast--warning" role="status">아직 돌아볼 장면이 조금 부족해. 한두 미션을 더 체험하면 이번 플레이의 흐름을 더 잘 보여 줄게.</div>}
      <div className="dna-grid">
        <Panel kicker="MY PLAY" title="이번 탐험 요약" className="dna-profile">
          <img src={pageAsset(9, 1)} alt="나의 일하기 지도를 살펴보는 탐험가" />
          <h3>{save.playerName || '미래 탐험가'}</h3>
          <p>{completedStages}개의 스테이지에서 {save.logs.length}개의 선택·행동 장면을 남겼어.</p>
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
          <p className="radar-note">크기는 능력 점수가 아니라 이번 게임에서 그 행동을 사용한 흐름을 보여 줘.</p>
        </Panel>

        <Panel kicker="EVIDENCE" title="내가 실제로 한 일" className="evidence-panel">
          <ol className="evidence-list">{evidence.length ? evidence.map((item, index) => <li key={item.page}><span>{index + 1}</span><div><small>{PAGE_META[item.page].title}</small><p>{item.copy}</p></div></li>) : <li className="empty-evidence">미션에서 행동하면 실제 기록이 여기에 모여.</li>}</ol>
        </Panel>
      </div>

      <section className="field-section" aria-labelledby="field-title">
        <div className="field-heading"><span>EXPLORE NEXT</span><h2 id="field-title">더 탐험해볼 분야</h2><p>순위가 아니야. 어떤 카드부터 열어도 좋아.</p></div>
        {fieldCards.length ? <div className="field-grid">{fieldCards.map((field) => <article key={field.id} className="field-card">
          <img src={pageAsset(9, field.assetSlot)} alt="" />
          <div><h3>{field.title}</h3><p>{field.copy}</p><ul>{field.jobs.map((job) => <li key={job}>{job}</li>)}</ul></div>
        </article>)}</div> : <div className="field-empty"><SparkIcon /><p>아직 기록이 조금 부족해. 여러 미션에서 선택하고 고친 장면을 더 남기면 탐험 분야 카드가 열려.</p></div>}
      </section>
    </GameShell>
  );
}
