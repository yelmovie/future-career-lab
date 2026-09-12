import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { GameShell } from '../GameShell';
import { ArrowIcon, CheckIcon, HelpIcon } from '../Icons';
import { Modal } from '../Modal';
import { audioService } from '../../services/audioService';
import type { PageNumber } from '../../shared/types';
import './v4.css';

export interface StepNext {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** 기본은 눌러 힌트를 읽기. lock은 화면에 이유를 표시하고 실제 입력을 막는다. */
  disabledMode?: 'hint' | 'lock';
  /** 비활성일 때 누르면 보여 줄 한 줄. 초등학생은 회색 버튼을 고장으로 여기므로 반드시 준다. */
  hint?: string;
}

export interface StepShellProps {
  page: PageNumber;
  /** 1-based 현재 단계 */
  step: number;
  steps: number;
  /** 한 문장 지시. 20자 안팎. */
  instruction: string;
  /** 좌하단 멘토 컷아웃(투명 배경) */
  mentor: string;
  mentorName?: string;
  /** 멘토 말풍선 한 줄 — 질문형. 정답을 말하지 않는다. */
  bubble?: string;
  /** 상단 오른쪽 상태 칩 (예: "배터리 70%") */
  status?: ReactNode;
  /** 무대 안의 선택 활동. 완료 후에도 다시 살펴볼 수 있다. */
  stageAction?: ReactNode;
  next: StepNext;
  /** ? 모달 내용 — 규칙·보상 등 첫 화면에서 치운 설명 */
  help?: ReactNode;
  /** 완료 모드: 무대 위에 도장 + 한 줄 */
  done?: { title: string; message?: string; badge?: { src: string; alt: string } };
  className?: string;
  onNavigate: (page: PageNumber) => void;
  children: ReactNode;
}

/**
 * v4 공통 화면 틀. 한 화면 = 한 행동.
 * 상단 점·지시 한 줄 / 중앙 무대 / 좌하단 멘토 말풍선 / 우하단 다음 버튼(항상 같은 자리).
 */
export function StepShell({ page, step, steps, instruction, mentor, mentorName, bubble, status, stageAction, next, help, done, className = '', onNavigate, children }: StepShellProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const nextHintId = useId();
  const hintTimer = useRef(0);
  const touch = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => () => window.clearTimeout(hintTimer.current), []);

  const pressNext = () => {
    audioService.unlock();
    if (next.disabled) {
      audioService.playSfx('tap');
      setHint(next.hint ?? '아직 이 단계가 안 끝났어');
      window.clearTimeout(hintTimer.current);
      hintTimer.current = window.setTimeout(() => setHint(null), 3500);
      return;
    }
    window.clearTimeout(hintTimer.current);
    setHint(null);
    audioService.playSfx('tap');
    next.onClick();
    if (document.documentElement.classList.contains('low-height-scroll')) {
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
    }
  };

  return (
    <GameShell page={page} onNavigate={onNavigate} className={`v4-page ${className}`}>
      <div className={`v4-shell${done ? ' is-done' : ''}`}>
        <header className="v4-head">
          <ol className="v4-dots" aria-label={`${steps}단계 중 ${step}단계`}>
            {Array.from({ length: steps }, (_, index) => (
              <li key={index} className={index + 1 < step ? 'is-past' : index + 1 === step ? 'is-current' : ''} aria-current={index + 1 === step ? 'step' : undefined}>
                {index + 1 < step ? <CheckIcon /> : index + 1}
              </li>
            ))}
          </ol>
          <h2 className="v4-instruction" aria-live="polite">{instruction}</h2>
          <div className="v4-head__right">
            {status && <span className="v4-status">{status}</span>}
            {help && <button type="button" className="v4-help" aria-label="어떻게 하는 거야" onClick={() => { audioService.playSfx('tap'); setHelpOpen(true); }}><HelpIcon /></button>}
          </div>
        </header>

        <div className="v4-stage">
          <div className="v4-stage-content" inert={Boolean(done)}>{children}</div>
          {done && (
            <div className="v4-done" role="status">
              <span className={`v4-done__stamp${done.badge ? ' has-badge' : ''}`}>
                {done.badge ? <img src={done.badge.src} alt={done.badge.alt} /> : <CheckIcon />}
              </span>
              <span className="v4-done__copy">
                <strong>{done.title}</strong>
                {done.message && <p>{done.message}</p>}
              </span>
            </div>
          )}
          {stageAction}
        </div>

        <footer className="v4-foot">
          <div className="v4-mentor">
            <img src={mentor} alt={mentorName ?? ''} />
            {bubble && <button type="button" className="v4-bubble" aria-label={`${mentorName ?? '멘토'} 말 크게 보기`} onClick={() => setMentorOpen(true)}>
              <span className="v4-bubble__name">{mentorName}</span>
              <span className="v4-bubble__full">{bubble}</span>
              <span className="v4-bubble__compact">멘토 말 보기</span>
            </button>}
          </div>
          <div className="v4-next-wrap">
            {next.disabled && next.disabledMode === 'lock' && next.hint && <span id={nextHintId} className="v4-next-status" role="status">{next.hint}</span>}
            {hint && next.disabled && next.disabledMode !== 'lock' && <span id={nextHintId} className="v4-hint" role="status">{hint}</span>}
            {next.disabled && next.disabledMode !== 'lock' && !hint && <span id={nextHintId} className="sr-only">{next.hint ?? '아직 이 단계가 안 끝났어'}</span>}
            <button
              type="button"
              className={`v4-next${next.disabled ? ' is-off' : ' is-next-action'}`}
              disabled={Boolean(next.disabled && next.disabledMode === 'lock')}
              aria-describedby={next.disabled && (next.disabledMode !== 'lock' || next.hint) ? nextHintId : undefined}
              onPointerDown={(event) => {
                suppressClick.current = false;
                if (event.isPrimary && event.button === 0 && event.pointerType !== 'mouse') {
                  touch.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
                }
              }}
              onPointerMove={(event) => {
                const tap = touch.current;
                if (tap?.id === event.pointerId) tap.moved ||= Math.hypot(event.clientX - tap.x, event.clientY - tap.y) >= 8;
              }}
              onPointerUp={(event) => {
                const tap = touch.current;
                if (!tap || tap.id !== event.pointerId) return;
                touch.current = null;
                if (tap.moved) return;
                // After a touch drag, some browsers omit the compatibility click.
                // Handle the tap here and consume that click if it does arrive.
                event.preventDefault();
                suppressClick.current = true;
                pressNext();
              }}
              onPointerCancel={() => { touch.current = null; }}
              onClick={(event) => {
                if (event.detail > 0 && suppressClick.current) { suppressClick.current = false; return; }
                pressNext();
              }}
            >
              {next.label} <ArrowIcon />
            </button>
          </div>
        </footer>
      </div>

      {helpOpen && help && (
        <Modal title="어떻게 하는 거야?" onClose={() => setHelpOpen(false)} actions={<button className="button button--primary" onClick={() => setHelpOpen(false)}>알겠어</button>}>
          {help}
        </Modal>
      )}
      {mentorOpen && bubble && (
        <Modal title={`${mentorName ?? '멘토'}가 알려 줄게`} onClose={() => setMentorOpen(false)} actions={<button className="button button--primary" onClick={() => setMentorOpen(false)}>알겠어</button>}>
          <p className="v4-mentor-dialog">{bubble}</p>
        </Modal>
      )}
    </GameShell>
  );
}
