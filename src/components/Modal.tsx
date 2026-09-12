import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  actions?: ReactNode;
  /** 제목 아래 고정 영역(탭 등). 본문이 스크롤돼도 항상 보인다. */
  subheader?: ReactNode;
  className?: string;
}

/**
 * 공통 팝업. 제목·하단 버튼은 고정하고 본문만 스크롤한다 —
 * 내용이 길어도 "닫기"가 화면 밖으로 밀려나지 않는다.
 */
export function Modal({ title, children, onClose, actions, subheader, className = '' }: ModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLElement>(null);
  const closeAction = useRef(onClose);
  useEffect(() => { closeAction.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])') ?? [])
      .filter((element) => element.getClientRects().length > 0 && !element.closest('[inert]'));
    const initialFocus = window.requestAnimationFrame(() => (focusable()[0] ?? modalRef.current)?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (!modalRef.current?.getClientRects().length) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAction.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) { event.preventDefault(); modalRef.current?.focus(); return; }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (!modalRef.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.cancelAnimationFrame(initialFocus);
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section ref={modalRef} className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId}>{title}</h2>
        {subheader && <div className="modal-subheader">{subheader}</div>}
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </section>
    </div>
  );
}
