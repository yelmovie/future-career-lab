/**
 * 16:9 고정 무대. 모든 화면은 논리 해상도 1280×720 으로 그리고,
 * 실제 화면(태블릿·웹·전자칠판)에는 CSS transform 으로 비율을 유지한 채 맞춘다.
 * 남는 부분은 검은 여백(레터박스)으로 둔다.
 */
export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

let scale = 1;

export function getStageScale() {
  return scale;
}

/** 뷰포트 좌표(clientX/Y)를 무대 논리 좌표로 바꾼다. 포인터 위치를 DOM 에 그대로 쓸 때 필요하다. */
export function toStagePoint(clientX: number, clientY: number) {
  const stage = document.getElementById('stage');
  if (!stage) return { x: clientX, y: clientY };
  const rect = stage.getBoundingClientRect();
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
}

function isTyping() {
  const tag = document.activeElement?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

export function installStageScale() {
  const apply = () => {
    // 가상 키보드가 올라와 뷰포트가 줄어든 동안에는 무대를 다시 줄이지 않는다.
    if (isTyping()) return;
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    const rootElement = document.documentElement;
    const lowHeightScroll = rootElement.classList.contains('force-mobile-game') && width >= 640 && width > height && height < 350;
    scale = lowHeightScroll ? width / STAGE_WIDTH : Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT);
    rootElement.classList.toggle('low-height-scroll', lowHeightScroll);
    const root = rootElement.style;
    root.setProperty('--stage-scale', scale.toFixed(4));
    root.setProperty('--stage-rendered-height', `${(STAGE_HEIGHT * scale).toFixed(2)}px`);
    /*
     * 고정 1280×720 무대를 축소해도 손가락으로 누르는 실제 크기는 48px을 지킨다.
     * CSS 안에서는 transform 뒤의 실제 px로 나눌 수 없어, 여기서 필요한 논리 px을 계산한다.
     */
    root.setProperty('--responsive-touch-min', `${Math.max(60, 48 / scale).toFixed(2)}px`);
    root.setProperty('--responsive-fs-title', `${Math.max(28, 19 / scale).toFixed(2)}px`);
    root.setProperty('--responsive-fs-head', `${Math.max(24, 17 / scale).toFixed(2)}px`);
    root.setProperty('--responsive-fs-body', `${Math.max(20, 16 / scale).toFixed(2)}px`);
    root.setProperty('--responsive-fs-instruction', `${Math.max(23, 18 / scale).toFixed(2)}px`);
  };
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  document.addEventListener('fullscreenchange', apply);
  window.visualViewport?.addEventListener('resize', apply);
  window.addEventListener('focusout', () => window.setTimeout(apply, 50));
}
