import { describe, expect, it } from 'vitest';
import fields from '../src/data/job-dna-rules.json';
import jobs from '../src/data/jobs.json';

describe('content ids and non-diagnostic copy', () => {
  it('keeps job ids unique', () => {
    const ids = jobs.map((job) => job.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not allow ranking or type labels in result copy', () => {
    expect(fields.disallowedCopy).toContain('상위');
    expect(fields.disallowedCopy).toContain('가장 적합');
    expect(fields.traits).toHaveLength(6);
  });
});
