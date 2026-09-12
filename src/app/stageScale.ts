/**
 * 16:9 고정 무대. 모든 화면은 논리 해상도 1280×720 으로 그리고,
 * 실제 화면(태블릿·웹·전자칠판)에는 CSS transform 으로 비율을 유지한 채 맞춘다.
 * 남는 부분은 검은 여백(레터박스)으로 둔다.
 */
export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

export const DISPLAY_SCALE_STORAGE_KEY = 'future-career-lab.display-scale.v1';
export const DISPLAY_SCALE_MIN = 80;
export const DISPLAY_SCALE_MAX = 100;
const DISPLAY_SCALE_STEP = 5;
const DISPLAY_SCALE_EVENT = 'future-career-lab:display-scale-change';

function normalizeDisplayScale(value: number) {
  const clamped = Math.min(DISPLAY_SCALE_MAX, Math.max(DISPLAY_SCALE_MIN, value));
  return Math.round(clamped / DISPLAY_SCALE_STEP) * DISPLAY_SCALE_STEP;
}

function readDisplayScale() {
  if (typeof window === 'undefined') return DISPLAY_SCALE_MAX;
  try {
    const stored = Number(window.localStorage.getItem(DISPLAY_SCALE_STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? normalizeDisplayScale(stored) : DISPLAY_SCALE_MAX;
  } catch {
    return DISPLAY_SCALE_MAX;
  }
}

let scale = 1;
let displayScalePercent = readDisplayScale();

export function getStageScale() {
  return scale;
}

/** 사용자가 설정에서 고른 게임 무대 크기. 기기별로 저장한다. */
export function getDisplayScalePercent() {
  return displayScalePercent;
}

export function setDisplayScalePercent(value: number) {
  displayScalePercent = normalizeDisplayScale(value);
  try {
    window.localStorage.setItem(DISPLAY_SCALE_STORAGE_KEY, String(displayScalePercent));
  } catch {
    // 저장 공간을 사용할 수 없어도 현재 화면에는 바로 적용한다.
  }
  window.dispatchEvent(new Event(DISPLAY_SCALE_EVENT));
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
  const apply = (force = false) => {
    // 가상 키보드가 올라와 뷰포트가 줄어든 동안에는 무대를 다시 줄이지 않는다.
    if (!force && isTyping()) return;
    const width = window.visualViewport?.width ?? window.innerWidth;
    const height = window.visualViewport?.height ?? window.innerHeight;
    const rootElement = document.documentElement;
    const lowHeightScroll = rootElement.classList.contains('force-mobile-game') && width >= 640 && width > height && height < 350;
    const fittedScale = lowHeightScroll ? width / STAGE_WIDTH : Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT);
    scale = fittedScale * (displayScalePercent / 100);
    rootElement.classList.toggle('low-height-scroll', lowHeightScroll);
    rootElement.classList.toggle('display-scale-adjusted', displayScalePercent < DISPLAY_SCALE_MAX);
    const root = rootElement.style;
    root.setProperty('--stage-scale', scale.toFixed(4));
    root.setProperty('--stage-rendered-height', `${(STAGE_HEIGHT * scale).toFixed(2)}px`);
    root.setProperty('--display-scale-percent', String(displayScalePercent));
    /*
     * 고정 1280×720 무대를 축소해도 손가락으로 누르는 실제 크기는 48px을 지킨다.
     * CSS 안에서는 transform 뒤의 실제 px로 나눌 수 없어, 여기서 필요한 논리 px을 계산한다.
     */
    const touchMin = `${Math.max(60, 48 / scale).toFixed(2)}px`;
    const titleSize = `${Math.max(28, 19 / scale).toFixed(2)}px`;
    const headSize = `${Math.max(24, 17 / scale).toFixed(2)}px`;
    const bodySize = `${Math.max(20, 16 / scale).toFixed(2)}px`;
    const instructionSize = `${Math.max(23, 18 / scale).toFixed(2)}px`;
    root.setProperty('--responsive-touch-min', touchMin);
    root.setProperty('--responsive-fs-title', titleSize);
    root.setProperty('--responsive-fs-head', headSize);
    root.setProperty('--responsive-fs-body', bodySize);
    root.setProperty('--responsive-fs-instruction', instructionSize);
    root.setProperty('--touch-min', touchMin);
    root.setProperty('--button-height-lg', touchMin);
    root.setProperty('--fs-title', titleSize);
    root.setProperty('--fs-head', headSize);
    root.setProperty('--fs-body', bodySize);
    root.setProperty('--fs-cap', bodySize);
    root.setProperty('--fs-instruction', instructionSize);
  };
  const applyViewport = () => apply();
  const applyDisplayScale = () => apply(true);
  apply();
  window.addEventListener('resize', applyViewport);
  window.addEventListener('orientationchange', applyViewport);
  window.addEventListener(DISPLAY_SCALE_EVENT, applyDisplayScale);
  document.addEventListener('fullscreenchange', applyViewport);
  window.visualViewport?.addEventListener('resize', applyViewport);
  window.addEventListener('focusout', () => window.setTimeout(applyViewport, 50));
}
