import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StepShell } from '../components/v4/StepShell';
import { PictureChoice } from '../components/v4/PictureChoice';
import { Modal } from '../components/Modal';
import { audioService } from '../services/audioService';
import { pageAsset, v6Asset, v7Asset, v8Asset } from '../shared/assets';
import { STAGE_META } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import {
  AUDIO_BAND,
  INCIDENTS,
  SEGMENTS,
  SOURCE_LABEL,
  acknowledgeIncidentRecovery,
  airBlock,
  airSegment,
  audioZone,
  buildCaptionCards,
  clipResult,
  createBroadcast,
  currentSegment,
  isFinished,
  resolveIncident,
  reviewCaption,
  restoreBroadcast,
  segmentCards,
  type BroadcastState,
  type CaptionCard,
  type SourceId,
} from './page08BroadcastModel';
import type { Trial } from './page07EcologyModel';
import { BroadcastReplay } from './BroadcastReplay';
import { buildBroadcastReplay } from './broadcastReplayModel';
import './page08-broadcast.css';

interface PageProps { onNavigate: (page: PageNumber) => void }

const SAVE_KEY = 'p8Broadcast';
const STAGE = STAGE_META[3]!;
const MENTOR = pageAsset(3, 3);
const SOURCES: SourceId[] = ['drone', 'studio', 'reporter'];
const SOURCE_IMAGE: Record<SourceId, string> = {
  drone: v6Asset('broadcast-field-poster'),
  studio: v8Asset('broadcast-anchor-neutral', 'png'),
  reporter: v8Asset('broadcast-mic-recovered', 'png'),
};
/** 한 뉴스 특집처럼 톤을 맞춘 근거 이미지. 소문은 출처 글을 읽어 가려낸다. */
const KIND_IMAGE: Record<CaptionCard['kind'], string> = {
  opening: v8Asset('broadcast-anchor-neutral', 'png'),
  graph: v7Asset('broadcast-evidence-graph'),
  photo: v6Asset('broadcast-field-poster'),
  action: v7Asset('broadcast-action-poster'),
  rumor: v7Asset('broadcast-rumor-social'),
};
const PHOTO_IMAGE = {
  logging: v6Asset('broadcast-field-poster'),
  stream: v8Asset('broadcast-photo-stream-blocked-v2'),
  construction: v8Asset('broadcast-photo-construction-v2'),
} as const;
const GRAPH_IMAGE: Record<string, string> = {
  'graph-noise': v8Asset('broadcast-graph-quiet', 'png'),
  'graph-logging': v8Asset('broadcast-graph-trees-grown', 'png'),
  'graph-water': v8Asset('broadcast-graph-water', 'png'),
};
const CAPTION_IMAGE: Record<string, string> = {
  'rumor-cat': v8Asset('broadcast-rumor-cat-v2'),
  'opening-rescue': '/assets/meshy/healthy-pair.png',
  'opening-news': v8Asset('broadcast-anchor-neutral', 'png'),
  'opening-help': v8Asset('broadcast-graph-trees-grown', 'png'),
  'action-plant': v8Asset('broadcast-graph-trees-grown', 'png'),
  'action-noise': v8Asset('broadcast-graph-quiet', 'png'),
  'action-report': v8Asset('broadcast-action-report', 'png'),
};
const cardImage = (card: CaptionCard) => (
  card.photo
    ? PHOTO_IMAGE[card.photo]
    : GRAPH_IMAGE[card.id] ?? CAPTION_IMAGE[card.id] ?? KIND_IMAGE[card.kind]
);
const INCIDENT_ICON: Record<string, string> = {
  'mic-swap': v7Asset('broadcast-mic-swap'),
  'mic-ignore': v7Asset('broadcast-mic-ignore'),
};
const WAVE_BARS = [.35, .7, 1, .55, .85, .45, .95, .6, .8, .4, 1, .65, .5, .9, .3];

/**
 * 멘토 대사 — 정답을 말해 주진 않지만, 지금 상황에서 무엇을 봐야 하는지 짚어 준다.
 * 초등학생 기준: 한 문장, 눈에 보이는 것(진행자·사진·리포터·출처 줄)을 가리킨다.
 */
const SOURCE_HINT: Record<string, string> = {
  opening: '첫 인사는 진행자가 해. 진행자가 앉아 있는 화면이 어디야?',
  scene: '숲이 어떤지는 말보다 하늘에서 찍은 사진이 더 잘 보여 줘.',
  cause: '이번 조사 결과는 스튜디오 진행자가 설명할 거야.',
  action: '시민한테 직접 부탁하려면 지금 숲에 나가 있는 사람이 필요해.',
  correction: '틀린 걸 바로잡는 건 진행자가 스튜디오에서 해.',
};
/** 화면을 잘못 골랐을 때 — 왜 아닌지 한 줄 + 무엇을 찾을지 한 줄. */
const WRONG_SOURCE: Record<string, Partial<Record<SourceId, string>>> = {
  opening: { drone: '첫 인사는 스튜디오 진행자가 해.\n진행자가 보이는 화면을 골라 봐.', reporter: '현장 리포터는 뒤에 만날 거야.\n첫 인사는 스튜디오에서 시작하자.' },
  scene: { studio: '이번에는 숲의 모습을 보여줄 차례야.\n하늘에서 찍은 드론 사진을 골라 봐.', reporter: '숲을 넓게 볼 수 있는 화면이 필요해.\n드론으로 찍은 사진을 골라 봐.' },
  cause: { drone: '이번에는 조사 결과를 설명할 차례야.\n스튜디오 진행자에게 연결하자.', reporter: '현장 리포터는 뒤에 다시 만날 거야.\n조사 결과는 스튜디오에서 설명하자.' },
  action: { drone: '시민에게 직접 부탁할 사람이 필요해.\n숲에 있는 현장 리포터를 골라 봐.', studio: '이번 부탁은 현장에서 전할 거야.\n숲에 나가 있는 리포터에게 연결하자.' },
  correction: { drone: '확인한 소식을 진행자가 다시 전할 거야.\n스튜디오 화면을 골라 봐.', reporter: '진행자가 앞서 전한 말을 바로잡을 거야.\n스튜디오 화면을 골라 봐.' },
};
/** 자막을 고르기 전 — 출처 줄을 읽게 한다. */
const CAPTION_HINT: Record<string, string> = {
  opening: '첫 인사로 어떤 소식을 소개할까?\n지구·젤리와 숲의 이야기를 골라 봐.',
  scene: '사진에 직접 보이는 일을 전해 줘.\n아직 모르는 이유를 짐작해서 말하지는 말자.',
  cause: '한 가지만 바꿔서 비교했어.\n새가 몇 마리로 늘었는지 전해 줘.',
  action: '숲과 새를 위해 할 수 있는 일을 골라\n시민들에게 함께 도와 달라고 부탁하자.',
  correction: '앞서 잘못 전한 말을 바로잡을 차례야.\n직접 확인한 소식으로 다시 알려 주자.',
};
const CAPTION_TASK: Record<string, string> = {
  opening: '첫 인사에 넣을 소식을 골라', scene: '사진을 설명할 자막을 골라',
  cause: '조사 결과를 전할 자막을 골라', action: '시민에게 부탁할 말을 골라',
  correction: '확인한 소식으로 바로잡아',
};
/** 출처 없는 자막이 나가 버렸을 때. */
const RUMOR_AIRED = '확인 안 된 말이 나갔어. 기록을 확인하고 잘못 전한 말을 바로잡자.';
/** 소리 맞추기에서 실제로 흐르는 아나운서 목소리. 슬라이더가 이 소리의 음량·왜곡을 바꾼다. */
const MIC_TEST_SRC = '/audio/v5/broadcast-mic-test.wav';
const RECOVERY_CAPTION = '잘 들리나요? 숲 소식을 계속 전해 드리겠습니다.';
const TYPE_MS = 55;

/** 아나운서가 읽듯 한 글자씩 나오는 자막. 자막이 바뀌면 처음부터 다시 친다. */
function Typewriter({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(text.length); return; }
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setShown(index);
      if (index >= text.length) window.clearInterval(timer);
    }, TYPE_MS);
    return () => window.clearInterval(timer);
  }, [text]);
  return <><span>{text.slice(0, shown)}</span><i className={`p8-cursor${shown >= text.length ? ' is-done' : ''}`} aria-hidden="true" /></>;
}

function ProgramMedia({ poster, label }: { poster: string; label: string }) {
  return (
    <span className="p8-program-media" role="img" aria-label={label}>
      <img src={poster} alt="" />
    </span>
  );
}

function readEvidenceTrials(value: unknown): Trial[] {
  const trials = (value as { trials?: unknown } | null)?.trials;
  if (!Array.isArray(trials)) return [];
  return trials.filter((trial): trial is Trial => Boolean(trial) && typeof trial === 'object'
    && ['logging', 'noise', 'water'].includes(trial.variable)
    && [trial.before, trial.after, trial.from, trial.to].every(Number.isFinite));
}

export default function Page08Broadcast({ onNavigate }: PageProps) {
  const { save, completePage, logEvent, setPageData, addBadge, addJobCard, setArtifacts } = useGame();
  const cards = useMemo(() => buildCaptionCards(save.artifacts, readEvidenceTrials(save.pageData.page07Ecology)), [save.artifacts, save.pageData.page07Ecology]);
  const [state, setState] = useState<BroadcastState>(() => restoreBroadcast(save.pageData[SAVE_KEY]) ?? createBroadcast(save.sessionSeed));
  const [completed, setCompleted] = useState(save.stageProgress.completedPages.includes(8));
  const [react, setReact] = useState<{ text: string; shake?: string } | null>(null);
  const [audioDone, setAudioDone] = useState(() => audioZone(state.draft.level) === 'ok');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const recoveryHeading = useRef<HTMLHeadingElement>(null);
  const reactionTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(reactionTimer.current), []);

  const commit = useCallback((next: BroadcastState) => { setState(next); setPageData(SAVE_KEY, next); }, [setPageData]);

  const segment = currentSegment(state);
  const done = completed || isFinished(state);
  const recovery = !done && state.pendingRecovery === 'mic';
  const zone = audioZone(state.draft.level);
  const incident = INCIDENTS.find((item) => item.id === state.pendingIncident) ?? null;
  const audioPhase = !done && !incident && !recovery && !audioDone;
  const micIgnored = Boolean(incident && state.incidentLog.some((entry) => entry.incidentId === incident.id && entry.actionId === 'mic-ignore'));
  const correction = segment?.id === 'correction';
  const options = useMemo(() => segmentCards(cards, state.index, save.sessionSeed, correction), [cards, state.index, save.sessionSeed, correction]);
  const caption = options.find((card) => card.id === state.draft.captionId) ?? null;
  const evidenceReviewed = Boolean(caption && state.reviewedCaptionIds?.includes(caption.id));
  const correctionFrom = state.pendingCorrection ? cards.find((card) => card.id === state.pendingCorrection) : null;
  const sourceImage = SOURCE_IMAGE;
  const replayScenes = useMemo(() => buildBroadcastReplay(state, cards).map((entry) => ({
    ...entry,
    poster: entry.source === 'drone' && entry.caption.photo ? cardImage(entry.caption) : SOURCE_IMAGE[entry.source],
  })), [state, cards]);
  const showReplay = done && replayScenes.length > 0;
  const programPoster = recovery
    ? v8Asset('broadcast-mic-recovered', 'png')
    : incident
    ? v7Asset('broadcast-mic-failure-poster')
    : state.draft.source
      ? state.draft.source === 'drone' && caption?.photo ? cardImage(caption) : sourceImage[state.draft.source]
      : v7Asset('broadcast-standby-poster');
  const result = done ? (isFinished(state) ? clipResult(state) : save.artifacts.clip ?? clipResult(state)) : null;

  // 소리 맞추기 단계 동안 아나운서 목소리를 틀어 두고, 슬라이더 값이 실제 음량·왜곡이 되게 한다.
  const level = state.draft.level;
  useEffect(() => {
    if (!audioPhase) { audioService.stopLevelDemo(); return; }
    audioService.startLevelDemo(MIC_TEST_SRC, level, AUDIO_BAND);
    return () => audioService.stopLevelDemo();
  }, [audioPhase]);
  useEffect(() => { if (audioPhase) audioService.setLevelDemo(level, AUDIO_BAND); }, [audioPhase, level, save.audio]);
  useEffect(() => { if (recovery) recoveryHeading.current?.focus(); }, [recovery]);

  const bounce = (text: string, shake?: string) => {
    audioService.playSfx('warning');
    const reaction = { text, shake };
    setReact(reaction);
    window.clearTimeout(reactionTimer.current);
    reactionTimer.current = window.setTimeout(() => setReact((current) => current === reaction ? null : current), 1800);
  };

  const pickSource = (source: SourceId) => {
    if (!segment) return;
    setReact(null);
    if (source !== segment.requiredSource) { bounce(WRONG_SOURCE[segment.id]?.[source] ?? SOURCE_HINT[segment.id] ?? '지금 필요한 화면이 뭘까?', source); return; }
    audioService.playSfx('success');
    commit({ ...state, draft: { ...state.draft, source } });
  };
  const pickCaption = (id: string) => { setReact(null); commit({ ...state, draft: { ...state.draft, captionId: id } }); };

  const finish = (final: BroadcastState) => {
    const clip = clipResult(final);
    setArtifacts({ clip });
    completePage(8);
    addBadge(STAGE.badgeName);
    addJobCard(STAGE.jobTitle);
    logEvent({
      page: 8,
      type: clip.corrections === 0 ? 'broadcast-clean' : 'broadcast-done',
      summary: `화면과 말을 골라 생방송 ${SEGMENTS.length}개 순서를 마쳤어. 시청자 신뢰도 ${clip.trust}점, 잘못 전한 말을 바로잡은 방송 ${final.correctionLog?.length ?? 0}회.`,
      tags: ['방송기술자', '출처 판단', clip.corrections === 0 ? '클린 방송' : '정정 방송'],
      traits: { execution: 2, analysis: 2, collaboration: 1 },
      contextRef: `p8:trust-${clip.trust}`,
    });
    setCompleted(true);
    audioService.playSfx('reward');
  };

  const air = () => {
    if (!segment || !caption) return;
    const blocked = airBlock(state, cards);
    if (blocked) {
      if (blocked === 'audio') { setAudioDone(false); setReact(null); return; }
      bounce(blocked === 'wrong-source' ? '이 순서에 맞는 화면을 다시 골라 줘.' : '지금 전할 소식에 맞는 말을 골라 줘.');
      if (blocked === 'wrong-source') commit({ ...state, draft: { ...state.draft, source: null } });
      return;
    }
    const next = airSegment(state, cards);
    if (next === state) return;
    if (!caption.sourced) {
      logEvent({ page: 8, type: 'broadcast-unsourced', summary: `"${caption.text}" 자막을 확인되지 않은 자료로 내보냈어. 정정할 근거를 찾기로 했어.`, tags: ['출처 판단', segment.title], contextRef: `p8:${segment.id}:${state.index}` });
      bounce(RUMOR_AIRED, caption.id);
      commit(next);
      return;
    }
    if (correction) {
      logEvent({ page: 8, type: 'broadcast-correction', summary: `“${correctionFrom?.text ?? '확인되지 않은 자막'}” 대신 ${caption.origin}에서 알게 된 소식인 “${caption.text}”을 전했어. 시청자 신뢰도 ${state.trust}→${next.trust}점.${evidenceReviewed ? ' 조사자료도 살펴봤어.' : ''}`, tags: ['소식 확인', '정보 수정'], traits: { analysis: 1, collaboration: 1 }, contextRef: `p8:correction:${state.index}:${state.pendingCorrection}:${caption.id}` });
      setReact({ text: '잘못 전한 말을 바로잡았어!\n이제 이어서 숲 소식을 전해 보자.' });
    } else {
      const upcoming = currentSegment(next);
      setReact(next.pendingIncident || !upcoming ? null : { text: `${segment.title} 방송을 마쳤어!\n이제 ${upcoming.title} 순서야.` });
    }
    logEvent({ page: 8, type: 'broadcast-evidence', summary: `${caption.origin}의 내용을 골라 “${caption.text}”을 방송했어.${evidenceReviewed ? ' 조사자료도 살펴봤어.' : ''}`, tags: ['소식 전달'], contextRef: `p8:evidence:${state.index}:${caption.id}` });
    audioService.playSfx('success');
    if (isFinished(next)) finish(next);
    commit(next);
  };

  const handleIncident = (actionId: string) => {
    const next = resolveIncident(state, actionId);
    if (next === state) return;
    setReact(null);
    setEvidenceOpen(false);
    audioService.playSfx(next.trust < state.trust ? 'warning' : 'success');
    if (next.pendingRecovery === 'mic') {
      logEvent({ page: 8, type: 'broadcast-mic-recovered', summary: '예비 마이크로 바꾸니 리포터 목소리가 다시 들렸어. 방송을 이어갈 준비가 됐어.', tags: ['방송기술자', '문제 해결'], traits: { execution: 1 }, contextRef: 'p8:mic-recovered' });
    }
    commit(next);
  };
  const continueBroadcast = () => {
    const next = acknowledgeIncidentRecovery(state);
    if (next === state) return;
    setReact(null);
    audioService.playSfx('tap');
    commit(next);
  };

  // ----- 화면 -----
  const step = Math.min(state.index + 1, SEGMENTS.length);
  const instruction = done ? '방송 끝!' :
    recovery ? '리포터 목소리가 돌아왔어!' :
    incident ? '마이크가 끊겼어!' :
    audioPhase ? '소리를 초록 칸에 맞춰' :
    !state.draft.source ? `${segment?.title}: 어떤 화면?` : CAPTION_TASK[segment?.id ?? 'opening'];
  const bubble = react?.text ?? (
    done ? (showReplay ? '네가 고른 화면과 말을 이어서 볼게.\n앞뒤 장면으로 가거나 다시 봐도 돼.' : '시민들이 도와주기로 했어!') :
    recovery ? '마이크를 바꾸니 목소리가 다시 들려!\n이제 다음 숲 소식을 전해 보자.' :
    incident ? '마이크가 끊겼어. 방송을 이어 가려면 뭘 먼저 해야 할까?' :
    audioPhase ? '초록 칸보다 위로 올리면 소리가 찢어지고, 아래면 잘 안 들려.' :
    !state.draft.source ? (segment?.need ?? '') :
    caption && !caption.sourced ? '이 말은 아직 확인하지 못했어.\n직접 알아본 소식과 비교해서 골라 보자.' : CAPTION_HINT[segment?.id ?? 'opening']
  );
  const next = done
    ? { label: '숲 살리기 작전으로', onClick: () => onNavigate(9) }
    : recovery
      ? { label: '방송 이어가기', onClick: continueBroadcast }
    : incident
      ? { label: '방송 이어가기', disabled: true, hint: '마이크를 바꾸면 방송을 이어갈 수 있어', onClick: () => undefined }
    : audioPhase
      ? { label: state.index === 0 ? '방송 시작' : '소리 확인 완료', disabled: zone !== 'ok', hint: '소리를 초록 칸에 맞춰 줘', onClick: () => { setAudioDone(true); audioService.playSfx('success'); } }
      : { label: correction ? '바로잡아 방송하기' : '방송으로 내보내기', disabled: !state.draft.source || !caption, hint: !state.draft.source ? '이번 소식에 맞는 화면을 골라 줘' : '전하고 싶은 자막을 골라 줘', onClick: air };

  const help = (
    <ul className="p8-help">
      <li>방송 순서마다 화면 하나, 자막 하나를 골라서 내보내!</li>
      <li>화면의 그림과 멘토 안내를 보고 전할 말을 골라. 더 궁금하면 ‘조사자료 보기’를 열어도 돼.</li>
      <li>첫 인사, 현장 보여주기, 조사 결과, 시민 부탁 순서로 뉴스를 만들어 봐. 직접 본 일과 짐작한 일도 나누어 생각해.</li>
      <li>확인 안 된 말을 내보냈다면 확인한 소식으로 바로잡아. 시청자들이 다시 믿을 수 있도록!</li>
      <li>마이크가 끊기면 예비 마이크로 바꿔 봐. 목소리가 돌아온 화면을 보고 ‘방송 이어가기’를 눌러.</li>
      <li>마지막에는 내가 만든 방송을 이어서 볼 수 있어. 앞뒤 장면으로 가거나 처음부터 다시 봐도 돼.</li>
    </ul>
  );

  return (
    <StepShell page={8} className="p8-page" step={step} steps={SEGMENTS.length} instruction={instruction ?? '자막을 골라'} mentor={MENTOR} mentorName="방송 멘토" bubble={bubble} status={`시청자 신뢰도 ${result?.trust ?? state.trust}`} next={{ ...next, disabledMode: 'lock' }} help={help} done={result && !showReplay ? { title: `${STAGE.badgeName}를 얻었어`, message: `네가 고른 화면과 말로 숲 소식을 전했어! 시청자 신뢰도 ${result.trust}점이야.`, badge: { src: STAGE.badge, alt: STAGE.badgeName } } : undefined} onNavigate={onNavigate}>
      {showReplay ? <BroadcastReplay scenes={replayScenes} badge={{ src: STAGE.badge, alt: STAGE.badgeName }} /> : <div className={`p8-stage${recovery ? ' is-recovery' : ''}`}>
        <div className={`v4-card p8-screen${done ? ' is-off' : ''}${recovery ? ' is-recovered' : ''}`} aria-label="송출 화면">
          <span className="p8-onair">{done ? '방송 완료' : recovery ? '방송 다시 연결' : incident ? '소리 끊김' : '방송 미리보기'}</span>
          <ProgramMedia poster={programPoster} label={recovery ? '새 마이크를 들고 다시 방송하는 리포터' : incident ? '마이크가 끊긴 현장 화면' : state.draft.source ? SOURCE_LABEL[state.draft.source] : '방송 대기 화면'} />
          {!state.draft.source && !incident && !recovery && <span className="p8-screen__empty">{audioPhase ? '방송 준비' : segment?.title}</span>}
          {recovery ? <p className="p8-screen__caption p8-screen__caption--recovered"><Typewriter text={RECOVERY_CAPTION} /></p>
            : caption && <p className="p8-screen__caption" key={caption.id}><Typewriter text={correction ? `앞서 확인되지 않은 말을 전해 바로잡습니다. ${caption.announce ?? caption.text}` : caption.announce ?? caption.text} /></p>}
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
                <input type="range" min={0} max={100} step={1} value={state.draft.level} aria-label="오디오 레벨" aria-valuetext={`${state.draft.level}, ${zone === 'ok' ? '알맞음' : zone === 'clip' ? '소리 찢어짐' : '너무 작음'}`} onPointerDown={() => audioService.unlock()} onChange={(event) => commit({ ...state, draft: { ...state.draft, level: Number(event.target.value) } })} />
                <output className={`is-${zone}`}>{zone === 'ok' ? '딱 좋아' : zone === 'clip' ? '찢어져' : '작아'}</output>
              </label>
            </div>
          )}

          {!audioPhase && !done && !incident && !recovery && !state.draft.source && (
            <div className={`p8-sources p8-sources--${segment?.id ?? 'opening'}${react?.shake && SOURCES.includes(react.shake as SourceId) ? ' v4-shake' : ''}`}>
              <PictureChoice size="lg" fit="cover" ariaLabel="화면 고르기" selected={null} onSelect={pickSource} options={SOURCES.map((id) => ({ id, image: sourceImage[id], label: SOURCE_LABEL[id] }))} />
            </div>
          )}

          {!audioPhase && !done && !incident && !recovery && state.draft.source && (
            <div className={`p8-captions${react?.shake === caption?.id ? ' v4-shake' : ''}`}>
              {correctionFrom && <p className="p8-correction-note">바로잡을 말: “{correctionFrom.text}”</p>}
              <PictureChoice
                size="lg"
                ariaLabel="자막 고르기"
                selected={state.draft.captionId}
                onSelect={pickCaption}
                options={options.map((card) => ({ id: card.id, image: cardImage(card), label: card.text, caption: card.evidenceLabel === '연습 자료' ? `${card.origin} · 연습` : card.origin }))}
              />
              {caption && <div className="p8-source-review"><button type="button" className="button button--ghost" onClick={() => setEvidenceOpen(true)}>조사자료 보기</button><span>{evidenceReviewed ? '궁금한 내용을 더 살펴봤어' : '더 궁금할 때 살펴봐도 돼'}</span></div>}
            </div>
          )}

          {incident && (
            <div className="p8-incident" role="alertdialog" aria-label={incident.title}>
              <p role={micIgnored ? 'status' : undefined}>{micIgnored ? '아직 목소리가 안 들려. 예비 마이크로 바꿔 보자.' : incident.signal}</p>
              <PictureChoice size="lg" ariaLabel="사고 대처" selected={null} onSelect={handleIncident} options={incident.actions.map((action) => ({ id: action.id, image: INCIDENT_ICON[action.id] ?? pageAsset(4, 5), label: action.label }))} />
            </div>
          )}
          {recovery && (
            <section className="p8-recovery" aria-labelledby="p8-recovery-title">
              <span className="p8-recovery__badge"><span aria-hidden="true">✓</span> 마이크 교체 완료</span>
              <h2 id="p8-recovery-title" ref={recoveryHeading} tabIndex={-1}>이제 소리가 잘 들려!</h2>
              <ol className="p8-recovery__steps">
                <li><span aria-hidden="true">1</span><div><strong>예비 마이크로 바꿨어</strong><p>소리가 안 나던 마이크를 바꿨어.</p></div></li>
                <li><span aria-hidden="true">2</span><div><strong>리포터 목소리가 돌아왔어</strong><p>시청자에게 말이 다시 전달돼.</p></div></li>
                <li><span aria-hidden="true">3</span><div><strong>숲 소식을 계속 전해 보자</strong><p>준비됐으면 ‘방송 이어가기’를 눌러.</p></div></li>
              </ol>
            </section>
          )}
        </div>
      </div>}
      {react && <span className="p8-announcement" role="status">{react.text}</span>}
      {evidenceOpen && caption && <Modal title="자막과 관련된 조사자료" onClose={() => setEvidenceOpen(false)} actions={<button type="button" className="button button--primary" onClick={() => { commit(reviewCaption(state, caption.id)); setEvidenceOpen(false); }}>확인했어</button>}>
        <div className="p8-evidence"><strong>{caption.evidenceLabel ?? '전해 들은 말'} · {caption.origin}</strong>{caption.photo && <img src={cardImage(caption)} alt="자막과 관련된 현장 사진" />}<ul>{(caption.evidence ?? [caption.text]).map((line) => <li key={line}>{line}</li>)}</ul><p>조사자료를 보고, “{caption.text}”라는 말이 맞는지 생각해 봐.</p></div>
      </Modal>}
    </StepShell>
  );
}
