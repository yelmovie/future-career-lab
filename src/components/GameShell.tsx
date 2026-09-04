import { useState, type ReactNode } from 'react';
import { backgroundFor } from '../shared/assets';
import { PAGE_META, STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { ArrowIcon, CheckIcon, HelpIcon, HomeIcon, MutedIcon, SoundIcon } from './Icons';
import { Modal } from './Modal';
import { SettingsModal } from './SettingsModal';

const GAME_FLOW = STAGE_META.map((stage) => ({ stage: stage.id, short: stage.subtitle, title: `${stage.label} · ${stage.subtitle}`, goal: stage.goal, image: stage.badge }));

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.1V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}

interface GameShellProps {
  page: PageNumber;
  eyebrow?: string;
  children: ReactNode;
  onNavigate: (page: PageNumber) => void;
  footer?: ReactNode;
  className?: string;
}

export function GameShell({ page, eyebrow, children, onNavigate, footer, className = '' }: GameShellProps) {
  const { save, setAudio, teacherMode } = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const meta = PAGE_META[page];
  const sectionLabel = meta.stage ? `스테이지 ${meta.stage}` : page === 2 ? '사건 접수' : page === 10 ? '탐험 정리' : page === 11 ? '탐험 완료' : '게임 시작';
  const activeStage = meta.stage ?? GAME_FLOW.find((item) => !save.stageProgress.completed[item.stage])?.stage;
  const isHome = page === 1;
  const teacherNextPage = teacherMode && page >= 2 && page < 11 ? (page + 1) as PageNumber : null;
  const visibleFooter = teacherNextPage ? (
    <div className="guided-footer teacher-preview-next">
      <TaskCue
        action="교사용 해금 중 · 미션을 하지 않아도 다음 화면을 볼 수 있어"
        target="오른쪽 교사용 다음 화면"
        done
      />
      <button
        type="button"
        className="button button--primary button--large is-next-action teacher-preview-next__button"
        aria-label={`교사용 다음 화면: ${PAGE_META[teacherNextPage].title}`}
        onClick={() => {
          audioService.unlock();
          audioService.playSfx('tap');
          onNavigate(teacherNextPage);
        }}
      >
        <span>교사용 다음 화면</span>
        <small>{PAGE_META[teacherNextPage].title}</small>
        <ArrowIcon />
      </button>
    </div>
  ) : footer;
  const toggleMuted = () => {
    audioService.unlock();
    setAudio({ muted: !save.audio.muted });
  };

  return (
    <div className={`game-shell page-${page} ${className}`} data-eyebrow={eyebrow} style={{ '--page-bg': `url("${backgroundFor(page)}")` } as React.CSSProperties}>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <div className="ambient" aria-hidden="true" />
      <header className={`topbar${isHome ? ' topbar--home' : ''}`}>
        {isHome ? (
          <div className="topbar-actions home-topbar-actions" aria-label="메인 화면 도구">
            {teacherMode && <span className="teacher-mode-chip">교사용 해금</span>}
            <button className="icon-button" onClick={toggleMuted} aria-label={save.audio.muted ? '소리 켜기' : '소리 끄기'} title={save.audio.muted ? '소리 켜기' : '소리 끄기'}>
              {save.audio.muted ? <MutedIcon /> : <SoundIcon />}
            </button>
            <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="설정 열기" title="설정"><GearIcon /></button>
          </div>
        ) : <>
          <button className="icon-button" onClick={() => onNavigate(1)} aria-label="메인으로 이동"><HomeIcon /></button>
          <div className="title-lockup">
            <span>{sectionLabel}</span>
            <h1>{meta.title}</h1>
          </div>
          <ol className="stage-rail" aria-label={meta.stage ? `현재 스테이지 ${meta.stage} / 5` : '전체 스테이지 길'}>
            {GAME_FLOW.map((item) => {
              const done = Boolean(save.stageProgress.completed[item.stage]);
              return <li key={item.stage} className={`${done ? 'is-done' : ''}${activeStage === item.stage ? ' is-current' : ''}`}><span>{done ? <CheckIcon /> : item.stage}</span><small>{item.short}</small></li>;
            })}
          </ol>
          <div className="topbar-actions">
            {teacherMode && <span className="teacher-mode-chip">교사용 해금</span>}
            <button className="icon-button" onClick={() => setHelpOpen(true)} aria-label="도움말" title="게임 흐름 보기"><HelpIcon /></button>
            <button className="icon-button" onClick={toggleMuted} aria-label={save.audio.muted ? '소리 켜기' : '소리 끄기'}>
              {save.audio.muted ? <MutedIcon /> : <SoundIcon />}
            </button>
            <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="설정 열기" title="설정"><GearIcon /></button>
          </div>
        </>}
      </header>
      <main id="main-content" className="game-content">{children}</main>
      {visibleFooter && <footer className="game-footer">{visibleFooter}</footer>}
      {helpOpen && (
        <Modal title="게임은 이렇게 이어져" onClose={() => setHelpOpen(false)} actions={<button className="button button--primary" onClick={() => setHelpOpen(false)}>알겠어</button>}>
          <p className="flow-goal"><strong>목표</strong> 숲에서 사라진 앵무새의 원인을 네 직업의 힘으로 찾고, 마지막에 넷을 한 팀으로 묶어 숲을 되돌리는 게임이야.</p>
          <ol className="flow-steps">
            {GAME_FLOW.map((item) => (
              <li key={item.stage} className={meta.stage === item.stage ? 'is-current' : ''}>
                <span><img src={item.image} alt="" /></span><div><strong>{item.stage}. {item.title}</strong><p>{item.goal}</p></div>
              </li>
            ))}
          </ol>
          <p className="flow-result">앞 미션에서 얻은 사진·기록·그래프·방송 클립이 다음 미션의 재료가 돼. 끝나면 <strong>처음 예측과 실제 플레이</strong>를 비교하고 수료증을 인쇄해.</p>
        </Modal>
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} onNavigate={onNavigate} />}
    </div>
  );
}

interface MissionGuideProps {
  image: string;
  imageAlt: string;
  action: string;
  goals: string[];
  /** 각 순서를 한눈에 구분하는 기존 에셋. 텍스트를 대신하지 않고 번호와 함께 보조한다. */
  goalImages?: string[];
  /** "끝내면 얻는 것" — 자세히 팝업에 표시 */
  reward?: string;
  /** 규칙·힌트 등 첫 화면에서 치운 설명 — 자세히 팝업에 표시 */
  details?: ReactNode;
}

/** 화면 왼쪽 미션 안내. 첫 화면에는 그림·할 일·단계만 두고, 나머지는 "자세히" 팝업으로 뺀다. */
export function MissionGuide({ image, imageAlt, action, goals, goalImages, reward, details }: MissionGuideProps) {
  const [open, setOpen] = useState(false);
  const hasMore = Boolean(reward || details);
  const hasGoalImages = Boolean(goalImages?.length);
  return (
    <div className={`mission-guide${hasGoalImages ? ' mission-guide--visual' : ''}`} aria-label="이번 미션">
      <img className="mission-guide__art" src={image} alt={imageAlt} />
      <div className="mission-guide__copy">
        <span>지금 할 일</span>
        <h3>{action}</h3>
        <ol className={hasGoalImages ? 'mission-guide__steps--visual' : undefined}>{goals.map((goal, index) => (
          <li key={goal}>
            <b className={goalImages?.[index] ? 'mission-guide__step-art' : undefined}>
              {goalImages?.[index] && <img src={goalImages[index]} alt="" aria-hidden="true" />}
              <em>{index + 1}</em>
            </b>
            <span>{goal}</span>
          </li>
        ))}</ol>
        {hasMore && <button type="button" className="mission-guide__more" onClick={() => { audioService.playSfx('tap'); setOpen(true); }}><HelpIcon />자세히</button>}
      </div>
      {open && (
        <Modal title={action} onClose={() => setOpen(false)} actions={<button className="button button--primary" onClick={() => setOpen(false)}>알겠어</button>}>
          {reward && <p className="flow-goal"><strong>끝내면 얻는 것</strong>{reward}</p>}
          {details}
        </Modal>
      )}
    </div>
  );
}

export function Panel({ title, kicker, children, className = '' }: { title?: string; kicker?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`} data-section={kicker}>
      {title && <header className="panel-header"><h2>{title}</h2></header>}
      {children}
    </section>
  );
}

interface TaskCueProps {
  action: string;
  target?: string;
  done?: boolean;
  className?: string;
}

/** 학생이 3초 안에 현재 행동과 누를 곳을 찾도록 한 문장만 보여 주는 공통 안내. */
export function TaskCue({ action, target, done = false, className = '' }: TaskCueProps) {
  return (
    <div className={`task-cue${done ? ' is-done' : ''}${className ? ` ${className}` : ''}`} role="status" aria-live="polite">
      <span className="task-cue__label">{done ? <CheckIcon /> : '지금 할 일'}</span>
      <strong>{action}</strong>
      {target && <span className="task-cue__target">눌러요 · {target}</span>}
    </div>
  );
}
