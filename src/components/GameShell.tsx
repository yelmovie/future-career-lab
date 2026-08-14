import type { ReactNode } from 'react';
import { backgroundFor } from '../shared/assets';
import { PAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { HelpIcon, HomeIcon, MutedIcon, SoundIcon } from './Icons';

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
  const meta = PAGE_META[page];
  const toggleMuted = () => {
    audioService.unlock();
    setAudio({ muted: !save.audio.muted });
  };

  return (
    <div className={`game-shell page-${page} ${className}`} style={{ '--page-bg': `url("${backgroundFor(page)}")` } as React.CSSProperties}>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <div className="ambient" aria-hidden="true" />
      <header className="topbar">
        <button className="icon-button" onClick={() => onNavigate(1)} aria-label="메인으로 이동"><HomeIcon /></button>
        <div className="title-lockup">
          <span>{eyebrow ?? (meta.stage ? `STAGE ${meta.stage}` : meta.short)}</span>
          <h1>{meta.title}</h1>
        </div>
        <div className="topbar-progress" aria-label={`전체 진행 ${page} / 10`}>
          <span>탐험 진행</span>
          <b>{String(page).padStart(2, '0')}<small>/10</small></b>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" aria-label="도움말" title="화면 안내"><HelpIcon /></button>
          <button className="icon-button" onClick={toggleMuted} aria-label={save.audio.muted ? '소리 켜기' : '소리 끄기'}>
            {save.audio.muted ? <MutedIcon /> : <SoundIcon />}
          </button>
        </div>
      </header>
      <main id="main-content" className="game-content">{children}</main>
      {footer && <footer className="game-footer">{footer}</footer>}
    </div>
  );
}

export function Panel({ title, kicker, children, className = '' }: { title?: string; kicker?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || kicker) && <header className="panel-header">{kicker && <span>{kicker}</span>}{title && <h2>{title}</h2>}</header>}
      {children}
    </section>
  );
}
