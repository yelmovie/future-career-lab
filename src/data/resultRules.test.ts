import { describe, expect, it } from 'vitest';
import type { Artifacts, GameLog, TraitScores } from '../shared/types';
import { actualJob, jobEvidence } from './resultRules';

const log = (page: GameLog['page'], type: string): GameLog => ({ id: `${page}-${type}`, page, type, summary: '', tags: [], traits: {}, contextRef: '', createdAt: '' });
const traits: TraitScores = { exploration: 0, analysis: 0, creation: 0, care: 0, execution: 0, collaboration: 0 };
const empty: Artifacts = { photos: [], hypothesis: null, careLog: [], habitatStars: 0, traces: [], graphs: [], clip: null, allianceTurns: null };
const bothBirds: Artifacts['careLog'] = [{ bird: 'green', issue: 'a', treatment: 'b' }, { bird: 'red', issue: 'a', treatment: 'b' }];

// 모든 스테이지를 다 돌아도 로그 수가 아니라 품질로 갈린다: 각 직업의 고정 로그를 전부 넣는다.
const fullLogs = [log(3, 'drone-mission'), log(4, 'hypothesis'), log(5, 'care-treatment'), log(5, 'care-treatment'), log(5, 'care-recorded'), log(6, 'habitat-simulation'), log(7, 'ecology-verdict'), log(8, 'broadcast-done')];

describe('actualJob', () => {
  it('returns null when artifacts are empty even if logs exist', () => {
    expect(actualJob(empty, fullLogs, traits).job).toBeNull();
    expect(jobEvidence(empty, []).every((entry) => entry.quality === 0)).toBe(true);
  });

  it('different artifacts yield different winners regardless of log counts', () => {
    const base: Artifacts = {
      ...empty,
      photos: [{ id: 'logging', quality: 'edge' }, { id: 'stream', quality: 'edge' }, { id: 'construction', quality: 'edge' }],
      careLog: bothBirds,
      habitatStars: 1,
      traces: ['a', 'b'],
      graphs: [{ variable: 'logging', verdict: 'sub' }],
      clip: { trust: 50, corrections: 1 },
    };
    const dronePlay: Artifacts = { ...base, photos: base.photos.map((photo) => ({ ...photo, quality: 'center' })) };
    expect(actualJob(dronePlay, [...fullLogs, log(3, 'drone-precision')], traits).job).toBe('drone');

    const carePlay: Artifacts = { ...base, habitatStars: 3 };
    expect(actualJob(carePlay, [...fullLogs, log(5, 'care-perfect')], traits).job).toBe('care');

    const ecologyPlay: Artifacts = { ...base, traces: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], graphs: [{ variable: 'water', verdict: 'main' }] };
    expect(actualJob(ecologyPlay, fullLogs, traits).job).toBe('ecology');

    const broadcastPlay: Artifacts = { ...base, clip: { trust: 100, corrections: 0 } };
    expect(actualJob(broadcastPlay, fullLogs, traits).job).toBe('broadcast');
  });

  it('gives a reason per job and breaks exact ties by the job traits, then stage order', () => {
    const tie: Artifacts = { ...empty, photos: [{ id: 'logging', quality: 'center' }], clip: { trust: 80, corrections: 0 } };
    const result = actualJob(tie, [], traits);
    expect(result.evidence.map((entry) => entry.quality)).toEqual([0.8, 0, 0, 0.8]);
    expect(result.job).toBe('drone');
    expect(actualJob(tie, [], { ...traits, collaboration: 5 }).job).toBe('broadcast');
    expect(result.evidence.find((entry) => entry.job === 'broadcast')?.reason).toContain('클린 방송');
    expect(jobEvidence({ ...empty, photos: [{ id: 'logging', quality: 'center' }] }, [log(3, 'drone-precision')])[0]?.reason).toContain('정밀 비행 도장');
  });
});
