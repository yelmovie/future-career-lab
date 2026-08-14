export function ProgressBar({ value, max = 100, label, compact = false }: { value: number; max?: number; label: string; compact?: boolean }) {
  const safeValue = Math.max(0, Math.min(100, max > 0 ? value / max * 100 : 0));
  return (
    <div className={`progress-block${compact ? ' progress-block--compact' : ''}`}>
      <div className="progress-label"><span>{label}</span><span>{Math.round(safeValue)}%</span></div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(Math.max(0, Math.min(max, value)))}>
        <span style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
