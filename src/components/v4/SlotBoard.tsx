import { useState, type DragEvent, type ReactNode } from 'react';
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

const DRAG_TYPE = 'text/v4-chip';

/**
 * 칩을 슬롯에 놓는 공통 보드. 드래그와 "칩 탭 → 슬롯 탭" 두 경로를 모두 지원한다(iOS 태블릿 대비).
 * 놓인 칩을 다시 탭하면 원래 자리로 돌아간다.
 */
export function SlotBoard<T extends string, S extends string>({ chips, slots, placed, onPlace, board, chipsLabel = '여기서 골라', layout = 'row' }: SlotBoardProps<T, S>) {
  const [held, setHeld] = useState<T | null>(null);
  const [over, setOver] = useState<S | null>(null);
  const placedIds = new Set(Object.values(placed).flat() as T[]);
  const pool = chips.filter((chip) => !placedIds.has(chip.id));

  const pick = (id: T) => { audioService.playSfx('tap'); setHeld(held === id ? null : id); };
  const drop = (slot: S) => { if (!held) return; audioService.playSfx('drop'); onPlace(held, slot); setHeld(null); setOver(null); };
  const onDragStart = (event: DragEvent, id: T) => { event.dataTransfer.setData(DRAG_TYPE, id); event.dataTransfer.effectAllowed = 'move'; setHeld(id); };
  const onDrop = (event: DragEvent, slot: S) => { event.preventDefault(); const id = (event.dataTransfer.getData(DRAG_TYPE) || held) as T | ''; if (!id) return; audioService.playSfx('drop'); onPlace(id, slot); setHeld(null); setOver(null); };

  const chipButton = (chip: SlotChip<T>, inSlot: S | null) => (
    <button
      key={chip.id}
      type="button"
      className={`v4-chip${held === chip.id ? ' is-held' : ''}${inSlot ? ' is-placed' : ''}`}
      draggable={!chip.disabled}
      disabled={chip.disabled}
      aria-pressed={held === chip.id}
      onDragStart={(event) => onDragStart(event, chip.id)}
      onDragEnd={() => setHeld(null)}
      onClick={() => (inSlot ? (audioService.playSfx('tap'), onPlace(chip.id, null)) : pick(chip.id))}
    >
      <img src={chip.image} alt="" /><span>{chip.label}</span>
    </button>
  );

  return (
    <div className={`v4-slotboard v4-slotboard--${layout}`}>
      <div className="v4-slots">
        {board}
        {slots.map((slot) => {
          const full = (slot.capacity ?? 1) <= placed[slot.id].length;
          return (
            <div
              key={slot.id}
              className={`v4-slot${over === slot.id ? ' is-over' : ''}${held && !full ? ' is-ready' : ''}${placed[slot.id].length ? ' has-chip' : ''}`}
              data-slot={slot.id}
              role="button"
              tabIndex={0}
              aria-label={`${slot.label} 자리`}
              onDragOver={(event) => { if (!full) { event.preventDefault(); setOver(slot.id); } }}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => !full && onDrop(event, slot.id)}
              onClick={() => !full && drop(slot.id)}
              onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && !full) { event.preventDefault(); drop(slot.id); } }}
            >
              {slot.scene && <img className="v4-slot__scene" src={slot.scene} alt="" />}
              <strong className="v4-slot__label">{slot.label}</strong>
              {slot.hint && <div className="v4-slot__hint">{slot.hint}</div>}
              <div className="v4-slot__chips">
                {placed[slot.id].map((id) => { const chip = chips.find((item) => item.id === id); return chip ? chipButton(chip, slot.id) : null; })}
                {!full && <span className="v4-slot__empty">{held ? '여기 놓기' : '비어 있음'}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="v4-pool" aria-label={chipsLabel}>
        <span className="v4-pool__label">{chipsLabel}</span>
        {pool.map((chip) => chipButton(chip, null))}
      </div>
    </div>
  );
}
