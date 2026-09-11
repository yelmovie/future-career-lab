import type { ModelViewerElement } from '@google/model-viewer';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
        src?: string;
        poster?: string;
        alt?: string;
        'camera-controls'?: boolean;
        'disable-pan'?: boolean;
        'camera-orbit'?: string;
        'touch-action'?: string;
        'interaction-prompt'?: string;
        'shadow-intensity'?: string;
        'environment-image'?: string;
        a11y?: string;
      };
    }
  }
}
