import { useCallback, useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { audioService } from '../../services/audioService';

export interface SlotChip<T extends string> { id: T; image: string; label: string; disabled?: boolean }
export interface Slot<S extends string> { id: S; label: string; hint?: ReactNode; scene?: string; capacity?: number }

interface SlotBoardProps<T extends string, S extends string> {
  chips: readonly SlotChip<T>[];
  slots: readonly Slot<S>[];
  /** 슬롯 → 놓인 칩 id 목록 */
  placed: Record<S, T[]>;
  onPlace: (chip: T, slot: S | null) => void;
  /** 슬롯 배경으로 쓸 큰 그림(선택) */
  board?: ReactNode;
  chipsLabel?: string;
  /** 슬롯을 세로 대신 가로로 */
  layout?: 'row' | 'stack';
}

interface ChipPointer<T, S> {
  id: T; pointerId: number; from: S | null; previousHeld: T | null;
  x: number; y: number; moved: boolean; scale: number; element: HTMLElement;
}

/**
 * 칩을 슬롯에 놓는 공통 보드.
 * 아래 카드 자체를 바로 끌거나, 물건과 공간을 차례로 눌러 놓는다.
 * 이미 놓인 칩은 직접 끌어 옮기거나 눌러서 원래 자리로 돌릴 수 있다.
 */
export function SlotBoard<T extends string, S extends string>({ chips, slots, placed, onPlace, board, chipsLabel = '물건을 끌어 놓기', layout = 'row' }: SlotBoardProps<T, S>) {
  const root = useRef<HTMLDivElement>(null);
  const instructionsId = useId();
  const [held, setHeld] = useState<T | null>(null);
  const [over, setOver] = useState<S | null>(null);
  const [overPool, setOverPool] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [notice, setNotice] = useState('물건을 바로 끌어 놓아 봐. 물건과 공간을 차례로 눌러도 돼.');
  const [dragView, setDragView] = useState<{ id: T; from: S | null; x: number; y: number; scale: number } | null>(null);
  const pointer = useRef<ChipPointer<T, S> | null>(null);
  const slotPointer = useRef<{ slot: S; pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const placedIds = new Set(Object.values(placed).flat() as T[]);
  const pool = chips.filter((chip) => !placedIds.has(chip.id));

  const cancelDrag = useCallback(() => {
    const drag = pointer.current;
    pointer.current = null;
    slotPointer.current = null;
    if (drag?.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
    if (drag?.moved) suppressClick.current = true;
    setHeld(drag?.previousHeld ?? null);
    setDragView(null); setOver(null); setOverPool(false);
    setFeedback('물건은 원래 자리에 있어');
    setNotice('취소했어. 물건은 원래 자리에 있어.');
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (pointer.current || root.current?.contains(document.activeElement))) { event.preventDefault(); cancelDrag(); }
    };
    const blur = () => { if (pointer.current) cancelDrag(); };
    window.addEventListener('keydown', escape); window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', escape); window.removeEventListener('blur', blur);
      const drag = pointer.current; pointer.current = null;
      if (drag?.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
    };
  }, [cancelDrag]);
  const canPlace = (slot: Slot<S>, id: T) => placed[slot.id].filter((item) => item !== id).length < (slot.capacity ?? 1);
  const focusSlot = (id: S) => requestAnimationFrame(() => {
    [...(root.current?.querySelectorAll<HTMLElement>('[data-slot]') ?? [])].find((element) => element.dataset.slot === id)?.focus({ preventScroll: true });
  });
  const pick = (id: T, keyboard: boolean) => {
    const next = held === id ? null : id;
    audioService.playSfx('tap'); setHeld(next);
    setFeedback(next ? '놓을 공간을 눌러 줘' : '');
    setNotice(next ? '놓을 공간을 눌러 줘. 키보드는 방향키로 공간을 고르고 Enter를 눌러.' : '선택을 취소했어.');
    if (next && keyboard) { const first = slots.find((slot) => canPlace(slot, id)); if (first) focusSlot(first.id); }
  };
  const returnChip = (id: T) => {
    onPlace(id, null); audioService.playSfx('tap'); setHeld(null);
    setFeedback('아래로 꺼냈어 · 다시 놓아 봐');
    setNotice(`${chips.find((chip) => chip.id === id)?.label ?? '물건'}, 아래로 꺼냈어. 다시 놓을 수 있어.`);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-chip-pool] [data-chip="${id}"]`)?.focus({ preventScroll: true }));
  };
  const placeChip = (id: T, slot: S) => {
    const target = slots.find((item) => item.id === slot);
    const chip = chips.find((item) => item.id === id && !item.disabled);
    if (!target || !chip) return;
    if (!canPlace(target, id)) {
      setHeld(id); setFeedback('꽉 찼어 · 다른 공간에 놓아 줘');
      setNotice(`${target.label}에는 물건이 ${target.capacity ?? 1}개 있어. 다른 공간에 놓거나, 놓인 물건을 아래로 꺼내 줘.`);
      return;
    }
    if (!placed[slot].includes(id)) { audioService.playSfx('drop'); onPlace(id, slot); }
    setFeedback(`${chip.label}, 잘 놓았어!`);
    setNotice(`${chip.label}, ${target.label}에 놓았어.`);
    setHeld(null);
    setOver(null);
    focusSlot(slot);
  };
  const drop = (slot: S) => { if (held) placeChip(held, slot); };
  // Hit testing uses viewport coordinates, including on the scaled classroom stage.
  const targetAt = (x: number, y: number, scale: number): { slot: S | null; pool: boolean } => {
    const element = document.elementFromPoint(x, y);
    if (!element || !root.current?.contains(element)) return { slot: null, pool: false };
    if (element.closest('[data-chip-pool]')) return { slot: null, pool: true };
    const exact = element.closest<HTMLElement>('[data-slot]')?.dataset.slot;
    if (exact && slots.some((slot) => slot.id === exact)) return { slot: exact as S, pool: false };
    const nearby = [...root.current.querySelectorAll<HTMLElement>('[data-slot]')].map((zone) => {
      const rect = zone.getBoundingClientRect();
      return { id: zone.dataset.slot as S, distance: Math.hypot(Math.max(rect.left - x, x - rect.right, 0), Math.max(rect.top - y, y - rect.bottom, 0)) };
    }).filter((zone) => zone.distance <= 12 * scale).sort((a, b) => a.distance - b.distance);
    return { slot: nearby[0]?.id ?? null, pool: false };
  };
  const pointerStart = (event: PointerEvent<HTMLElement>, chip: SlotChip<T>, from: S | null) => {
    if (chip.disabled || !event.isPrimary || event.button !== 0 || pointer.current) return;
    const scale = root.current!.getBoundingClientRect().width / root.current!.offsetWidth;
    pointer.current = { id: chip.id, pointerId: event.pointerId, from, previousHeld: held, x: event.clientX, y: event.clientY, moved: false, scale, element: event.currentTarget };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLElement>) => {
    const drag = pointer.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
    event.preventDefault();
    if (!drag.moved) {
      drag.moved = true; setHeld(drag.id); setFeedback('큰 공간에 놓아 줘');
      setNotice('물건을 잡았어. 원하는 공간에서 손을 떼면 놓을 수 있어.');
    }
    const target = targetAt(event.clientX, event.clientY, drag.scale);
    setOver(target.slot); setOverPool(Boolean(drag.from && target.pool));
    setDragView({ id: drag.id, from: drag.from, x: event.clientX, y: event.clientY, scale: drag.scale });
  };
  const pointerEnd = (event: PointerEvent<HTMLElement>) => {
    const drag = pointer.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    pointer.current = null;
    if (drag.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
    if (!drag.moved) {
      // Browsers may omit the compatibility click after a sequence of touch drags.
      // Handle the tap once here, and consume any compatibility click that follows.
      if (event.pointerType !== 'mouse') {
        event.preventDefault();
        suppressClick.current = true;
        if (drag.from) returnChip(drag.id);
        else pick(drag.id, false);
      }
      return;
    }
    suppressClick.current = true;
    const target = targetAt(event.clientX, event.clientY, drag.scale);
    setDragView(null); setOver(null); setOverPool(false);
    if (target.slot) placeChip(drag.id, target.slot);
    else if (target.pool && drag.from) returnChip(drag.id);
    else {
      setHeld(drag.previousHeld); setFeedback('원래 자리에 있어 · 다시 놓아 봐');
      setNotice('공간 밖에서 놓았어. 물건은 원래 자리에 있어. 다시 끌어 놓아 봐.');
    }
  };
  const slotPointerStart = (event: PointerEvent<HTMLElement>, slot: S) => {
    if (!held || event.pointerType === 'mouse' || !event.isPrimary || event.button !== 0 || pointer.current
      || (event.target as Element).closest('[data-chip]')) return;
    slotPointer.current = { slot, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  };
  const slotPointerMove = (event: PointerEvent<HTMLElement>) => {
    const tap = slotPointer.current;
    if (tap?.pointerId === event.pointerId) tap.moved ||= Math.hypot(event.clientX - tap.x, event.clientY - tap.y) >= 6;
  };
  const slotPointerEnd = (event: PointerEvent<HTMLElement>) => {
    const tap = slotPointer.current;
    if (!tap || tap.pointerId !== event.pointerId) return;
    slotPointer.current = null;
    event.preventDefault();
    suppressClick.current = true;
    if (!tap.moved) drop(tap.slot);
  };
  const draggedChip = dragView ? chips.find((chip) => chip.id === dragView.id) : null;

  const chipButton = (chip: SlotChip<T>, inSlot: S | null) => (
    <button
      key={chip.id}
      type="button"
      data-chip={chip.id}
      className={`v4-chip${held === chip.id ? ' is-held' : ''}${inSlot ? ' is-placed' : ''}${dragView?.id === chip.id ? ' is-dragging' : ''}`}
      draggable={false}
      disabled={chip.disabled}
      aria-pressed={held === chip.id}
      aria-label={inSlot ? `${chip.label} 되돌리기` : chip.label}
      aria-describedby={instructionsId}
      onDragStart={(event) => event.preventDefault()}
      onPointerDown={(event) => pointerStart(event, chip, inSlot)}
      onPointerMove={pointerMove}
      onPointerUp={pointerEnd}
      onPointerCancel={(event) => { if (pointer.current?.pointerId === event.pointerId) cancelDrag(); }}
      onLostPointerCapture={(event) => { if (pointer.current?.pointerId === event.pointerId) cancelDrag(); }}
      onClick={(event) => {
        event.stopPropagation();
        if (inSlot) returnChip(chip.id);
        else pick(chip.id, event.detail === 0);
      }}
    >
      <img src={chip.image} alt="" draggable={false} /><span>{chip.label}</span>
    </button>
  );

  return (
    <div ref={root} className={`v4-slotboard v4-slotboard--${layout}${dragView ? ' is-dragging' : ''}`}
      onPointerDownCapture={() => { if (!pointer.current) suppressClick.current = false; }}
      onClickCapture={(event) => {
        if (event.detail > 0 && suppressClick.current) {
          event.preventDefault(); event.stopPropagation(); suppressClick.current = false;
        }
      }}>
      <div className="v4-slots">
        {board}
        {slots.map((slot) => {
          const full = held ? !canPlace(slot, held) : (slot.capacity ?? 1) <= placed[slot.id].length;
          return (
            <div
              key={slot.id}
              className={`v4-slot${over === slot.id ? ' is-over' : ''}${held && !full ? ' is-ready' : ''}${held && full ? ' is-full' : ''}${placed[slot.id].length ? ' has-chip' : ''}`}
              data-slot={slot.id}
              role="button"
              tabIndex={held && !full ? 0 : -1}
              aria-disabled={Boolean(held && full)}
              aria-label={`${slot.label} 아이콘 놓는 곳`}
              onPointerDown={(event) => slotPointerStart(event, slot.id)}
              onPointerMove={slotPointerMove}
              onPointerUp={slotPointerEnd}
              onPointerCancel={() => { slotPointer.current = null; }}
              onClick={() => { if (held) drop(slot.id); }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drop(slot.id); }
                if (held && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
                  event.preventDefault();
                  const available = slots.filter((item) => canPlace(item, held));
                  const index = available.findIndex((item) => item.id === slot.id);
                  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
                  if (available.length) focusSlot(available[(index + direction + available.length) % available.length]!.id);
                }
              }}
            >
              {slot.scene && <img className="v4-slot__scene" src={slot.scene} alt="" draggable={false} />}
              <strong className="v4-slot__label">{slot.label}</strong>
              {slot.hint && <div className="v4-slot__hint">{slot.hint}</div>}
              <div className="v4-slot__chips">
                {placed[slot.id].map((id) => { const chip = chips.find((item) => item.id === id); return chip ? chipButton(chip, slot.id) : null; })}
                {(!full || held) && <span className="v4-slot__empty">{held && full ? '여기는 꽉 찼어' : over === slot.id ? '손을 떼면 여기에 놓여' : held ? '여기에 놓아 줘' : '여기에 놓기'}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className={`v4-pool${overPool ? ' is-return-target' : ''}`} data-chip-pool aria-label={chipsLabel}>
        <span className="v4-pool__label" aria-hidden="true">{feedback || chipsLabel}</span>
        {pool.map((chip) => chipButton(chip, null))}
        {dragView?.from && <span className="v4-pool__return-hint">아래에 놓으면 꺼낼 수 있어</span>}
      </div>
      <p id={instructionsId} className="sr-only">물건을 끌어서 공간에 놓아 봐. 물건과 공간을 차례로 눌러도 돼. 키보드는 Enter로 고르고 방향키로 공간을 바꿔 Enter로 놓아. Escape는 취소야. 놓인 물건을 누르면 아래로 꺼낼 수 있어.</p>
      <p className="v4-placement-status" role="status">{notice}</p>
      {dragView && draggedChip && createPortal(
        <div className="v4-drag-preview" aria-hidden="true" style={{
          left: Math.max(58 * dragView.scale, Math.min(window.innerWidth - 58 * dragView.scale, dragView.x)),
          top: Math.max(8, dragView.y - 136 * dragView.scale), width: 108 * dragView.scale, height: 120 * dragView.scale, fontSize: 20 * dragView.scale,
        }}><img src={draggedChip.image} alt="" draggable={false} /><span>{draggedChip.label}</span></div>, document.body,
      )}
    </div>
  );
}
