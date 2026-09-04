import { useEffect, useRef, useState } from 'react';
import { GameShell, Panel, TaskCue } from '../components/GameShell';
import { CheckIcon, LockIcon, PrintIcon, SparkIcon } from '../components/Icons';
import { pageAsset } from '../shared/assets';
import { STAGE_META, STAGE_PAGES } from '../shared/constants';
import type { PageNumber, StageNumber } from '../shared/types';
import { audioService } from '../services/audioService';
import { useGame } from '../state/GameContext';

const CERTIFICATE_TITLE = '미래 직업실 탐험 수료증';
const STAGE_LABELS: Record<StageNumber, string> = Object.fromEntries(STAGE_META.map((stage) => [stage.id, stage.label])) as Record<StageNumber, string>;

export default function Page10Certificate({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, setPlayerName, grantReward, teacherMode } = useGame();
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [classroom, setClassroom] = useState('');
  const [number, setNumber] = useState('');
  const [teacher, setTeacher] = useState('');
  const [celebrating, setCelebrating] = useState(true);
  const printing = useRef(false);
  const rewarded = useRef(false);
  const date = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(new Date());
  const missingStage = ([1, 2, 3, 4, 5] as StageNumber[]).find((stage) => !save.stageProgress.completed[stage]);

  useEffect(() => {
    if (!save.certificateUnlocked || rewarded.current) return;
    rewarded.current = true;
    grantReward('certificate-2026.09');
    audioService.playSfx('reward');
    const timer = window.setTimeout(() => setCelebrating(false), 2600);
    return () => window.clearTimeout(timer);
  }, [grantReward, save.certificateUnlocked]);

  const print = () => {
    if (printing.current) return;
    printing.current = true;
    audioService.pause();
    window.print();
    window.setTimeout(() => { printing.current = false; }, 600);
  };

  if (!save.certificateUnlocked && !teacherMode) {
    return <GameShell page={11} eyebrow="FINAL REWARD" onNavigate={onNavigate} className="certificate-page">
      <div className="locked-certificate">
        <Panel className="panel--cream">
          <span className="locked-icon"><LockIcon /></span>
          <h2>수료증은 다섯 스테이지를 완주하면 열려</h2>
          <p>페이지를 방문한 것만으로는 열리지 않아. 아직 남은 실제 미션을 끝내고 돌아오면 탐험 기록이 그대로 반영돼.</p>
          <div className="certificate-stage-list">{([1, 2, 3, 4, 5] as StageNumber[]).map((stage) => <div key={stage} className={save.stageProgress.completed[stage] ? 'is-done' : ''}>{save.stageProgress.completed[stage] ? <CheckIcon /> : <LockIcon />}<span>STAGE {stage}<b>{STAGE_LABELS[stage]}</b></span></div>)}</div>
          <div className="row"><button className="button button--ghost" onClick={() => onNavigate(1)}>메인으로</button>{missingStage && <button className="button button--primary" onClick={() => onNavigate(STAGE_PAGES[missingStage][0]!)}>남은 미션으로 이동</button>}</div>
        </Panel>
      </div>
    </GameShell>;
  }

  return (
    <GameShell page={11} eyebrow="MISSION COMPLETE" onNavigate={onNavigate} className="certificate-page">
      {celebrating && <div className="celebration no-print" aria-live="polite"><span className="celebration-ring" /><SparkIcon /><strong>다섯 스테이지 탐험 완료!</strong><p>관찰하고 선택하고 협업한 모든 장면이 모였어.</p></div>}
      <div className="certificate-layout">
        <Panel kicker="YOUR RECORD" title="수료 정보" className="certificate-form no-print">
          <TaskCue action="정보를 적고 수료증을 인쇄해" done />
          <p>입력 내용은 이 화면과 인쇄에만 사용돼.</p>
          <label>학교<input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="학교 이름" /></label>
          <div className="form-row"><label>학년<input value={grade} onChange={(event) => setGrade(event.target.value)} inputMode="numeric" /></label><label>반<input value={classroom} onChange={(event) => setClassroom(event.target.value)} inputMode="numeric" /></label><label>번호<input value={number} onChange={(event) => setNumber(event.target.value)} inputMode="numeric" /></label></div>
          <label>이름<input value={save.playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="탐험가 이름" /></label>
          <label>담임교사 서명<input value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="인쇄 후 직접 서명해도 돼" /></label>
          <div className="certificate-actions"><button className="button button--primary is-next-action" aria-label="수료증 인쇄하기" onClick={print}><PrintIcon /> 인쇄하기</button><button className="button button--ghost" aria-label="메인으로 돌아가기" onClick={() => onNavigate(1)}>메인으로</button></div>
        </Panel>

        <article className="certificate-sheet" aria-label={CERTIFICATE_TITLE}>
          <div className="certificate-border">
            <header><img src={pageAsset(10, 2)} alt="" /><span>FUTURE CAREER LAB</span><h2>{CERTIFICATE_TITLE}</h2><p>Certificate of Career Exploration</p></header>
            <div className="certificate-name"><strong>{save.playerName || '　　　　　　　　　'}</strong><span>탐험가</span></div>
            <p className="certificate-copy">위 학생은 「미래 직업실」에서 드론 현장가·동물돌봄 전문가·생태연구가·방송기술자의 일을 직접 해 보고<br />모모와 루비를 찾고 푸른솔 숲의 새들을 지키는 데 네 직업의 힘을 모았습니다.<br />네 직업을 한 팀으로 묶어 숲의 위기를 해결했기에 이 증서를 수여합니다.</p>
            <div className="certificate-badges">{STAGE_META.map((stage) => <div key={stage.id}><span><img src={stage.badge} alt="" /></span><b>{stage.label}</b></div>)}</div>
            {save.abilityStatements.length > 0 && <ul className="certificate-abilities">{save.abilityStatements.map((statement) => <li key={statement}>나는 이제 {statement}</li>)}</ul>}
            <div className="certificate-info">
              <span>학교 <b>{school || '　　　　　　　　　'}</b></span>
              <span>학년 <b>{grade || '　　'}</b></span><span>반 <b>{classroom || '　　'}</b></span><span>번호 <b>{number || '　　'}</b></span>
            </div>
            <footer><span>{date}</span><span>담임교사 <b>{teacher || '　　　　　　　　　'}</b> (서명)</span></footer>
            <img className="certificate-seal" src={pageAsset(10, 7)} alt="미래 직업실 성취 문장" />
          </div>
        </article>
      </div>
    </GameShell>
  );
}
