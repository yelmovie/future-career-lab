import { GameShell, Panel } from '../components/GameShell';
import { ArrowIcon } from '../components/Icons';
import { audioService } from '../services/audioService';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';

// ponytail: 뼈대 단계 임시 화면. S3 생태 조사 본 구현(핫스팟·그래프·변인 슬라이더)이 이 파일을 대체한다.
export default function Page07Ecology({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { completePage } = useGame();
  return (
    <GameShell page={7} eyebrow="STAGE 3 · ECOLOGY" onNavigate={onNavigate}>
      <Panel title="숲 생태 조사 (준비 중)">
        <p>흔적을 모으고 조건을 하나씩 바꿔 원인을 찾는 미션이 여기에 들어가.</p>
        <button className="button button--primary" onClick={() => { audioService.playSfx('success'); completePage(7); onNavigate(8); }}>임시로 완료하고 다음 <ArrowIcon /></button>
      </Panel>
    </GameShell>
  );
}
