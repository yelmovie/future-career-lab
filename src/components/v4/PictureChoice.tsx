import { audioService } from '../../services/audioService';
import { CheckIcon } from '../Icons';

export interface PictureOption<T extends string> {
  id: T;
  image: string;
  label: string;
  /** 한 줄 보조 (18px). 없으면 생략 */
  caption?: string;
  disabled?: boolean;
  /** 이미 끝낸 항목 표시 (체크 스티커) */
  done?: boolean;
}

interface PictureChoiceProps<T extends string> {
  options: readonly PictureOption<T>[];
  selected?: T | readonly T[] | null;
  onSelect: (id: T) => void;
  /** 카드 크기: lg=1행 3장, md=1행 4장, sm=1행 6장 */
  size?: 'lg' | 'md' | 'sm';
  /** 이미지가 사진(cover)인지 컷아웃(contain)인지 */
  fit?: 'contain' | 'cover';
  ariaLabel?: string;
}

/** 큰 그림 버튼 묶음. 글 목록 대신 쓴다. 선택되면 파란 테두리 + 체크 스티커. */
export function PictureChoice<T extends string>({ options, selected, onSelect, size = 'lg', fit = 'contain', ariaLabel }: PictureChoiceProps<T>) {
  const isSelected = (id: T) => Array.isArray(selected) ? selected.includes(id) : selected === id;
  return (
    <div className={`v4-choices v4-choices--${size}`} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`v4-choice${isSelected(option.id) ? ' is-selected' : ''}${option.done ? ' is-done' : ''}`}
          aria-pressed={isSelected(option.id)}
          disabled={option.disabled}
          onClick={() => { audioService.playSfx('tap'); onSelect(option.id); }}
        >
          <span className={`v4-choice__art v4-choice__art--${fit}`}><img src={option.image} alt="" /></span>
          <strong>{option.label}</strong>
          {option.caption && <small>{option.caption}</small>}
          {(isSelected(option.id) || option.done) && <i className="v4-choice__check" aria-hidden="true"><CheckIcon /></i>}
        </button>
      ))}
    </div>
  );
}
