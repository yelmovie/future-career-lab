import { useEffect, useState, type MouseEvent } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { PictureChoice } from '../components/v4/PictureChoice';
import { CheckIcon, SearchIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { CauseId, PageNumber, PhotoId } from '../shared/types';
import { useGame } from '../state/GameContext';
import { DRONE_TARGETS, HYPOTHESES, PHOTO_DETAILS, hitDetail, photoAsset, type DetailId } from './stage1-2-content';
import './stage1-2.css';

const DETAIL_IDS = new Set<string>(PHOTO_DETAILS.map((detail) => detail.id));
const HYPOTHESIS_PHOTO: Record<CauseId, PhotoId> = { logging: 'logging', noise: 'construction', water: 'stream' };
const HINT_RING_MS = 10_000;
/** 완료 메시지는 고른 가설에 따라 찾은 장소가 달라진다. */
const FOUND_PLACE: Record<CauseId, string> = { logging: '깊은 숲 열매 나무 아래서', noise: '조용한 깊은 숲에서', water: '깊은 숲 개울 근처에서' };
const doneMessage = (id: CauseId) => `네 가설대로 뒤져서 사육사가 ${FOUND_PLACE[id]} 모모와 루비를 찾았대!`;

function detailList(value: unknown): DetailId[] {
  return Array.isArray(value) ? value.filter((item): item is DetailId => typeof item === 'string' && DETAIL_IDS.has(item)) : [];
}

export default function Page03Mystery({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, setArtifacts, addBadge, addJobCard } = useGame();
  const [found, setFound] = useState<DetailId[]>(() => detailList(save.pageData.p4Details));
  const [hypothesis, setHypothesis] = useState<CauseId | null>(save.artifacts.hypothesis);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(4));
  const [step, setStep] = useState(() => (save.stageProgress.completedPages.includes(4) || detailList(save.pageData.p4Details).length === PHOTO_DETAILS.length ? 2 : 1));
  const [openPhoto, setOpenPhoto] = useState<PhotoId | null>(null);
  const [ring, setRing] = useState(false);
  const [react, setReact] = useState<string | null>(null);

  const allFound = found.length === PHOTO_DETAILS.length;
  const openMeta = openPhoto ? PHOTO_DETAILS.find((item) => item.photo === openPhoto)! : null;
  const openFound = openMeta ? found.includes(openMeta.id) : false;

  // 확대 후 10초 넘게 못 찾으면 힌트 링.
  useEffect(() => {
    if (!openPhoto || openFound) return;
    const timer = window.setTimeout(() => setRing(true), HINT_RING_MS);
    return () => window.clearTimeout(timer);
  }, [openPhoto, openFound]);

  const say = (text: string) => {
    setReact(text);
    window.setTimeout(() => setReact(null), 2200);
  };

  const openZoom = (id: PhotoId) => {
    audioService.playSfx('tap');
    setRing(false);
    setOpenPhoto(id);
  };

  const inspect = (event: MouseEvent<HTMLImageElement>) => {
    if (!openPhoto || !openMeta) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const detail = hitDetail(openPhoto, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    if (!detail) { audioService.playSfx('tap'); say(openMeta.hint); return; }
    if (found.includes(detail)) return;
    const next = [...found, detail];
    setFound(next);
    setPageData('p4Details', next);
    audioService.playSfx('clue');
    logEvent({ page: 4, type: 'detail-found', contextRef: `detail-${detail}`, summary: `사진을 확대해 ${openMeta.label}을 찾았어.`, tags: ['관찰', detail], traits: { exploration: 1, analysis: 1 } });
  };

  const choose = (id: CauseId) => {
    setHypothesis(id);
    setArtifacts({ hypothesis: id });
    setPageData('p4Hypothesis', id);
    const label = HYPOTHESES.find((item) => item.id === id)!.label;
    logEvent({ page: 4, type: 'hypothesis', contextRef: `hypothesis-${id}`, summary: `증거판을 보고 "${label}" 가설을 세웠어.`, tags: ['가설', id], traits: { analysis: 2 } });
    if (completed) return;
    // 스테이지 1 완료 = 가설까지. 배지·직업 카드는 여기서 준다.
    setCompleted(true);
    completePage(4);
    addBadge(STAGE_META[0]!.badgeName);
    addJobCard(STAGE_META[0]!.jobTitle);
    audioService.playSfx('reward');
  };

  const next = step === 1
    ? { label: '다음', disabled: !allFound, hint: `사진 ${PHOTO_DETAILS.length - found.length}장을 더 살펴보면 켜져요`, onClick: () => { audioService.playSfx('swipe'); setStep(2); } }
    : { label: '모모와 루비 살피러', disabled: !hypothesis, hint: '카드 하나를 고르면 켜져요', onClick: () => onNavigate(5) };

  return (
    <StepShell
      page={4}
      step={step}
      steps={2}
      instruction={step === 1 ? '사진을 눌러 이상한 곳을 찾아' : '모모와 루비는 왜 떠났을까?'}
      mentor={pageAsset(4, 2)}
      mentorName="드론 멘토"
      bubble={step === 1 ? '사진 속에 뭔가 이상한 게 있지 않아?' : '찾은 것들이 어디를 가리키고 있어?'}
      status={step === 1 ? `${found.length} / ${PHOTO_DETAILS.length}` : undefined}
      next={next}
      done={hypothesis && step === 2 ? { title: `${STAGE_META[0]!.badgeName} 획득!`, message: doneMessage(hypothesis) } : undefined}
      onNavigate={onNavigate}
    >
      {step === 1 && (
        <div className="p4-photos">
          {DRONE_TARGETS.map((target) => {
            const detail = PHOTO_DETAILS.find((item) => item.photo === target.id)!;
            const done = found.includes(detail.id);
            return (
              <button key={target.id} type="button" className={`p4-photo${done ? ' is-done' : ''}`} onClick={() => openZoom(target.id)} aria-label={`${target.name} 사진${done ? ' (찾음)' : ''}`}>
                <img src={photoAsset(target.id)} alt="" />
                <span className="p4-photo__sticker">{done ? <CheckIcon /> : <SearchIcon />}</span>
                <strong>{target.name}</strong>
              </button>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <div className="p4-guess">
          <ul className="p4-found" aria-label="찾은 것">
            {PHOTO_DETAILS.filter((detail) => found.includes(detail.id)).map((detail) => <li key={detail.id}><CheckIcon />{detail.label}</li>)}
          </ul>
          <PictureChoice
          size="lg"
          fit="cover"
          ariaLabel="가설 고르기"
          options={HYPOTHESES.map((item) => ({ id: item.id, image: photoAsset(HYPOTHESIS_PHOTO[item.id]), label: item.label }))}
          selected={hypothesis}
          onSelect={choose}
          />
        </div>
      )}

      {openPhoto && openMeta && (
        <Modal
          title={`${DRONE_TARGETS.find((target) => target.id === openPhoto)!.name} 크게 보기`}
          onClose={() => setOpenPhoto(null)}
          actions={<>
            {!openFound && <button className="button button--ghost" onClick={() => { setRing(true); audioService.playSfx('tap'); }}>못 찾겠어요</button>}
            <button className="button button--primary" onClick={() => setOpenPhoto(null)}>{openFound ? '찾았어! 닫기' : '닫기'}</button>
          </>}
        >
          <div className="zoom-frame">
            <img src={photoAsset(openPhoto)} alt={`${openMeta.label} 찾기`} onClick={inspect} />
            {openFound && (
              <span className="zoom-mark" style={{ left: `${openMeta.rect.x * 100}%`, top: `${openMeta.rect.y * 100}%`, width: `${openMeta.rect.width * 100}%`, height: `${openMeta.rect.height * 100}%` }}>
                {openMeta.label}
              </span>
            )}
            {!openFound && ring && (
              <span className="zoom-help" style={{ left: `${(openMeta.rect.x + openMeta.rect.width / 2) * 100}%`, top: `${(openMeta.rect.y + openMeta.rect.height / 2) * 100}%` }} aria-hidden="true" />
            )}
            {react && <span className="v4-react" role="status">{react}</span>}
          </div>
        </Modal>
      )}
    </StepShell>
  );
}
