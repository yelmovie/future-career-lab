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
    if (!host.current) return;
    const game = new Phaser.Game({
      // The MVP scenes are intentionally 2D. Canvas avoids fragile WebGL
      // framebuffer allocation on school tablets and embedded browsers.
      type: Phaser.CANVAS,
      parent: host.current,
      transparent: true,
      backgroundColor: 'rgba(0,0,0,0)',
      scene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
      },
      render: { antialias: true, pixelArt: false, roundPixels: true },
      input: { activePointers: 3 },
      audio: { noAudio: true },
    });
    return () => game.destroy(true, false);
  }, [scene]);

  return <div ref={host} className={`phaser-stage ${className}`} role="img" aria-label={ariaLabel} />;
}
