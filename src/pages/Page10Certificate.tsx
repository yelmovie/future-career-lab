import { useCallback, useEffect, useRef, useState } from 'react';
import { GameShell, Panel } from '../components/GameShell';
import { CheckIcon, DownloadIcon, LockIcon, PrintIcon } from '../components/Icons';
import { pageAsset } from '../shared/assets';
import { STAGE_META, STAGE_PAGES } from '../shared/constants';
import type { PageNumber, StageNumber } from '../shared/types';
import { audioService } from '../services/audioService';
import { useGame } from '../state/GameContext';
import { Modal } from '../components/Modal';
import { getLearningRecord, learningRecordText } from '../data/learningRecord';
import './learning-record.css';

const CERTIFICATE_TITLE = '미래 직업실 탐험 수료증';
const CERTIFICATE_COPY_LINES = [
  '위 학생은 「미래 직업실」에서',
  '드론 현장가·동물돌봄 전문가·생태연구가·방송기술자의',
  '일을 직접 해 보고, 네 직업의 힘을 모아',
  '푸른솔 숲의 새들을 지켰기에 이 증서를 수여합니다.',
] as const;
const STAGE_LABELS: Record<StageNumber, string> = Object.fromEntries(STAGE_META.map((stage) => [stage.id, stage.label])) as Record<StageNumber, string>;

interface CertificateExportData {
  date: string;
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
  context.fillText('F U T U R E   C A R E E R   L A B', width / 2, 150);
  context.fillStyle = '#1f3548';
  context.font = '400 66px Jua, Pretendard, sans-serif';
  context.fillText(CERTIFICATE_TITLE, width / 2, 235);
  context.fillStyle = '#b8933f';
  context.font = '700 25px Pretendard, sans-serif';
  context.fillText('Certificate of Career Exploration', width / 2, 278);

  context.textAlign = 'center';
  context.fillStyle = '#35495c';
  context.font = '700 28px Pretendard, sans-serif';
  CERTIFICATE_COPY_LINES.forEach((line, index) => context.fillText(line, width / 2, 365 + index * 44));

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

  const infoY = 895;
  context.fillStyle = '#35495c';
  context.font = '600 27px Pretendard, sans-serif';
  const infoFields = [
    { label: '학교', width: 420 },
    { label: '학년', width: 200 },
    { label: '반', width: 200 },
    { label: '번호', width: 220 },
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
  const { save, grantReward, teacherMode } = useGame();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [recordOpen, setRecordOpen] = useState(false);
  const closeRecord = useCallback(() => setRecordOpen(false), []);
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
      await downloadCertificatePng({ date }, '미래-직업실-수료증.png');
      setSaveMessage('수료증 이미지를 저장했어.');
    } catch {
      setSaveMessage('이미지를 저장하지 못했어. 인쇄하기에서 PDF로 저장해 줘.');
    } finally {
      setSaving(false);
    }
  };

  const downloadRecord = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', learningRecordText(save)], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '미래-직업실-내-탐험-기록.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        <article className="certificate-sheet" aria-label={CERTIFICATE_TITLE}>
          <div className="certificate-border">
            <header><span>FUTURE CAREER LAB</span><h2>{CERTIFICATE_TITLE}</h2><p>Certificate of Career Exploration</p></header>
            <p className="certificate-copy">{CERTIFICATE_COPY_LINES.map((line) => <span key={line}>{line}</span>)}</p>
            <div className="certificate-badges">{STAGE_META.map((stage) => <div key={stage.id}><span><img src={stage.badge} alt="" /></span><b>{stage.label}</b></div>)}</div>
            <div className="certificate-info">
              <span>학교 <b aria-label="학교 기입란" /></span>
              <span>학년 <b aria-label="학년 기입란" /></span><span>반 <b aria-label="반 기입란" /></span><span>번호 <b aria-label="번호 기입란" /></span>
            </div>
            <footer><span>{date}</span></footer>
            <img className="certificate-seal" src={pageAsset(10, 7)} alt="미래 직업실 성취 문장" />
          </div>
        </article>
        <div className="certificate-actions has-record no-print">
          <button className="button button--primary is-next-action" aria-label="수료증 이미지로 저장하기" onClick={saveImage} disabled={saving}><DownloadIcon /> {saving ? '저장 중…' : '이미지 저장'}</button>
          <button className="button button--ghost" aria-label="수료증 인쇄하기" onClick={print}><PrintIcon /> 인쇄하기</button>
          <button className="button button--ghost" onClick={() => setRecordOpen(true)}>내 탐험 기록</button>
          <button className="button button--ghost" aria-label="메인으로 돌아가기" onClick={() => onNavigate(1)}>메인으로</button>
          {saveMessage && <span className="sr-only" role="status">{saveMessage}</span>}
        </div>
      </div>
      {recordOpen && <Modal title="내 탐험 기록" className="learning-record-modal" onClose={closeRecord} actions={<><button className="button button--ghost" onClick={downloadRecord}>기록 파일 저장</button><button className="button button--primary" onClick={closeRecord}>닫기</button></>}>
        <p className="learning-record-intro">네가 찾고, 시험하고, 고친 과정이야. 친구와 다른 선택이 있었는지 이야기해 봐.</p>
        <div className="learning-record-list">{getLearningRecord(save).map((entry) => <article key={entry.id} className={entry.recorded ? '' : 'is-missing'}><h3>{entry.title}</h3><p>{entry.detail}</p></article>)}</div>
      </Modal>}
    </GameShell>
  );
}
