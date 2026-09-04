import { useLayoutEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import { GameShell, MissionGuide, Panel, TaskCue } from '../components/GameShell';
import { ArrowIcon, CheckIcon, SearchIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { StageComplete } from '../components/StageComplete';
import { getStageScale } from '../app/stageScale';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { CauseId, PageNumber, PhotoId } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  BINS,
  FACT_CARDS,
  HYPOTHESES,
  IRRELEVANT_CARD,
  LINKS_TO_UNLOCK,
  PHOTO_DETAILS,
  hitDetail,
  isValidLink,
  linkKey,
  photoAsset,
  photoCards,
  sureBlocker,
  type BinId,
  type DetailId,
  type EvidenceCard,
  type FactId,
} from './stage1-2-content';
import './stage1-2.css';

const DETAIL_IDS = new Set<string>(PHOTO_DETAILS.map((detail) => detail.id));
const BIN_IDS = new Set<string>(BINS.map((bin) => bin.id));
const DRAG_TYPE = 'text/evidence-card';

/**
 * 한 화면에 네 가지 일이 한꺼번에 펼쳐지면 초등학생은 어디부터 눌러야 할지 모른다.
 * 그래서 단계를 하나씩만 보여 주고, 끝나면 아래 큰 버튼으로만 다음으로 넘어가게 한다.
 */
type Step = 'detail' | 'link' | 'sort' | 'guess';
const STEPS: readonly { id: Step; short: string; title: string; lead: string }[] = [
  { id: 'detail', short: '숨은 것 찾기', title: '사진 속 숨은 것을 찾아', lead: '사진을 눌러 크게 보고, 이상한 곳을 손가락으로 눌러.' },
  { id: 'link', short: '선으로 잇기', title: '찾은 것과 사실을 이어', lead: '왼쪽에서 찾은 것을 하나 누르고, 오른쪽에서 어울리는 사실을 눌러.' },
  { id: 'sort', short: '카드 나누기', title: '카드를 세 칸으로 나눠', lead: '카드를 누르고, 아래 칸의 버튼을 눌러 넣어.' },
  { id: 'guess', short: '가설 고르기', title: '모모와 루비는 왜 숲 가장자리를 떠났을까?', lead: '모은 근거를 보고 하나만 골라. 틀려도 괜찮아, 숲 생태 조사에서 확인할 거야.' },
];
const STEP_IDS = STEPS.map((item) => item.id);
/** 가설 카드에 붙일 그림 — 앞에서 드론으로 찍은 사진을 그대로 쓴다. */
const HYPOTHESIS_PHOTO: Record<CauseId, PhotoId> = { logging: 'logging', noise: 'construction', water: 'stream' };

function detailList(value: unknown): DetailId[] {
  return Array.isArray(value) ? value.filter((item): item is DetailId => typeof item === 'string' && DETAIL_IDS.has(item)) : [];
}
function binMap(value: unknown): Record<string, BinId> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter((entry): entry is [string, BinId] => typeof entry[1] === 'string' && BIN_IDS.has(entry[1])));
}
function linkList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.includes('::')) : [];
}

interface Line { key: string; x1: number; y1: number; x2: number; y2: number; wrong: boolean }

export default function Page03Mystery({ onNavigate }: { onNavigate: (page: PageNumber) => void }) {
  const { save, completePage, logEvent, setPageData, setArtifacts, addBadge, addJobCard } = useGame();
  const cards = useMemo<EvidenceCard[]>(() => [...photoCards(save.artifacts.photos), ...FACT_CARDS], [save.artifacts.photos]);
  const [found, setFound] = useState<DetailId[]>(() => detailList(save.pageData.p4Details));
  const [bins, setBins] = useState<Record<string, BinId>>(() => binMap(save.pageData.p4Bins));
  const [links, setLinks] = useState<string[]>(() => linkList(save.pageData.p4Links));
  const [hypothesis, setHypothesis] = useState<CauseId | null>(save.artifacts.hypothesis);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(4));
  const [openPhoto, setOpenPhoto] = useState<PhotoId | null>(null);
  const [zoomHelp, setZoomHelp] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [pendingDetail, setPendingDetail] = useState<DetailId | null>(null);
  const [wrongLink, setWrongLink] = useState<string | null>(null);
  const [bounce, setBounce] = useState<string | null>(null);
  const linkArea = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const [lines, setLines] = useState<Line[]>([]);

  // 이어서 열 때는 저장된 단계로. 아직 안 끝난 단계보다 앞서가지 않게 잘라 준다.
  const [step, setStep] = useState<Step>(() => {
    if (save.stageProgress.completedPages.includes(4)) return 'guess';
    const savedFound = detailList(save.pageData.p4Details);
    const savedLinks = linkList(save.pageData.p4Links);
    const savedBins = binMap(save.pageData.p4Bins);
    const sorted = cards.every((card) => savedBins[card.id]) && savedBins[IRRELEVANT_CARD] === 'none';
    if (savedFound.length < PHOTO_DETAILS.length) return 'detail';
    if (savedLinks.length < LINKS_TO_UNLOCK) return 'link';
    if (!sorted) return 'sort';
    return 'guess';
  });
  const [hint, setHint] = useState('');

  const photoOnly = cards.filter((card) => card.kind === 'photo');
  const factCards = cards.filter((card) => card.kind === 'fact' && bins[card.id] !== 'none');
  const foundDetails = PHOTO_DETAILS.filter((detail) => found.includes(detail.id));
  const allSorted = cards.every((card) => bins[card.id]);
  const irrelevantOk = bins[IRRELEVANT_CARD] === 'none';
  const stepIndex = STEP_IDS.indexOf(step);
  const meta = STEPS[stepIndex]!;
  const stepDone: Record<Step, boolean> = {
    detail: found.length === PHOTO_DETAILS.length,
    link: links.length >= LINKS_TO_UNLOCK,
    sort: allSorted && irrelevantOk,
    guess: hypothesis !== null,
  };
  const stepCount: Record<Step, string> = {
    detail: `${found.length}/${PHOTO_DETAILS.length}`,
    link: `${links.length}/${LINKS_TO_UNLOCK}`,
    sort: `${cards.filter((card) => bins[card.id]).length}/${cards.length}`,
    guess: hypothesis ? '1/1' : '0/1',
  };
  const stepTarget: Record<Step, string> = {
    detail: '가운데 사진 카드',
    link: pendingDetail ? '오른쪽 관찰 사실' : '왼쪽에서 찾은 것',
    sort: selectedCard ? '넣을 칸의 여기에 넣기' : '가운데 카드',
    guess: '가운데 가설 카드',
  };

  const goStep = (next: Step) => {
    setStep(next);
    setPageData('p4Step', next);
    setSelectedCard(null);
    setPendingDetail(null);
    setHint('');
    audioService.playSfx('swipe');
  };

  useLayoutEffect(() => {
    const measure = () => {
      const host = linkArea.current?.getBoundingClientRect();
      if (!host) return;
      // 무대가 CSS transform 으로 축소·확대되므로 뷰포트 px 차이를 논리 px 로 되돌린다.
      const scale = getStageScale();
      const centre = (id: string, side: 'right' | 'left') => {
        const rect = chipRefs.current.get(id)?.getBoundingClientRect();
        if (!rect) return null;
        return { x: ((side === 'right' ? rect.right : rect.left) - host.left) / scale, y: (rect.top + rect.height / 2 - host.top) / scale };
      };
      const keys = wrongLink ? [...links, wrongLink] : links;
      setLines(keys.flatMap((key) => {
        const [detail, fact] = key.split('::');
        const a = centre(`d-${detail}`, 'right'); const b = centre(`f-${fact}`, 'left');
        return a && b ? [{ key, x1: a.x, y1: a.y, x2: b.x, y2: b.y, wrong: key === wrongLink }] : [];
      }));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [links, wrongLink, found, bins, step]);

  const inspect = (event: MouseEvent<HTMLImageElement>) => {
    if (!openPhoto) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const detail = hitDetail(openPhoto, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    const photoMeta = PHOTO_DETAILS.find((item) => item.photo === openPhoto)!;
    if (!detail) { setHint(photoMeta.hint); audioService.playSfx('tap'); return; }
    if (found.includes(detail)) return;
    const next = [...found, detail];
    setFound(next);
    setPageData('p4Details', next);
    setHint(next.length === PHOTO_DETAILS.length ? '세 장 다 찾았어! 아래 파란 버튼을 눌러 다음으로 가.' : `"${photoMeta.label}" 을 찾았어! 남은 사진도 살펴봐.`);
    audioService.playSfx('clue');
    logEvent({ page: 4, type: 'detail-found', contextRef: `detail-${detail}`, summary: `사진을 확대해 ${photoMeta.label}을 찾았어.`, tags: ['관찰', detail], traits: { exploration: 1, analysis: 1 } });
  };

  const placeCard = (cardId: string, bin: BinId) => {
    const blocker = bin === 'sure' ? sureBlocker(cardId, found, links) : null;
    if (blocker) {
      // 근거 없는 '확실'은 튕겨 낸다. 카드는 있던 자리에 그대로.
      setBounce(cardId);
      window.setTimeout(() => setBounce(null), 600);
      setHint(blocker);
      audioService.playSfx('warning');
      return;
    }
    const next = { ...bins, [cardId]: bin };
    setBins(next);
    setPageData('p4Bins', next);
    setSelectedCard(null);
    audioService.playSfx('drop');
    if (cardId === IRRELEVANT_CARD && bin !== 'none') setHint('도시 야경이 모모와 루비 사건과 이어질까? 한 번 더 생각해 봐.');
    else if (cardId !== IRRELEVANT_CARD && bin === 'none') setHint('이 카드가 정말 사건과 상관없을까? 사진 속 세부와 비교해 봐.');
    else setHint(`${BINS.find((item) => item.id === bin)!.label} 칸에 놓았어.`);
  };

  const onDrop = (event: DragEvent<HTMLElement>, bin: BinId) => {
    event.preventDefault();
    const id = event.dataTransfer.getData(DRAG_TYPE);
    if (id) placeCard(id, bin);
  };

  const connect = (fact: FactId) => {
    if (!pendingDetail) { setHint('먼저 왼쪽에서 찾은 것을 하나 눌러.'); return; }
    const key = linkKey(pendingDetail, fact);
    setPendingDetail(null);
    if (links.includes(key)) { setHint('이미 이은 연결이야.'); return; }
    if (!isValidLink(pendingDetail, fact)) {
      setWrongLink(key);
      window.setTimeout(() => setWrongLink(null), 700);
      setHint('이 둘은 같은 곳을 가리키지 않아. 사진에서 본 것과 어울리는 사실을 골라 봐.');
      audioService.playSfx('warning');
      return;
    }
    const next = [...links, key];
    setLinks(next);
    setPageData('p4Links', next);
    audioService.playSfx('clue');
    setHint(next.length >= LINKS_TO_UNLOCK ? '두 개 이었어! 아래 파란 버튼을 눌러 다음으로 가.' : '좋은 연결이야. 하나만 더 이어 봐.');
  };

  const choose = (id: CauseId) => {
    setHypothesis(id);
    setArtifacts({ hypothesis: id });
    setPageData('p4Hypothesis', id);
    const label = HYPOTHESES.find((item) => item.id === id)!.label;
    logEvent({ page: 4, type: 'hypothesis', contextRef: `hypothesis-${id}`, summary: `증거판을 보고 "${label}" 가설을 세웠어.`, tags: ['가설', id], traits: { analysis: 2 } });
    if (!completed) {
      // 스테이지 1 완료 = 가설까지. 배지·직업 카드는 여기서 준다.
      setCompleted(true);
      completePage(4);
      addBadge(STAGE_META[0]!.badgeName);
      addJobCard(STAGE_META[0]!.jobTitle);
      audioService.playSfx('reward');
    } else audioService.playSfx('tap');
    setHint(`가설 카드 "${label}" 를 받았어. 맞는지는 숲 생태 조사에서 확인해. 바꿔도 돼.`);
  };

  const openZoom = (id: PhotoId) => {
    setOpenPhoto(id);
    setZoomHelp(false);
    setHint('');
    audioService.playSfx('tap');
  };

  const cardName = (id: string) => cards.find((card) => card.id === id)?.title ?? id;
  const renderCard = (card: EvidenceCard) => (
    <article
      key={card.id}
      className={`evidence-card${selectedCard === card.id ? ' is-selected' : ''}${bounce === card.id ? ' is-bounce' : ''}`}
      draggable
      onDragStart={(event) => { event.dataTransfer.setData(DRAG_TYPE, card.id); setSelectedCard(card.id); }}
    >
      <button className="evidence-card__pick" aria-pressed={selectedCard === card.id} onClick={() => { setSelectedCard(selectedCard === card.id ? null : card.id); audioService.playSfx('tap'); }}>
        <img src={card.image} alt="" draggable={false} />
        <strong>{card.title}</strong>
      </button>
      {card.kind === 'photo' && (
        <button className="evidence-card__zoom" onClick={() => openZoom(card.id as PhotoId)} aria-label={`${card.title} 다시 크게 보기`}><SearchIcon /></button>
      )}
    </article>
  );

  const openMeta = openPhoto ? PHOTO_DETAILS.find((item) => item.photo === openPhoto)! : null;
  const openFound = openMeta ? found.includes(openMeta.id) : false;

  return (
    <GameShell
      page={4}
      eyebrow="STAGE 1 · 드론 현장가"
      onNavigate={onNavigate}
      footer={completed && step === 'guess'
        ? <StageComplete title={`가설 카드와 ${STAGE_META[0]!.badgeName}를 얻었어`} message="가설을 세웠어. 사육사가 깊은 숲 열매 나무 근처에서 모모와 루비를 찾았대! 상태가 안 좋아 — 살피러 가자. 가설은 숲 생태 조사에서 검증해." nextLabel="모모와 루비 살피러 가기" onNext={() => onNavigate(5)} />
        : (
          <div className="p4-footer">
            <TaskCue
              action={stepDone[step] && step !== 'guess' ? `${meta.short} 완료! 다음 단계로 넘어가` : meta.lead}
              target={stepDone[step] && step !== 'guess' ? '오른쪽 다음으로' : stepTarget[step]}
              done={stepDone[step]}
            />
            <button
              className={`button button--primary button--large p4-next${stepDone[step] && step !== 'guess' ? ' is-next-action' : ''}`}
              disabled={!stepDone[step] || step === 'guess'}
              onClick={() => goStep(STEP_IDS[stepIndex + 1] ?? 'guess')}
            >
              {stepDone[step] ? '다음으로' : `${meta.short} 먼저 끝내기`} <ArrowIcon />
            </button>
          </div>
        )}
    >
      <div className="p4-layout">
        <Panel title="이번 미션" kicker="EVIDENCE BOARD">
          <MissionGuide
            image={pageAsset(3, 5)}
            imageAlt="증거판"
            action="사진 속 세부를 찾아 사실과 이어"
            goals={['사진 3장에서 숨은 것 찾기', '찾은 것과 사실 잇기', '카드를 세 칸으로 나누기']}
            goalImages={[pageAsset(3, 6), pageAsset(3, 5), pageAsset(3, 10)]}
            reward={`가설 카드 + ${STAGE_META[0]!.badgeName}`}
            details={
              <>
                <p>한 단계씩 차례로 진행해. 한 단계를 끝내면 화면 아래 파란 버튼이 켜져.</p>
                <p>선으로 이은 카드만 '확실' 칸에 들어갈 수 있어. 근거가 없으면 '의심'에 두는 게 맞아.</p>
                <div className="replay-goal" role="note"><strong>갱신 목표</strong><span>다른 가설을 골라 숲 조사에서 다시 검증하기</span></div>
              </>
            }
          />
          <ol className="p4-step-list" aria-label="단계 목록">
            {STEPS.map((item, index) => {
              const reachable = index <= stepIndex || stepDone[item.id];
              return (
                <li key={item.id} className={`${stepDone[item.id] ? 'is-done' : ''}${step === item.id ? ' is-current' : ''}`}>
                  <button type="button" disabled={!reachable} onClick={() => goStep(item.id)}>
                    <b>{stepDone[item.id] ? <CheckIcon /> : index + 1}</b>
                    <span>{item.short}</span>
                    <em>{stepCount[item.id]}</em>
                  </button>
                </li>
              );
            })}
          </ol>
        </Panel>

        <section className="p4-stage" aria-labelledby="p4-stage-title">
          <header className="p4-stage__head">
            <span>{stepIndex + 1}단계 · {stepCount[step]}</span>
            <h2 id="p4-stage-title">{meta.title}</h2>
            <p>{meta.lead}</p>
          </header>

          {step === 'detail' && (
            <div className="p4-photo-grid">
              {photoOnly.map((card) => {
                const detail = PHOTO_DETAILS.find((item) => item.photo === card.id)!;
                const done = found.includes(detail.id);
                return (
                  <button key={card.id} type="button" className={`p4-photo${done ? ' is-done' : ''}`} onClick={() => openZoom(card.id as PhotoId)}>
                    <img src={card.image} alt={card.title} />
                    <span className="p4-photo__badge">{done ? <CheckIcon /> : <SearchIcon />}</span>
                    <span className="p4-photo__body">
                      <strong>{card.title}</strong>
                      <em>{done ? detail.label : '눌러서 크게 보기'}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 'link' && (
            <div className="link-area" ref={linkArea}>
              <svg className="link-lines" aria-hidden="true">
                {lines.map((line) => <line key={line.key} className={line.wrong ? 'is-wrong' : ''} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />)}
              </svg>
              <div className="link-column">
                <strong>사진에서 찾은 것</strong>
                {foundDetails.map((detail) => (
                  <button key={detail.id} ref={(el) => { if (el) chipRefs.current.set(`d-${detail.id}`, el); else chipRefs.current.delete(`d-${detail.id}`); }}
                    className={`link-chip${pendingDetail === detail.id ? ' is-pending' : ''}${links.some((key) => key.startsWith(`${detail.id}::`)) ? ' is-linked' : ''}`}
                    aria-pressed={pendingDetail === detail.id} onClick={() => { setPendingDetail(pendingDetail === detail.id ? null : detail.id); audioService.playSfx('tap'); }}>
                    {detail.label}
                  </button>
                ))}
              </div>
              <div className="link-column link-column--facts">
                <strong>관찰 사실</strong>
                {factCards.map((card) => (
                  <button key={card.id} ref={(el) => { if (el) chipRefs.current.set(`f-${card.id}`, el); else chipRefs.current.delete(`f-${card.id}`); }}
                    className={`link-chip${links.some((key) => key.endsWith(`::${card.id}`)) ? ' is-linked' : ''}`} disabled={!pendingDetail} onClick={() => connect(card.id as FactId)}>
                    {card.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'sort' && (
            <div className="p4-sort">
              <div className="p4-sort__tray">
                {cards.filter((card) => !bins[card.id]).length === 0
                  ? <p className="p4-sort__empty"><CheckIcon />카드를 모두 나눴어. 아래 파란 버튼을 눌러.</p>
                  : <div className="evidence-card-grid">{cards.filter((card) => !bins[card.id]).map(renderCard)}</div>}
              </div>
              <div className="evidence-bins">
                {BINS.map((bin) => (
                  <section key={bin.id} className={`evidence-bin is-${bin.id}${selectedCard ? ' is-target' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, bin.id)} aria-label={`${bin.label} 칸`}>
                    <header>
                      <h3>{bin.label}</h3>
                      <button className="button button--ghost" disabled={!selectedCard} onClick={() => selectedCard && placeCard(selectedCard, bin.id)}>{selectedCard ? '여기에 넣기' : '카드 고른 뒤'}</button>
                    </header>
                    <div className="evidence-card-grid evidence-card-grid--bin">{cards.filter((card) => bins[card.id] === bin.id).map(renderCard)}</div>
                  </section>
                ))}
              </div>
            </div>
          )}

          {step === 'guess' && (
            <div className="p4-guess-grid" role="radiogroup" aria-label="가설 고르기">
              {HYPOTHESES.map((item) => (
                <button key={item.id} type="button" role="radio" aria-checked={hypothesis === item.id} className={`p4-guess${hypothesis === item.id ? ' is-selected' : ''}`} onClick={() => choose(item.id)}>
                  <img src={photoAsset(HYPOTHESIS_PHOTO[item.id])} alt="" />
                  <strong>{item.label}</strong>
                  <p>{item.note}</p>
                  <span className="p4-guess__mark">{hypothesis === item.id ? <CheckIcon /> : '고르기'}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <Panel title="도우미" kicker="HELPER" className="p4-helper">
          <img className="p4-helper__art" src={pageAsset(4, 2)} alt="" />
          <p className="p4-helper__lead">{meta.lead}</p>
          {hint && <div className="toast" role="status">{hint}</div>}

          {step === 'detail' && (
            <ul className="p4-check-list">
              {photoOnly.map((card) => {
                const detail = PHOTO_DETAILS.find((item) => item.photo === card.id)!;
                return <li key={card.id} className={found.includes(detail.id) ? 'is-done' : ''}><b>{found.includes(detail.id) ? <CheckIcon /> : ''}</b>{card.title}</li>;
              })}
            </ul>
          )}
          {step === 'link' && (
            <ul className="p4-check-list">
              {foundDetails.map((detail) => (
                <li key={detail.id} className={links.some((key) => key.startsWith(`${detail.id}::`)) ? 'is-done' : ''}><b>{links.some((key) => key.startsWith(`${detail.id}::`)) ? <CheckIcon /> : ''}</b>{detail.label}</li>
              ))}
            </ul>
          )}
          {step === 'sort' && (
            <>
              <p className="p4-helper__note">{selectedCard ? `"${cardName(selectedCard)}" 을 골랐어. 넣을 칸의 버튼을 눌러.` : '먼저 카드를 하나 눌러 골라.'}</p>
              <ul className="p4-check-list">
                <li className={allSorted ? 'is-done' : ''}><b>{allSorted ? <CheckIcon /> : ''}</b>카드 모두 넣기</li>
                <li className={irrelevantOk ? 'is-done' : ''}><b>{irrelevantOk ? <CheckIcon /> : ''}</b>상관없는 카드는 '무관'</li>
              </ul>
            </>
          )}
          {step === 'guess' && (
            <ul className="p4-check-list">
              {foundDetails.filter((detail) => links.some((key) => key.startsWith(`${detail.id}::`))).map((detail) => (
                <li key={detail.id} className="is-done"><b><CheckIcon /></b>{detail.label}</li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {openPhoto && openMeta && (
        <Modal
          title={`${cardName(openPhoto)} 크게 보기`}
          onClose={() => setOpenPhoto(null)}
          actions={<>
            {!openFound && <button className="button button--ghost" onClick={() => { setZoomHelp(true); audioService.playSfx('tap'); }}>못 찾겠어요</button>}
            <button className="button button--primary" onClick={() => setOpenPhoto(null)}>{openFound ? '찾았어! 닫기' : '닫기'}</button>
          </>}
        >
          <p className={`zoom-hint${openFound ? ' is-found' : ''}`}>{openFound ? `찾았어: ${openMeta.label}` : '사진에서 이상한 곳을 손가락으로 눌러 봐.'}</p>
          <div className="zoom-frame">
            <img src={cards.find((card) => card.id === openPhoto)!.image} alt={`${cardName(openPhoto)} 확대`} onClick={inspect} />
            {openFound && (
              <span className="zoom-mark" style={{ left: `${openMeta.rect.x * 100}%`, top: `${openMeta.rect.y * 100}%`, width: `${openMeta.rect.width * 100}%`, height: `${openMeta.rect.height * 100}%` }}>
                {openMeta.label}
              </span>
            )}
            {!openFound && zoomHelp && (
              <span className="zoom-help" style={{ left: `${(openMeta.rect.x + openMeta.rect.width / 2) * 100}%`, top: `${(openMeta.rect.y + openMeta.rect.height / 2) * 100}%` }} aria-hidden="true" />
            )}
          </div>
          {!openFound && <p className="zoom-tip">{zoomHelp ? '반짝이는 곳을 눌러 봐.' : openMeta.hint}</p>}
        </Modal>
      )}
    </GameShell>
  );
}
