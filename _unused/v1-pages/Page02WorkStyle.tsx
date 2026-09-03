import { useMemo, useRef, useState } from 'react';
import { GameShell, MissionGuide, Panel } from '../components/GameShell';
import { ProgressBar } from '../components/ProgressBar';
import { StageComplete } from '../components/StageComplete';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import { seededShuffle } from '../shared/rng';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { WORK_STYLE_SCENARIOS, type WorkStyleOption } from './stage1-2-content';
import './stage1-2.css';

interface WorkStyleAnswer {
  scenarioId: string;
  optionId: string;
}

function savedAnswers(value: unknown): WorkStyleAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WorkStyleAnswer => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Record<string, unknown>;
    return typeof candidate.scenarioId === 'string' && typeof candidate.optionId === 'string';
  });
}

export default function Page02WorkStyle({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, addBadge } = useGame();
  const scenarioOrder = useMemo(
    () => seededShuffle(WORK_STYLE_SCENARIOS, save.sessionSeed ^ 0x21a57),
    [save.sessionSeed],
  );
  const [answers, setAnswers] = useState<WorkStyleAnswer[]>(() => savedAnswers(save.pageData.p2Answers));
  const [message, setMessage] = useState('어느 쪽이든 너다운 선택이야. 정답은 없어.');
  const pointerStart = useRef<number | null>(null);
  const choosing = useRef(false);
  const completed = answers.length >= scenarioOrder.length || save.stageProgress.completedPages.includes(2);
  const scenario = completed ? undefined : scenarioOrder.find((item) => !answers.some((answer) => answer.scenarioId === item.id));

  const choose = (option: WorkStyleOption) => {
    if (!scenario || choosing.current) return;
    choosing.current = true;
    audioService.playSfx('swipe');
    const next = [...answers, { scenarioId: scenario.id, optionId: option.id }];
    setAnswers(next);
    setPageData('p2Answers', next);
    logEvent({
      page: 2,
      type: 'work-style-choice',
      summary: `${scenario.title}에서 “${option.title}” 방법을 골랐어.`,
      contextRef: scenario.id,
      tags: ['선택', '자기이해', option.id],
      traits: option.traits,
    });
    setMessage(`“${option.title}” 방법을 탐험 기록에 담았어.`);
    if (next.length === scenarioOrder.length) {
      completePage(2);
      addBadge('선택 나침반');
      audioService.playSfx('success');
    }
    window.setTimeout(() => { choosing.current = false; }, 180);
  };

  const finishPointer = (clientX: number) => {
    if (pointerStart.current === null || !scenario) return;
    const distance = clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) < 54) return;
    choose(distance < 0 ? scenario.options[0] : scenario.options[1]);
  };

  return (
    <GameShell
      page={2}
      eyebrow="STAGE 1 · 나를 알아보기"
      onNavigate={onNavigate}
      footer={completed ? (
        <StageComplete
          title="나만의 선택 지도를 완성했어"
          message="선택은 점수가 아니라 앞으로 해 볼 탐험의 단서가 돼."
          nextLabel="직업 미스터리 시작"
          onNext={() => onNavigate(3)}
        />
      ) : undefined}
    >
      <div className="game-grid work-style-layout">
        <Panel title="이번에 할 일" kicker="MISSION">
          <MissionGuide
            image={pageAsset(2, 10)}
            imageAlt="어느 쪽으로 갈지 알려 주는 나침반"
            action="마음이 가는 쪽을 골라요"
            goals={['8번 고르기', '정답은 없어요']}
          />
          <div className="stage12-spacer" />
          <ProgressBar value={(answers.length / scenarioOrder.length) * 100} label={`선택 ${answers.length} / ${scenarioOrder.length}`} />
          <ol className="work-style-dots" aria-label="선택 진행 단계">
            {scenarioOrder.map((item, index) => (
              <li key={item.id} className={index < answers.length ? 'is-done' : index === answers.length ? 'is-current' : ''}>
                <span>{index + 1}</span><span className="sr-only">{index < answers.length ? '완료' : index === answers.length ? '현재' : '남음'}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel className="work-style-stage" title={scenario ? scenario.title : '선택 기록 완료'} kicker={scenario ? `SCENE ${answers.length + 1}` : 'COMPLETE'}>
          {scenario ? (
            <div
              className="work-style-swipe"
              tabIndex={0}
              role="group"
              aria-label={`${scenario.title}. 왼쪽과 오른쪽 선택지를 비교해 봐.`}
              onPointerDown={(event) => { pointerStart.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }}
              onPointerUp={(event) => finishPointer(event.clientX)}
              onPointerCancel={() => { pointerStart.current = null; }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') { event.preventDefault(); choose(scenario.options[0]); }
                if (event.key === 'ArrowRight') { event.preventDefault(); choose(scenario.options[1]); }
              }}
            >
              <img src={pageAsset(2, scenario.imageSlot)} alt="선택 상황을 나타낸 탐험 장면" />
              <div className="work-style-question">
                <span>어떻게 해 볼까?</span>
                <h2>{scenario.prompt}</h2>
              </div>
            </div>
          ) : (
            <div className="work-style-finished" role="status">
              <img src={pageAsset(2, 9)} alt="완성된 선택 나침반" />
              <h2>여덟 번의 선택을 모두 기록했어</h2>
              <p>다음 탐험에서는 여러 단서를 연결해 숨어 있는 직업을 찾아볼 거야.</p>
            </div>
          )}

          {scenario && (
            <div className="work-style-options" aria-label="선택지">
              {scenario.options.map((option, index) => (
                <button key={option.id} className="choice-card" onClick={() => choose(option)}>
                  <span className="choice-card__badge">{index + 1}</span>
                  <strong>{option.title}</strong>
                  <p>{option.description}</p>
                </button>
              ))}
            </div>
          )}
          <div className="toast work-style-feedback" role="status">{message}</div>
        </Panel>
      </div>
    </GameShell>
  );
}
