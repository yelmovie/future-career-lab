import { describe, expect, it } from 'vitest';
import { isTeacherPassword } from '../src/state/teacherAccess';

describe('teacher preview password', () => {
  it('accepts YELSAM without case sensitivity or surrounding spaces', () => {
    expect(isTeacherPassword('YELSAM')).toBe(true);
    expect(isTeacherPassword('yelsam')).toBe(true);
    expect(isTeacherPassword('  YeLsAm  ')).toBe(true);
  });

  it('rejects a different password', () => {
    expect(isTeacherPassword('YELSAM1')).toBe(false);
    expect(isTeacherPassword('')).toBe(false);
  });
});
