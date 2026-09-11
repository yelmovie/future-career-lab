import { useEffect, useRef, useState } from 'react';
import type { ModelViewerElement } from '@google/model-viewer';
import { BIRDS, getBird, type BirdId } from '../pages/page05Data';
import { Modal } from './Modal';
import { PARROT_MODELS, validateEmbeddedParrotGlb, type ParrotAppearance } from './parrotPreviewModel';
import './parrot-model-preview.css';

interface Props {
  initialBird: BirdId;
  stableBirds: BirdId[];
  onClose: () => void;
}

const START_ORBIT = '20deg 82deg 105%';
const PAIR_IMAGES = { sick: '/assets/meshy/sick-pair.png', healthy: '/assets/meshy/healthy-pair.png' };
const A11Y = JSON.stringify({
  front: '앞모습', back: '뒷모습', left: '왼쪽 모습', right: '오른쪽 모습',
  'upper-front': '위에서 본 앞모습', 'upper-back': '위에서 본 뒷모습', 'upper-left': '위에서 본 왼쪽', 'upper-right': '위에서 본 오른쪽',
  'lower-front': '아래에서 본 앞모습', 'lower-back': '아래에서 본 뒷모습', 'lower-left': '아래에서 본 왼쪽', 'lower-right': '아래에서 본 오른쪽',
  'interaction-prompt': '손가락으로 돌리거나 아래의 방향 버튼으로 살펴봐.',
});

let viewerReady: Promise<void> | undefined;
function loadViewer() {
  viewerReady ??= import('@google/model-viewer').then(({ ModelViewerElement: Viewer }) => {
    Viewer.modelCacheSize = 0;
    // Models with compression are rejected before src is assigned. Keep even accidental decoder resolution local.
    Viewer.dracoDecoderLocation = '/assets/meshy/decoders/';
    Viewer.ktx2TranscoderLocation = '/assets/meshy/decoders/';
  }).catch((error) => { viewerReady = undefined; throw error; });
  return viewerReady;
}

export default function ParrotModelPreview({ initialBird, stableBirds, onClose }: Props) {
  const [birdId, setBirdId] = useState(initialBird);
  const [appearance, setAppearance] = useState<ParrotAppearance>(stableBirds.includes(initialBird) ? 'healthy' : 'sick');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [pair, setPair] = useState(false);
  const [pairImageError, setPairImageError] = useState(false);
  const viewer = useRef<ModelViewerElement>(null);
  const bird = getBird(birdId);
  const poster = appearance === 'healthy' ? bird.recoveredImage : bird.sickImage;
  const canCompare = stableBirds.includes(birdId);
  const availableBirds = BIRDS.filter((item) => item.id === initialBird || stableBirds.includes(item.id));

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    if (pair) {
      setModelUrl(null);
      setStatus('ready');
      setPairImageError(false);
      return;
    }
    setStatus('loading');
    setModelUrl(null);
    const load = async () => {
      try {
        const response = await fetch(PARROT_MODELS[birdId][appearance], { signal: controller.signal });
        if (!response.ok) throw new Error('아직 모형이 준비되지 않았어.');
        const data = await response.arrayBuffer();
        validateEmbeddedParrotGlb(data);
        await loadViewer();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(new Blob([data], { type: 'model/gltf-binary' }));
        setModelUrl(objectUrl);
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    };
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [birdId, appearance, retry, pair]);

  useEffect(() => {
    const element = viewer.current;
    if (!element || !modelUrl) return;
    const loaded = () => setStatus('ready');
    const failed = () => setStatus('error');
    element.addEventListener('load', loaded);
    element.addEventListener('error', failed);
    return () => { element.removeEventListener('load', loaded); element.removeEventListener('error', failed); };
  }, [modelUrl]);

  const pointCamera = (orbit: string) => {
    if (!viewer.current) return;
    viewer.current.cameraOrbit = orbit;
    viewer.current.jumpCameraToGoal();
  };
  const selectBird = (id: BirdId) => {
    setPair(false);
    setBirdId(id);
    setAppearance(stableBirds.includes(id) ? 'healthy' : 'sick');
  };

  return (
    <Modal className="parrot-preview" title={pair ? '두 친구 함께 보기' : `${bird.name}: 3D로 살펴보기`} onClose={onClose}
      actions={<button type="button" className="button button--primary" onClick={onClose}>관찰로 돌아가기</button>}>
      <div className="parrot-preview__layout">
        <aside className="parrot-preview__notes">
          <p>이야기 속 모습을 만든 모형이야. 눈·깃털·자세를 여러 방향에서 살펴봐.</p>
          {availableBirds.length > 1 && <div className="parrot-preview__choices" role="group" aria-label="살펴볼 친구">
            {availableBirds.map((item) => <button key={item.id} type="button" aria-pressed={!pair && birdId === item.id} onClick={() => selectBird(item.id)}>{item.name}</button>)}
            {stableBirds.length === BIRDS.length && <button type="button" aria-label="두 친구 함께 보기" aria-pressed={pair} onClick={() => setPair(true)}>함께 보기</button>}
          </div>}
          {canCompare ? <div className="parrot-preview__choices" role="group" aria-label="돌봄 전후 비교">
            <button type="button" aria-pressed={appearance === 'sick'} onClick={() => setAppearance('sick')}>돌봄 전</button>
            <button type="button" aria-pressed={appearance === 'healthy'} onClick={() => setAppearance('healthy')}>회복한 모습</button>
          </div> : <strong className="parrot-preview__state">지금 살펴보는 모습</strong>}
          <p className="parrot-preview__question">{canCompare ? '시간이 지난 뒤 어떤 모습이 달라졌을까?' : '관찰 카드에서 본 모습과 어디가 닮았을까?'}</p>
          <p className="parrot-preview__scope">주변 소리와 물그릇은 관찰 카드에서 확인해.</p>
        </aside>
        <div className="parrot-preview__visual">
          <div className="parrot-preview__canvas" aria-busy={status === 'loading'}>
            {pair ? (pairImageError
              ? <div className="parrot-preview__pair-fallback">{BIRDS.map((item) => <img key={item.id} src={appearance === 'healthy' ? item.recoveredImage : item.sickImage} alt={`${item.name}의 ${appearance === 'healthy' ? '회복한 모습' : '돌봄 전 모습'}`} />)}</div>
              : <img className="parrot-preview__poster" src={PAIR_IMAGES[appearance]} alt={`지구와 젤리의 ${appearance === 'healthy' ? '회복한 모습' : '돌봄 전 모습'}을 함께 놓고 비교하는 그림`} onError={() => setPairImageError(true)} />)
              : modelUrl && status !== 'error'
              ? <model-viewer ref={viewer} src={modelUrl} poster={poster} alt={`${bird.name}의 ${appearance === 'healthy' ? '회복한' : '돌봄 전'} 모습을 표현한 입체 모형`}
                camera-controls disable-pan camera-orbit={START_ORBIT} touch-action="pan-y" interaction-prompt="none" shadow-intensity="0.4" environment-image="neutral" a11y={A11Y} tabIndex={0} />
              : <img className="parrot-preview__poster" src={poster} alt={`${bird.name}의 ${appearance === 'healthy' ? '회복한 모습' : '돌봄 전 모습'}`} />}
            {status === 'loading' && <p className="parrot-preview__loading" role="status">입체 모형을 준비하고 있어…</p>}
          </div>
          {pair ? <p className="parrot-preview__pair-note">두 친구를 같은 방향에서 본 그림이야. 돌봄 전후 모습을 비교해 봐.</p> : status === 'error' ? <div className="parrot-preview__fallback" role="status">
            <p>입체 모형을 열지 못했어. 그림으로 계속 살펴볼 수 있어.</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)}>다시 불러오기</button>
          </div> : <div className="parrot-preview__camera" role="group" aria-label="모형 보는 방향">
            <button type="button" disabled={status !== 'ready'} onClick={() => pointCamera('0deg 82deg 105%')}>앞모습</button>
            <button type="button" disabled={status !== 'ready'} onClick={() => pointCamera('-90deg 75deg 105%')}>왼쪽</button>
            <button type="button" disabled={status !== 'ready'} onClick={() => pointCamera('90deg 75deg 105%')}>오른쪽</button>
            <button type="button" disabled={status !== 'ready'} onClick={() => pointCamera(START_ORBIT)}>처음으로</button>
          </div>}
        </div>
      </div>
    </Modal>
  );
}
