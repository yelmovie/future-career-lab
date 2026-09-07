import { useEffect, useRef, useState } from 'react';
import { GameShell, Panel, TaskCue } from '../components/GameShell';
import { CheckIcon, DownloadIcon, LockIcon, PrintIcon } from '../components/Icons';
import { pageAsset } from '../shared/assets';
import { STAGE_META, STAGE_PAGES } from '../shared/constants';
import type { PageNumber, StageNumber } from '../shared/types';
import { audioService } from '../services/audioService';
import { useGame } from '../state/GameContext';

const CERTIFICATE_TITLE = '미래 직업실 탐험 수료증';
const STAGE_LABELS: Record<StageNumber, string> = Object.fromEntries(STAGE_META.map((stage) => [stage.id, stage.label])) as Record<StageNumber, string>;

interface CertificateExportData {
  playerName: string;
  school: string;
  grade: string;
  classroom: string;
  number: string;
  date: string;
  abilities: string[];
}

const loadCanvasImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('배지 이미지를 불러오지 못했어'));
  image.src = src;
});

function drawContained(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number): void {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawFittedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, startSize: number, weight = 700): void {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px Pretendard, "Noto Sans KR", sans-serif`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 1;
  } while (size > 19);
  context.fillText(text, x, y);
}

/** 별도 라이브러리 없이 입력 정보와 실제 배지 자산을 고해상도 PNG로 그린다. */
async function downloadCertificatePng(data: CertificateExportData, filename: string): Promise<void> {
  await document.fonts.ready;
  const width = 1600;
  const height = 1132;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('저장용 화면을 만들지 못했어');

  const [seal, ...badges] = await Promise.all([pageAsset(10, 7), ...STAGE_META.map((stage) => stage.badge)].map(loadCanvasImage));
  context.fillStyle = '#fffdf6';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = '#b8933f';
  context.lineWidth = 8;
  context.strokeRect(34, 34, width - 68, height - 68);
  context.strokeStyle = '#e6d6ac';
  context.lineWidth = 3;
  context.strokeRect(52, 52, width - 104, height - 104);

  context.textAlign = 'center';
  context.fillStyle = '#0f7b7e';
  context.font = '800 28px Pretendard, sans-serif';
  context.fillText('F U T U R E   C A R E E R   L A B', width / 2, 120);
  context.fillStyle = '#1f3548';
  context.font = '400 66px Jua, Pretendard, sans-serif';
  context.fillText(CERTIFICATE_TITLE, width / 2, 205);
  context.fillStyle = '#b8933f';
  context.font = '700 25px Pretendard, sans-serif';
  context.fillText('Certificate of Career Exploration', width / 2, 248);

  context.fillStyle = '#1f3548';
  context.font = '400 52px Jua, Pretendard, sans-serif';
  context.fillText(data.playerName || '탐험가', width / 2 - 26, 330);
  context.strokeStyle = '#b8933f';
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(width / 2 - 235, 345);
  context.lineTo(width / 2 + 180, 345);
  context.stroke();
  context.textAlign = 'left';
  context.fillStyle = '#596b79';
  context.font = '700 26px Pretendard, sans-serif';
  context.fillText('탐험가', width / 2 + 200, 330);

  context.textAlign = 'center';
  context.fillStyle = '#35495c';
  context.font = '500 28px Pretendard, sans-serif';
  context.fillText('위 학생은 「미래 직업실」에서 네 가지 미래 직업의 일을 직접 해 보고,', width / 2, 410);
  context.fillText('네 직업의 힘을 모아 지구와 젤리를 찾고 푸른솔 숲의 새들을 지켰기에', width / 2, 454);
  context.fillText('이 증서를 수여합니다.', width / 2, 498);

  const badgeSize = 156;
  const badgeGap = 42;
  const badgeStart = (width - (badgeSize * badges.length + badgeGap * (badges.length - 1))) / 2;
  badges.forEach((badge, index) => {
    const x = badgeStart + index * (badgeSize + badgeGap);
    drawContained(context, badge, x, 535, badgeSize, badgeSize);
    context.fillStyle = '#1f3548';
    context.textAlign = 'center';
    drawFittedText(context, STAGE_META[index]!.label, x + badgeSize / 2, 730, badgeSize + 24, 25, 800);
  });

  data.abilities.slice(0, 2).forEach((ability, index) => {
    context.fillStyle = '#f7f0df';
    context.beginPath();
    context.roundRect(230, 770 + index * 58, width - 460, 44, 22);
    context.fill();
    context.fillStyle = '#1f3548';
    context.textAlign = 'center';
    drawFittedText(context, `나는 이제 ${ability}`, width / 2, 801 + index * 58, width - 520, 26, 700);
  });

  const infoY = data.abilities.length > 1 ? 930 : 895;
  context.fillStyle = '#35495c';
  context.font = '600 27px Pretendard, sans-serif';
  const infoFields = [
    { label: '학교', value: data.school, width: 420 },
    { label: '학년', value: data.grade, width: 200 },
    { label: '반', value: data.classroom, width: 200 },
    { label: '번호', value: data.number, width: 220 },
  ];
  let infoX = (width - 1100) / 2;
  infoFields.forEach((field) => {
    context.textAlign = 'left';
    context.fillText(field.label, infoX, infoY);
    const lineStart = infoX + 64;
    const lineEnd = infoX + field.width;
    context.strokeStyle = '#e6d6ac';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(lineStart, infoY + 9);
    context.lineTo(lineEnd, infoY + 9);
    context.stroke();
    if (field.value) {
      context.textAlign = 'center';
      drawFittedText(context, field.value, (lineStart + lineEnd) / 2, infoY, lineEnd - lineStart - 12, 26, 700);
    }
    infoX += field.width + 20;
  });
  context.strokeStyle = '#e6d6ac';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(140, 985);
  context.lineTo(width - 140, 985);
  context.stroke();
  context.fillStyle = '#35495c';
  context.font = '600 25px Pretendard, sans-serif';
  context.textAlign = 'center';
  context.fillText(data.date, width / 2, 1035);
  drawContained(context, seal!, width - 210, 955, 120, 120);

  const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG 파일을 만들지 못했어')), 'image/png'));
  const downloadUrl = URL.createObjectURL(png);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

export default function Page10Certificate({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, setPlayerName, grantReward, teacherMode } = useGame();
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [classroom, setClassroom] = useState('');
  const [number, setNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const printing = useRef(false);
  const rewarded = useRef(false);
  const date = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' }).format(new Date());
  const missingStage = ([1, 2, 3, 4, 5] as StageNumber[]).find((stage) => !save.stageProgress.completed[stage]);

  useEffect(() => {
    if (!save.certificateUnlocked || rewarded.current) return;
    rewarded.current = true;
    grantReward('certificate-2026.09');
    audioService.playSfx('reward');
  }, [grantReward, save.certificateUnlocked]);

  const print = () => {
    if (printing.current) return;
    printing.current = true;
    audioService.pause();
    window.print();
    window.setTimeout(() => { printing.current = false; }, 600);
  };

  const saveImage = async () => {
    if (saving) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const safeName = (save.playerName.trim() || '탐험가').replace(/[\\/:*?"<>|]/g, '-');
      await downloadCertificatePng({ playerName: save.playerName, school, grade, classroom, number, date, abilities: save.abilityStatements }, `미래-직업실-수료증-${safeName}.png`);
      setSaveMessage('수료증 이미지를 저장했어.');
    } catch {
      setSaveMessage('이미지를 저장하지 못했어. 인쇄하기에서 PDF로 저장해 줘.');
    } finally {
      setSaving(false);
    }
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
      <div className="certificate-layout">
        <Panel kicker="YOUR RECORD" title="수료 정보" className="certificate-form no-print">
          <TaskCue action="정보를 적고 저장하거나 인쇄해" done />
          <p>입력 내용은 이 화면과 저장·인쇄에만 사용돼.</p>
          <label>학교<input value={school} onChange={(event) => setSchool(event.target.value)} placeholder="학교 이름" /></label>
          <div className="form-row"><label>학년<input value={grade} onChange={(event) => setGrade(event.target.value)} inputMode="numeric" /></label><label>반<input value={classroom} onChange={(event) => setClassroom(event.target.value)} inputMode="numeric" /></label><label>번호<input value={number} onChange={(event) => setNumber(event.target.value)} inputMode="numeric" /></label></div>
          <label>이름<input value={save.playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="탐험가 이름" /></label>
          <div className="certificate-actions"><button className="button button--primary is-next-action" aria-label="수료증 이미지로 저장하기" onClick={saveImage} disabled={saving}><DownloadIcon /> {saving ? '저장 중…' : '이미지 저장'}</button><button className="button button--ghost" aria-label="수료증 인쇄하기" onClick={print}><PrintIcon /> 인쇄하기</button><button className="button button--ghost certificate-actions__home" aria-label="메인으로 돌아가기" onClick={() => onNavigate(1)}>메인으로</button></div>
          {saveMessage && <p className="certificate-save-status" role="status">{saveMessage}</p>}
        </Panel>

        <article className="certificate-sheet" aria-label={CERTIFICATE_TITLE}>
          <div className="certificate-border">
            <header><span>FUTURE CAREER LAB</span><h2>{CERTIFICATE_TITLE}</h2><p>Certificate of Career Exploration</p></header>
            <div className="certificate-name"><strong>{save.playerName || '　　　　　　　　　'}</strong><span>탐험가</span></div>
            <p className="certificate-copy">위 학생은 「미래 직업실」에서 드론 현장가·동물돌봄 전문가·생태연구가·방송기술자의 일을 직접 해 보고,<br />네 직업의 힘을 모아 지구와 젤리를 찾고 푸른솔 숲의 새들을 지켰기에 이 증서를 수여합니다.</p>
            <div className="certificate-badges">{STAGE_META.map((stage) => <div key={stage.id}><span><img src={stage.badge} alt="" /></span><b>{stage.label}</b></div>)}</div>
            {save.abilityStatements.length > 0 && <ul className="certificate-abilities">{save.abilityStatements.map((statement) => <li key={statement}>나는 이제 {statement}</li>)}</ul>}
            <div className="certificate-info">
              <span>학교 <b>{school || '　　　　　　　　　'}</b></span>
              <span>학년 <b>{grade || '　　'}</b></span><span>반 <b>{classroom || '　　'}</b></span><span>번호 <b>{number || '　　'}</b></span>
            </div>
            <footer><span>{date}</span></footer>
            <img className="certificate-seal" src={pageAsset(10, 7)} alt="미래 직업실 성취 문장" />
          </div>
        </article>
      </div>
    </GameShell>
  );
}
