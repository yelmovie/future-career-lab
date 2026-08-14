import { ArrowIcon, CheckIcon } from './Icons';

export function StageComplete({ title, message, nextLabel, onNext }: { title: string; message: string; nextLabel: string; onNext: () => void }) {
  return (
    <div className="stage-complete" role="status">
      <span className="stage-complete__icon"><CheckIcon /></span>
      <div><strong>{title}</strong><p>{message}</p></div>
      <button className="button button--primary" onClick={onNext}>{nextLabel}<ArrowIcon /></button>
    </div>
  );
}
