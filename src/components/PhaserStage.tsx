import Phaser from 'phaser';
import { useEffect, useRef } from 'react';

interface PhaserStageProps {
  scene: Phaser.Scene;
  ariaLabel: string;
  className?: string;
}

export function PhaserStage({ scene, ariaLabel, className = '' }: PhaserStageProps) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = host.current;
    if (!parent) return;
    // 무대 전체가 CSS transform 으로 확대·축소되므로 Phaser 의 RESIZE 모드(getBoundingClientRect 기준)는
    // 실제 크기를 잘못 읽는다. 크기는 우리가 논리 px(clientWidth/Height)로 직접 넘긴다.
    const game = new Phaser.Game({
      // The MVP scenes are intentionally 2D. Canvas avoids fragile WebGL
      // framebuffer allocation on school tablets and embedded browsers.
      type: Phaser.CANVAS,
      parent,
      transparent: true,
      backgroundColor: 'rgba(0,0,0,0)',
      scene,
      scale: {
        mode: Phaser.Scale.NONE,
        width: Math.max(1, parent.clientWidth),
        height: Math.max(1, parent.clientHeight),
      },
      render: { antialias: true, pixelArt: false, roundPixels: true },
      input: { activePointers: 3 },
      audio: { noAudio: true },
    });
    const observer = new ResizeObserver(() => {
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      if (game.scale.width !== width || game.scale.height !== height) game.scale.resize(width, height);
    });
    observer.observe(parent);
    return () => {
      observer.disconnect();
      game.destroy(true, false);
    };
  }, [scene]);

  return <div ref={host} className={`phaser-stage ${className}`} role="img" aria-label={ariaLabel} />;
}
