import { useEffect, useRef, useState, type MouseEvent } from 'react';
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
const DONE_MESSAGE = '네 현장 사진을 단서로\n사육사가 꾸꾸와 앵자를 찾았대!\n새가 떠난 이유는 생태 실험에서 확인해 보자.';
/** 3단계 해설: 흔적 → 가설 → 드론 현장가가 한 일. 배지는 이걸 읽고 나서 받는다. */
const EXPLAIN_LINE: Record<CauseId, string> = {
  logging: '그루터기를 보면 열매 나무가 잘렸어. 먹을 게 없어진 새들이 깊은 숲으로 갔다는 짐작이야.',
  noise: '소음 작업 표지를 보면 공사장이 시끄러워. 놀란 새들이 조용한 곳으로 갔다는 짐작이야.',
  water: '물길을 막은 자재를 보면 개울이 말랐어. 목마른 새들이 물 있는 곳으로 갔다는 짐작이야.',
};

function detailList(value: unknown): DetailId[] {
  return Array.isArray(value) ? value.filter((item): item is DetailId => typeof item === 'string' && DETAIL_IDS.has(item)) : [];
}

export default function Page03Mystery({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, setArtifacts, addBadge, addJobCard } = useGame();
  const [found, setFound] = useState<DetailId[]>(() => detailList(save.pageData.p4Details));
  const [hypothesis, setHypothesis] = useState<CauseId | null>(save.artifacts.hypothesis);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(4));
  const [step, setStep] = useState<1 | 2 | 3>(() => (save.stageProgress.completedPages.includes(4) ? 3 : detailList(save.pageData.p4Details).length === PHOTO_DETAILS.length ? 2 : 1));
  const [openPhoto, setOpenPhoto] = useState<PhotoId | null>(null);
  const [ring, setRing] = useState(false);
  const [react, setReact] = useState<string | null>(null);
  const closePhoto = useRef<HTMLButtonElement>(null);

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

  const discover = (detail: DetailId) => {
    if (!openMeta) return;
    if (found.includes(detail)) return;
    const next = [...found, detail];
    setFound(next);
    setPageData('p4Details', next);
    requestAnimationFrame(() => closePhoto.current?.focus());
    audioService.playSfx('clue');
    logEvent({ page: 4, type: 'detail-found', contextRef: `detail-${detail}`, summary: `사진을 확대해 ${openMeta.label}을 찾았어.`, tags: ['관찰', detail], traits: { exploration: 1, analysis: 1 } });
  };

  const inspect = (event: MouseEvent<HTMLImageElement>) => {
    if (!openPhoto || !openMeta) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const detail = hitDetail(openPhoto, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    if (!detail) { audioService.playSfx('tap'); say(openMeta.hint); return; }
    discover(detail);
  };

  const choose = (id: CauseId) => {
    if (id === hypothesis) return;
    setHypothesis(id);
    setArtifacts({ hypothesis: id });
    setPageData('p4Hypothesis', id);
    const label = HYPOTHESES.find((item) => item.id === id)!.label;
    logEvent({ page: 4, type: 'hypothesis', contextRef: `hypothesis-${id}`, summary: `증거판을 보고 "${label}" 가설을 세웠어.`, tags: ['가설', id], traits: { analysis: 2 } });
  };

  /** 스테이지 1 완료 = 해설까지 읽고 배지 받기. 카드를 고르자마자 끝나 버리지 않게 3단계에서 준다. */
  const claimBadge = () => {
    if (completed) return;
    setCompleted(true);
    completePage(4);
    addBadge(STAGE_META[0]!.badgeName);
    addJobCard(STAGE_META[0]!.jobTitle);
    audioService.playSfx('reward');
  };

  const next = step === 1
    ? { label: '다음', disabled: !allFound, hint: `사진 ${PHOTO_DETAILS.length - found.length}장을 더 살펴보면 켜져요`, onClick: () => { audioService.playSfx('swipe'); setStep(2); } }
    : step === 2
      ? { label: '이 가설로 정하기', disabled: !hypothesis, hint: '카드 하나를 고르면 켜져요', onClick: () => { audioService.playSfx('swipe'); setStep(3); } }
      : completed
        ? { label: '꾸꾸와 앵자 살피러', onClick: () => onNavigate(5) }
        : { label: '배지 받기', onClick: claimBadge };
  const chosen = hypothesis ? HYPOTHESES.find((item) => item.id === hypothesis)! : null;

  return (
    <StepShell
      page={4}
      step={step}
      steps={3}
      instruction={step === 1 ? '사진을 눌러 이상한 곳을 찾아' : step === 2 ? '꾸꾸와 앵자 주변, 새가 왜 줄었을까?' : '흔적을 모아 이유를 짐작했어'}
      mentor={pageAsset(4, 2)}
      mentorName="드론 멘토"
      bubble={step === 1 ? '사진 속에 뭔가 이상한 게 있지 않아?' : step === 2 ? (chosen ? chosen.note : '찾은 것들이 어디를 가리키고 있어?') : '하늘에서 찍고, 사진을 확대해 흔적을 찾고, 이유를 짐작했어. 이게 드론 현장가의 힘이야!'}
      status={step === 1 ? `${found.length} / ${PHOTO_DETAILS.length}` : undefined}
      next={next}
      done={hypothesis && completed && step === 3 ? { title: `${STAGE_META[0]!.badgeName} 획득!`, message: DONE_MESSAGE, badge: { src: STAGE_META[0]!.badge, alt: STAGE_META[0]!.badgeName } } : undefined}
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

      {step === 3 && chosen && (
        <div className="v4-card p4-explain" aria-label="흔적과 가설 해설">
          <ol className="p4-explain__flow">
            <li className="p4-explain__step">
              <span className="p4-explain__tag">1 하늘에서 찍음</span>
              <div className="p4-explain__photos">{DRONE_TARGETS.map((target) => <img key={target.id} src={photoAsset(target.id)} alt={target.name} />)}</div>
            </li>
            <li className="p4-explain__step">
              <span className="p4-explain__tag">2 흔적을 찾음</span>
              <ul className="p4-found">{PHOTO_DETAILS.filter((detail) => found.includes(detail.id)).map((detail) => <li key={detail.id}><CheckIcon />{detail.label}</li>)}</ul>
            </li>
            <li className="p4-explain__step is-answer">
              <span className="p4-explain__tag">3 이유를 짐작함</span>
              <div className="p4-explain__answer">
                <img src={photoAsset(HYPOTHESIS_PHOTO[chosen.id])} alt="" />
                <div><strong>{chosen.label}</strong><p>{EXPLAIN_LINE[chosen.id]}</p></div>
              </div>
            </li>
          </ol>
          <p className="p4-explain__note">사진은 사육사가 새를 찾는 데 도움이 돼. 새가 줄어든 이유는 조사 팀과 더 알아보자.</p>
        </div>
      )}

      {openPhoto && openMeta && (
        <Modal
          title={`${DRONE_TARGETS.find((target) => target.id === openPhoto)!.name} 크게 보기`}
          onClose={() => setOpenPhoto(null)}
          actions={<>
            {!openFound && <button className="button button--ghost" onClick={() => { setRing(true); audioService.playSfx('tap'); }}>못 찾겠어요</button>}
            <button ref={closePhoto} className="button button--primary" onClick={() => setOpenPhoto(null)}>{openFound ? '찾았어! 닫기' : '닫기'}</button>
          </>}
        >
          <div className="zoom-frame">
            <img src={photoAsset(openPhoto)} alt={`${openMeta.label} 찾기`} onClick={inspect} />
            {!openFound && <button type="button" className="zoom-observation" aria-label={`사진 관찰하기: ${openMeta.hint}`} onClick={() => discover(openMeta.id)} style={{ left: `${(openMeta.rect.x + openMeta.rect.width / 2) * 100}%`, top: `${(openMeta.rect.y + openMeta.rect.height / 2) * 100}%`, width: `${openMeta.rect.width * 100}%`, height: `${openMeta.rect.height * 100}%` }}><span>이곳 살펴보기</span></button>}
            {openFound && (
              <span className="zoom-mark" style={{ left: `${openMeta.rect.x * 100}%`, top: `${openMeta.rect.y * 100}%`, width: `${openMeta.rect.width * 100}%`, height: `${openMeta.rect.height * 100}%` }}>
                <span className="zoom-mark__label">{openMeta.label}</span>
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
