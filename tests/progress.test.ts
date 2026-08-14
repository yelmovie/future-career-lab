import { describe, expect, it } from 'vitest';
import { deriveStageCompletion, isCertificateUnlocked } from '../src/state/progress';

describe('stage completion gates', () => {
  it('does not complete a two-page stage from a route visit alone', () => {
    expect(deriveStageCompletion([3])[2]).toBe(false);
    expect(deriveStageCompletion([3, 4])[2]).toBe(true);
  });

  it('unlocks the certificate only after all five stages', () => {
    expect(isCertificateUnlocked([2, 3, 4, 5, 6, 7])).toBe(false);
    expect(isCertificateUnlocked([2, 3, 4, 5, 6, 7, 8])).toBe(true);
  });
});
