import { useLayoutEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import { GameShell, MissionGuide, Panel } from '../components/GameShell';
import { CheckIcon, SearchIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { StageComplete } from '../components/StageComplete';
import { audioService } from '../services/audioService';
import { pageAsset } from '../shared/assets';
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
  photoCards,
  type BinId,
  type DetailId,
  type EvidenceCard,
  type FactId,
} from './stage1-2-content';
import './stage1-2.css';

const DETAIL_IDS = new Set<string>(PHOTO_DETAILS.map((detail) => detail.id));
const BIN_IDS = new Set<string>(BINS.map((bin) => bin.id));
const DRAG_TYPE = 'text/evidence-card';

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
  const { save, completePage, logEvent, setPageData, setArtifacts } = useGame();
  const cards = useMemo<EvidenceCard[]>(() => [...photoCards(save.artifacts.photos), ...FACT_CARDS], [save.artifacts.photos]);
  const [found, setFound] = useState<DetailId[]>(() => detailList(save.pageData.p4Details));
  const [bins, setBins] = useState<Record<string, BinId>>(() => binMap(save.pageData.p4Bins));
  const [links, setLinks] = useState<string[]>(() => linkList(save.pageData.p4Links));
  const [hypothesis, setHypothesis] = useState<CauseId | null>(save.artifacts.hypothesis);
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(4));
  const [openPhoto, setOpenPhoto] = useState<PhotoId | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [pendingDetail, setPendingDetail] = useState<DetailId | null>(null);
  const [wrongLink, setWrongLink] = useState<string | null>(null);
  const [hint, setHint] = useState('사진을 탭해 확대하고, 숨은 세부를 찾아 봐. 찾은 세부만 선으로 이을 수 있어.');
  const linkArea = useRef<HTMLDivElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());
  const [lines, setLines] = useState<Line[]>([]);

  const factCards = cards.filter((card) => card.kind === 'fact' && bins[card.id] !== 'none');
  const foundDetails = PHOTO_DETAILS.filter((detail) => found.includes(detail.id));
  const allSorted = cards.every((card) => bins[card.id]);
  const irrelevantOk = bins[IRRELEVANT_CARD] === 'none';
  const canChoose = links.length >= LINKS_TO_UNLOCK && allSorted && irrelevantOk;

  useLayoutEffect(() => {
    const measure = () => {
      const host = linkArea.current?.getBoundingClientRect();
      if (!host) return;
      const centre = (id: string, side: 'right' | 'left') => {
        const rect = chipRefs.current.get(id)?.getBoundingClientRect();
        if (!rect) return null;
        return { x: (side === 'right' ? rect.right : rect.left) - host.left, y: rect.top + rect.height / 2 - host.top };
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
  }, [links, wrongLink, found, bins]);

  const inspect = (event: MouseEvent<HTMLImageElement>) => {
    if (!openPhoto) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const detail = hitDetail(openPhoto, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    const meta = PHOTO_DETAILS.find((item) => item.photo === openPhoto)!;
    if (!detail) { setHint(meta.hint); audioService.playSfx('tap'); return; }
    if (found.includes(detail)) return;
    const next = [...found, detail];
    setFound(next);
    setPageData('p4Details', next);
    setHint(`"${meta.label}" 을 찾았어! 이제 증거판에서 사실 카드와 이을 수 있어.`);
    audioService.playSfx('clue');
    logEvent({ page: 4, type: 'detail-found', contextRef: `detail-${detail}`, summary: `사진을 확대해 ${meta.label}을 찾았어.`, tags: ['관찰', detail], traits: { exploration: 1, analysis: 1 } });
  };

  const placeCard = (cardId: string, bin: BinId) => {
    const next = { ...bins, [cardId]: bin };
    setBins(next);
    setPageData('p4Bins', next);
    setSelectedCard(null);
    audioService.playSfx('drop');
    if (cardId === IRRELEVANT_CARD && bin !== 'none') setHint('도시 야경이 숲 사건과 이어질까? 한 번 더 생각해 봐.');
    else if (cardId !== IRRELEVANT_CARD && bin === 'none') setHint('이 카드가 정말 사건과 상관없을까? 사진 속 세부와 비교해 봐.');
    else setHint(`${BINS.find((item) => item.id === bin)!.label} 칸에 놓았어.`);
  };

  const onDrop = (event: DragEvent<HTMLElement>, bin: BinId) => {
    event.preventDefault();
    const id = event.dataTransfer.getData(DRAG_TYPE);
    if (id) placeCard(id, bin);
  };

  const connect = (fact: FactId) => {
    if (!pendingDetail) { setHint('먼저 왼쪽에서 찾은 세부를 고르고, 오른쪽 사실 카드를 눌러 이어.'); return; }
    const key = linkKey(pendingDetail, fact);
    setPendingDetail(null);
    if (links.includes(key)) { setHint('이미 이은 연결이야.'); return; }
    if (!isValidLink(pendingDetail, fact)) {
      setWrongLink(key);
      window.setTimeout(() => setWrongLink(null), 700);
      setHint('이 연결을 뒷받침하는 사진은 어느 거야? 세부가 찍힌 사진과 사실이 같은 장소를 가리켜야 해.');
      audioService.playSfx('warning');
      return;
    }
    const next = [...links, key];
    setLinks(next);
    setPageData('p4Links', next);
    audioService.playSfx('clue');
    setHint(next.length >= LINKS_TO_UNLOCK ? '연결 2개! 카드 분류를 마치면 가설을 고를 수 있어.' : '좋은 연결이야. 하나 더 이어 봐.');
  };

  const choose = (id: CauseId) => {
    setHypothesis(id);
    setArtifacts({ hypothesis: id });
    setPageData('p4Hypothesis', id);
    const label = HYPOTHESES.find((item) => item.id === id)!.label;
    logEvent({ page: 4, type: 'hypothesis', contextRef: `hypothesis-${id}`, summary: `증거판을 보고 "${label}" 가설을 세웠어.`, tags: ['가설', id], traits: { analysis: 2 } });
    if (!completed) { setCompleted(true); completePage(4); audioService.playSfx('success'); } else audioService.playSfx('tap');
    setHint(`가설 카드 "${label}" 를 받았어. 맞는지는 숲 생태 조사에서 확인해. 바꿔도 돼.`);
  };

  const cardName = (id: string) => cards.find((card) => card.id === id)?.title ?? id;
  const renderCard = (card: EvidenceCard) => (
    <article
      key={card.id}
      className={`evidence-card${selectedCard === card.id ? ' is-selected' : ''}`}
      draggable
      onDragStart={(event) => { event.dataTransfer.setData(DRAG_TYPE, card.id); setSelectedCard(card.id); }}
    >
      <button className="evidence-card__pick" aria-pressed={selectedCard === card.id} onClick={() => { setSelectedCard(selectedCard === card.id ? null : card.id); audioService.playSfx('tap'); }}>
        <img src={card.image} alt="" draggable={false} />
        <strong>{card.title}</strong>
        <p>{card.note}</p>
      </button>
      {card.kind === 'photo' && (
        <button className="evidence-card__zoom" onClick={() => { setOpenPhoto(card.id as PhotoId); audioService.playSfx('tap'); }} aria-label={`${card.title} 확대 관찰`}>
          <SearchIcon />{found.some((id) => PHOTO_DETAILS.find((detail) => detail.id === id)?.photo === card.id) ? '세부 찾음' : '확대'}
        </button>
      )}
    </article>
  );

  const openMeta = openPhoto ? PHOTO_DETAILS.find((item) => item.photo === openPhoto)! : null;

  return (
    <GameShell
      page={4}
      eyebrow="STAGE 1 · 드론 현장가"
      onNavigate={onNavigate}
      footer={completed ? <StageComplete title="가설 카드를 얻었어" message="구조된 앵무새를 살피러 가자. 가설은 숲 생태 조사에서 검증해." nextLabel="앵무새 살피러 가기" onNext={() => onNavigate(5)} /> : undefined}
    >
      <div className="game-grid game-grid--wide-center mystery-layout">
        <Panel title="이번 미션" kicker="EVIDENCE BOARD">
          <MissionGuide
            image={pageAsset(3, 5)}
            imageAlt="증거판"
            action="사진 속 세부를 찾아 사실과 이어"
            goals={['사진 3장 확대해 세부 찾기', '카드를 세 칸으로 나누기', '세부와 사실 2개 잇기', '끝내면: 가설 카드']}
          />
          <ul className="board-steps" aria-label="진행">
            <li className={found.length === PHOTO_DETAILS.length ? 'is-done' : ''}><b>1</b>세부 {found.length} / {PHOTO_DETAILS.length}</li>
            <li className={allSorted && irrelevantOk ? 'is-done' : ''}><b>2</b>분류 {Object.keys(bins).filter((id) => cards.some((card) => card.id === id)).length} / {cards.length}</li>
            <li className={links.length >= LINKS_TO_UNLOCK ? 'is-done' : ''}><b>3</b>연결 {links.length} / {LINKS_TO_UNLOCK}</li>
          </ul>
          <div className="replay-goal" role="note"><strong>갱신 목표</strong><span>다른 가설을 골라 숲 조사에서 다시 검증하기</span></div>
          <div className="toast" role="status">{hint}</div>
        </Panel>

        <div className="stack">
          <Panel title="단서 카드" kicker="CARDS">
            <p className="empty-copy">카드를 끌어 아래 칸에 놓거나, 카드를 누른 뒤 칸의 버튼을 눌러.</p>
            <div className="evidence-card-grid">{cards.filter((card) => !bins[card.id]).map(renderCard)}</div>
          </Panel>
          <div className="evidence-bins">
            {BINS.map((bin) => (
              <section key={bin.id} className={`evidence-bin is-${bin.id}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, bin.id)} aria-label={`${bin.label} 칸`}>
                <header>
                  <h3>{bin.label}</h3>
                  <button className="button button--ghost" disabled={!selectedCard} onClick={() => selectedCard && placeCard(selectedCard, bin.id)}>{selectedCard ? `${cardName(selectedCard)} 여기에` : '카드 고른 뒤'}</button>
                </header>
                <div className="evidence-card-grid evidence-card-grid--bin">{cards.filter((card) => bins[card.id] === bin.id).map(renderCard)}</div>
              </section>
            ))}
          </div>
        </div>

        <Panel title="선잇기" kicker="CONNECT">
          <div className="link-area" ref={linkArea}>
            <svg className="link-lines" aria-hidden="true">
              {lines.map((line) => <line key={line.key} className={line.wrong ? 'is-wrong' : ''} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />)}
            </svg>
            <div className="link-column">
              <strong>찾은 세부</strong>
              {foundDetails.length === 0 && <p className="empty-copy">사진을 확대해 세부를 찾으면 여기 생겨.</p>}
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

          <div className={`hypothesis-section${hypothesis ? ' is-done' : ''}`}>
            <strong><b>{hypothesis ? <CheckIcon /> : '4'}</b> 가설 고르기</strong>
            {!canChoose && <p className="empty-copy">{links.length < LINKS_TO_UNLOCK ? `연결 ${LINKS_TO_UNLOCK}개가 필요해.` : !allSorted ? '카드를 모두 칸에 넣어 줘.' : '무관한 카드가 다른 칸에 있어. 다시 봐.'}</p>}
            <div className="candidate-list" role="radiogroup" aria-label="가설">
              {HYPOTHESES.map((item) => (
                <button key={item.id} role="radio" aria-checked={hypothesis === item.id} className={hypothesis === item.id ? 'is-selected' : ''} disabled={!canChoose} onClick={() => choose(item.id)}>
                  <strong>{item.label}</strong><small>{item.note}</small>
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {openPhoto && openMeta && (
        <Modal title={`${cardName(openPhoto)} 확대 관찰`} onClose={() => setOpenPhoto(null)} actions={<button className="button button--primary" onClick={() => setOpenPhoto(null)}>닫기</button>}>
          <p className="zoom-hint">{found.includes(openMeta.id) ? `찾은 세부: ${openMeta.label}` : '사진에서 이상한 부분을 눌러 봐.'}</p>
          <div className="zoom-frame">
            <img src={cards.find((card) => card.id === openPhoto)!.image} alt={`${cardName(openPhoto)} 확대`} onClick={inspect} />
            {found.includes(openMeta.id) && (
              <span className="zoom-mark" style={{ left: `${openMeta.rect.x * 100}%`, top: `${openMeta.rect.y * 100}%`, width: `${openMeta.rect.width * 100}%`, height: `${openMeta.rect.height * 100}%` }}>
                {openMeta.label}
              </span>
            )}
          </div>
        </Modal>
      )}
    </GameShell>
  );
}
