import { useEffect } from 'react';
import type { PageNumber } from '../shared/types';

/** 예전 저장 기록·북마크가 페이지 10을 가리켜도 폐기된 선택 화면을 건너뛴다. */
export default function Page09DNA({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  useEffect(() => onNavigate(11), [onNavigate]);

  return (
    <div className="app-loader" role="status">
      <span className="loader-orbit" />
      <strong>수료증을 여는 중이야…</strong>
    </div>
  );
}
