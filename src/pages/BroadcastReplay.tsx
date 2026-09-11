import { useEffect, useState } from 'react';
import type { BroadcastReplayEntry } from './broadcastReplayModel';
import { SOURCE_LABEL } from './page08BroadcastModel';
import './broadcast-replay.css';

export interface ReplayScene extends BroadcastReplayEntry { poster: string }

interface Props {
  scenes: readonly ReplayScene[];
  badge: { src: string; alt: string };
}

/** 완성한 방송을 다시 보는 동안 저장된 선택이나 보상은 바꾸지 않는다. */
export function BroadcastReplay({ scenes, badge }: Props) {
  const [index, setIndex] = useState(0);
  const [ended, setEnded] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const scene = scenes[index];

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (ended || !visible || !scene) return;
    const timer = window.setTimeout(() => {
      if (index + 1 < scenes.length) setIndex(index + 1);
      else setEnded(true);
    }, scene.durationMs);
    return () => window.clearTimeout(timer);
  }, [ended, visible, scene, index, scenes.length]);

  if (!scene) return null;

  const move = (nextIndex: number) => { setIndex(nextIndex); setEnded(false); };

  return (
    <section className="p8-replay" aria-label="내가 만든 방송">
      <header className="p8-replay__heading">
        <div>
          <span>내가 만든 숲 소식</span>
          <img className="p8-replay__badge" src={badge.src} alt={`${badge.alt} 획득`} />
          <h2>{ended ? '내 방송을 모두 봤어!' : scene.title}</h2>
        </div>
        <strong aria-label={`${scenes.length}개 장면 중 ${index + 1}번째 장면`}>{index + 1} / {scenes.length}</strong>
      </header>
      <div className="p8-replay__screen" data-scene={scene.id}>
        <span className="p8-replay__onair">{ended ? '방송 끝' : '내 방송 다시 보기'}</span>
        <img className="p8-replay__image" src={scene.poster} alt={SOURCE_LABEL[scene.source]} />
        <p className="p8-replay__caption">{scene.announcement}</p>
      </div>
      <div className={`p8-replay__controls${ended ? ' is-ended' : ''}`} aria-label="방송 재생 조작">
        <button type="button" disabled={index === 0} onClick={() => move(index - 1)}>이전 장면</button>
        {ended && <button type="button" className="p8-replay__restart" onClick={() => move(0)}>처음부터 다시 보기</button>}
        <button type="button" disabled={index === scenes.length - 1} onClick={() => move(index + 1)}>다음 장면</button>
      </div>
    </section>
  );
}
