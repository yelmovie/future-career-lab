import { useCallback, useMemo, useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { PictureChoice } from '../components/v4/PictureChoice';
import { audioService } from '../services/audioService';
import { pageAsset, v2Asset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  AUDIO_BAND,
  INCIDENTS,
  SEGMENTS,
  SOURCE_LABEL,
  airRumor,
  airSegment,
  audioZone,
  buildCaptionCards,
  clipResult,
  createBroadcast,
  currentSegment,
  isFinished,
  photoIds,
  resolveIncident,
  restoreBroadcast,
  segmentCards,
  type BroadcastState,
  type CaptionCard,
  type SourceId,
} from './page08BroadcastModel';
import './page08-broadcast.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const SAVE_KEY = 'p8Broadcast';
const STAGE = STAGE_META[3]!;
const MENTOR = pageAsset(3, 3);
const SOURCES: SourceId[] = ['drone', 'studio', 'reporter'];
/** 카드 종류별 그림. 소문 카드는 "?" 표식 없이 휴대 기기 그림 — 출처 글을 읽어야 가려낼 수 있다. */
const KIND_IMAGE: Record<CaptionCard['kind'], string> = { graph: pageAsset(5, 9), photo: v2Asset('photo-logging'), action: pageAsset(7, 5), rumor: pageAsset(3, 9) };
const cardImage = (card: CaptionCard) => (card.photo ? v2Asset(`photo-${card.photo}`) : KIND_IMAGE[card.kind]);
const INCIDENT_ICON: Record<string, string> = { 'mic-swap': pageAsset(4, 5), 'mic-ignore': pageAsset(4, 7) };
const WAVE_BARS = [.35, .7, 1, .55, .85, .45, .95, .6, .8, .4, 1, .65, .5, .9, .3];

export default function Page08Broadcast({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const cards = useMemo(() => buildCaptionCards(save.artifacts), [save.artifacts]);
  const photos = useMemo(() => photoIds(save.artifacts.photos), [save.artifacts.photos]);
  const [state, setState] = useState<BroadcastState>(() => restoreBroadcast(save.pageData[SAVE_KEY]) ?? createBroadcast(save.sessionSeed));
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(8));
  const [react, setReact] = useState<{ text: string; shake?: string } | null>(null);
  const [audioDone, setAudioDone] = useState(() => audioZone(state.draft.level) === 'ok');

  const commit = useCallback((next: BroadcastState) => { setState(next); setPageData(SAVE_KEY, next); }, [setPageData]);

  const segment = currentSegment(state);
  const done = completed || isFinished(state);
  const zone = audioZone(state.draft.level);
  const audioPhase = !done && !audioDone && state.index === 0 && state.log.length === 0;
  const incident = INCIDENTS.find((item) => item.id === state.pendingIncident) ?? null;
  const options = useMemo(() => segmentCards(cards, state.index, save.sessionSeed), [cards, state.index, save.sessionSeed]);
  const caption = options.find((card) => card.id === state.draft.captionId) ?? null;
  const sourceImage: Record<SourceId, string> = { drone: v2Asset(`photo-${photos[0] ?? 'logging'}`), studio: pageAsset(4, 7), reporter: v2Asset('reporter') };
  const result = done ? (isFinished(state) ? clipResult(state) : save.artifacts.clip ?? clipResult(state)) : null;

  const bounce = (text: string, shake?: string) => {
    audioService.playSfx('warning');
    setReact({ text, shake });
    window.setTimeout(() => setReact(null), 1800);
  };

  const pickSource = (source: SourceId) => {
    if (!segment) return;
    if (source !== segment.requiredSource) { bounce('지금은 보여 줄까, 말할까, 들을까?', source); return; }
    audioService.playSfx('success');
    commit({ ...state, draft: { ...state.draft, source } });
  };
  const pickCaption = (id: string) => commit({ ...state, draft: { ...state.draft, captionId: id } });

  const finish = (final: BroadcastState) => {
    const clip = clipResult(final);
    setArtifacts({ clip });
    completePage(8);
    addBadge(STAGE.badgeName);
    addJobCard(STAGE.jobTitle);
    logEvent({
      page: 8,
      type: clip.corrections === 0 ? 'broadcast-clean' : 'broadcast-done',
      summary: `생방송 ${SEGMENTS.length}개 세그먼트를 마쳤어. 시청자 신뢰 ${clip.trust}점, 소문 자막 ${clip.corrections}회.`,
      tags: ['방송기술자', '출처 판단', clip.corrections === 0 ? '클린 방송' : '정정 방송'],
      traits: { execution: 2, analysis: clip.corrections === 0 ? 2 : 1, collaboration: 1 },
      contextRef: `p8:trust-${clip.trust}`,
    });
    setCompleted(true);
    audioService.playSfx('reward');
  };

  const air = () => {
    if (!segment || !caption) return;
    if (!caption.sourced) {
      logEvent({ page: 8, type: 'broadcast-unsourced', summary: `"${caption.text}" 자막을 출처 없이 내보냈어.`, tags: ['출처 판단', segment.title], traits: { analysis: -1 }, contextRef: `p8:${segment.id}` });
      bounce('출처가 뭐였지?', caption.id);
      commit(airRumor(state));
      return;
    }
    const next = airSegment(state, cards);
    if (next === state) return;
    audioService.playSfx('success');
    if (isFinished(next)) finish(next);
    commit(next);
  };

  const handleIncident = (actionId: string) => {
    const next = resolveIncident(state, actionId);
    if (next === state) return;
    audioService.playSfx(next.trust < state.trust ? 'warning' : 'success');
    commit(next);
  };

  // ----- 화면 -----
  const step = Math.min(state.index + 1, SEGMENTS.length);
  const instruction = done ? '방송 끝!' :
    incident ? '마이크가 끊겼어!' :
    audioPhase ? '소리를 초록 칸에 맞춰' :
    !state.draft.source ? `${segment?.title}: 어떤 화면?` : '자막 하나를 골라';
  const bubble = react?.text ?? (
    done ? '시민들이 도와주기로 했어!' :
    incident ? '어떻게 할까?' :
    audioPhase ? '너무 크면 소리가 찢어져.' :
    !state.draft.source ? (segment?.need ?? '') :
    caption ? (caption.sourced ? '좋아, 송출!' : '출처가 어디서 왔지?') : '출처를 잘 봐.'
  );
  const next = done
    ? { label: '연합 작전으로', onClick: () => onNavigate(9) }
    : audioPhase
      ? { label: '방송 시작', disabled: zone !== 'ok', hint: '초록 칸에 맞추면 켜져요', onClick: () => { setAudioDone(true); audioService.playSfx('success'); } }
      : { label: '송출', disabled: Boolean(incident) || !caption, hint: incident ? '사고부터 처리해' : !state.draft.source ? '화면부터 골라' : '자막을 골라', onClick: air };

  const help = (
    <ul className="p8-help">
      <li>세그먼트마다 화면 하나, 자막 하나를 고르고 송출!</li>
      <li>자막 아래 출처 줄을 읽어. <b>SNS 제보·익명 댓글</b>처럼 누가 봤는지 모르는 건 소문이야. 내보내면 신뢰가 떨어져.</li>
      <li>사고가 나면 그림 버튼으로 바로 대처해.</li>
    </ul>
  );

  return (
    <StepShell page={8} step={step} steps={SEGMENTS.length} instruction={instruction} mentor={MENTOR} mentorName="방송 멘토" bubble={bubble} status={`신뢰 ${result?.trust ?? state.trust}`} next={next} help={help} done={result ? { title: result.corrections === 0 ? '클린 방송 성공' : '생방송 완료', message: `시청자 신뢰 ${result.trust}점. 시민들이 푸른솔 숲의 새를 함께 지키기로 했어.` } : undefined} onNavigate={onNavigate}>
      <div className="p8-stage">
        <div className={`v4-card p8-screen${done ? ' is-off' : ''}`} aria-label="송출 화면">
          <span className="p8-onair">{done ? 'OFF AIR' : 'ON AIR'}</span>
          {state.draft.source ? <img className="p8-screen__art" src={sourceImage[state.draft.source]} alt={SOURCE_LABEL[state.draft.source]} /> : <span className="p8-screen__empty">{segment?.title}</span>}
          {caption && <p className={`p8-screen__caption${caption.sourced ? '' : ' is-rumor'}`}>{caption.text}</p>}
        </div>

        <div className="p8-controls">
          {audioPhase && (
            <div className="p8-audio">
              <div className={`p8-meter is-${zone}`} aria-hidden="true">
                <span className="p8-band" style={{ bottom: `${AUDIO_BAND.low}%`, height: `${AUDIO_BAND.high - AUDIO_BAND.low}%` }} />
                {WAVE_BARS.map((height, index) => <i key={index} style={{ height: `${Math.round(height * state.draft.level)}%` }} />)}
              </div>
              <label className="p8-slider">
                <span>소리</span>
                <input type="range" min={0} max={100} step={1} value={state.draft.level} aria-label="오디오 레벨" aria-valuetext={`${state.draft.level}, ${zone === 'ok' ? '알맞음' : zone === 'clip' ? '소리 찢어짐' : '너무 작음'}`} onChange={(event) => commit({ ...state, draft: { ...state.draft, level: Number(event.target.value) } })} />
                <output className={`is-${zone}`}>{zone === 'ok' ? '딱 좋아' : zone === 'clip' ? '찢어져' : '작아'}</output>
              </label>
            </div>
          )}

          {!audioPhase && !done && !incident && !state.draft.source && (
            <div className={react?.shake && SOURCES.includes(react.shake as SourceId) ? 'v4-shake' : ''}>
              <PictureChoice size="lg" fit="cover" ariaLabel="화면 고르기" selected={null} onSelect={pickSource} options={SOURCES.map((id) => ({ id, image: sourceImage[id], label: SOURCE_LABEL[id] }))} />
            </div>
          )}

          {!audioPhase && !done && !incident && state.draft.source && (
            <div className={`p8-captions${react?.shake === caption?.id ? ' v4-shake' : ''}`}>
              <PictureChoice
                size="lg"
                ariaLabel="자막 고르기"
                selected={state.draft.captionId}
                onSelect={pickCaption}
                options={options.map((card) => ({ id: card.id, image: cardImage(card), label: card.text, caption: card.origin }))}
              />
            </div>
          )}

          {incident && (
            <div className="p8-incident" role="alertdialog" aria-label={incident.title}>
              <p>{incident.signal}</p>
              <PictureChoice size="lg" ariaLabel="사고 대처" selected={null} onSelect={handleIncident} options={incident.actions.map((action) => ({ id: action.id, image: INCIDENT_ICON[action.id] ?? pageAsset(4, 5), label: action.label }))} />
            </div>
          )}
        </div>
      </div>
      {react && <span className="v4-react" role="status">{react.text}</span>}
    </StepShell>
  );
}
