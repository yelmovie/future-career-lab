import { STAGE_PAGES } from '../shared/constants';
import type { PageNumber, StageNumber } from '../shared/types';

export function deriveStageCompletion(completedPages: PageNumber[]): Record<StageNumber, boolean> {
  return {
    1: STAGE_PAGES[1].every((page) => completedPages.includes(page)),
    2: STAGE_PAGES[2].every((page) => completedPages.includes(page)),
    3: STAGE_PAGES[3].every((page) => completedPages.includes(page)),
    4: STAGE_PAGES[4].every((page) => completedPages.includes(page)),
    5: STAGE_PAGES[5].every((page) => completedPages.includes(page)),
  };
}

export function isCertificateUnlocked(completedPages: PageNumber[]): boolean {
  return Object.values(deriveStageCompletion(completedPages)).every(Boolean);
}
