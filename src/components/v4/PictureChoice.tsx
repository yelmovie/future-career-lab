import { useId } from 'react';
import { audioService } from '../../services/audioService';
import { CheckIcon } from '../Icons';

export interface PictureOption<T extends string> {
  id: T;
  image: string;
  label: string;
  /** 짧은 제목 아래에서 읽는 설명. 실제로 선택하는 문장을 그대로 보여 줄 때 사용한다. */
  description?: string;
  /** 보이는 제목을 줄여도 선택할 문장을 접근성 이름으로 유지할 수 있다. */
  accessibleLabel?: string;
  /** 개별 이미지 표시 방식. 지정하지 않으면 PictureChoice의 fit을 따른다. */
  fit?: 'contain' | 'cover';
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
  const groupId = useId();
  const isSelected = (id: T) => Array.isArray(selected) ? selected.includes(id) : selected === id;
  return (
    <div className={`v4-choices v4-choices--${size}`} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const descriptionId = `${groupId}-${option.id}-description`;
        const choice = <button
          key={option.id}
          type="button"
          className={`v4-choice${isSelected(option.id) ? ' is-selected' : ''}${option.done ? ' is-done' : ''}`}
          aria-pressed={isSelected(option.id)}
          aria-label={option.accessibleLabel}
          aria-describedby={option.description ? descriptionId : undefined}
          disabled={option.disabled}
          onClick={() => { audioService.playSfx('tap'); onSelect(option.id); }}
        >
          <span className={`v4-choice__art v4-choice__art--${option.fit ?? fit}`}><img src={option.image} alt="" /></span>
          <strong>{option.label}</strong>
          {!option.description && option.caption && <small>{option.caption}</small>}
          {(isSelected(option.id) || option.done) && <i className="v4-choice__check" aria-hidden="true"><CheckIcon /></i>}
        </button>;
        return option.description ? <article key={option.id} className={`v4-choice-card${isSelected(option.id) ? ' is-selected' : ''}`}>
          {choice}
          <p id={descriptionId} className="v4-choice__description">{option.description}</p>
          {option.caption && <small>{option.caption}</small>}
        </article> : choice;
      })}
    </div>
  );
}
