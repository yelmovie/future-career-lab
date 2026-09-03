import { useState, type ReactNode } from 'react';
import { backgroundFor } from '../shared/assets';
import { PAGE_META, STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { HelpIcon, HomeIcon, MutedIcon, SoundIcon } from './Icons';
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
  const { save, setAudio } = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const meta = PAGE_META[page];
  const sectionLabel = meta.stage ? `스테이지 ${meta.stage}` : page === 2 ? '사건 접수' : page === 10 ? '탐험 정리' : page === 11 ? '탐험 완료' : '게임 시작';
  const activeStage = meta.stage ?? GAME_FLOW.find((item) => !save.stageProgress.completed[item.stage])?.stage;
  const toggleMuted = () => {
    audioService.unlock();
    setAudio({ muted: !save.audio.muted });
  };

  return (
    <div className={`game-shell page-${page} ${className}`} data-eyebrow={eyebrow} style={{ '--page-bg': `url("${backgroundFor(page)}")` } as React.CSSProperties}>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <div className="ambient" aria-hidden="true" />
      <header className="topbar">
        <button className="icon-button" onClick={() => onNavigate(1)} aria-label="메인으로 이동"><HomeIcon /></button>
        <div className="title-lockup">
          <span>{sectionLabel}</span>
          <h1>{meta.title}</h1>
        </div>
        <ol className="stage-rail" aria-label={meta.stage ? `현재 스테이지 ${meta.stage} / 5` : '전체 스테이지 길'}>
          {GAME_FLOW.map((item) => {
            const done = Boolean(save.stageProgress.completed[item.stage]);
            return <li key={item.stage} className={`${done ? 'is-done' : ''}${activeStage === item.stage ? ' is-current' : ''}`}><span>{done ? '✓' : item.stage}</span><small>{item.short}</small></li>;
          })}
        </ol>
        <div className="topbar-actions">
          <button className="icon-button" onClick={() => setHelpOpen(true)} aria-label="도움말" title="게임 흐름 보기"><HelpIcon /></button>
          <button className="icon-button" onClick={toggleMuted} aria-label={save.audio.muted ? '소리 켜기' : '소리 끄기'}>
            {save.audio.muted ? <MutedIcon /> : <SoundIcon />}
          </button>
          <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="설정 열기" title="설정"><GearIcon /></button>
        </div>
      </header>
      <main id="main-content" className="game-content">{children}</main>
      {footer && <footer className="game-footer">{footer}</footer>}
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

export function MissionGuide({ image, imageAlt, action, goals }: { image: string; imageAlt: string; action: string; goals: string[] }) {
  return (
    <div className="mission-guide" aria-label="이번 미션">
      <img className="mission-guide__art" src={image} alt={imageAlt} />
      <div className="mission-guide__copy">
        <span>지금 할 일</span>
        <h3>{action}</h3>
        <ol>{goals.map((goal, index) => <li key={goal}><b>{index + 1}</b>{goal}</li>)}</ol>
      </div>
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
